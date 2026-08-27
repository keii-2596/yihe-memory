import { headers } from 'next/headers';

export type AuthProvider='chatgpt'|'proxy'|'cloudflare-access'|'development';
export type AppUser={userId:string;displayName:string;email:string;fullName:string|null;provider:AuthProvider};
export type AuthOption={id:'local'|'chatgpt'|'github'|'google'|'email'|'proxy';label:string;description:string;available:boolean;href?:string};

export async function getAppUser():Promise<AppUser|null>{
  const values=await headers(); const mode=(process.env.AUTH_MODE||'auto').toLowerCase();
  if(mode==='auto'||mode==='chatgpt'){
    const userId=values.get('oai-authenticated-user-id'); const email=values.get('oai-authenticated-user-email');
    // Keep the original ChatGPT subject as the storage key so existing Sites users
    // continue to see the D1 state created before multi-provider auth was added.
    if(userId&&email){const encoded=values.get('oai-authenticated-user-full-name');const fullName=encoded&&values.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'?safeDecode(encoded):null;return{userId,email,fullName,displayName:fullName??email.split('@')[0],provider:'chatgpt'};}
  }
  if((mode==='auto'||mode==='proxy')&&process.env.AUTH_PROXY_SECRET){
    const supplied=values.get('x-yihe-proxy-secret');const subject=readConfiguredHeader(values,process.env.AUTH_USER_ID_HEADER,'x-auth-user-id');const email=readConfiguredHeader(values,process.env.AUTH_EMAIL_HEADER,'x-auth-user-email');
    if(supplied&&safeEqual(supplied,process.env.AUTH_PROXY_SECRET)&&subject&&email){const fullName=readConfiguredHeader(values,process.env.AUTH_NAME_HEADER,'x-auth-user-name');return{userId:`proxy:${subject}`,email,fullName,displayName:fullName??email.split('@')[0],provider:'proxy'};}
  }
  if((mode==='auto'||mode==='cloudflare-access')&&process.env.AUTH_TRUST_CLOUDFLARE_ACCESS==='true'){
    const email=values.get('cf-access-authenticated-user-email');if(email){const subject=values.get('cf-access-user-id')||await digest(email.toLowerCase());return{userId:`cf:${subject}`,email,fullName:null,displayName:email.split('@')[0],provider:'cloudflare-access'};}
  }
  if(mode==='development'&&process.env.NODE_ENV!=='production'){
    const email=values.get('x-dev-user-email')||'developer@localhost';const subject=values.get('x-dev-user-id')||'local-developer';return{userId:`dev:${subject}`,email,fullName:null,displayName:email.split('@')[0],provider:'development'};
  }
  return null;
}

export function getAuthOptions():AuthOption[]{return[
  {id:'local',label:'无需账号',description:'数据仅保存在当前设备，可随时导出备份。',available:true},
  {id:'chatgpt',label:'ChatGPT',description:'适合 OpenAI Sites，自动获得个人云同步。',available:process.env.AUTH_ENABLE_CHATGPT!=='false',href:'/signin-with-chatgpt?return_to=/'},
  externalOption('github','GitHub','适合开发者社区，可由 Auth.js、Supabase、Clerk 或 OAuth2 Proxy 接入。','AUTH_GITHUB_SIGNIN_URL'),
  externalOption('google','Google','适合公开产品和个人用户，可由外部身份服务接入。','AUTH_GOOGLE_SIGNIN_URL'),
  externalOption('email','邮箱验证码','适合不想绑定社交账号的用户，由外部身份服务发送魔法链接。','AUTH_EMAIL_SIGNIN_URL'),
  {id:'proxy',label:'自托管 / SSO',description:'支持 oauth2-proxy、Authelia、Authentik 与企业反向代理。',available:Boolean(process.env.AUTH_PROXY_SECRET||process.env.AUTH_TRUST_CLOUDFLARE_ACCESS==='true')},
]}

export const getChatGPTUser=getAppUser;
function externalOption(id:'github'|'google'|'email',label:string,description:string,key:string):AuthOption{const href=safeAuthUrl(process.env[key]);return{id,label,description,available:Boolean(href),...(href?{href}:{})};}
function safeAuthUrl(value:string|undefined){if(!value)return undefined;try{if(value.startsWith('/'))return value;const url=new URL(value);return url.protocol==='https:'?url.toString():undefined;}catch{return undefined;}}
function readConfiguredHeader(values:Headers,name:string|undefined,fallback:string){const selected=name&&/^[a-z0-9-]+$/i.test(name)?name:fallback;return values.get(selected);}
function safeDecode(value:string){try{return decodeURIComponent(value);}catch{return null;}}
function safeEqual(left:string,right:string){if(left.length!==right.length)return false;let result=0;for(let index=0;index<left.length;index++)result|=left.charCodeAt(index)^right.charCodeAt(index);return result===0;}
async function digest(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return[...new Uint8Array(bytes)].map(item=>item.toString(16).padStart(2,'0')).join('').slice(0,32);}
