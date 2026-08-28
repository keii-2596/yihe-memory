import type { AppUser } from '../app/chatgpt-auth';

export type CodexGatewayStatus={configured:boolean;allowed:boolean;connected:boolean;account?:string;model?:string;message?:string};

const timeout=(milliseconds:number)=>AbortSignal.timeout(milliseconds);

function gatewayConfig(){
  const url=String(process.env.CODEX_GATEWAY_URL||'').trim();
  const token=String(process.env.CODEX_GATEWAY_TOKEN||'').trim();
  if(!url||!token)return null;
  let endpoint:URL;
  try{endpoint=new URL(url);}catch{return null;}
  if(!['https:','http:'].includes(endpoint.protocol))return null;
  if(endpoint.protocol==='http:'&&!['127.0.0.1','localhost'].includes(endpoint.hostname))return null;
  return{url:endpoint.toString().replace(/\/$/,''),token};
}

export function isCodexOwner(user:AppUser|null){
  if(!user)return false;
  const ownerId=String(process.env.CODEX_OWNER_USER_ID||'').trim();
  const ownerEmail=String(process.env.CODEX_OWNER_EMAIL||'').trim().toLowerCase();
  return Boolean((ownerId&&user.userId===ownerId)||(ownerEmail&&user.email.toLowerCase()===ownerEmail));
}

async function gatewayFetch(path:string,init?:RequestInit){
  const config=gatewayConfig();
  if(!config)throw new Error('codex_gateway_not_configured');
  return fetch(`${config.url}${path}`,{...init,redirect:'error',signal:timeout(path==='/v1/status'?5000:90000),headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json',...(init?.headers||{})}});
}

export async function readCodexStatus(user:AppUser|null):Promise<CodexGatewayStatus>{
  const configured=Boolean(gatewayConfig());const allowed=isCodexOwner(user);
  if(!configured)return{configured:false,allowed,connected:false,message:'私人网关尚未配置'};
  if(!allowed)return{configured:true,allowed:false,connected:false,message:user?'当前账号不在私人测试白名单中':'请先登录站点账号'};
  try{
    const response=await gatewayFetch('/v1/status');
    const data=await response.json() as {connected?:boolean;account?:string;model?:string;message?:string};
    return{configured:true,allowed:true,connected:response.ok&&Boolean(data.connected),account:data.account,model:data.model,message:data.message};
  }catch{return{configured:true,allowed:true,connected:false,message:'暂时无法连接私人网关'};}
}

export async function evaluateWithCodex(user:AppUser|null,input:{question:string;answer:string;keyPoints:string[];reference:string;prompt?:string}){
  if(!isCodexOwner(user))throw new Error('codex_owner_required');
  const response=await gatewayFetch('/v1/evaluate',{method:'POST',body:JSON.stringify(input)});
  if(!response.ok)throw new Error(response.status===429?'codex_gateway_busy':'codex_gateway_failed');
  return response.json() as Promise<{score:number;verdict:string;summary:string;hitPoints:string[];missedPoints:string[];suggestion:string;model?:string}>;
}
