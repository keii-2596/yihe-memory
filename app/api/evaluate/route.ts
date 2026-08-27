import { ensureSchema, getDb } from '../../../db';
import { getAppUser } from '../../chatgpt-auth';

type EvaluationRequest = {
  question?: string;
  answer?: string;
  keyPoints?: string[];
  reference?: string;
  model?: string;
  dailyLimit?: number;
  testConnection?: boolean;
  personalApi?: {
    endpoint?: string;
    apiKey?: string;
    model?: string;
  };
};

type EvaluationInput = Required<Pick<EvaluationRequest, 'question'|'answer'|'keyPoints'|'reference'>> & EvaluationRequest;
type ProviderConfig = { endpoint:string; apiKey:string; model:string; personal:boolean };

type Evaluation = {
  score: number;
  verdict: string;
  summary: string;
  hitPoints: string[];
  missedPoints: string[];
  suggestion: string;
  source: 'ai' | 'local';
};

const conceptAliases: Record<string, string[]> = {
  原子性:['原子性','atomic','全部成功','全部失败','回滚'], 一致性:['一致性','consistent','合法状态','约束'],
  隔离性:['隔离性','isolation','互不干扰','并发事务'], 持久性:['持久性','durable','永久保存','故障不丢失'],
  强缓存:['强缓存','不发请求','本地缓存'], 协商缓存:['协商缓存','条件请求','304'],
  进程:['进程','资源分配','地址空间'], 线程:['线程','调度','共享','栈','寄存器'],
  堆:['堆','对象','共享'], 方法区:['方法区','元数据','共享'], 程序计数器:['程序计数器','线程私有'],
  虚拟机栈:['虚拟机栈','线程私有'], 本地方法栈:['本地方法栈','线程私有'],
  String:['string','字符串','计数器','缓存'], Hash:['hash','对象','字段'], List:['list','队列'], Set:['set','去重','交集','并集'],
  Sorted:['sorted set','zset','排行榜'], B树:['b+','树高','多路','磁盘','范围查询','叶子'],
  IoC:['ioc','控制反转','依赖注入','容器'], AOP:['aop','切面','横切','事务','日志'],
  TCP:['三次握手','四次挥手','全双工','序列号','收发能力'], 幂等:['幂等','唯一','去重','setnx','状态机'],
  CAP:['cap','一致性','可用性','分区','网络'], React:['state','props','context','memo','重新渲染'],
};

function localEvaluate(input: EvaluationInput): Evaluation {
  const normalized = input.answer.toLowerCase().replace(/\s+/g, '');
  const hitPoints: string[] = [];
  const missedPoints: string[] = [];
  for (const point of input.keyPoints) {
    const concept = Object.keys(conceptAliases).find(key => point.toLowerCase().includes(key.toLowerCase()));
    const aliases = concept ? conceptAliases[concept] : point.split(/[：，、。；/]/).filter(token => token.length >= 2).slice(0, 4);
    (aliases.some(alias => normalized.includes(alias.toLowerCase().replace(/\s+/g,''))) ? hitPoints : missedPoints).push(point);
  }
  const coverage = hitPoints.length / Math.max(1, input.keyPoints.length);
  const clarity = Math.min(1, input.answer.length / 130);
  const structure = /[1-9一二三四首先其次最后①②③④]|\n/.test(input.answer) ? 1 : .55;
  const score = Math.max(20, Math.min(96, Math.round(coverage * 72 + clarity * 16 + structure * 12)));
  const verdict = score >= 88 ? '掌握得很扎实' : score >= 72 ? '回答良好' : score >= 55 ? '方向正确，还需补充' : '需要再巩固一次';
  return {
    score, verdict,
    summary: coverage > .75 ? '核心概念覆盖较完整，整体逻辑清楚。再用一个具体场景串联各点，会更像高质量面试回答。' : `你已经说中了 ${hitPoints.length} 个关键点，但回答还不够完整。建议先补齐概念，再压缩成清晰的分点表达。`,
    hitPoints, missedPoints,
    suggestion: structure === 1 ? '结构已经比较清晰；可以在结尾加一句总结，强化概念之间的关系。' : '建议使用“第一、第二……”分点回答，每点先下定义，再补一句作用或例子。',
    source:'local',
  };
}

function cleanEvaluation(value: Partial<Evaluation>, fallback: Evaluation): Evaluation {
  return {
    score:Math.max(0, Math.min(100, Number(value.score) || fallback.score)),
    verdict:String(value.verdict || fallback.verdict), summary:String(value.summary || fallback.summary),
    hitPoints:Array.isArray(value.hitPoints) ? value.hitPoints.map(String) : fallback.hitPoints,
    missedPoints:Array.isArray(value.missedPoints) ? value.missedPoints.map(String) : fallback.missedPoints,
    suggestion:String(value.suggestion || fallback.suggestion), source:'ai',
  };
}

const allowedModels=new Set(['gpt-4.1-mini','gpt-4.1','gpt-4o-mini']);
const personalEndpointHosts=new Set([
  'api.openai.com',
  'api.deepseek.com',
  'api.moonshot.cn',
  'open.bigmodel.cn',
  'dashscope.aliyuncs.com',
  ...(process.env.AI_ALLOWED_ENDPOINT_HOSTS||'').split(',').map(host=>host.trim().toLowerCase()).filter(Boolean),
]);
const periodKey=()=>new Date().toISOString().slice(0,10);

