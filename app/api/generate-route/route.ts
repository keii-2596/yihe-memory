type Candidate={id:string;title:string;category:string;tags?:string[];roleIds?:string[];levels?:string[];directionTags?:string[]};
const signals:[RegExp,string[]][]=[
  [/前端|react|vue|javascript|typescript|浏览器|webpack/i,['frontend']],
  [/java|spring|jvm|mybatis/i,['java-backend']],
  [/\bgo\b|golang|gin|grpc/i,['go-backend']],
  [/python|django|flask|fastapi/i,['python-backend']],
  [/测试|qa|自动化|selenium|性能测试/i,['qa']],
  [/运维|sre|devops|kubernetes|k8s|docker|linux|可观测/i,['devops']],
];

export async function POST(request:Request){
  let body:{description?:string;questions?:Candidate[];model?:string;prompt?:string;personalApi?:PersonalApi};try{body=await request.json() as typeof body;}catch{return Response.json({error:'invalid_json'},{status:400});}
  const description=(body.description||'').trim();const questions=(body.questions||[]).slice(0,1000);
  if(description.length<20)return Response.json({error:'请粘贴更完整的岗位描述'},{status:400});
  const roles=[...new Set(signals.filter(([pattern])=>pattern.test(description)).flatMap(([,values])=>values))];
  const level=/高级|资深|专家|架构|lead|senior/i.test(description)?'senior':/中级|3年|4年|5年|独立负责|mid/i.test(description)?'mid':'junior';
  const words=[...new Set((description.toLowerCase().match(/[a-z][a-z0-9+#.]{1,20}|[\u4e00-\u9fff]{2,8}/g)||[]))].filter(word=>!['负责','熟悉','掌握','能力','经验','优先','工作','相关','以上','要求'].includes(word));
  const ranked=questions.map(item=>{const haystack=`${item.title} ${item.category} ${(item.tags||[]).join(' ')} ${(item.directionTags||[]).join(' ')}`.toLowerCase();let score=words.reduce((sum,word)=>sum+(haystack.includes(word)?2:0),0);if(roles.some(role=>(item.roleIds||[]).includes(role)))score+=8;if((item.levels||[]).includes(level))score+=3;return{item,score};}).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title,'zh-CN'));
  const selected=ranked.filter(row=>row.score>0).slice(0,45);const fallback=roles.length?ranked.filter(row=>roles.some(role=>(row.item.roleIds||[]).includes(role))).slice(0,30):ranked.slice(0,30);
  const rows=selected.length>=8?selected:fallback;const roleName=roles.map(role=>({'frontend':'前端','java-backend':'Java 后端','go-backend':'Go 后端','python-backend':'Python 后端','qa':'测试','devops':'SRE / 运维'}[role]||role)).join(' + ')||'综合岗位';
  const localRoute={id:`jd-${Date.now().toString(36)}`,name:`JD · ${roleName}`,description:`从岗位描述提取的 ${level==='senior'?'高级':level==='mid'?'中级':'初级'}面试词书，共 ${rows.length} 个匹配知识点`,categories:[],questionIds:rows.map(row=>row.item.id),source:'jd' as const,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  let provider;try{provider=resolveProvider(body.personalApi,body.model);}catch(error){return Response.json({error:error instanceof Error?error.message:'个人 API 配置无效'},{status:400});}
  if(!provider)return Response.json({route:localRoute,skills:words.slice(0,12),level,source:'local'});
  try{
    const shortlist=ranked.slice(0,120).map(row=>({id:row.item.id,title:row.item.title,category:row.item.category}));
    const prompt=`${fillPrompt(body.prompt,{jd:description})||'请根据岗位描述选择最相关的面试知识点。'}\n只返回 JSON：{"name":"词书名称","description":"一句说明","selectedIds":["题目ID"]}。最多选择 45 道，ID 必须来自候选题目。`;
    const response=await chat(provider,[{role:'system',content:prompt},{role:'user',content:JSON.stringify({jobDescription:description,candidates:shortlist})}],true,.2);
    if(!response.ok)throw new Error('failed');const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};const parsed=JSON.parse(payload.choices?.[0]?.message?.content||'{}') as {name?:string;description?:string;selectedIds?:string[]};
    const allowed=new Set(questions.map(item=>item.id));const selectedIds=(parsed.selectedIds||[]).filter(id=>allowed.has(id)).slice(0,45);
    const route=selectedIds.length>=5?{...localRoute,name:String(parsed.name||localRoute.name).slice(0,50),description:String(parsed.description||localRoute.description).slice(0,160),questionIds:selectedIds}:localRoute;
    return Response.json({route,skills:words.slice(0,12),level,source:'ai',model:provider.model});
  }catch{return Response.json({route:localRoute,skills:words.slice(0,12),level,source:'local'});}
}
import { chat, fillPrompt, PersonalApi, resolveProvider } from '../../../lib/llm';
