import { JAVA_QUESTION_BANK } from '../data/java-bank.ts';
import { CAREER_QUESTION_BANK } from '../data/career-bank.ts';
import { EXPANDED_QUESTION_BANK } from '../data/expanded-bank.ts';
import { Rating as FsrsRating, State as FsrsState, createEmptyCard, fsrs, type Card as FsrsCard, type Grade as FsrsGrade } from 'ts-fsrs';

export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type CareerLevel = 'junior' | 'mid' | 'senior';
export type SiblingKind = 'core' | 'mechanism' | 'boundary' | 'diagnosis' | 'practice';

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
  roleIds?: string[];
  levels?: CareerLevel[];
  companyTags?: string[];
  directionTags?: string[];
  prerequisites?: string[];
  bankVersion?: number;
  source?: string;
  suspended?: boolean;
  buriedUntil?: string;
  topicId?: string;
  topicTitle?: string;
  siblingKind?: SiblingKind;
  siblingOrder?: number;
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
  scheduledDays?: number;
  elapsedDays?: number;
  learningSteps?: number;
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
  hintUsed?: boolean;
  referenceViewed?: boolean;
  previousProgress?: QuestionProgress | null;
};

export type Settings = {
  dailyGoal:number; dailyNewLimit:number; targetRetention:number; reminderTime:string; notifications:boolean;
  model:string; dailyAiLimit:number; aiEvaluationEnabled:boolean; selectedRoute:string; compactMobile:boolean; adaptiveDailyGoal:boolean; weeklyGoal:number; targetDate:string;
  interviewPlanEnabled:boolean; interviewFinalReviewDays:number; dailyMinutes:number;
  prompts:PromptTemplates;
};

export type PromptKey='evaluate'|'followup'|'cardGeneration'|'jdRoute'|'transcription'|'interviewReview';
export type PromptTemplates=Record<PromptKey,string>;
export const DEFAULT_PROMPTS:PromptTemplates={
  evaluate:'你是一名严格但鼓励式的计算机面试教练。请评价候选人对“{question}”的回答。关注概念覆盖、逻辑准确和表达清晰，不要求逐字匹配。评分要点：{keyPoints}\n参考答案：{reference}\n候选人回答：{answer}\n只输出约定的 JSON。',
  followup:'你是计算机面试官。请基于原题“{question}”、候选人回答“{answer}”和遗漏点“{missedPoints}”，只给出一个自然、具体、能检验真实理解的中文追问，不要解释。',
  cardGeneration:'从下面材料中生成最多 {count} 张计算机面试记忆卡。问题必须可独立理解，参考答案必须忠于材料，并给出 2—6 个可评分要点。材料：\n{material}',
  jdRoute:'分析下面岗位描述，提炼岗位方向、级别与技能关键词，并从候选题目中选择最相关的知识点形成面试词书。岗位描述：\n{jd}',
  transcription:'请准确转写这段中文技术面试录音。保留技术名词、问题与回答的边界；不确定的词不要擅自补写。',
  interviewReview:'你是一名资深技术面试教练。分析“{role}”面试的文字稿，找出表现亮点、知识薄弱点和被问到但回答不完整的主题，并生成可用于间隔复习的题目。不要猜测文字稿中没有的信息。文字稿：\n{transcript}',
};

