export async function POST(request:Request) {
  const input=await request.json() as { question?:string; answer?:string; missedPoints?:string[]; model?:string };
  if (!input.question || !input.answer) return Response.json({ error:'invalid_request' },{status:400});
  const missed=input.missedPoints?.[0]; const fallback={ question:missed?`你刚才没有展开“${missed}”。如果面试官追问，你会怎样结合一个具体场景解释？`:`如果面试官要求你用一个实际场景证明刚才的结论，你会怎么回答？`, source:'local' };
  const endpoint=process.env.AI_EVALUATION_ENDPOINT; const apiKey=process.env.AI_EVALUATION_API_KEY;
  if (!endpoint||!apiKey) return Response.json(fallback);
  try {
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:input.model||process.env.AI_EVALUATION_MODEL||'gpt-4.1-mini',temperature:.35,messages:[{role:'system',content:'你是计算机面试官。根据候选人的回答和遗漏点，只给出一个自然、具体、能检验真实理解的中文追问，不要解释。'},{role:'user',content:JSON.stringify(input)}]})});
    if(!response.ok) throw new Error('failed'); const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};
    return Response.json({question:payload.choices?.[0]?.message?.content?.trim()||fallback.question,source:'ai'});
  } catch { return Response.json(fallback); }
}
