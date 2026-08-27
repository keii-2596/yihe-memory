import { ensureSchema, getDb } from '../../../../db';

type ReminderRow={id:string;owner_id:string;channel:string;destination:string;reminder_time:string;timezone:string;last_sent_date:string|null;display_name:string|null;state_json:string|null};

export async function POST(request:Request){
  const secret=process.env.REMINDER_CRON_SECRET;if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'unauthorized'},{status:401});
  try{
    await ensureSchema();const now=new Date();const result=await getDb().prepare(`SELECT r.id,r.owner_id,r.channel,r.destination,r.reminder_time,r.timezone,r.last_sent_date,u.display_name,u.state_json FROM reminder_subscriptions r LEFT JOIN user_state u ON u.owner_id=r.owner_id WHERE r.enabled=1 LIMIT 500`).all<ReminderRow>();let sent=0;let skipped=0;let failed=0;
    for(const row of result.results||[]){const due=dueNow(row,now);if(!due){skipped++;continue;}const count=dueCount(row.state_json,now);const message=count?`今天有 ${count} 个知识点等待主动回忆。先完成一个，让记忆继续生长。`:'今天的计划已经完成，保持这个节奏。';const ok=row.channel==='email'?await sendEmail(row.destination,row.display_name||'同学',message):await sendWechat(row.destination,message);if(ok){sent++;await getDb().prepare('UPDATE reminder_subscriptions SET last_sent_date=?,updated_at=? WHERE id=?').bind(due.date,new Date().toISOString(),row.id).run();}else failed++;}
    return Response.json({ok:true,sent,skipped,failed});
  }catch{return Response.json({error:'dispatch_failed'},{status:503});}
}

function dueNow(row:ReminderRow,now:Date){try{const formatted=new Intl.DateTimeFormat('sv-SE',{timeZone:row.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);const [date,time]=formatted.split(' ');const minutes=(value:string)=>{const [h,m]=value.split(':').map(Number);return h*60+m;};return minutes(time)>=minutes(row.reminder_time)&&row.last_sent_date!==date?{date}:null;}catch{return null;}}
function dueCount(raw:string|null,now:Date){try{const state=JSON.parse(raw||'null') as {questions?:{id:string}[];progress?:Record<string,{nextReview:string}>};return(state.questions||[]).filter(item=>{const progress=state.progress?.[item.id];return !progress||new Date(progress.nextReview)<=now;}).length;}catch{return 0;}}
async function sendEmail(to:string,name:string,message:string){const key=process.env.RESEND_API_KEY;const from=process.env.REMINDER_EMAIL_FROM;if(!key||!from)return false;const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject:'忆核 · 今日学习提醒',html:`<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:28px"><h2>${escapeHtml(name)}，该复习啦</h2><p>${escapeHtml(message)}</p><p><a href="https://yihe-memory.leo527952.chatgpt.site/">打开忆核开始学习</a></p><small>你可以在忆核设置中关闭此提醒。</small></div>`})});return response.ok;}
async function sendWechat(webhook:string,message:string){const response=await fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({msgtype:'text',text:{content:`忆核 · 今日学习提醒\n${message}\nhttps://yihe-memory.leo527952.chatgpt.site/`}})});return response.ok;}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));}