export type InterviewReport = { id:string; role:string; questionIds:string[]; scores:number[]; startedAt:string; completedAt:string; durationSeconds:number };
export type InterviewRetrospective={id:string;createdAt:string;role:string;summary:string;overallFeedback:string;strengths:string[];weaknesses:string[];topics:{name:string;category:string;evidence:string;priority:'high'|'medium'|'low'}[];actionPlan:string[];questionIds:string[];transcriptPreview:string;source:'ai'|'local';model?:string};
export type RetentionState={ streakFreezes:number; freezeDates:string[]; lastWeeklyReportAt?:string };
export type LearningRoute={id:string;name:string;description:string;categories:string[];roleIds?:string[];levels?:CareerLevel[];companyTags?:string[];directionTags?:string[];questionIds?:string[];source?:'built-in'|'jd'|'custom'|'interview';createdAt?:string;updatedAt?:string};
export type AppSnapshot = { version:7; questions:Question[]; progress:Progress; history:ReviewRecord[]; settings:Settings; interviewReports:InterviewReport[]; interviewRetrospectives:InterviewRetrospective[]; customRoutes:LearningRoute[]; retention:RetentionState };
export const DEFAULT_RETENTION:RetentionState={streakFreezes:1,freezeDates:[]};
export const DEFAULT_SETTINGS:Settings={ dailyGoal:20,dailyNewLimit:5,targetRetention:.9,reminderTime:'20:00',notifications:false,model:'gpt-4.1-mini',dailyAiLimit:30,aiEvaluationEnabled:true,selectedRoute:'java-backend',compactMobile:false,adaptiveDailyGoal:true,weeklyGoal:5,targetDate:'',interviewPlanEnabled:false,interviewFinalReviewDays:4,dailyMinutes:30,prompts:DEFAULT_PROMPTS };
const JAVA_BACKEND_CATEGORIES=['Java 基础','面向对象','集合框架','Java IO','Java 新特性','JVM','Java 并发','Spring','Spring Boot','MyBatis','数据库','Redis','消息队列','分布式','系统设计'];
export const LEARNING_ROUTES:LearningRoute[]=[
  { id:'java-backend',name:'Java 后端核心词书',description:'按基础、JVM、框架、数据与分布式逐步引入新知识',categories:JAVA_BACKEND_CATEGORIES,source:'built-in' },
  { id:'java-core',name:'Java 核心基础',description:'语言、面向对象、集合、IO 与新特性',categories:['Java 基础','面向对象','集合框架','Java IO','Java 新特性'] },
  { id:'jvm-concurrency',name:'JVM 与并发',description:'内存、GC、类加载、锁和线程池',categories:['JVM','Java 并发'] },
  { id:'spring-data',name:'Spring 与数据层',description:'Spring、Boot、MyBatis、MySQL 与 Redis',categories:['Spring','Spring Boot','MyBatis','数据库','Redis'] },
  { id:'distributed',name:'分布式进阶',description:'消息、微服务、分布式事务与场景设计',categories:['消息队列','分布式','系统设计'] },
  { id:'frontend',name:'前端工程师',description:'JavaScript、TypeScript、React、浏览器、工程化与性能',categories:[],roleIds:['frontend'] },
  { id:'go-backend',name:'Go 后端工程师',description:'Go 语言、并发、Runtime、服务治理与性能',categories:[],roleIds:['go-backend'] },
  { id:'python-backend',name:'Python 后端工程师',description:'Python 基础、运行时、异步、Web 与工程实践',categories:[],roleIds:['python-backend'] },
  { id:'qa',name:'测试与质量工程师',description:'测试设计、自动化、性能、CI 质量与混沌工程',categories:[],roleIds:['qa'] },
  { id:'devops',name:'运维与 SRE',description:'Linux、容器、Kubernetes、CI/CD、可观测性与安全',categories:[],roleIds:['devops'] },
  { id:'junior-foundation',name:'初级 · 基础通关',description:'覆盖各岗位初级面试的核心概念',categories:[],levels:['junior'] },
  { id:'mid-engineering',name:'中级 · 工程能力',description:'聚焦并发、工程化、故障定位与项目实践',categories:[],levels:['mid'] },
  { id:'senior-architecture',name:'高级 · 架构与治理',description:'聚焦系统设计、性能、安全与可靠性',categories:[],levels:['senior'] },
  { id:'company-big-tech',name:'大厂通用方向',description:'算法之外的系统设计、性能、并发与工程深度',categories:['JVM','Java 并发','分布式','系统设计'],companyTags:['大厂通用'] },
  { id:'company-finance',name:'金融高可用方向',description:'事务一致性、消息可靠性、安全、SRE 与容灾',categories:['数据库','Redis','消息队列','分布式'],companyTags:['金融高可用'] },
  { id:'company-startup',name:'创业团队全栈方向',description:'覆盖快速交付所需的前后端、数据与交付能力',categories:['Spring Boot','数据库','系统设计'],companyTags:['创业全栈'] },
  { id:'all',name:'全部题库',description:'包含自定义题与所有分类，不限制新知识范围',categories:[] },
];

