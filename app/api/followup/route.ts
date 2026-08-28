import { chat, fillPrompt, PersonalApi, resolveProvider } from '../../../lib/llm';

export async function POST(request:Request) {
  const input=await request.json() as { question?:string; answer?:string; missedPoints?:string[]; model?:string;prompt?:string;personalApi?:PersonalApi };
  if (!input.question || !input.answer) return Response.json({ error:'invalid_request' },{status:400});
  const missed=input.missedPoints?.[0]; const fallback={ question:missed?`你刚才没有展开“${missed}”。如果面试官追问，你会怎样结合一个具体场景解释？`:`如果面试官要求你用一个实际场景证明刚才的结论，你会怎么回答？`, source:'local' };
  let provider;try{provider=resolveProvider(input.personalApi,input.model);}catch(error){return Response.json({error:error instanceof Error?error.message:'个人 API 配置无效'},{status:400});}
  if (!provider) return Response.json(fallback);
  try {
    const prompt=fillPrompt(input.prompt,{question:input.question,answer:input.answer,missedPoints:input.missedPoints||[]});
    const response=await chat(provider,[{role:'system',content:prompt||'你是计算机面试官。只给出一个自然、具体、能检验真实理解的中文追问，不要解释。'},{role:'user',content:JSON.stringify({question:input.question,answer:input.answer,missedPoints:input.missedPoints})}],false,.35);
    if(!response.ok) throw new Error('failed'); const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};
    return Response.json({question:payload.choices?.[0]?.message?.content?.trim()||fallback.question,source:'ai',model:provider.model});
  } catch { return Response.json(fallback); }
}
