const PRIMARY_TEXT_KEYS=['text','point','content','summary','title','name','strength','weakness','suggestion','description','message'] as const;
const SUPPORTING_TEXT_KEYS=['evidence','reason','detail','example'] as const;

export function aiText(value:unknown,fallback='',limit=4000):string{
  if(typeof value==='string')return value.trim().slice(0,limit);
  if(typeof value==='number'||typeof value==='boolean')return String(value).slice(0,limit);
  if(Array.isArray(value))return value.map(item=>aiText(item,'',limit)).filter(Boolean).join('；').slice(0,limit);
  if(value&&typeof value==='object'){
    const record=value as Record<string,unknown>;
    const primary=PRIMARY_TEXT_KEYS.map(key=>aiText(record[key],'',limit)).find(Boolean)||'';
    const supporting=SUPPORTING_TEXT_KEYS.map(key=>aiText(record[key],'',limit)).find(Boolean)||'';
    if(primary&&supporting&&primary!==supporting)return `${primary}：${supporting}`.slice(0,limit);
    return (primary||supporting||fallback).slice(0,limit);
  }
  return fallback.slice(0,limit);
}

export function aiStringList(value:unknown,limit=8,itemLimit=500):string[]{
  const values=Array.isArray(value)?value:value==null?[]:[value];
  return [...new Set(values.map(item=>aiText(item,'',itemLimit)).filter(Boolean))].slice(0,limit);
}
