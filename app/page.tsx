'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_QUESTIONS, Progress, Question, Rating, ReviewRecord, RATING_LABELS,
  createId, dueQuestions, localDateKey, relativeReviewTime, reviewStreak, safeParse, scheduleReview,
} from '../lib/model';

type View = 'study' | 'library' | 'stats' | 'settings';
type Evaluation = { score:number; verdict:string; summary:string; hitPoints:string[]; missedPoints:string[]; suggestion:string; source?:'ai'|'local' };
type Draft = Omit<Question, 'keyPoints'> & { keyPoints:string };

const navItems: { id:View; label:string; icon:string }[] = [
  { id:'study', label:'今日复习', icon:'◎' }, { id:'library', label:'知识题库', icon:'▦' },
  { id:'stats', label:'学习数据', icon:'↗' }, { id:'settings', label:'AI 与数据', icon:'◇' },
];

const emptyDraft = (): Draft => ({ id:'', category:'数据库', title:'', hint:'', keyPoints:'', reference:'', difficulty:1, strength:30 });

export default function Home() {
  const [view, setView] = useState<View>('study');
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [progress, setProgress] = useState<Progress>({});
  const [history, setHistory] = useState<ReviewRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [manualReview, setManualReview] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('全部');
  const [toast, setToast] = useState('');
  const [showReference, setShowReference] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [aiMode, setAiMode] = useState<'loading'|'ai'|'local'>('loading');

  useEffect(() => {
    const savedQuestions = safeParse<Question[]>(localStorage.getItem('yihe-questions'), DEFAULT_QUESTIONS);
    const savedProgress = safeParse<Progress>(localStorage.getItem('yihe-progress'), {});
    const savedHistory = safeParse<ReviewRecord[]>(localStorage.getItem('yihe-history'), []);
    const timer = window.setTimeout(() => {
      setQuestions(savedQuestions.length ? savedQuestions : DEFAULT_QUESTIONS);
      setProgress(savedProgress); setHistory(savedHistory); setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem('yihe-questions', JSON.stringify(questions)); }, [questions, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('yihe-progress', JSON.stringify(progress)); }, [progress, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('yihe-history', JSON.stringify(history)); }, [history, hydrated]);
  useEffect(() => { fetch('/api/evaluate').then(r => r.json()).then((data:{ mode?:string }) => setAiMode(data.mode === 'ai' ? 'ai' : 'local')).catch(() => setAiMode('local')); }, []);

  const due = useMemo(() => dueQuestions(questions, progress), [questions, progress]);
  const question = questions.find(item => item.id === currentId) ?? (!sessionDone ? due[0] : null) ?? null;

  const categories = useMemo(() => ['全部', ...Array.from(new Set(questions.map(q => q.category)))], [questions]);
  const filteredQuestions = questions.filter(q => (filter === '全部' || q.category === filter) && `${q.title}${q.hint}${q.keyPoints.join('')}`.toLowerCase().includes(search.toLowerCase()));
  const todayKey = hydrated ? localDateKey(new Date()) : '';
  const todayHistory = history.filter(item => localDateKey(new Date(item.reviewedAt)) === todayKey);
  const sessionTotal = due.length + todayHistory.length;
  const activeStrength = question ? (progress[question.id]?.strength ?? question.strength) : 0;
  const strengthValues = questions.map(q => progress[q.id]?.strength ?? q.strength);
  const memoryHealth = strengthValues.length ? Math.round(strengthValues.reduce((a,b) => a+b,0) / strengthValues.length) : 0;
  const streak = reviewStreak(history);
  const dateLabel = hydrated ? new Intl.DateTimeFormat('zh-CN',{ month:'short', day:'numeric', weekday:'short' }).format(new Date()) : '今天';
  const upcoming = questions.map(q => ({ q, p:progress[q.id] })).filter(item => item.p && new Date(item.p.nextReview) > new Date()).sort((a,b) => a.p.nextReview.localeCompare(b.p.nextReview)).slice(0,3);
  const avgScore = history.length ? Math.round(history.reduce((sum,item) => sum + item.score,0) / history.length) : 0;
  const mastered = questions.filter(q => (progress[q.id]?.strength ?? q.strength) >= 70).length;
  const chart = Array.from({ length:14 }, (_,index) => { const date = new Date(); date.setDate(date.getDate() - (13-index)); const key = localDateKey(date); return { key, label:index % 3 === 0 ? `${date.getMonth()+1}/${date.getDate()}`:'', value:history.filter(item => localDateKey(new Date(item.reviewedAt)) === key).length }; });
  const maxChart = Math.max(1, ...chart.map(item => item.value));
  const categoryMastery = categories.filter(c => c !== '全部').map(category => { const items = questions.filter(q => q.category === category); return [category, Math.round(items.reduce((sum,q) => sum + (progress[q.id]?.strength ?? q.strength),0) / items.length)] as const; }).sort((a,b) => b[1]-a[1]);
  const weakQuestions = [...questions].sort((a,b) => (progress[a.id]?.strength ?? a.strength) - (progress[b.id]?.strength ?? b.strength)).slice(0,3);
  const weekDays = Array.from({length:7},(_,index) => { const date = new Date(); date.setDate(date.getDate() - (6-index)); const key = localDateKey(date); return { label:['日','一','二','三','四','五','六'][date.getDay()], done:history.some(item => localDateKey(new Date(item.reviewedAt)) === key) }; });

  function notify(message:string) { setToast(message); window.setTimeout(() => setToast(''), 2600); }
  function resetAnswerState() { setAnswer(''); setEvaluation(null); setShowReference(false); }

  async function submitAnswer() {
    if (!question || !answer.trim() || loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/evaluate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ question:question.title, answer, keyPoints:question.keyPoints, reference:question.reference }) });
      if (!response.ok) throw new Error('evaluation_failed');
      setEvaluation(await response.json() as Evaluation);
    } catch {
      setEvaluation({ score:60, verdict:'已记录回答', summary:'评估服务暂时不可用，请对照参考答案完成自评。', hitPoints:[], missedPoints:question.keyPoints, suggestion:'先分点列出核心概念，再为每一点补上含义或例子。', source:'local' });
    } finally { setLoading(false); }
  }

  function rate(rating:Rating) {
    if (!question || !evaluation) return;
    const nextProgress = scheduleReview(question, progress[question.id], rating, evaluation.score);
    const nextRecord:ReviewRecord = { id:createId('review'), questionId:question.id, category:question.category, score:evaluation.score, rating, reviewedAt:new Date().toISOString() };
    const next = { ...progress, [question.id]:nextProgress };
    setProgress(next); setHistory(items => [...items, nextRecord]);
    notify(`已安排 ${relativeReviewTime(nextProgress.nextReview)}复习`);
    resetAnswerState(); setManualReview(false);
    const remaining = dueQuestions(questions, next).find(item => item.id !== question.id);
    if (remaining) setCurrentId(remaining.id); else { setCurrentId(null); setSessionDone(true); }
  }

  function startVoice() {
    type Recognition = { lang:string; interimResults:boolean; start:()=>void; onresult:(event:{ results:ArrayLike<{ 0:{ transcript:string } }> })=>void; onend:()=>void; onerror:()=>void };
    type RecognitionWindow = Window & { SpeechRecognition?:new()=>Recognition; webkitSpeechRecognition?:new()=>Recognition };
    const RecognitionClass = (window as RecognitionWindow).SpeechRecognition || (window as RecognitionWindow).webkitSpeechRecognition;
    if (!RecognitionClass) { notify('当前浏览器暂不支持语音输入'); return; }
    const recognition = new RecognitionClass(); recognition.lang='zh-CN'; recognition.interimResults=false;
    recognition.onresult = event => setAnswer(old => `${old}${old ? ' ' : ''}${event.results[0][0].transcript}`);
    recognition.onend = () => setListening(false); recognition.onerror = () => { setListening(false); notify('没有识别到语音，请重试'); };
    setListening(true); recognition.start();
  }

  function jumpToQuestion(id:string) { setCurrentId(id); setManualReview(true); setSessionDone(false); resetAnswerState(); setView('study'); }
  function startDueSession() { setSessionDone(false); setManualReview(false); setCurrentId(due[0]?.id ?? null); resetAnswerState(); }

  function openNewQuestion() { setDraft(emptyDraft()); setEditorOpen(true); }
  function openEditQuestion(item:Question) { setDraft({ ...item, keyPoints:item.keyPoints.join('\n') }); setEditorOpen(true); }
  function saveQuestion() {
    const keyPoints = draft.keyPoints.split('\n').map(item => item.trim()).filter(Boolean);
    if (!draft.title.trim() || !draft.reference.trim() || !keyPoints.length || !draft.category.trim()) { notify('请填写题目、分类、评分要点和参考答案'); return; }
    const item:Question = { ...draft, id:draft.id || createId(), category:draft.category.trim(), title:draft.title.trim(), hint:draft.hint.trim(), keyPoints, reference:draft.reference.trim() };
    setQuestions(items => draft.id ? items.map(old => old.id === draft.id ? item : old) : [item,...items]);
    setEditorOpen(false); notify(draft.id ? '知识点已更新' : '知识点已添加到今日复习');
  }
  function deleteQuestion(item:Question) {
    if (!window.confirm(`确定删除“${item.title}”吗？可在数据设置中恢复默认题库。`)) return;
    setQuestions(items => items.filter(q => q.id !== item.id));
    setProgress(old => { const next={...old}; delete next[item.id]; return next; });
    setHistory(items => items.filter(record => record.questionId !== item.id));
    if (currentId === item.id) setCurrentId(null); notify('知识点已删除');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ version:1, exportedAt:new Date().toISOString(), questions, progress, history },null,2)],{ type:'application/json' });
    const url = URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`忆核学习数据-${localDateKey(new Date())}.json`; link.click(); URL.revokeObjectURL(url); notify('学习数据已导出');
  }
  async function importData(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]; event.target.value=''; if (!file) return;
    try {
      const data=JSON.parse(await file.text()) as { questions?:Question[]; progress?:Progress; history?:ReviewRecord[] };
      if (!Array.isArray(data.questions) || !data.questions.every(q => q.id && q.title && Array.isArray(q.keyPoints))) throw new Error('invalid');
      setQuestions(data.questions); setProgress(data.progress ?? {}); setHistory(Array.isArray(data.history) ? data.history : []); setCurrentId(null); setSessionDone(false); notify(`已导入 ${data.questions.length} 个知识点`);
    } catch { notify('导入失败：请选择由忆核导出的 JSON 文件'); }
  }
  function resetAllData() {
    if (!window.confirm('确定恢复默认题库并清空全部学习记录吗？此操作不可撤销，建议先导出备份。')) return;
    setQuestions(DEFAULT_QUESTIONS); setProgress({}); setHistory([]); setCurrentId(null); setSessionDone(false); notify('已恢复默认题库');
  }

  return <main className="app-shell">
    {toast && <div className="toast" role="status">✓ {toast}</div>}
    <aside className="sidebar">
      <button className="brand" onClick={() => setView('study')}><span className="brand-mark">忆</span><span>忆核</span></button>
      <nav className="nav-list" aria-label="主导航">{navItems.map(item => <button key={item.id} onClick={() => setView(item.id)} className={`nav-item ${view===item.id?'active':''}`}><span>{item.icon}</span>{item.label}{item.id==='study' && <b>{due.length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><p>近 7 天</p><strong>学习了 {weekDays.filter(day => day.done).length} 天</strong><div className="week-dots">{weekDays.map((day,index) => <i key={index} className={day.done?'done':''}>{day.label}</i>)}</div></div>
    </aside>

    <section className="workspace">
      <header className="topbar"><div><span className="eyebrow">{dateLabel}</span><h1>{view==='study'?'用自己的语言，讲清今天的知识。':view==='library'?'把知识拆小，才能记得更久。':view==='stats'?'看见积累，也看见薄弱处。':'让 AI 更懂你的答案，也掌控你的数据。'}</h1></div><div className="streak"><span>↗</span><div><b>{streak} 天</b><small>连续学习</small></div></div></header>

      {view==='study' && (question ? <div className="content-grid">
        <section className="study-area">
          <div className="session-head"><div><span className="section-label">TODAY&apos;S SESSION</span><h2>{manualReview?'自由复习':'今日复习'}</h2></div><div className="session-progress"><b>{String(Math.max(1,todayHistory.length+1)).padStart(2,'0')}</b><span>/ {Math.max(1,sessionTotal)}</span></div></div>
          <div className="progress-track"><i style={{ width:`${Math.min(100, Math.max(4, todayHistory.length / Math.max(1,sessionTotal) * 100))}%` }} /></div>
          <article className="question-card">
            <div className="question-meta"><span className="topic-chip">{question.category}</span><span className="memory-chip"><i /> 记忆强度 {activeStrength}%</span></div>
            <p className="question-kicker">KNOWLEDGE RECALL · {'◆'.repeat(question.difficulty)}{'◇'.repeat(3-question.difficulty)}</p>
            <h3>{question.title}</h3><p className="hint">{question.hint || '请尽量完整地讲出概念、原理和适用场景。'}</p>
            {!evaluation ? <div className="answer-box"><textarea value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if ((event.metaKey||event.ctrlKey) && event.key==='Enter') submitAnswer(); }} placeholder="用自己的话写下答案，不必追求标准表述……" aria-label="输入你的答案" /><div className="answer-actions"><button className={`voice-button ${listening?'listening':''}`} onClick={startVoice}><span className="record-dot">●</span><span>{listening?'正在聆听…':'语音回答'}</span></button><small>{answer.length} 字 · ⌘ Enter 提交</small><button className="submit-button" onClick={submitAnswer} disabled={!answer.trim()||loading}>{loading?'AI 正在评估…':'提交评估'} <span>→</span></button></div></div> :
              <div className="evaluation-panel"><div className="evaluation-head"><div className="score-ring" style={{ '--score':`${evaluation.score*3.6}deg` } as React.CSSProperties}><span><strong>{evaluation.score}</strong><small>/100</small></span></div><div><span className="section-label">{evaluation.source==='ai'?'AI FEEDBACK':'LOCAL FEEDBACK'}</span><h4>{evaluation.verdict}</h4><p>{evaluation.summary}</p></div></div><div className="point-columns"><div><b>✓ 已覆盖</b>{evaluation.hitPoints.length?evaluation.hitPoints.map(point=><span key={point}>{point}</span>):<span>继续补充核心概念</span>}</div><div><b>＋ 可补充</b>{evaluation.missedPoints.length?evaluation.missedPoints.slice(0,4).map(point=><span key={point}>{point}</span>):<span>核心要点已经覆盖完整</span>}</div></div><div className="ai-tip"><b>表达建议</b><p>{evaluation.suggestion}</p></div><button className="reference-toggle" onClick={() => setShowReference(value=>!value)}>{showReference?'收起参考答案':'查看参考答案'} <span>⌄</span></button>{showReference&&<p className="reference-answer">{question.reference}</p>}<div className="rating-row"><p>这道题你掌握得怎么样？<small>你的选择决定下次复习时间</small></p>{(['again','hard','good','easy'] as Rating[]).map(rating => { const preview=scheduleReview(question,progress[question.id],rating,evaluation.score); return <button key={rating} className={rating==='good'?'recommended':''} onClick={() => rate(rating)}><b>{RATING_LABELS[rating].title}</b><span>{relativeReviewTime(preview.nextReview)}</span></button>; })}</div></div>}
          </article>
        </section>
        <aside className="insights"><div className="memory-card"><div className="orbit"><span>{memoryHealth}<small>%</small></span></div><div><span className="section-label">MEMORY HEALTH</span><h3>{memoryHealth>=70?'记忆状态很好':memoryHealth>=45?'记忆状态良好':'正处于积累期'}</h3><p>{mastered} 个知识点已稳定掌握</p></div></div><div className="due-card"><div className="card-title"><span className="section-label">COMING UP</span><button onClick={() => setView('library')}>查看全部</button></div><h3>接下来复习</h3>{upcoming.length?<ul>{upcoming.map((item,index)=><li key={item.q.id}><i className={`dot ${['purple','green','orange'][index]}`} /><button onClick={() => jumpToQuestion(item.q.id)}><b>{item.q.title.slice(0,14)}…</b><span>{item.q.category} · {relativeReviewTime(item.p.nextReview)}</span></button><em>{item.p.strength}%</em></li>)}</ul>:<p className="empty-upcoming">完成一次复习后，这里会显示后续安排。</p>}</div><div className="quote-card"><span>“</span><p>真正的掌握，始于你能用自己的语言把它讲清楚。</p></div></aside>
      </div> : <section className="session-complete"><div className="complete-orbit">✓</div><span className="section-label">SESSION COMPLETE</span><h2>{questions.length?'今天的到期任务已完成':'题库还是空的'}</h2><p>{questions.length?'新的复习会在记忆即将衰退时自动出现。你也可以从题库中自由复习任意知识点。':'添加第一个知识点，开始建立你的长期记忆系统。'}</p><div><button className="primary-action" onClick={() => { setView('library'); if (!questions.length) openNewQuestion(); }}>{questions.length?'浏览知识题库':'添加知识点'}</button>{due.length>0&&<button className="secondary-action" onClick={startDueSession}>继续到期复习</button>}</div></section>)}

      {view==='library' && <section className="library-view"><div className="page-heading"><div><span className="section-label">KNOWLEDGE BASE</span><h2>知识题库</h2><p>{questions.length} 个知识点，覆盖 {Math.max(0,categories.length-1)} 个方向 · 数据保存在当前设备</p></div><button className="primary-action" onClick={openNewQuestion}>＋ 添加知识点</button></div><div className="library-toolbar"><label>⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索题目、提示或评分要点" /></label><div className="filter-tabs">{categories.map(category=><button key={category} className={filter===category?'active':''} onClick={() => setFilter(category)}>{category}</button>)}</div></div><div className="question-table"><div className="table-head"><span>知识点</span><span>难度</span><span>记忆强度</span><span>下次复习</span><span>操作</span></div>{filteredQuestions.length?filteredQuestions.map((q,index)=>{ const itemProgress=progress[q.id]; const strength=itemProgress?.strength??q.strength; return <div className="table-row" key={q.id}><div><i className={`category-mark c${index%4}`}>{q.category.slice(0,1)}</i><span><b>{q.title}</b><small>{q.category} · 已复习 {itemProgress?.reviews??0} 次</small></span></div><span className="difficulty">{'●'.repeat(q.difficulty)}{'○'.repeat(3-q.difficulty)}</span><div className="strength-bar"><i><em style={{width:`${strength}%`}} /></i><b>{strength}%</b></div><span className="next-date">{itemProgress?relativeReviewTime(itemProgress.nextReview):'现在'}</span><div className="table-actions"><button onClick={() => jumpToQuestion(q.id)}>复习</button><button onClick={() => openEditQuestion(q)}>编辑</button><button className="danger" onClick={() => deleteQuestion(q)}>删除</button></div></div>}):<div className="table-empty">没有找到匹配的知识点</div>}</div></section>}

      {view==='stats' && <section className="stats-view"><div className="page-heading"><div><span className="section-label">LEARNING INSIGHTS</span><h2>学习数据</h2><p>数据来自你在当前设备上的真实复习记录</p></div><span className="status-pill">近 14 天</span></div><div className="metric-grid"><article><span>累计复习</span><strong>{history.length}<small> 次</small></strong><em>今日 {todayHistory.length} 次</em></article><article><span>平均得分</span><strong>{avgScore}<small> 分</small></strong><em>{history.length?'持续输出更重要':'等待第一次回答'}</em></article><article><span>稳定掌握</span><strong>{mastered}<small> / {questions.length}</small></strong><em>{questions.length?Math.round(mastered/questions.length*100):0}%</em></article><article><span>连续学习</span><strong>{streak}<small> 天</small></strong><em>约 {Math.round(history.length*3/60*10)/10} 小时</em></article></div><div className="stats-grid"><article className="chart-card"><div className="card-title"><div><span className="section-label">REVIEW ACTIVITY</span><h3>复习活动</h3></div><span className="legend"><i /> 复习次数</span></div><div className="bar-chart">{chart.map(item=><i key={item.key} className={item.value?'has-value':''} style={{height:`${Math.max(3,item.value/maxChart*100)}%`}} title={`${item.key}：${item.value} 次`}><b>{item.label}</b></i>)}</div></article><article className="mastery-card"><span className="section-label">CATEGORY MASTERY</span><h3>分类掌握度</h3>{categoryMastery.slice(0,6).map(([name,value])=><div className="mastery-row" key={name}><span>{name}</span><i><em style={{width:`${value}%`}} /></i><b>{value}%</b></div>)}</article></div><div className="weak-card"><div><span className="section-label">NEEDS ATTENTION</span><h3>建议优先巩固</h3></div>{weakQuestions.map((q,index)=><button key={q.id} onClick={() => jumpToQuestion(q.id)}><i>{index+1}</i><span><b>{q.title}</b><small>{q.category} · 记忆强度 {progress[q.id]?.strength??q.strength}%</small></span><em>开始复习 →</em></button>)}</div></section>}

      {view==='settings' && <section className="settings-view"><div className="page-heading"><div><span className="section-label">AI & DATA</span><h2>AI 与数据</h2><p>判题接口安全运行在服务端；学习资料保存在当前浏览器</p></div><span className={`status-pill ${aiMode==='ai'?'online':''}`}>● {aiMode==='loading'?'检测中':aiMode==='ai'?'AI 已连接':'本地评估'}</span></div><div className="settings-grid"><article><span className="step-number">01</span><h3>当前判题模式</h3><p>{aiMode==='ai'?'外部 AI 已配置，会理解不同措辞和回答顺序，并返回结构化反馈。':'无需配置即可使用。本地评估会检查核心概念覆盖度，回答不会发送到外部。'}</p><div className="mode-box"><i>◇</i><span><b>{aiMode==='ai'?'AI 智能评估':'本地评估模式'}</b><small>{aiMode==='ai'?'适合正式学习':'适合离线使用和演示'}</small></span><em>当前</em></div></article><article><span className="step-number">02</span><h3>接入你的 AI</h3><p>部署时设置三个服务端变量，即可使用任意兼容 OpenAI Chat Completions 的模型服务。</p><div className="code-box"><span>AI_EVALUATION_ENDPOINT</span><span>AI_EVALUATION_API_KEY</span><span>AI_EVALUATION_MODEL</span></div><small>密钥只存在服务端，不会出现在浏览器中。</small></article><article><span className="step-number">03</span><h3>备份与迁移</h3><p>导出文件包含题库、复习进度和历史记录，可在另一台设备导入继续学习。</p><div className="data-actions"><button onClick={exportData}>↓ 导出数据</button><label>↑ 导入数据<input type="file" accept="application/json" onChange={importData} /></label><button className="danger" onClick={resetAllData}>恢复默认并清空</button></div></article></div><article className="principles-card"><div><span className="section-label">DESIGN PRINCIPLES</span><h3>判题不是寻找标准句子</h3></div><p>系统以“概念是否覆盖、逻辑是否正确、表达是否清楚”为评价维度。不同措辞、举例和回答顺序都能得到合理判断。</p><div><span><b>50%</b> 核心概念</span><span><b>30%</b> 逻辑准确</span><span><b>20%</b> 表达清晰</span></div></article></section>}
    </section>

    {editorOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget===event.target) setEditorOpen(false); }}><section className="question-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="editor-head"><div><span className="section-label">KNOWLEDGE EDITOR</span><h2 id="editor-title">{draft.id?'编辑知识点':'添加知识点'}</h2></div><button onClick={() => setEditorOpen(false)} aria-label="关闭">×</button></div><div className="editor-grid"><label>分类<input value={draft.category} onChange={e => setDraft(old=>({...old,category:e.target.value}))} placeholder="例如：数据库" /></label><label>难度<select value={draft.difficulty} onChange={e => setDraft(old=>({...old,difficulty:Number(e.target.value) as 1|2|3}))}><option value="1">基础</option><option value="2">进阶</option><option value="3">困难</option></select></label><label className="full">题目<textarea value={draft.title} onChange={e => setDraft(old=>({...old,title:e.target.value}))} placeholder="输入需要回忆的问题" /></label><label className="full">回答提示<input value={draft.hint} onChange={e => setDraft(old=>({...old,hint:e.target.value}))} placeholder="可选：引导回答的角度" /></label><label className="full">评分要点 <small>每行一个要点</small><textarea className="tall" value={draft.keyPoints} onChange={e => setDraft(old=>({...old,keyPoints:e.target.value}))} placeholder={'原子性：要么全部成功，要么全部失败\n一致性：事务前后保持合法状态'} /></label><label className="full">参考答案<textarea className="tall" value={draft.reference} onChange={e => setDraft(old=>({...old,reference:e.target.value}))} placeholder="给出一份完整但不要求逐字匹配的答案" /></label></div><div className="editor-actions"><button className="secondary-action" onClick={() => setEditorOpen(false)}>取消</button><button className="primary-action" onClick={saveQuestion}>保存知识点</button></div></section></div>}
  </main>;
}
