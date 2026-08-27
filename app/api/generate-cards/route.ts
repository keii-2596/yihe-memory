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
  const input=await request.json() as { text?:string; count?:number; model?:string };
  const text=String(input.text??'').trim(); const count=Math.max(1,Math.min(20,Number(input.count)||6));
  if (text.length<20 || text.length>30000) return Response.json({ error:'invalid_text' },{ status:400 });
  const fallback=localCards(text,count); const endpoint=process.env.AI_EVALUATION_ENDPOINT; const apiKey=process.env.AI_EVALUATION_API_KEY;
  if (!endpoint||!apiKey) return Response.json({ cards:fallback, source:'local' });
  const prompt=`从材料中生成最多 ${count} 张计算机面试记忆卡。只返回 JSON 对象 {"cards": [...]}。每张字段：title（问题）、category、hint、keyPoints（2-6项）、reference、tags（1-4项）、difficulty（1-3）。问题必须可独立理解，参考答案必须忠于材料。`;
  try {
    const response=await fetch(endpoint,{ method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:input.model||process.env.AI_EVALUATION_MODEL||'gpt-4.1-mini',temperature:.25,response_format:{type:'json_object'},messages:[{role:'system',content:prompt},{role:'user',content:text}]}) });
    if (!response.ok) throw new Error('ai_failed'); const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};
    const parsed=JSON.parse(payload.choices?.[0]?.message?.content||'{}') as {cards?:GeneratedCard[]};
    return Response.json({ cards:Array.isArray(parsed.cards)?parsed.cards.slice(0,count):fallback, source:'ai' });
  } catch { return Response.json({ cards:fallback, source:'local' }); }
}