export type DailyQueue = {
  questions:Question[];
  reviewScheduled:number;
  newScheduled:number;
  reviewCompleted:number;
  newCompleted:number;
  reviewBacklog:number;
  newAvailable:number;
};

export const DEFAULT_QUESTIONS:Question[]=[...JAVA_QUESTION_BANK,...CAREER_QUESTION_BANK,...EXPANDED_QUESTION_BANK];

export const RATING_LABELS: Record<Rating, { title:string; fallback:string }> = {
  again:{ title:'忘记', fallback:'10 分钟' }, hard:{ title:'困难', fallback:'1 天' },
  good:{ title:'掌握', fallback:'3 天' }, easy:{ title:'简单', fallback:'7 天' },
};

export function createId(prefix = 'q') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

const FSRS_RATINGS:Record<Rating,FsrsGrade>={again:FsrsRating.Again,hard:FsrsRating.Hard,good:FsrsRating.Good,easy:FsrsRating.Easy};
const FSRS_STATES:Record<NonNullable<QuestionProgress['state']>,FsrsState>={new:FsrsState.New,learning:FsrsState.Learning,review:FsrsState.Review,relearning:FsrsState.Relearning};
const APP_STATES:Record<FsrsState,NonNullable<QuestionProgress['state']>>={0:'new',1:'learning',2:'review',3:'relearning'};

function toFsrsCard(previous:QuestionProgress|undefined,now=new Date()):FsrsCard {
  if(!previous)return createEmptyCard(now);
  const interval=Math.max(0,previous.interval||0);const due=new Date(previous.nextReview);const fallbackLast=new Date(due.getTime()-interval*86400000);const lastReview=previous.lastReviewedAt?new Date(previous.lastReviewedAt):fallbackLast;
  return {due:Number.isNaN(due.getTime())?now:due,stability:Math.max(.01,previous.stability??interval??.01),difficulty:Math.max(1,Math.min(10,previous.difficulty??5)),elapsed_days:previous.elapsedDays??Math.max(0,Math.round((now.getTime()-lastReview.getTime())/86400000)),scheduled_days:previous.scheduledDays??Math.max(0,Math.round(interval)),learning_steps:previous.learningSteps??0,reps:previous.reviews||0,lapses:previous.lapses||0,state:FSRS_STATES[previous.state||'review'],last_review:lastReview};
}

export function scheduleReview(question: Question, previous: QuestionProgress | undefined, rating: Rating, score: number, now = new Date(), targetRetention=.9): QuestionProgress {
  const scheduler=fsrs({request_retention:Math.max(.8,Math.min(.97,targetRetention)),enable_fuzz:false,enable_short_term:true,learning_steps:['10m','1d'],relearning_steps:['10m']});
  const {card}=scheduler.next(toFsrsCard(previous,now),now,FSRS_RATINGS[rating]);const interval=Math.max(1/1440,(card.due.getTime()-now.getTime())/86400000);
  const strengthDelta = { again:-14, hard:3, good:10, easy:18 }[rating] + Math.round((score - 70) / 15);
  return {
    strength:Math.max(5, Math.min(100, (previous?.strength ?? question.strength) + strengthDelta)),
    interval,
    ease:Math.max(1.3,Math.min(3.2,3.3-card.difficulty*.2)),
    nextReview:card.due.toISOString(),
    reviews:card.reps,
    lastScore:score,
    stability:card.stability,
    difficulty:card.difficulty,
    state:APP_STATES[card.state],
    lapses:card.lapses,
    lastReviewedAt:now.toISOString(),
    scheduledDays:card.scheduled_days,
    elapsedDays:card.elapsed_days,
    learningSteps:card.learning_steps,
  };
}

