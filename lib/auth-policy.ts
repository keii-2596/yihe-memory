export function safeAuthUrl(value:string|undefined) {
  if (!value) return undefined;
  const candidate=value.trim();
  if (/^\/(?!\/)/.test(candidate) && !candidate.includes('\\') && !/[\u0000-\u001f\u007f]/.test(candidate)) return candidate;
  try {
    const url=new URL(candidate);
    return url.protocol==='https:' && Boolean(url.hostname) && !url.username && !url.password ? url.toString() : undefined;
  } catch { return undefined; }
}

export function safeEqual(left:string,right:string) {
  if (left.length!==right.length) return false;
  let result=0;
  for (let index=0;index<left.length;index++) result|=left.charCodeAt(index)^right.charCodeAt(index);
  return result===0;
}
