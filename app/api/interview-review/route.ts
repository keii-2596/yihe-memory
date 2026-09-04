import { chat, fillPrompt, PersonalApi, resolveProvider } from '../../../lib/llm';
import { aiStringList, aiText } from '../../../lib/llm-normalize';

type Card={title:string;category:string;hint:string;keyPoints:string[];reference:string;tags:string[];difficulty:1|2|3};
type Review={summary:string;overallFeedback:string;strengths:string[];weaknesses:string[];topics:{name:string;category:string;evidence:string;priority:'high'|'medium'|'low'}[];actionPlan:string[];cards:Card[]};

function localReview(transcript:string,role:string):Review{
  const blocks=transcript.split(/\n+|(?<=[。！？])\s*/).map(value=>value.trim()).filter(value=>value.length>10).slice(0,8);
  const cards=blocks.slice(0,6).map((value,index)=>{const subject=value.replace(/^(面试官|问|Q)[:：]?\s*/i,'').split(/[，。：；]/)[0].slice(0,32)||`面试知识点 ${index+1}`;return{title:/[？?]$/.test(subject)?subject:`请解释：${subject}？`,category:'面试复盘',hint:'先给出结论，再说明原理与实际场景。',keyPoints:value.split(/[，；。]/).filter(item=>item.length>4).slice(0,4),reference:value,tags:['面试复盘',role].filter(Boolean),difficulty:2 as const};});
  return{summary:`已从文字稿中识别 ${cards.length} 个可复习主题。`,overallFeedback:'当前使用本地提取，建议检查生成题目后再加入词书。',strengths:['完成了面试内容记录'],weaknesses:cards.slice(0,3).map(card=>`继续梳理：${card.title.replace(/[？?]$/,'')}`),topics:cards.map(card=>({name:card.title,category:card.category,evidence:card.reference.slice(0,80),priority:'medium' as const})),actionPlan:['筛选本次暴露的知识点','把高优先级题目加入词书','按每日新学上限开始复习'],cards};
}

function topics(value:unknown,fallback:Review['topics']):Review['topics']{
  if(!Array.isArray(value))return fallback;
  const normalized=value.slice(0,12).map(item=>{const raw=item&&typeof item==='object'?item as Record<string,unknown>:{};const priority:Review['topics'][number]['priority']=raw.priority==='high'||raw.priority==='low'?raw.priority:'medium';return{name:aiText(raw.name||raw.title,'',120),category:aiText(raw.category,'面试复盘',40),evidence:aiText(raw.evidence||raw.reason,'文字稿中暴露出该主题',300),priority};}).filter(item=>item.name);
  return normalized.length?normalized:fallback;
}
export async function POST(request:Request){
  let input:{transcript?:string;role?:string;model?:string;prompt?:string;personalApi?:PersonalApi};try{input=await request.json() as typeof input;}catch{return Response.json({error:'invalid_json'},{status:400});}
  const transcript=String(input.transcript||'').trim();const role=String(input.role||'技术岗位').trim().slice(0,80);
  if(transcript.length<50||transcript.length>60000)return Response.json({error:'请提供 50—60,000 字的面试文字稿'},{status:400});
  const fallback=localReview(transcript,role);let provider;try{provider=resolveProvider(input.personalApi,input.model);}catch(error){return Response.json({error:error instanceof Error?error.message:'个人 API 配置无效'},{status:400});}
  if(!provider)return Response.json({...fallback,source:'local'});
  const instruction=`${fillPrompt(input.prompt,{role,transcript:'见用户消息中的 <interview_transcript>'})||'分析面试文字稿，提取可复习的计算机知识点。'}\n\n# 输出协议\n只返回 JSON 对象，不要 Markdown。字段：summary、overallFeedback、strengths、weaknesses、topics、actionPlan、cards。strengths、weaknesses、actionPlan、keyPoints、tags 必须是纯字符串数组，数组元素禁止使用对象。topics 每项包含 name/category/evidence/priority(high|medium|low)；cards 每项包含 title/category/hint/keyPoints/reference/tags/difficulty(1|2|3)。最多 10 张卡片，禁止编造文字稿中未出现的经历。`;
  try{
    const response=await chat(provider,[{role:'system',content:instruction},{role:'user',content:`<interview_transcript>\n${transcript}\n</interview_transcript>`}],true,.2);if(!response.ok)throw new Error('failed');
    const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};const raw=JSON.parse(payload.choices?.[0]?.message?.content||'{}') as Partial<Review>;
    const cards=(Array.isArray(raw.cards)?raw.cards:[]).slice(0,10).map((card,index)=>({title:aiText(card.title,`复盘题目 ${index+1}`,180),category:aiText(card.category,'面试复盘',40),hint:aiText(card.hint,'先说结论，再展开原理。',300),keyPoints:aiStringList(card.keyPoints,6),reference:aiText(card.reference,'',3000),tags:aiStringList(card.tags,4,40),difficulty:Math.max(1,Math.min(3,Number(card.difficulty)||2)) as 1|2|3})).filter(card=>card.reference&&card.keyPoints.length);
    return Response.json({summary:aiText(raw.summary,fallback.summary,800),overallFeedback:aiText(raw.overallFeedback,fallback.overallFeedback,1600),strengths:aiStringList(raw.strengths),weaknesses:aiStringList(raw.weaknesses),topics:topics(raw.topics,fallback.topics),actionPlan:aiStringList(raw.actionPlan),cards:cards.length?cards:fallback.cards,source:'ai',model:provider.model});
  }catch{return Response.json({...fallback,source:'local'});}
}