export function questionTopicId(question:Question){return question.topicId||question.id;}
export type QuestionTopic={id:string;title:string;category:string;questions:Question[]};
export function groupQuestionTopics(questions:Question[]):QuestionTopic[]{const groups=new Map<string,QuestionTopic>();for(const question of questions){const id=questionTopicId(question);const current=groups.get(id);if(current)current.questions.push(question);else groups.set(id,{id,title:question.topicTitle||question.title,category:question.category,questions:[question]});}return [...groups.values()].map(topic=>({...topic,questions:topic.questions.slice().sort((a,b)=>(a.siblingOrder??0)-(b.siblingOrder??0))}));}
function uniqueByTopic(questions:Question[]){const seen=new Set<string>();return questions.filter(question=>{const id=questionTopicId(question);if(seen.has(id))return false;seen.add(id);return true;});}

export function dueQuestions(questions: Question[], progress: Progress, now = new Date()) {
  return [...questions].filter(question => isCardAvailable(question,now)&&(!progress[question.id] || new Date(progress[question.id].nextReview) <= now)).sort((a,b) => {
    const aDate = progress[a.id]?.nextReview ?? '';
    const bDate = progress[b.id]?.nextReview ?? '';
    if (!aDate && bDate) return -1;
    if (aDate && !bDate) return 1;
    const urgent=(item:QuestionProgress|undefined)=>item?.state==='relearning'?0:item?.state==='learning'?1:2;
    return urgent(progress[a.id])-urgent(progress[b.id])||aDate.localeCompare(bDate)||(estimatedRecall(progress[a.id],now)??100)-(estimatedRecall(progress[b.id],now)??100)||(progress[b.id]?.lapses??0)-(progress[a.id]?.lapses??0);
  });
}

export function questionsForRoute(questions:Question[],route:LearningRoute) {
  const matches=(question:Question)=>{
    if(route.questionIds?.length)return route.questionIds.includes(question.id);
    const categoryMatch=!route.categories.length||route.categories.includes(question.category);
    const roleMatch=!route.roleIds?.length||route.roleIds.some(role=>(question.roleIds||[]).includes(role));
    const levelMatch=!route.levels?.length||route.levels.some(level=>(question.levels||[]).includes(level));
    const companyMatch=!route.companyTags?.length||route.companyTags.some(tag=>(question.companyTags||[]).includes(tag));
    const directionMatch=!route.directionTags?.length||route.directionTags.some(tag=>(question.directionTags||[]).includes(tag));
    return (categoryMatch&&roleMatch&&levelMatch&&companyMatch&&directionMatch)||(question.routeIds||[]).includes(route.id);
  };
  const scoped=questions.filter(matches);
  if(!route.categories.length)return scoped.sort((a,b)=>a.difficulty-b.difficulty||a.category.localeCompare(b.category,'zh-CN'));
  const categoryOrder=new Map(route.categories.map((category,index)=>[category,index]));
  return scoped.map((question,index)=>({question,index})).sort((a,b)=>(categoryOrder.get(a.question.category)??999)-(categoryOrder.get(b.question.category)??999)||a.question.difficulty-b.question.difficulty||a.index-b.index).map(item=>item.question);
}