function personalProvider(value:EvaluationRequest['personalApi']):ProviderConfig|null {
  if(!value)return null;
  const endpoint=String(value.endpoint||'').trim(); const apiKey=String(value.apiKey||'').trim(); const model=String(value.model||'').trim();
  if(!endpoint||!apiKey||!model)throw new Error('请完整填写接口地址、API Key 和模型');
  if(endpoint.length>500||apiKey.length>2048||model.length>120||!/^[\w./:-]+$/.test(model))throw new Error('个人 API 配置格式不正确');
  let url:URL; try{url=new URL(endpoint);}catch{throw new Error('接口地址不是有效 URL');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!personalEndpointHosts.has(url.hostname.toLowerCase())||(url.port&&url.port!=='443'))throw new Error('该接口地址未被允许，请使用受支持的 HTTPS 服务商');
  return {endpoint:url.toString(),apiKey,model,personal:true};
}

function deploymentProvider(input:EvaluationRequest):ProviderConfig|null {
  const endpoint=process.env.AI_EVALUATION_ENDPOINT; const apiKey=process.env.AI_EVALUATION_API_KEY;
  if(!endpoint||!apiKey)return null;
  const model=allowedModels.has(input.model||'')?String(input.model):process.env.AI_EVALUATION_MODEL||'gpt-4.1-mini';
  return {endpoint,apiKey,model,personal:false};
}

async function providerRequest(provider:ProviderConfig,body:Record<string,unknown>){
  return fetch(provider.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${provider.apiKey}`},body:JSON.stringify(body)});
}

async function usageFor(ownerId:string) {
  try { await ensureSchema(); const row=await getDb().prepare('SELECT request_count FROM ai_usage WHERE owner_id = ? AND period = ?').bind(ownerId,periodKey()).first<{request_count:number}>(); return row?.request_count??0; } catch { return 0; }
}
async function recordUsage(ownerId:string,tokens:number) {
  try { await ensureSchema(); const now=new Date().toISOString(); await getDb().prepare(`INSERT INTO ai_usage (owner_id,period,request_count,estimated_tokens,updated_at) VALUES (?,?,1,?,?) ON CONFLICT(owner_id,period) DO UPDATE SET request_count=request_count+1,estimated_tokens=estimated_tokens+excluded.estimated_tokens,updated_at=excluded.updated_at`).bind(ownerId,periodKey(),tokens,now).run(); } catch { /* evaluation must still work when usage storage is unavailable */ }
}

export async function GET() {
  const user=await getAppUser(); const usage=user?await usageFor(user.userId):0;
  return Response.json({
    mode:process.env.AI_EVALUATION_ENDPOINT && process.env.AI_EVALUATION_API_KEY ? 'ai' : 'local',
    model:process.env.AI_EVALUATION_MODEL || null,
    models:[...allowedModels], usage,
  });
}

export async function POST(request: Request) {
  const input = await request.json() as EvaluationRequest;
  let provider:ProviderConfig|null;
  try{provider=personalProvider(input.personalApi)||deploymentProvider(input);}catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:'个人 API 配置无效'},{status:400});}
  if(input.testConnection){
    if(!input.personalApi||!provider?.personal)return Response.json({ok:false,error:'请先填写个人 API 配置'},{status:400});
    try{
      const response=await providerRequest(provider,{model:provider.model,temperature:0,messages:[{role:'user',content:'这是连接测试。请只回复 OK。'}]});
      if(!response.ok)return Response.json({ok:false,error:`服务商返回 ${response.status}，请检查 Key、模型和接口地址`},{status:502});
      return Response.json({ok:true,model:provider.model,host:new URL(provider.endpoint).hostname});
    }catch{return Response.json({ok:false,error:'连接失败，请检查接口地址或稍后重试'},{status:502});}
  }
  if (!input?.question || !input?.answer || !Array.isArray(input?.keyPoints)) return Response.json({ error:'invalid_request' }, { status:400 });
  const evaluationInput={...input,question:input.question,answer:input.answer,keyPoints:input.keyPoints,reference:String(input.reference||'')} as EvaluationInput;
  const fallback = localEvaluate(evaluationInput);
  if (!provider) return Response.json(fallback);
  const chatUser=await getAppUser(); const dailyLimit=Math.max(5,Math.min(100,Number(input.dailyLimit)||30));
  if (chatUser && await usageFor(chatUser.userId)>=dailyLimit) return Response.json({ ...fallback, summary:`今日 AI 判题额度已用完（${dailyLimit} 次），本次使用本地评估。${fallback.summary}` });

  const system = `你是一名严格但鼓励式的计算机面试教练。评价答案时关注概念覆盖、逻辑准确和表达清晰，不要求逐字匹配参考答案。只输出 JSON，不要 markdown。字段必须为：score(0-100数字)、verdict(短句)、summary(1-2句)、hitPoints(字符串数组)、missedPoints(字符串数组)、suggestion(一句可执行建议)。`;
  const userPrompt = JSON.stringify({ question:evaluationInput.question, answer:evaluationInput.answer, scoring_points:evaluationInput.keyPoints, reference_answer:evaluationInput.reference });
  try {
    const model=provider.model; let response:Response|null=null;
    for(let attempt=0;attempt<3;attempt++){response=await providerRequest(provider,{model,temperature:.2,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:userPrompt}]});if(response.ok)break;if(response.status<500&&response.status!==429)break;}
    if (!response) return Response.json(fallback);
    if (!response.ok) return Response.json(fallback);
    const payload = await response.json() as { choices?:Array<{ message?:{ content?:string } }>; evaluation?:Partial<Evaluation> };
    const raw = payload.choices?.[0]?.message?.content;
    const parsed = raw ? JSON.parse(raw) as Partial<Evaluation> : payload.evaluation;
    if(chatUser)await recordUsage(chatUser.userId,Math.ceil((evaluationInput.answer.length+evaluationInput.reference.length)/2));
    return Response.json({ ...cleanEvaluation(parsed || {}, fallback),model });
  } catch { return Response.json(fallback); }
}
