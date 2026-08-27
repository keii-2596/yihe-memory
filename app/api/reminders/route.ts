import { ensureSchema, getDb } from '../../../db';
import { getAppUser } from '../../chatgpt-auth';

type ReminderRow={channel:string;destination:string;reminder_time:string;timezone:string;enabled:number;last_sent_date:string|null};
const CHANNELS=['email','wechat'] as const;

export async function GET(){
  const user=await getAppUser();if(!user)return Response.json({error:'sign_in_required'},{status:401});
  try{await ensureSchema();const result=await getDb().prepare('SELECT channel, destination, reminder_time, timezone, enabled, last_sent_date FROM reminder_subscriptions WHERE owner_id = ? ORDER BY channel').bind(user.userId).all<ReminderRow>();return Response.json({reminders:(result.results||[]).map(publicReminder)});}catch{return Response.json({error:'cloud_unavailable'},{status:503});}
}

export async function PUT(request:Request){
  const user=await getAppUser();if(!user)return Response.json({error:'sign_in_required'},{status:401});
  let body:{channel?:string;destination?:string;reminderTime?:string;timezone?:string;enabled?:boolean};try{body=await request.json() as typeof body;}catch{return Response.json({error:'invalid_json'},{status:400});}
  if(!CHANNELS.includes(body.channel as typeof CHANNELS[number]))return Response.json({error:'unsupported_channel'},{status:400});
  const destination=(body.destination||'').trim();if(!validDestination(body.channel!,destination))return Response.json({error:body.channel==='email'?'请输入正确邮箱':'请输入企业微信群机器人 Webhook'},{status:400});
  const reminderTime=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body.reminderTime||'')?body.reminderTime!:'20:00';const timezone=(body.timezone||'Asia/Shanghai').slice(0,64);const now=new Date().toISOString();
  try{await ensureSchema();await getDb().prepare(`INSERT INTO reminder_subscriptions (id,owner_id,channel,destination,reminder_time,timezone,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,channel) DO UPDATE SET destination=excluded.destination,reminder_time=excluded.reminder_time,timezone=excluded.timezone,enabled=excluded.enabled,updated_at=excluded.updated_at`).bind(crypto.randomUUID(),user.userId,body.channel,destination,reminderTime,timezone,body.enabled===false?0:1,now,now).run();return Response.json({ok:true,reminder:publicReminder({channel:body.channel!,destination,reminder_time:reminderTime,timezone,enabled:body.enabled===false?0:1,last_sent_date:null})});}catch{return Response.json({error:'cloud_unavailable'},{status:503});}
}

export async function DELETE(request:Request){
  const user=await getAppUser();if(!user)return Response.json({error:'sign_in_required'},{status:401});
  const channel=new URL(request.url).searchParams.get('channel');if(!channel)return Response.json({error:'channel_required'},{status:400});
  try{await ensureSchema();await getDb().prepare('DELETE FROM reminder_subscriptions WHERE owner_id = ? AND channel = ?').bind(user.userId,channel).run();return Response.json({ok:true});}catch{return Response.json({error:'cloud_unavailable'},{status:503});}
}

function validDestination(channel:string,value:string){if(channel==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='qyapi.weixin.qq.com'&&url.pathname==='/cgi-bin/webhook/send'&&Boolean(url.searchParams.get('key'));}catch{return false;}}
function publicReminder(row:ReminderRow){return{channel:row.channel,destinationMasked:row.channel==='email'?row.destination.replace(/^(.{1,2}).*(@.*)$/,'$1***$2'):`企业微信群机器人 · ${row.destination.slice(-6)}`,reminderTime:row.reminder_time,timezone:row.timezone,enabled:Boolean(row.enabled),lastSentDate:row.last_sent_date};}