export function buildDailyQueue(questions:Question[],progress:Progress,history:ReviewRecord[],settings:Settings,route:LearningRoute,now=new Date()):DailyQueue {
  const today=localDateKey(now);
  const firstReview=new Map<string,ReviewRecord>();
  for(const record of history){const current=firstReview.get(record.questionId);if(!current||record.reviewedAt<current.reviewedAt)firstReview.set(record.questionId,record);}
  const todayRecords=history.filter(record=>localDateKey(new Date(record.reviewedAt))===today);
  const questionById=new Map(questions.map(question=>[question.id,question]));
  const reviewedTopics=new Set(todayRecords.map(record=>questionById.get(record.questionId)).filter((question):question is Question=>Boolean(question)).map(questionTopicId));
  const newCompleted=todayRecords.filter(record=>firstReview.get(record.questionId)?.id===record.id).length;
  const reviewCompleted=Math.max(0,todayRecords.length-newCompleted);
  const dueReviews=uniqueByTopic(dueQuestions(questions.filter(question=>progress[question.id]&&!reviewedTopics.has(questionTopicId(question))),progress,now));
  const adaptive=adaptiveDailyLimits(history,settings,now);
  const interviewPlan=buildInterviewStudyPlan(questions,progress,route,settings,now);
  const plannedReviewLimit=settings.interviewPlanEnabled&&interviewPlan.active?interviewPlan.dailyReviewTarget:adaptive.reviewLimit;
  const remainingReviewLimit=Math.max(0,plannedReviewLimit-reviewCompleted);
  let reviews=dueReviews.slice(0,remainingReviewLimit);
  const reviewBacklog=Math.max(0,dueReviews.length-reviews.length);
  const routeQuestions=questionsForRoute(questions,route);
  const newQuestions=uniqueByTopic(routeQuestions.filter(question=>isCardAvailable(question,now)&&!progress[question.id]&&!reviewedTopics.has(questionTopicId(question))));
  const plannedNewLimit=settings.interviewPlanEnabled&&interviewPlan.active?interviewPlan.dailyNewTarget:adaptive.newLimit;
  const remainingNewLimit=reviewBacklog?0:Math.max(0,plannedNewLimit-newCompleted);
  const newCards=newQuestions.slice(0,remainingNewLimit);
  if(settings.interviewPlanEnabled&&interviewPlan.phase==='final-review'&&reviews.length<remainingReviewLimit){
    const usedTopics=new Set(reviews.map(questionTopicId));
    const finalReview=uniqueByTopic(routeQuestions.filter(question=>progress[question.id]&&!reviewedTopics.has(questionTopicId(question))&&!usedTopics.has(questionTopicId(question))&&!dueReviews.some(item=>item.id===question.id)).sort((a,b)=>(estimatedRecall(progress[a.id],now)??101)-(estimatedRecall(progress[b.id],now)??101))).slice(0,remainingReviewLimit-reviews.length);
    reviews=[...reviews,...finalReview];
  }
  return {questions:[...reviews,...newCards],reviewScheduled:reviews.length,newScheduled:newCards.length,reviewCompleted,newCompleted,reviewBacklog,newAvailable:newQuestions.length};
}

export function adaptiveDailyLimits(history:ReviewRecord[],settings:Settings,now=new Date()){
  if(!settings.adaptiveDailyGoal||history.length<3)return{newLimit:settings.dailyNewLimit,reviewLimit:settings.dailyGoal,reason:'使用手动上限'};
  const recent=history.filter(item=>now.getTime()-new Date(item.reviewedAt).getTime()<7*86400000);
  const activeDays=new Set(recent.map(item=>localDateKey(new Date(item.reviewedAt)))).size;
  const average=recent.length?recent.reduce((sum,item)=>sum+item.score,0)/recent.length:75;
  if(activeDays<=2||average<60)return{newLimit:Math.max(1,Math.round(settings.dailyNewLimit*.7)),reviewLimit:Math.max(5,Math.round(settings.dailyGoal*.8)),reason:'近期负担偏高，任务已自动缩减'};
  if(activeDays>=5&&average>=80)return{newLimit:Math.min(20,settings.dailyNewLimit+1),reviewLimit:Math.min(100,settings.dailyGoal+5),reason:'近期完成稳定，可小幅增加任务'};
  return{newLimit:settings.dailyNewLimit,reviewLimit:settings.dailyGoal,reason:'近期节奏稳定'};
}

