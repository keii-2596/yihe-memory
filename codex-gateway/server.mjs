import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';

const host=process.env.YIHE_CODEX_HOST||'127.0.0.1';
const port=Number(process.env.YIHE_CODEX_PORT||4317);
const secret=String(process.env.YIHE_CODEX_GATEWAY_TOKEN||'');
const codexBin=process.env.YIHE_CODEX_BIN||'codex';
const model=String(process.env.YIHE_CODEX_MODEL||'');
let busy=false;

if(secret.length<24){console.error('YIHE_CODEX_GATEWAY_TOKEN 至少需要 24 个字符。');process.exit(1);}

function authorized(request){
  const supplied=String(request.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const left=Buffer.from(supplied);const right=Buffer.from(secret);
  return left.length===right.length&&timingSafeEqual(left,right);
}

function json(response,status,body){response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});response.end(JSON.stringify(body));}

function readBody(request){return new Promise((resolve,reject)=>{let body='';request.setEncoding('utf8');request.on('data',chunk=>{body+=chunk;if(Buffer.byteLength(body)>64_000){reject(new Error('too_large'));request.destroy();}});request.on('end',()=>resolve(body));request.on('error',reject);});}

function runCodex(args,input,timeoutMs){
  return new Promise((resolve,reject)=>{
    const child=spawn(codexBin,args,{cwd:process.cwd(),env:process.env,stdio:['pipe','pipe','pipe']});let stdout='';let stderr='';
    const timer=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('timeout'));},timeoutMs);
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{clearTimeout(timer);if(code===0)resolve({stdout,stderr});else reject(new Error(stderr||`codex exited ${code}`));});
    if(input)child.stdin.end(input);else child.stdin.end();
  });
}

function parseJson(text){
  const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const start=cleaned.indexOf('{');const end=cleaned.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('invalid_json');
  return JSON.parse(cleaned.slice(start,end+1));
}

function validEvaluation(value){
  return value&&Number.isFinite(Number(value.score))&&typeof value.verdict==='string'&&typeof value.summary==='string'&&Array.isArray(value.hitPoints)&&Array.isArray(value.missedPoints)&&typeof value.suggestion==='string';
}

async function status(){
  try{const result=await runCodex(['login','status'],'',8000);const line=result.stdout.trim()||result.stderr.trim();return{connected:/logged in/i.test(line),account:line.replace(/^Logged in using\s*/i,''),model:model||'Codex 默认模型'};}catch(error){return{connected:false,message:error instanceof Error?error.message:'Codex 未登录'};}
}

async function evaluate(input){
  const question=String(input.question||'').slice(0,8000);const answer=String(input.answer||'').slice(0,16000);const reference=String(input.reference||'').slice(0,16000);
  const keyPoints=Array.isArray(input.keyPoints)?input.keyPoints.map(String).slice(0,30):[];const custom=String(input.prompt||'').slice(0,12000);
  if(!question||!answer||!keyPoints.length)throw new Error('invalid_request');
  const instructions=`${custom||'你是一名严格但鼓励式的计算机面试教练。评价答案时关注概念覆盖、逻辑准确和表达清晰，不要求逐字匹配参考答案。'}\n\n请评价下面的面试回答。只输出一个 JSON 对象，不要 Markdown，不要调用工具。字段必须为：score（0-100 数字）、verdict（短句）、summary（1-2 句）、hitPoints（字符串数组）、missedPoints（字符串数组）、suggestion（一句可执行建议）。\n\n${JSON.stringify({question,answer,keyPoints,reference})}`;
  const args=['exec','--ephemeral','--skip-git-repo-check','--ignore-rules','--ignore-user-config','--sandbox','read-only','--ask-for-approval','never','--color','never'];
  if(model)args.push('--model',model);args.push('-');
  const result=await runCodex(args,instructions,85_000);const value=parseJson(result.stdout);
  if(!validEvaluation(value))throw new Error('invalid_evaluation');
  return{score:Math.max(0,Math.min(100,Math.round(Number(value.score)))),verdict:String(value.verdict),summary:String(value.summary),hitPoints:value.hitPoints.map(String),missedPoints:value.missedPoints.map(String),suggestion:String(value.suggestion),model:model||'codex-account'};
}

const server=createServer(async(request,response)=>{
  if(!authorized(request))return json(response,401,{error:'unauthorized'});
  if(request.method==='GET'&&request.url==='/v1/status')return json(response,200,await status());
  if(request.method==='POST'&&request.url==='/v1/evaluate'){
    if(busy)return json(response,429,{error:'busy'});busy=true;
    try{const input=JSON.parse(await readBody(request));return json(response,200,await evaluate(input));}
    catch(error){return json(response,502,{error:error instanceof Error?error.message:'evaluation_failed'});}finally{busy=false;}
  }
  return json(response,404,{error:'not_found'});
});

server.listen(port,host,()=>console.log(`忆核 Codex 私人网关已启动：http://${host}:${port}`));
