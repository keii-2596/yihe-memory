type EvaluationRequest = {
  question: string;
  answer: string;
  keyPoints: string[];
  reference: string;
};

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

function localEvaluate(input: EvaluationRequest): Evaluation {
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

export async function GET() {
  return Response.json({
    mode:process.env.AI_EVALUATION_ENDPOINT && process.env.AI_EVALUATION_API_KEY ? 'ai' : 'local',
    model:process.env.AI_EVALUATION_MODEL || null,
  });
}

export async function POST(request: Request) {
  const input = await request.json() as EvaluationRequest;
  if (!input?.question || !input?.answer || !Array.isArray(input?.keyPoints)) return Response.json({ error:'invalid_request' }, { status:400 });
  const fallback = localEvaluate(input);
  const endpoint = process.env.AI_EVALUATION_ENDPOINT;
  const apiKey = process.env.AI_EVALUATION_API_KEY;
  if (!endpoint || !apiKey) return Response.json(fallback);

  const system = `你是一名严格但鼓励式的计算机面试教练。评价答案时关注概念覆盖、逻辑准确和表达清晰，不要求逐字匹配参考答案。只输出 JSON，不要 markdown。字段必须为：score(0-100数字)、verdict(短句)、summary(1-2句)、hitPoints(字符串数组)、missedPoints(字符串数组)、suggestion(一句可执行建议)。`;
  const user = JSON.stringify({ question:input.question, answer:input.answer, scoring_points:input.keyPoints, reference_answer:input.reference });
  try {
    const response = await fetch(endpoint, {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${apiKey}` },
      body:JSON.stringify({ model:process.env.AI_EVALUATION_MODEL || 'gpt-4.1-mini', temperature:.2, response_format:{ type:'json_object' }, messages:[{ role:'system', content:system },{ role:'user', content:user }] }),
    });
    if (!response.ok) return Response.json(fallback);
    const payload = await response.json() as { choices?:Array<{ message?:{ content?:string } }>; evaluation?:Partial<Evaluation> };
    const raw = payload.choices?.[0]?.message?.content;
    const parsed = raw ? JSON.parse(raw) as Partial<Evaluation> : payload.evaluation;
    return Response.json(cleanEvaluation(parsed || {}, fallback));
  } catch { return Response.json(fallback); }
}