export type WeeklyReport={start:string;end:string;reviews:number;activeDays:number;newLearned:number;averageScore:number;minutes:number;strongestCategory:string;weakestCategory:string;trend:number;summary:string};
export function buildWeeklyReport(history:ReviewRecord[],questions:Question[],now=new Date()):WeeklyReport{
  const end=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59);const start=new Date(end);start.setDate(start.getDate()-6);start.setHours(0,0,0,0);
  const previousStart=new Date(start);previousStart.setDate(previousStart.getDate()-7);
  const current=history.filter(item=>{const value=new Date(item.reviewedAt);return value>=start&&value<=end;});
  const previous=history.filter(item=>{const value=new Date(item.reviewedAt);return value>=previousStart&&value<start;});
  const firstByQuestion=new Map<string,string>();history.forEach(item=>{const currentDate=firstByQuestion.get(item.questionId);if(!currentDate||item.reviewedAt<currentDate)firstByQuestion.set(item.questionId,item.reviewedAt);});
  const categories=[...new Set(current.map(item=>item.category))].map(name=>{const rows=current.filter(item=>item.category===name);return{name,score:rows.reduce((sum,item)=>sum+item.score,0)/rows.length};}).sort((a,b)=>b.score-a.score);
  const reviews=current.length;const activeDays=new Set(current.map(item=>localDateKey(new Date(item.reviewedAt)))).size;const averageScore=reviews?Math.round(current.reduce((sum,item)=>sum+item.score,0)/reviews):0;const trend=previous.length?Math.round((reviews-previous.length)/previous.length*100):(reviews?100:0);
  return{start:localDateKey(start),end:localDateKey(end),reviews,activeDays,newLearned:current.filter(item=>firstByQuestion.get(item.questionId)===item.reviewedAt).length,averageScore,minutes:Math.round(current.reduce((sum,item)=>sum+(item.durationSeconds||180),0)/60),strongestCategory:categories[0]?.name||'等待数据',weakestCategory:categories.at(-1)?.name||'等待数据',trend,summary:reviews?`本周学习 ${activeDays} 天、完成 ${reviews} 次主动回忆，平均 ${averageScore} 分。${categories.length>1?`优势在${categories[0].name}，下周优先巩固${categories.at(-1)?.name}。`:'继续保持稳定输出。'}`:'本周还没有学习记录，从完成一个知识点开始即可。'};
}

export function estimateCompletion(questions:Question[],progress:Progress,route:LearningRoute,settings:Settings,now=new Date()){
  const remaining=questionsForRoute(questions,route).filter(item=>!progress[item.id]).length;
  if(!remaining)return{remaining,days:0,date:localDateKey(now)};
  const perDay=Math.max(1,settings.dailyNewLimit);const days=Math.ceil(remaining/perDay);const target=settings.targetDate?new Date(`${settings.targetDate}T12:00:00`):new Date(now.getTime()+days*86400000);
  return{remaining,days,date:localDateKey(target)};
}

