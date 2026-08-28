export type PersonalApi={endpoint?:string;apiKey?:string;model?:string};
export type LlmProvider={endpoint:string;apiKey:string;model:string;personal:boolean};

const endpointHosts=new Set([
  'api.openai.com','api.deepseek.com','api.moonshot.cn','open.bigmodel.cn','dashscope.aliyuncs.com',
  ...(process.env.AI_ALLOWED_ENDPOINT_HOSTS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean),
]);

export function resolveProvider(personalApi?:PersonalApi,requestedModel?:string):LlmProvider|null{
  if(personalApi){
    const endpoint=String(personalApi.endpoint||'').trim();const apiKey=String(personalApi.apiKey||'').trim();const model=String(personalApi.model||'').trim();
    if(!endpoint||!apiKey||!model)throw new Error('请完整填写接口地址、API Key 和模型');
    if(endpoint.length>500||apiKey.length>2048||model.length>120||!/^[\w./:-]+$/.test(model))throw new Error('个人 API 配置格式不正确');
    let url:URL;try{url=new URL(endpoint);}catch{throw new Error('接口地址不是有效 URL');}
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!endpointHosts.has(url.hostname.toLowerCase())||(url.port&&url.port!=='443'))throw new Error('该接口地址未被允许，请使用受支持的 HTTPS 服务商');
    return{endpoint:url.toString(),apiKey,model,personal:true};
  }
  const endpoint=process.env.AI_EVALUATION_ENDPOINT;const apiKey=process.env.AI_EVALUATION_API_KEY;
  if(!endpoint||!apiKey)return null;
  return{endpoint,apiKey,model:String(requestedModel||process.env.AI_EVALUATION_MODEL||'gpt-4.1-mini'),personal:false};
}

export function fillPrompt(template:string|undefined,variables:Record<string,string|number|string[]>){
  const safe=String(template||'').slice(0,12000);
  return safe.replace(/\{([a-zA-Z]+)\}/g,(match,key)=>key in variables?String(Array.isArray(variables[key])?(variables[key] as string[]).join('；'):variables[key]):match);
}

export async function chat(provider:LlmProvider,messages:{role:'system'|'user';content:string}[],json=false,temperature=.25){
  return fetch(provider.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${provider.apiKey}`},body:JSON.stringify({model:provider.model,temperature,...(json?{response_format:{type:'json_object'}}:{}),messages})});
}
