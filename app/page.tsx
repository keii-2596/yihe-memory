'use client';

import { useEffect, useMemo, useState } from 'react';

type View = 'study' | 'library' | 'stats' | 'settings';
type Rating = 'again' | 'hard' | 'good' | 'easy';

type Question = {
  id: string;
  category: string;
  title: string;
  hint: string;
  keyPoints: string[];
  reference: string;
  difficulty: 1 | 2 | 3;
  strength: number;
};

type Evaluation = {
  score: number;
  verdict: string;
  summary: string;
  hitPoints: string[];
  missedPoints: string[];
  suggestion: string;
  source?: 'ai' | 'local';
};

type Progress = Record<string, { strength: number; interval: number; nextReview: string; reviews: number }>;

const QUESTIONS: Question[] = [
  { id:'db-acid', category:'数据库', title:'请说一下数据库事务的四大特性（ACID），并简要解释它们各自的含义。', hint:'可以结合转账场景来回答，尽量说完整。', keyPoints:['原子性：事务中的操作要么全部成功，要么全部失败','一致性：事务前后数据必须保持合法的一致状态','隔离性：并发事务之间尽可能互不干扰','持久性：事务提交后的修改必须永久保存'], reference:'ACID 分别是原子性、一致性、隔离性、持久性。原子性保证事务不可分割；一致性保证数据从一个合法状态转换到另一个合法状态；隔离性控制并发事务影响；持久性保证已提交结果即使故障也不丢失。', difficulty:1, strength:42 },
  { id:'net-cache', category:'计算机网络', title:'HTTP 强缓存和协商缓存有什么区别？浏览器如何判断使用哪一种？', hint:'请提到 Cache-Control、ETag 或 Last-Modified。', keyPoints:['强缓存命中时不向服务器发请求','Cache-Control 或 Expires 控制强缓存','协商缓存会向服务器发起条件请求','ETag/If-None-Match 或 Last-Modified/If-Modified-Since','未修改时服务器返回 304'], reference:'强缓存由 Cache-Control/Expires 决定，命中后直接使用本地副本。过期后进入协商缓存，浏览器携带 ETag 或 Last-Modified 对应的条件请求头；资源未变化时服务器返回 304。', difficulty:2, strength:20 },
  { id:'os-process-thread', category:'操作系统', title:'进程和线程有什么区别？为什么线程切换通常更轻量？', hint:'从资源、地址空间和上下文切换三个角度回答。', keyPoints:['进程是资源分配的基本单位','线程是 CPU 调度的基本单位','同一进程内线程共享地址空间和多数资源','线程有独立栈和寄存器上下文','线程切换通常无需切换地址空间'], reference:'进程拥有独立地址空间与系统资源，线程是进程内的执行单元。同一进程的线程共享代码、数据和文件等，但各自拥有栈与寄存器上下文。线程切换通常不更换地址空间，因此开销更小。', difficulty:1, strength:48 },
  { id:'redis-types', category:'中间件', title:'Redis 常见的数据类型有哪些？各自适合什么场景？', hint:'至少说出 5 种基础类型及典型用途。', keyPoints:['String 适合缓存、计数器或分布式锁','Hash 适合存储对象字段','List 适合队列或时间线','Set 适合去重、交并集','Sorted Set 适合排行榜','Bitmap/HyperLogLog/Stream 等扩展类型'], reference:'String、Hash、List、Set、Sorted Set 是五种基础结构，分别适合缓存值、对象、队列、集合运算与排行榜；此外还有 Bitmap、HyperLogLog、Geo、Stream 等。', difficulty:1, strength:61 },
  { id:'java-jvm', category:'Java', title:'JVM 的运行时数据区包括哪些部分？哪些是线程私有的？', hint:'注意区分堆、方法区、虚拟机栈、程序计数器和本地方法栈。', keyPoints:['堆是线程共享的对象分配区域','方法区存储类元数据等且线程共享','虚拟机栈线程私有','程序计数器线程私有','本地方法栈线程私有'], reference:'堆和方法区是线程共享区域；程序计数器、Java 虚拟机栈、本地方法栈是线程私有区域。', difficulty:2, strength:35 },
  { id:'algo-quicksort', category:'算法', title:'快速排序的核心思想是什么？它的平均和最坏时间复杂度分别是多少？', hint:'说明 partition 的作用，以及什么时候退化。', keyPoints:['选择基准元素并进行分区','小于基准和大于基准的元素被放到两侧','递归处理两个子区间','平均时间复杂度 O(n log n)','极端不平衡时最坏 O(n²)'], reference:'快速排序通过选择 pivot 并 partition，将序列划分为左右子区间后递归排序。平均复杂度 O(n log n)，当分区持续极不平衡时退化为 O(n²)。', difficulty:1, strength:76 },
  { id:'spring-ioc', category:'Java', title:'Spring IoC 和 AOP 分别解决了什么问题？', hint:'请分别解释控制反转、依赖注入与横切关注点。', keyPoints:['IoC 将对象创建和依赖管理交给容器','依赖注入是 IoC 的常见实现方式','AOP 将横切逻辑从业务代码中分离','典型横切逻辑包括事务、日志或权限'], reference:'IoC 通过容器负责对象创建和依赖装配，降低组件耦合；AOP 将事务、日志、权限等横切关注点抽离，通过切面统一织入业务流程。', difficulty:1, strength:57 },
  { id:'mysql-index', category:'数据库', title:'为什么 MySQL 的 InnoDB 索引常用 B+ 树，而不是二叉树或哈希表？', hint:'从磁盘 I/O、范围查询和树高角度回答。', keyPoints:['B+ 树多路分支使树高更低','节点适配页存储以减少磁盘 I/O','叶子节点有序并通过链表连接','适合范围查询和排序','哈希索引不擅长范围查询'], reference:'B+ 树的高扇出让树高很低，节点按页组织可减少随机 I/O；数据集中在有序叶子节点并相连，因此点查、范围查询和排序都较高效。', difficulty:2, strength:29 },
  { id:'tcp-handshake', category:'计算机网络', title:'TCP 为什么建立连接需要三次握手，而断开连接通常需要四次挥手？', hint:'从双方收发能力确认和 TCP 全双工解释。', keyPoints:['三次握手确认双方发送和接收能力正常','防止失效的历史连接请求建立错误连接','TCP 是全双工连接','关闭时两个方向需要分别关闭','服务端 ACK 和 FIN 可能无法合并所以通常四次'], reference:'三次握手能让双方确认彼此的收发能力并同步序列号，也能避免历史连接请求造成误连接。TCP 是全双工的，两个方向需分别关闭，因此通常需要四次挥手。', difficulty:2, strength:67 },
  { id:'mq-idempotent', category:'系统设计', title:'消息队列如何保证消费端幂等？请给出至少两种实现方案。', hint:'考虑业务唯一键、去重表和状态机。', keyPoints:['为消息或业务操作设计唯一标识','消费前检查去重表或幂等记录','利用数据库唯一约束防止重复写入','状态机只允许合法的单向状态迁移','幂等设计通常需要结合业务语义'], reference:'常见方案包括：消息 ID 去重表、业务唯一键加数据库唯一约束、Redis SETNX、状态机约束等。关键是让重复执行不会产生额外副作用。', difficulty:3, strength:18 },
  { id:'react-render', category:'前端', title:'React 组件在什么情况下会重新渲染？如何避免不必要的渲染？', hint:'提到 state、props、context 以及 memo 化。', keyPoints:['组件 state 变化会触发重新渲染','父组件渲染通常会带动子组件渲染','订阅的 context 变化会触发重新渲染','React.memo 可跳过 props 未变的函数组件渲染','useMemo/useCallback 可稳定计算结果或引用'], reference:'state、父组件渲染导致的 props 流程、context 变化都会触发组件重新渲染。可通过合理拆分状态、React.memo、useMemo 和 useCallback 等减少无效工作，但应先定位性能问题。', difficulty:2, strength:53 },
  { id:'distributed-cap', category:'系统设计', title:'CAP 理论中的 C、A、P 分别是什么？为什么发生网络分区时只能在 C 和 A 之间取舍？', hint:'注意 CAP 中一致性的含义是线性一致性。', keyPoints:['C 表示一致性或线性一致性','A 表示每个请求都能得到非错误响应','P 表示系统能容忍网络分区','网络分区使节点无法可靠通信','分区时等待一致会牺牲可用性，继续响应则可能牺牲一致性'], reference:'CAP 指一致性、可用性和分区容错性。分布式系统必须面对网络分区；分区发生时，系统若拒绝或等待请求来保证一致性会失去可用性，若继续响应则可能返回不一致数据。', difficulty:2, strength:40 },
];