export type InterviewPlanPhase='learning'|'catch-up'|'final-review'|'interview-day'|'expired'|'complete';
export type InterviewStudyPlan={active:boolean;phase:InterviewPlanPhase;daysRemaining:number;studyDaysRemaining:number;remainingNew:number;overdue:number;dailyNewTarget:number;dailyReviewTarget:number;projectedMinutes:number;onTrack:boolean;finalReviewStartsAt:string;message:string};
export function buildInterviewStudyPlan(questions:Question[],progress:Progress,route:LearningRoute,settings:Settings,now=new Date()):InterviewStudyPlan {
  const scoped=questionsForRoute(questions,route);const remainingNew=scoped.filter(question=>!progress[question.id]).length;const overdue=scoped.filter(question=>progress[question.id]&&new Date(progress[question.id].nextReview)<=now).length;
  const target=settings.targetDate?new Date(`${settings.targetDate}T12:00:00`):null;const valid=Boolean(target&&!Number.isNaN(target.getTime()));
  const daysRemaining=valid?Math.ceil((target!.getTime()-new Date(now.getFullYear(),now.getMonth(),now.getDate(),12).getTime())/86400000):0;
  const finalDays=Math.max(2,Math.min(7,settings.interviewFinalReviewDays||4));const studyDaysRemaining=Math.max(0,daysRemaining-finalDays);const dailyNewTarget=remainingNew?Math.ceil(remainingNew/Math.max(1,studyDaysRemaining)):0;
  const learnedCount=scoped.length-remainingNew;const baseReview=Math.max(overdue,Math.ceil(learnedCount*(1-settings.targetRetention)/7));const dailyReviewTarget=Math.min(150,Math.max(settings.dailyGoal,baseReview+(daysRemaining<=finalDays?Math.ceil(learnedCount/Math.max(1,daysRemaining)):0)));const rawProjectedMinutes=Math.ceil(dailyNewTarget*5+dailyReviewTarget*3);
  const phase:InterviewPlanPhase=!valid?'learning':remainingNew===0&&overdue===0?'complete':daysRemaining<0?'expired':daysRemaining===0?'interview-day':daysRemaining<=finalDays?'final-review':(dailyNewTarget>settings.dailyNewLimit||overdue>settings.dailyGoal||rawProjectedMinutes>settings.dailyMinutes)?'catch-up':'learning';
  const effectiveNew=phase==='final-review'||phase==='interview-day'||phase==='expired'?0:dailyNewTarget;const projectedMinutes=Math.max(0,Math.ceil(effectiveNew*5+dailyReviewTarget*3));const onTrack=valid&&phase!=='expired'&&dailyNewTarget<=Math.max(1,settings.dailyNewLimit)&&overdue<=settings.dailyGoal&&projectedMinutes<=settings.dailyMinutes;const finalDate=valid?new Date(target!.getTime()-finalDays*86400000):now;
  const messages:Record<InterviewPlanPhase,string>={learning:'按当前节奏推进新知识，并保留末段集中复习。','catch-up':'当前进度偏紧，计划已提高每日任务；先清理到期积压。','final-review':'已进入最终复习期：暂停新题，优先覆盖薄弱主题。','interview-day':'今天是面试日，只做轻量回忆，不再引入新题。',expired:'目标日期已过，请更新日期后重新生成计划。',complete:'当前词书已完成，保持到期复习即可。'};
  return{active:valid,phase,daysRemaining,studyDaysRemaining,remainingNew,overdue,dailyNewTarget:effectiveNew,dailyReviewTarget,projectedMinutes,onTrack,finalReviewStartsAt:localDateKey(finalDate),message:messages[phase]};
}

export function buildWorkloadForecast(questions:Question[],progress:Progress,route:LearningRoute,settings:Settings,days=30,now=new Date()){
  const plan=buildInterviewStudyPlan(questions,progress,route,settings,now);const scopedIds=new Set(questionsForRoute(questions,route).map(question=>question.id));
  return Array.from({length:days},(_,index)=>{const date=new Date(now.getFullYear(),now.getMonth(),now.getDate());date.setDate(date.getDate()+index);const key=localDateKey(date);const review=Object.entries(progress).filter(([id,item])=>scopedIds.has(id)&&localDateKey(new Date(item.nextReview))===key).length;const fresh=plan.active&&index<plan.studyDaysRemaining?plan.dailyNewTarget:0;return{key,label:index%5===0?`${date.getMonth()+1}/${date.getDate()}`:'',review,new:fresh,total:review+fresh};});
}

export function learningCalendar(history:ReviewRecord[],progress:Progress,days=42,now=new Date()){
  return Array.from({length:days},(_,index)=>{const date=new Date(now.getFullYear(),now.getMonth(),now.getDate());date.setDate(date.getDate()-(days-1-index));const key=localDateKey(date);const completed=history.filter(item=>localDateKey(new Date(item.reviewedAt))===key).length;const due=Object.values(progress).filter(item=>localDateKey(new Date(item.nextReview))===key).length;return{key,date,completed,due};});
}

