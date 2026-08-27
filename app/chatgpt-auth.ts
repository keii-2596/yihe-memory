import { headers } from 'next/headers';

export type ChatGPTUser={ userId:string; displayName:string; email:string; fullName:string|null };
export async function getChatGPTUser():Promise<ChatGPTUser|null> {
  const values=await headers(); const userId=values.get('oai-authenticated-user-id'); const email=values.get('oai-authenticated-user-email');
  if (!userId || !email) return null;
  const encoded=values.get('oai-authenticated-user-full-name');
  const fullName=encoded && values.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8' ? safeDecode(encoded) : null;
  return { userId,email,fullName,displayName:fullName??email.split('@')[0] };
}
function safeDecode(value:string){ try{return decodeURIComponent(value);}catch{return null;} }
