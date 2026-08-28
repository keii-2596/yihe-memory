export async function POST(request:Request) {
  const form=await request.formData(); const audio=form.get('audio');
  if (!(audio instanceof File) || audio.size===0 || audio.size>25_000_000) return Response.json({error:'invalid_audio'},{status:400});
  const endpoint=process.env.AI_TRANSCRIPTION_ENDPOINT; const apiKey=process.env.AI_EVALUATION_API_KEY;
  if (!endpoint||!apiKey) return Response.json({error:'transcription_not_configured'},{status:501});
  const external=new FormData(); external.set('file',audio,audio.name||'answer.webm'); external.set('model',process.env.AI_TRANSCRIPTION_MODEL||'gpt-4o-mini-transcribe'); external.set('language','zh');
  const prompt=String(form.get('prompt')||'').slice(0,4000);if(prompt)external.set('prompt',prompt);
  try {
    const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body:external});
    if(!response.ok) throw new Error('failed'); const data=await response.json() as {text?:string};
    return Response.json({text:data.text||''});
  } catch { return Response.json({error:'transcription_failed'},{status:502}); }
}
