export type Rating = 'again' | 'hard' | 'good' | 'easy';

export type Question = {
  id: string;
  category: string;
  title: string;
  hint: string;
  keyPoints: string[];
  reference: string;
  difficulty: 1 | 2 | 3;
  strength: number;
};

export type QuestionProgress = {
  strength: number;
  interval: number;
  ease: number;
  nextReview: string;
  reviews: number;
  lastScore: number;
};

export type Progress = Record<string, QuestionProgress>;

export type ReviewRecord = {
  id: string;
  questionId: string;
  category: string;
  score: number;
  rating: Rating;
  reviewedAt: string;
};

export const DEFAULT_QUESTIONS: Question[] = [
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

export const RATING_LABELS: Record<Rating, { title:string; fallback:string }> = {
  again:{ title:'忘记', fallback:'10 分钟' }, hard:{ title:'困难', fallback:'1 天' },
  good:{ title:'掌握', fallback:'3 天' }, easy:{ title:'简单', fallback:'7 天' },
};

export function createId(prefix = 'q') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export function scheduleReview(question: Question, previous: QuestionProgress | undefined, rating: Rating, score: number, now = new Date()): QuestionProgress {
  const reviews = previous?.reviews ?? 0;
  const oldInterval = previous?.interval ?? 0;
  const oldEase = previous?.ease ?? 2.5;
  const intervals: Record<Rating, number> = {
    again: 10 / 1440,
    hard: reviews === 0 ? 1 : Math.max(1, Math.round(oldInterval * 1.2)),
    good: reviews === 0 ? 3 : Math.max(3, Math.round(oldInterval * oldEase)),
    easy: reviews === 0 ? 7 : Math.max(7, Math.round(oldInterval * (oldEase + .8))),
  };
  const easeDelta = { again:-.2, hard:-.08, good:.04, easy:.14 }[rating];
  const strengthDelta = { again:-14, hard:3, good:10, easy:18 }[rating] + Math.round((score - 70) / 15);
  const interval = intervals[rating];
  return {
    strength:Math.max(5, Math.min(100, (previous?.strength ?? question.strength) + strengthDelta)),
    interval,
    ease:Math.max(1.3, Math.min(3.2, oldEase + easeDelta)),
    nextReview:new Date(now.getTime() + interval * 86400000).toISOString(),
    reviews:reviews + 1,
    lastScore:score,
  };
}

export function dueQuestions(questions: Question[], progress: Progress, now = new Date()) {
  return [...questions].filter(question => !progress[question.id] || new Date(progress[question.id].nextReview) <= now).sort((a,b) => {
    const aDate = progress[a.id]?.nextReview ?? '';
    const bDate = progress[b.id]?.nextReview ?? '';
    if (!aDate && bDate) return -1;
    if (aDate && !bDate) return 1;
    return aDate.localeCompare(bDate) || (progress[a.id]?.strength ?? a.strength) - (progress[b.id]?.strength ?? b.strength);
  });
}

export function reviewStreak(history: ReviewRecord[], now = new Date()) {
  const days = new Set(history.map(item => localDateKey(new Date(item.reviewedAt))));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDateKey(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
  return count;
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function relativeReviewTime(value: string | undefined, now = new Date()) {
  if (!value) return '现在';
  const diff = new Date(value).getTime() - now.getTime();
  if (diff <= 0) return '已到期';
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} 分钟后`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)} 小时后`;
  return `${Math.round(diff / 86400000)} 天后`;
}

export function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