const navItems: { id: View; label: string; icon: string }[] = [
  { id:'study', label:'今日复习', icon:'◎' }, { id:'library', label:'知识题库', icon:'▦' },
  { id:'stats', label:'学习数据', icon:'↗' }, { id:'settings', label:'AI 设置', icon:'◇' },
];

function dateText(offset: number) {
  if (offset === 0) return '10 分钟后';
  if (offset === 1) return '明天';
  return `${offset} 天后`;
}

export default function Home() {
  const [view, setView] = useState<View>('study');
  const [answer, setAnswer] = useState('');
  const [current, setCurrent] = useState(0);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('全部');
  const [progress, setProgress] = useState<Progress>({});
  const [toast, setToast] = useState('');
  const [showReference, setShowReference] = useState(false);
  const question = QUESTIONS[current % QUESTIONS.length];

  useEffect(() => {
    const saved = localStorage.getItem('yihe-progress');
    if (saved) setProgress(JSON.parse(saved) as Progress);
  }, []);

  const categories = useMemo(() => ['全部', ...Array.from(new Set(QUESTIONS.map(q => q.category)))], []);
  const filteredQuestions = QUESTIONS.filter(q => (filter === '全部' || q.category === filter) && q.title.toLowerCase().includes(search.toLowerCase()));
  const activeStrength = progress[question.id]?.strength ?? question.strength;

  async function submitAnswer() {
    if (!answer.trim() || loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/evaluate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ question:question.title, answer, keyPoints:question.keyPoints, reference:question.reference }) });
      const result = await response.json() as Evaluation;
      setEvaluation(result);
    } catch {
      setEvaluation({ score:68, verdict:'已完成回忆', summary:'答案已经记录，但评估服务暂时不可用。你仍然可以对照要点进行自评。', hitPoints:[], missedPoints:question.keyPoints, suggestion:'稍后重试 AI 评估，或先查看参考答案。', source:'local' });
    } finally { setLoading(false); }
  }

  function rate(rating: Rating) {
    const config = { again:{ interval:0, delta:-12 }, hard:{ interval:1, delta:3 }, good:{ interval:3, delta:10 }, easy:{ interval:7, delta:18 } }[rating];
    const old = progress[question.id];
    const next = { ...progress, [question.id]: { strength:Math.max(5, Math.min(100, (old?.strength ?? question.strength) + config.delta)), interval:config.interval, nextReview:new Date(Date.now() + (config.interval || 0.007) * 86400000).toISOString(), reviews:(old?.reviews ?? 0) + 1 } };
    setProgress(next); localStorage.setItem('yihe-progress', JSON.stringify(next));
    setToast(`已安排 ${dateText(config.interval)}复习`);
    setTimeout(() => setToast(''), 2400);
    setCurrent(value => (value + 1) % QUESTIONS.length); setAnswer(''); setEvaluation(null); setShowReference(false);
  }

  function startVoice() {
    type Recognition = { lang:string; interimResults:boolean; start:()=>void; stop:()=>void; onresult:(event:{ results:ArrayLike<{ 0:{ transcript:string } }> })=>void; onend:()=>void; onerror:()=>void };
    type RecognitionWindow = Window & { SpeechRecognition?:new()=>Recognition; webkitSpeechRecognition?:new()=>Recognition };
    const SpeechRecognition = (window as RecognitionWindow).SpeechRecognition || (window as RecognitionWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) { setToast('当前浏览器暂不支持语音输入'); setTimeout(() => setToast(''), 2400); return; }
    const recognition = new SpeechRecognition(); recognition.lang = 'zh-CN'; recognition.interimResults = false;
    recognition.onresult = event => setAnswer(old => `${old}${old ? ' ' : ''}${event.results[0][0].transcript}`);
    recognition.onend = () => setListening(false); recognition.onerror = () => setListening(false);
    setListening(true); recognition.start();
  }

  function jumpToQuestion(index: number) { setCurrent(index); setAnswer(''); setEvaluation(null); setShowReference(false); setView('study'); }

  return (
    <main className="app-shell">
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <aside className="sidebar">
        <button className="brand" onClick={() => setView('study')}><span className="brand-mark">忆</span><span>忆核</span></button>
        <nav className="nav-list" aria-label="主导航">
          {navItems.map(item => <button key={item.id} onClick={() => setView(item.id)} className={`nav-item ${view === item.id ? 'active' : ''}`}><span>{item.icon}</span>{item.label}{item.id === 'study' && <b>{QUESTIONS.length}</b>}</button>)}
        </nav>
        <div className="sidebar-bottom"><p>本周目标</p><strong>已坚持 5 天</strong><div className="week-dots">{[1,2,3,4,5,6,7].map(day => <i key={day} className={day < 6 ? 'done' : ''}>{day}</i>)}</div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><span className="eyebrow">WED · AUG 26</span><h1>{view === 'study' ? '早上好，今天的大脑也要热身。' : view === 'library' ? '把知识拆小，才能记得更久。' : view === 'stats' ? '看见积累，也看见薄弱处。' : '让 AI 更懂你的答案。'}</h1></div><div className="streak"><span>↗</span><div><b>18 天</b><small>连续学习</small></div></div></header>

        {view === 'study' && <div className="content-grid">
          <section className="study-area">
            <div className="session-head"><div><span className="section-label">TODAY&apos;S SESSION</span><h2>今日复习</h2></div><div className="session-progress"><b>{String(current + 1).padStart(2,'0')}</b><span>/ {QUESTIONS.length}</span></div></div>
            <div className="progress-track"><i style={{ width:`${((current + 1) / QUESTIONS.length) * 100}%` }} /></div>
            <article className="question-card">
              <div className="question-meta"><span className="topic-chip">{question.category}</span><span className="memory-chip"><i /> 记忆强度 {activeStrength}%</span></div>
              <p className="question-kicker">QUESTION {String(current + 1).padStart(2,'0')} · {'◆'.repeat(question.difficulty)}{'◇'.repeat(3-question.difficulty)}</p>
              <h3>{question.title}</h3><p className="hint">{question.hint}</p>
              {!evaluation ? <div className="answer-box">
                <textarea value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitAnswer(); }} placeholder="用自己的话写下答案，不必追求标准表述……" aria-label="输入你的答案" />
                <div className="answer-actions"><button className={`voice-button ${listening ? 'listening' : ''}`} onClick={startVoice}><span className="record-dot">●</span><span>{listening ? '正在聆听…' : '语音回答'}</span></button><small>{answer.length} 字 · ⌘ Enter 提交</small><button className="submit-button" onClick={submitAnswer} disabled={!answer.trim() || loading}>{loading ? 'AI 正在评估…' : '提交给 AI 评估'} <span>→</span></button></div>
              </div> : <div className="evaluation-panel">
                <div className="evaluation-head"><div className="score-ring" style={{ '--score':`${evaluation.score * 3.6}deg` } as React.CSSProperties}><span><strong>{evaluation.score}</strong><small>/100</small></span></div><div><span className="section-label">AI FEEDBACK · {evaluation.source === 'ai' ? '智能评估' : '本地评估'}</span><h4>{evaluation.verdict}</h4><p>{evaluation.summary}</p></div></div>
                <div className="point-columns"><div><b>✓ 已覆盖</b>{evaluation.hitPoints.length ? evaluation.hitPoints.map(point => <span key={point}>{point}</span>) : <span>继续补充核心概念</span>}</div><div><b>＋ 可补充</b>{evaluation.missedPoints.slice(0,3).map(point => <span key={point}>{point}</span>)}</div></div>
                <div className="ai-tip"><b>表达建议</b><p>{evaluation.suggestion}</p></div>
                <button className="reference-toggle" onClick={() => setShowReference(value => !value)}>{showReference ? '收起参考答案' : '查看参考答案'} <span>⌄</span></button>
                {showReference && <p className="reference-answer">{question.reference}</p>}
                <div className="rating-row"><p>这道题你掌握得怎么样？<small>你的选择将决定下次复习时间</small></p><button onClick={() => rate('again')}><b>忘记</b><span>10 分钟</span></button><button onClick={() => rate('hard')}><b>困难</b><span>1 天</span></button><button className="recommended" onClick={() => rate('good')}><b>掌握</b><span>3 天</span></button><button onClick={() => rate('easy')}><b>简单</b><span>7 天</span></button></div>
              </div>}
            </article>
          </section>
          <aside className="insights">
            <div className="memory-card"><div className="orbit"><span>72<small>%</small></span></div><div><span className="section-label">MEMORY HEALTH</span><h3>记忆状态良好</h3><p>比上周提升了 8%</p></div></div>
            <div className="due-card"><div className="card-title"><span className="section-label">COMING UP</span><button onClick={() => setView('library')}>查看全部</button></div><h3>接下来复习</h3><ul>{QUESTIONS.slice(1,4).map((q,index) => <li key={q.id}><i className={`dot ${['purple','green','orange'][index]}`} /><button onClick={() => jumpToQuestion(index + 1)}><b>{q.title.slice(0,11)}…</b><span>{q.category} · {['今天 14:30','明天','2 天后'][index]}</span></button><em>{q.strength}%</em></li>)}</ul></div>
            <div className="quote-card"><span>“</span><p>真正的掌握，始于你能用自己的语言把它讲清楚。</p></div>
          </aside>
        </div>}

        {view === 'library' && <section className="library-view">
          <div className="page-heading"><div><span className="section-label">KNOWLEDGE BASE</span><h2>知识题库</h2><p>{QUESTIONS.length} 个知识点，覆盖 7 个面试方向</p></div><button className="primary-action" onClick={() => { setToast('自定义题目功能已预留，接入数据库后即可长期保存'); setTimeout(() => setToast(''),3000); }}>＋ 添加知识点</button></div>
          <div className="library-toolbar"><label>⌕<input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索题目或关键词" /></label><div className="filter-tabs">{categories.map(category => <button key={category} className={filter === category ? 'active' : ''} onClick={() => setFilter(category)}>{category}</button>)}</div></div>
          <div className="question-table"><div className="table-head"><span>知识点</span><span>难度</span><span>记忆强度</span><span>下次复习</span><span /></div>{filteredQuestions.map(q => { const index = QUESTIONS.findIndex(item => item.id === q.id); const itemProgress = progress[q.id]; const strength = itemProgress?.strength ?? q.strength; return <div className="table-row" key={q.id}><div><i className={`category-mark c${index % 4}`}>{q.category.slice(0,1)}</i><span><b>{q.title}</b><small>{q.category}</small></span></div><span className="difficulty">{'●'.repeat(q.difficulty)}{'○'.repeat(3-q.difficulty)}</span><div className="strength-bar"><i><em style={{ width:`${strength}%` }} /></i><b>{strength}%</b></div><span className="next-date">{itemProgress ? new Date(itemProgress.nextReview).toLocaleDateString('zh-CN') : ['今天','明天','2 天后'][index % 3]}</span><button className="row-action" onClick={() => jumpToQuestion(index)}>复习 →</button></div>})}</div>
        </section>}

        {view === 'stats' && <section className="stats-view">
          <div className="page-heading"><div><span className="section-label">LEARNING INSIGHTS</span><h2>学习数据</h2><p>过去 30 天，你的长期记忆正在稳步形成</p></div><select aria-label="统计周期"><option>近 30 天</option><option>近 7 天</option></select></div>
          <div className="metric-grid"><article><span>累计复习</span><strong>286<small> 次</small></strong><em>↗ 18%</em></article><article><span>平均得分</span><strong>81<small> 分</small></strong><em>↗ 6%</em></article><article><span>掌握知识点</span><strong>64<small> / 92</small></strong><em>69.5%</em></article><article><span>专注时长</span><strong>12.4<small> 小时</small></strong><em>本月</em></article></div>
          <div className="stats-grid"><article className="chart-card"><div className="card-title"><div><span className="section-label">REVIEW ACTIVITY</span><h3>复习活动</h3></div><span className="legend"><i /> 复习次数</span></div><div className="bar-chart">{[34,55,42,72,48,80,64,92,58,75,88,68,95,81].map((height,index) => <i key={index} style={{ height:`${height}%` }}><b>{index % 3 === 0 ? ['08/13','08/16','08/19','08/22','08/25'][Math.floor(index/3)] : ''}</b></i>)}</div></article><article className="mastery-card"><span className="section-label">CATEGORY MASTERY</span><h3>分类掌握度</h3>{[['数据库',82],['操作系统',71],['计算机网络',68],['Java',63],['系统设计',51]].map(([name,value]) => <div className="mastery-row" key={name}><span>{name}</span><i><em style={{ width:`${value}%` }} /></i><b>{value}%</b></div>)}</article></div>
          <div className="weak-card"><div><span className="section-label">NEEDS ATTENTION</span><h3>建议优先巩固</h3></div>{QUESTIONS.filter(q => q.strength < 40).map((q,index) => <button key={q.id} onClick={() => jumpToQuestion(QUESTIONS.indexOf(q))}><i>{index + 1}</i><span><b>{q.title}</b><small>{q.category} · 记忆强度 {q.strength}%</small></span><em>开始复习 →</em></button>)}</div>
        </section>}

        {view === 'settings' && <section className="settings-view">
          <div className="page-heading"><div><span className="section-label">AI EVALUATION</span><h2>AI 判题设置</h2><p>系统已提供安全的服务端接口，未配置时自动使用本地规则评分</p></div><span className="status-pill">● 接口可用</span></div>
          <div className="settings-grid"><article><span className="step-number">01</span><h3>开箱即用</h3><p>当前原型无需配置即可体验完整流程。本地评分会检查核心概念覆盖度，不会把答案发送到外部。</p><div className="mode-box"><i>◇</i><span><b>本地评估模式</b><small>适合演示和离线开发</small></span><em>当前</em></div></article><article><span className="step-number">02</span><h3>接入你的 AI</h3><p>部署时设置以下三个服务端变量，即可切换到兼容 OpenAI Chat Completions 的模型服务。</p><div className="code-box"><span>AI_EVALUATION_ENDPOINT</span><span>AI_EVALUATION_API_KEY</span><span>AI_EVALUATION_MODEL</span></div><small>密钥只存在服务端，不会出现在浏览器或请求日志中。</small></article><article><span className="step-number">03</span><h3>接口契约</h3><p>前端只调用站内 <code>POST /api/evaluate</code>，传入题目、用户回答、评分要点和参考答案。</p><div className="flow-line"><span>用户回答</span><b>→</b><span>安全代理</span><b>→</b><span>AI 模型</span><b>→</b><span>结构化反馈</span></div></article></div>
          <article className="principles-card"><div><span className="section-label">DESIGN PRINCIPLES</span><h3>判题不是寻找标准句子</h3></div><p>AI 以“概念是否覆盖、逻辑是否正确、表达是否清楚”为评价维度。不同措辞、举例和回答顺序都可以得到合理判断，并明确告诉学习者遗漏了什么。</p><div><span><b>50%</b> 核心概念</span><span><b>30%</b> 逻辑准确</span><span><b>20%</b> 表达清晰</span></div></article>
        </section>}
      </section>
    </main>
  );
}