export function consumeStreakFreeze(retention:RetentionState,history:ReviewRecord[],now=new Date()):RetentionState|null{
  if(retention.streakFreezes<=0)return null;const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate());yesterday.setDate(yesterday.getDate()-1);const key=localDateKey(yesterday);if(history.some(item=>localDateKey(new Date(item.reviewedAt))===key)||retention.freezeDates.includes(key))return null;return{...retention,streakFreezes:retention.streakFreezes-1,freezeDates:[...retention.freezeDates,key]};
}

export function estimatedRecall(item:QuestionProgress|undefined,now=new Date()):number|null {
  if(!item)return null;
  const value=fsrs({enable_fuzz:false}).get_retrievability(toFsrsCard(item,now),now,false);
  return Math.max(1,Math.min(100,Math.round(value*100)));
}

export function isMastered(item:QuestionProgress|undefined) {
  return Boolean(item&&item.state==='review'&&(item.stability??item.interval)>=21&&item.lastScore>=70);
}

export function reviewStreak(history: ReviewRecord[], now = new Date(), freezeDates:string[] = []) {
  const days = new Set(history.map(item => localDateKey(new Date(item.reviewedAt))));
  freezeDates.forEach(date=>days.add(date));
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
  const levels:CareerLevel[]=Array.isArray(question.levels)&&question.levels.length?question.levels:[question.difficulty===1?'junior':question.difficulty===2?'mid':'senior'];
  const companyTags=Array.isArray(question.companyTags)?question.companyTags:question.difficulty===3?['大厂通用']:(['数据库','Redis','消息队列','分布式'].includes(question.category)?['金融高可用']:['创业全栈']);
  return { ...question,tags:Array.isArray(question.tags)?question.tags:[],favorite:Boolean(question.favorite),routeIds:Array.isArray(question.routeIds)?question.routeIds:[],roleIds:Array.isArray(question.roleIds)?question.roleIds:question.id.startsWith('java-')?['java-backend']:[],levels,companyTags,directionTags:Array.isArray(question.directionTags)?question.directionTags:[],prerequisites:Array.isArray(question.prerequisites)?question.prerequisites:[],bankVersion:question.bankVersion||1,source:question.source||'手动',suspended:Boolean(question.suspended),buriedUntil:question.buriedUntil||undefined,topicId:question.topicId||question.id,topicTitle:question.topicTitle||question.title,siblingOrder:question.siblingOrder??0 };
}

export function isCardAvailable(question:Question,now=new Date()){
  return !question.suspended&&(!question.buriedUntil||new Date(question.buriedUntil)<=now);
}

export function createSnapshot(questions:Question[],progress:Progress,history:ReviewRecord[],settings:Settings,interviewReports:InterviewReport[],customRoutes:LearningRoute[]=[],retention:RetentionState=DEFAULT_RETENTION,interviewRetrospectives:InterviewRetrospective[]=[]):AppSnapshot {
  return {version:7,questions:questions.map(normalizeQuestion),progress,history,settings:{...DEFAULT_SETTINGS,...settings,prompts:{...DEFAULT_PROMPTS,...settings.prompts}},interviewReports,interviewRetrospectives,customRoutes,retention:{...DEFAULT_RETENTION,...retention,freezeDates:[...(retention.freezeDates||[])]}};
}

export function mergeBuiltInQuestions(questions:Question[]) {
  const existing=new Map(questions.map(item=>[item.id,normalizeQuestion(item)]));
  for(const item of DEFAULT_QUESTIONS){const normalized=normalizeQuestion(item);const current=existing.get(item.id);if(!current)existing.set(item.id,normalized);else existing.set(item.id,{...normalized,...current,routeIds:[...new Set([...(normalized.routeIds||[]),...(current.routeIds||[])])],roleIds:[...new Set([...(normalized.roleIds||[]),...(current.roleIds||[])])],levels:[...new Set([...(normalized.levels||[]),...(current.levels||[])])],companyTags:[...new Set([...(normalized.companyTags||[]),...(current.companyTags||[])])],directionTags:[...new Set([...(normalized.directionTags||[]),...(current.directionTags||[])])]});}
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
