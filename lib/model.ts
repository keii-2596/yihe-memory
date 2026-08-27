import { JAVA_QUESTION_BANK } from '../data/java-bank.ts';

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
  tags?: string[];
  favorite?: boolean;
  routeIds?: string[];
  prerequisites?: string[];
  source?: string;
};

export type QuestionProgress = {
  strength: number;
  interval: number;
  ease: number;
  nextReview: string;
  reviews: number;
  lastScore: number;
  stability?: number;
  difficulty?: number;
  state?: 'new' | 'learning' | 'review' | 'relearning';
  lapses?: number;
  lastReviewedAt?: string;
};

export type Progress = Record<string, QuestionProgress>;

export type ReviewRecord = {
  id: string;
  questionId: string;
  category: string;
  score: number;
  rating: Rating;
  reviewedAt: string;
  answer?: string;
  verdict?: string;
  summary?: string;
  hitPoints?: string[];
  missedPoints?: string[];
  suggestion?: string;
  source?: 'ai' | 'local';
  model?: string;
  durationSeconds?: number;
  fillerCount?: number;
};

export type Settings = {
  dailyGoal:number; targetRetention:number; reminderTime:string; notifications:boolean;
  model:string; dailyAiLimit:number; selectedRoute:string; compactMobile:boolean;
};

export type InterviewReport = { id:string; role:string; questionIds:string[]; scores:number[]; startedAt:string; completedAt:string; durationSeconds:number };
export type AppSnapshot = { version:3; questions:Question[]; progress:Progress; history:ReviewRecord[]; settings:Settings; interviewReports:InterviewReport[] };
export const DEFAULT_SETTINGS:Settings={ dailyGoal:12,targetRetention:.9,reminderTime:'20:00',notifications:false,model:'gpt-4.1-mini',dailyAiLimit:30,selectedRoute:'all',compactMobile:false };
export const LEARNING_ROUTES=[
  { id:'all',name:'Java 全栈八股',description:'从语言基础到分布式与系统设计的完整题库',categories:[] as string[] },
  { id:'java-backend',name:'Java 后端 30 天',description:'完整 Java 后端面试路线',categories:[] as string[] },
  { id:'java-core',name:'Java 核心基础',description:'语言、面向对象、集合、IO 与新特性',categories:['Java 基础','面向对象','集合框架','Java IO','Java 新特性'] },
  { id:'jvm-concurrency',name:'JVM 与并发',description:'内存、GC、类加载、锁和线程池',categories:['JVM','Java 并发'] },
  { id:'spring-data',name:'Spring 与数据层',description:'Spring、Boot、MyBatis、MySQL 与 Redis',categories:['Spring','Spring Boot','MyBatis','数据库','Redis'] },
  { id:'distributed',name:'分布式进阶',description:'消息、微服务、分布式事务与场景设计',categories:['消息队列','分布式','系统设计'] },
  { id:'frontend',name:'前端工程师',description:'前端、网络、浏览器与算法基础',categories:['前端','计算机网络','算法'] },
  { id:'infra',name:'基础架构',description:'操作系统、网络、中间件与分布式系统',categories:['操作系统','计算机网络','中间件','系统设计'] },
];

export const DEFAULT_QUESTIONS:Question[]=JAVA_QUESTION_BANK;

export const RATING_LABELS: Record<Rating, { title:string; fallback:string }> = {
  again:{ title:'忘记', fallback:'10 分钟' }, hard:{ title:'困难', fallback:'1 天' },
  good:{ title:'掌握', fallback:'3 天' }, easy:{ title:'简单', fallback:'7 天' },
};

