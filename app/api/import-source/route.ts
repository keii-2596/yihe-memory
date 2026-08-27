const MAX_SOURCE_BYTES=2_000_000;

export async function POST(request:Request){
  let body:{url?:string};try{body=await request.json() as typeof body;}catch{return Response.json({error:'invalid_json'},{status:400});}
  let url:URL;try{url=new URL(body.url||'');}catch{return Response.json({error:'请输入完整网页地址'},{status:400});}
  if(url.protocol!=='https:'||isPrivateHost(url.hostname))return Response.json({error:'仅支持公开 HTTPS 网页'},{status:400});
  try{
    const response=await fetch(url,{redirect:'error',headers:{'User-Agent':'YiheMemoryImporter/1.0'}});
    if(!response.ok)return Response.json({error:`网页读取失败（${response.status}）`},{status:422});
    const type=response.headers.get('content-type')||'';const length=Number(response.headers.get('content-length')||0);
    if(!type.includes('text/html')&&!type.includes('text/plain'))return Response.json({error:'该地址不是可读取的网页正文'},{status:415});
    if(length>MAX_SOURCE_BYTES)return Response.json({error:'网页内容过大'},{status:413});
    const html=(await response.text()).slice(0,MAX_SOURCE_BYTES);
    const title=decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||url.hostname).trim();
    const text=decodeEntities(html.replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<\/(p|div|article|section|h[1-6]|li|tr)>/gi,'\n').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n')).trim().slice(0,60_000);
    if(text.length<20)return Response.json({error:'没有提取到足够正文'},{status:422});
    return Response.json({title,text});
  }catch{return Response.json({error:'网页无法访问，可能需要登录或禁止抓取'},{status:422});}
}

function isPrivateHost(host:string){
  const value=host.toLowerCase().replace(/^\[|\]$/g,'');
  if(value==='localhost'||value.endsWith('.localhost')||value.endsWith('.local'))return true;
  if(value==='::1'||value.startsWith('fc')||value.startsWith('fd')||value.startsWith('fe80:'))return true;
  const parts=value.split('.').map(Number);if(parts.length!==4||parts.some(Number.isNaN))return false;
  return parts[0]===10||parts[0]===127||parts[0]===0||parts[0]===169&&parts[1]===254||parts[0]===172&&parts[1]>=16&&parts[1]<=31||parts[0]===192&&parts[1]===168;
}
function decodeEntities(value:string){return value.replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)));}
