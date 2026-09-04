import { chat, fillPrompt, PersonalApi, resolveProvider } from '../../../lib/llm';
import { aiStringList, aiText } from '../../../lib/llm-normalize';

type GeneratedCard={ title:string; category:string; hint:string; keyPoints:string[]; reference:string; tags:string[]; difficulty:1|2|3 };

function localCards(text:string,count:number):GeneratedCard[] {
  const blocks=text.split(/\n\s*\n|(?<=[。！？])\s*/).map(item=>item.trim()).filter(item=>item.length>12).slice(0,count);
  return blocks.map((block,index)=>{
    const clean=block.replace(/^[-*#\d.、\s]+/,'').slice(0,280);
    const subject=clean.split(/[，。：；]/)[0].slice(0,28) || `知识点 ${index+1}`;
    return { title:`请解释：${subject}？`, category:'待整理', hint:'先说明定义，再讲原理、特点或应用场景。', keyPoints:clean.split(/[；。]/).filter(Boolean).slice(0,4), reference:clean, tags:['AI生成'], difficulty:1 };
  });
}

export async function POST(request:Request) {
  const input=await request.json() as { text?:string; count?:number; model?:string;prompt?:string;personalApi?:PersonalApi };
  const text=String(input.text??'').trim(); const count=Math.max(1,Math.min(20,Number(input.count)||6));
  if (text.length<20 || text.length>30000) return Response.json({ error:'invalid_text' },{ status:400 });
  const fallback=localCards(text,count);let provider;try{provider=resolveProvider(input.personalApi,input.model);}catch(error){return Response.json({error:error instanceof Error?error.message:'个人 API 配置无效'},{status:400});}
  if (!provider) return Response.json({ cards:fallback, source:'local' });
  const prompt=`${fillPrompt(input.prompt,{count,material:'见用户消息中的 <source_material>'})||`从材料中生成最多 ${count} 张计算机面试记忆卡。`}\n\n# 输出协议\n只返回 JSON 对象 {"cards": [...]}，不要 Markdown。每张字段：title（问题）、category、hint、keyPoints（2—6 个纯字符串）、reference、tags（1—4 个纯字符串）、difficulty（1—3）。keyPoints 和 tags 的数组元素禁止使用对象。`;
  try {
    const response=await chat(provider,[{role:'system',content:prompt},{role:'user',content:`<source_material>\n${text}\n</source_material>`}],true,.25);
    if (!response.ok) throw new Error('ai_failed'); const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};
    const parsed=JSON.parse(payload.choices?.[0]?.message?.content||'{}') as {cards?:GeneratedCard[]};
    const cards=(Array.isArray(parsed.cards)?parsed.cards:[]).slice(0,count).map((card,index)=>({title:aiText(card.title,`知识点 ${index+1}`,180),category:aiText(card.category,'待整理',40),hint:aiText(card.hint,'先说明定义，再讲原理与场景。',300),keyPoints:aiStringList(card.keyPoints,6),reference:aiText(card.reference,'',3000),tags:aiStringList(card.tags,4,40),difficulty:Math.max(1,Math.min(3,Number(card.difficulty)||1)) as 1|2|3})).filter(card=>card.title&&card.reference&&card.keyPoints.length>=2);
    return Response.json({ cards:cards.length?cards:fallback, source:'ai',model:provider.model });
  } catch { return Response.json({ cards:fallback, source:'local' }); }
}
