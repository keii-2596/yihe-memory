'use client';

import { useEffect, useState } from 'react';

export function AiProgress({title,stages,note}:{title:string;stages:string[];note?:string}){
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{const started=Date.now();const timer=window.setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return()=>window.clearInterval(timer);},[]);
  const active=Math.min(stages.length-1,Math.floor(elapsed/8));const time=elapsed<60?`${elapsed} 秒`:`${Math.floor(elapsed/60)} 分 ${elapsed%60} 秒`;
  return <div className="ai-progress-box" role="status" aria-live="polite" aria-label={`${title}，已等待 ${time}`}><div className="ai-progress-head"><span className="ai-progress-spinner" aria-hidden="true"/><span><b>{title}</b><small>已等待 {time}</small></span><em>处理中</em></div><div className="ai-progress-track" aria-hidden="true"><i/></div><ol>{stages.map((stage,index)=><li key={stage} className={index<active?'done':index===active?'active':''}><i>{index<active?'✓':index+1}</i><span>{stage}</span></li>)}</ol><p>{note||(elapsed>=180?'长文字稿可能需要几分钟，任务仍在运行；完成后会自动显示结果。':elapsed>=45?'内容较多时会需要更久，完成后会自动显示结果，请保持页面打开。':'正在等待 AI 返回结果，完成后会自动更新。')}</p></div>;
}
