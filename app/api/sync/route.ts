import { ensureSchema, getDb } from '../../../db';
import { getChatGPTUser } from '../../chatgpt-auth';

type StoredRow={ state_json:string; version:number; updated_at:string };
const MAX_STATE_BYTES=2_000_000;

export async function GET() {
  const user=await getChatGPTUser();
  if (!user) return Response.json({ authenticated:false },{ status:401 });
  try {
    await ensureSchema();
    const row=await getDb().prepare('SELECT state_json, version, updated_at FROM user_state WHERE owner_id = ?').bind(user.userId).first<StoredRow>();
    return Response.json({ authenticated:true, user, state:row ? JSON.parse(row.state_json) : null, version:row?.version ?? 0, updatedAt:row?.updated_at ?? null });
  } catch {
    return Response.json({ authenticated:true, user, state:null, version:0, cloudUnavailable:true });
  }
}

export async function PUT(request:Request) {
  const user=await getChatGPTUser();
  if (!user) return Response.json({ error:'sign_in_required' },{ status:401 });
  let body:{ state?:unknown; baseVersion?:number };
  try { body=await request.json() as typeof body; } catch { return Response.json({ error:'invalid_json' },{ status:400 }); }
  const stateJson=JSON.stringify(body.state ?? null);
  if (stateJson==='null' || new TextEncoder().encode(stateJson).length>MAX_STATE_BYTES) return Response.json({ error:'invalid_or_too_large' },{ status:413 });
  try {
    await ensureSchema(); const db=getDb(); const now=new Date().toISOString();
    const current=await db.prepare('SELECT state_json, version, updated_at FROM user_state WHERE owner_id = ?').bind(user.userId).first<StoredRow>();
    if (current && Number(body.baseVersion ?? 0)!==current.version) return Response.json({ error:'version_conflict', state:JSON.parse(current.state_json), version:current.version, updatedAt:current.updated_at },{ status:409 });
    const nextVersion=(current?.version ?? 0)+1; const statements=[];
    if (current) {
      const dayStart=`${now.slice(0,10)}T00:00:00.000Z`;
      const todayBackup=await db.prepare('SELECT id FROM backups WHERE owner_id = ? AND created_at >= ? LIMIT 1').bind(user.userId,dayStart).first();
      if (!todayBackup) statements.push(db.prepare('INSERT INTO backups (id, owner_id, state_json, created_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(),user.userId,current.state_json,now));
    }
    statements.push(db.prepare(`INSERT INTO user_state (owner_id,email,display_name,state_json,version,updated_at) VALUES (?,?,?,?,?,?)
      ON CONFLICT(owner_id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,state_json=excluded.state_json,version=excluded.version,updated_at=excluded.updated_at`)
      .bind(user.userId,user.email,user.displayName,stateJson,nextVersion,now));
    await db.batch(statements);
    await db.prepare('DELETE FROM backups WHERE owner_id = ? AND id NOT IN (SELECT id FROM backups WHERE owner_id = ? ORDER BY created_at DESC LIMIT 20)').bind(user.userId,user.userId).run();
    return Response.json({ ok:true, version:nextVersion, updatedAt:now });
  } catch { return Response.json({ error:'cloud_unavailable' },{ status:503 }); }
}