export function createId(prefix = 'q') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export function scheduleReview(question: Question, previous: QuestionProgress | undefined, rating: Rating, score: number, now = new Date(), targetRetention=.9): QuestionProgress {
  const reviews = previous?.reviews ?? 0;
  const oldEase = previous?.ease ?? 2.5;
  const oldStability=previous?.stability ?? Math.max(.4,previous?.interval ?? 1);
  const oldDifficulty=previous?.difficulty ?? Math.max(1,Math.min(10,7-question.difficulty));
  const elapsed=previous?.lastReviewedAt ? Math.max(0,(now.getTime()-new Date(previous.lastReviewedAt).getTime())/86400000) : 0;
  const retrievability=Math.exp(Math.log(.9)*elapsed/Math.max(.2,oldStability));
  const growth:Record<Rating,number>={again:.45,hard:1.18+(1-retrievability)*.25,good:1.85+(1-retrievability)*1.4,easy:2.65+(1-retrievability)*2};
  const initial:Record<Rating,number>={again:10/1440,hard:1,good:3,easy:7};
  const stability=reviews===0 ? initial[rating] : Math.max(10/1440,oldStability*growth[rating]*(.92+score/1000));
  const retention=Math.max(.8,Math.min(.97,targetRetention));
  const interval=rating==='again' ? 10/1440 : reviews===0 ? initial[rating] : Math.max(1,Math.round(stability*Math.log(retention)/Math.log(.9)));
  const easeDelta = { again:-.2, hard:-.08, good:.04, easy:.14 }[rating];
  const strengthDelta = { again:-14, hard:3, good:10, easy:18 }[rating] + Math.round((score - 70) / 15);
  return {
    strength:Math.max(5, Math.min(100, (previous?.strength ?? question.strength) + strengthDelta)),
    interval,
    ease:Math.max(1.3, Math.min(3.2, oldEase + easeDelta)),
    nextReview:new Date(now.getTime() + interval * 86400000).toISOString(),
    reviews:reviews + 1,
    lastScore:score,
    stability,
    difficulty:Math.max(1,Math.min(10,oldDifficulty+({again:.8,hard:.25,good:-.15,easy:-.45}[rating]))),
    state:rating==='again'?(reviews?'relearning':'learning'):'review',
    lapses:(previous?.lapses??0)+(rating==='again'?1:0),
    lastReviewedAt:now.toISOString(),
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

export function normalizeQuestion(question:Question):Question {
  return { ...question,tags:Array.isArray(question.tags)?question.tags:[],favorite:Boolean(question.favorite),routeIds:Array.isArray(question.routeIds)?question.routeIds:[],prerequisites:Array.isArray(question.prerequisites)?question.prerequisites:[],source:question.source||'手动' };
}

export function createSnapshot(questions:Question[],progress:Progress,history:ReviewRecord[],settings:Settings,interviewReports:InterviewReport[]):AppSnapshot {
  return {version:3,questions:questions.map(normalizeQuestion),progress,history,settings:{...DEFAULT_SETTINGS,...settings},interviewReports};
}

export function mergeBuiltInQuestions(questions:Question[]) {
  const existing=new Map(questions.map(item=>[item.id,normalizeQuestion(item)]));
  for(const item of DEFAULT_QUESTIONS) if(!existing.has(item.id)) existing.set(item.id,normalizeQuestion(item));
  return [...existing.values()];
}

export function parseImportedCards(text:string,fileName=''):Question[] {
  const make=(value:Partial<Question>,index:number):Question=>normalizeQuestion({id:value.id||createId('import'),category:value.category||'待整理',title:value.title||`导入知识点 ${index+1}`,hint:value.hint||'',keyPoints:Array.isArray(value.keyPoints)?value.keyPoints:[],reference:value.reference||'',difficulty:value.difficulty||1,strength:value.strength??30,tags:value.tags||[],source:fileName||'批量导入'});
  if (fileName.toLowerCase().endsWith('.csv')) {
    const rows=text.split(/\r?\n/).filter(Boolean).map(parseCsvRow); const header=rows.shift()?.map(cell=>cell.trim())||[];
    return rows.map((row,index)=>{const get=(name:string)=>row[header.indexOf(name)]||'';return make({category:get('category')||get('分类'),title:get('title')||get('题目'),hint:get('hint')||get('提示'),keyPoints:(get('keyPoints')||get('评分要点')).split(/[|；;]/).filter(Boolean),reference:get('reference')||get('参考答案'),tags:(get('tags')||get('标签')).split(/[|，,]/).filter(Boolean),difficulty:Number(get('difficulty')||get('难度')||1) as 1|2|3},index);}).filter(item=>item.title&&item.reference);
  }
  const sections=text.split(/^#{1,3}\s+/m).map(item=>item.trim()).filter(Boolean);
  return sections.map((section,index)=>{const [title,...lines]=section.split(/\r?\n/);const body=lines.join('\n').trim();const points=lines.filter(line=>/^[-*]\s+/.test(line)).map(line=>line.replace(/^[-*]\s+/,''));return make({title:title.replace(/^#+\s*/,''),reference:body,keyPoints:points.length?points:body.split(/[。；]/).filter(Boolean).slice(0,5),tags:['Markdown']},index);}).filter(item=>item.title&&item.reference);
}

function parseCsvRow(line:string) {
  const cells:string[]=[]; let current=''; let quoted=false;
  for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'&&line[i+1]==='"'){current+='"';i++;}else if(char==='"')quoted=!quoted;else if(char===','&&!quoted){cells.push(current);current='';}else current+=char;}cells.push(current);return cells;
}

export function fillerCount(answer:string){ return (answer.match(/(然后|就是|这个|那个|其实|嗯+|呃+|额+)/g)||[]).length; }

export function weakCauses(question:Question,records:ReviewRecord[]) {
  const related=records.filter(item=>item.questionId===question.id); const missed=new Map<string,number>();
  related.flatMap(item=>item.missedPoints||[]).forEach(point=>missed.set(point,(missed.get(point)||0)+1));
  return [...missed.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([point,count])=>({point,count}));
}
