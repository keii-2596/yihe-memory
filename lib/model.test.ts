import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAuthUrl, safeEqual } from './auth-policy.ts';
import { DEFAULT_QUESTIONS, DEFAULT_RETENTION, DEFAULT_SETTINGS, LEARNING_ROUTES, adaptiveDailyLimits, buildDailyQueue, buildInterviewStudyPlan, buildWeeklyReport, consumeStreakFreeze, createSnapshot, dueQuestions, estimateCompletion, estimatedRecall, groupQuestionTopics, isCardAvailable, learningCalendar, mergeBuiltInQuestions, normalizeQuestion, parseImportedCards, questionsForRoute, reviewStreak, scheduleReview } from './model.ts';

const now = new Date('2026-08-26T08:00:00.000Z');
const question = DEFAULT_QUESTIONS[0];

test('new cards receive increasing intervals by rating', () => {
  const intervals=(['again','hard','good','easy'] as const).map(rating=>scheduleReview(question,undefined,rating,80,now).interval);
  assert.deepEqual(intervals,[10/1440,145/288,1,8]);
  assert.ok(intervals.every((value,index)=>index===0||value>intervals[index-1]));
});

test('scheduled cards disappear until their review time', () => {
  const item = scheduleReview(question, undefined, 'good', 85, now);
  assert.equal(dueQuestions([question], { [question.id]:item }, new Date('2026-08-26T20:00:00.000Z')).length, 0);
  assert.equal(dueQuestions([question], { [question.id]:item }, new Date('2026-08-27T08:00:00.000Z')).length, 1);
});

test('streak includes consecutive days and tolerates no review today', () => {
  const records = ['2026-08-23','2026-08-24','2026-08-25'].map((date,index) => ({ id:String(index), questionId:'q', category:'数据库', score:80, rating:'good' as const, reviewedAt:`${date}T08:00:00.000Z` }));
  assert.equal(reviewStreak(records, now), 3);
});

test('higher target retention schedules an earlier review', () => {
  const first=scheduleReview(question,undefined,'good',85,now);
  const later=new Date('2026-08-29T08:00:00.000Z');
  const high=scheduleReview(question,first,'good',85,later,.95);
  const normal=scheduleReview(question,first,'good',85,later,.85);
  assert.ok(high.interval<normal.interval);
});

test('daily queue limits new knowledge instead of exhausting the full bank', () => {
  const settings={...DEFAULT_SETTINGS,dailyGoal:20,dailyNewLimit:3};
  const route=LEARNING_ROUTES.find(item=>item.id==='java-backend')!;
  const queue=buildDailyQueue(DEFAULT_QUESTIONS,{},[],settings,route,now);
  assert.equal(queue.newScheduled,3);
  assert.equal(queue.reviewScheduled,0);
  assert.equal(queue.questions.length,3);
});

test('overdue reviews are prioritized and pause new knowledge when backlog remains', () => {
  const due=DEFAULT_QUESTIONS.slice(0,2);
  const progress=Object.fromEntries(due.map(item=>[item.id,{...scheduleReview(item,undefined,'good',80,new Date('2026-08-20T08:00:00.000Z')),nextReview:'2026-08-21T08:00:00.000Z'}]));
  const settings={...DEFAULT_SETTINGS,dailyGoal:1,dailyNewLimit:5};
  const queue=buildDailyQueue(DEFAULT_QUESTIONS,progress,[],settings,LEARNING_ROUTES[0],now);
  assert.equal(queue.reviewScheduled,1);
  assert.equal(queue.reviewBacklog,1);
  assert.equal(queue.newScheduled,0);
});

test('suspended and today-hidden cards stay out of the daily queue without losing progress', () => {
  const active={...DEFAULT_QUESTIONS[0],id:'active-card'};
  const suspended={...DEFAULT_QUESTIONS[1],id:'suspended-card',suspended:true};
  const buried={...DEFAULT_QUESTIONS[2],id:'buried-card',buriedUntil:'2026-08-27T00:00:00.000Z'};
  const progress=Object.fromEntries([active,suspended,buried].map(item=>[item.id,{...scheduleReview(item,undefined,'good',80,new Date('2026-08-20T08:00:00.000Z')),nextReview:'2026-08-21T08:00:00.000Z'}]));
  const route={id:'control-test',name:'测试',description:'',categories:[],questionIds:[active.id,suspended.id,buried.id]};
  const queue=buildDailyQueue([active,suspended,buried],progress,[],{...DEFAULT_SETTINGS,dailyGoal:10},route,now);
  assert.deepEqual(queue.questions.map(item=>item.id),[active.id]);
  assert.equal(isCardAvailable(suspended,now),false);
  assert.equal(isCardAvailable(buried,now),false);
  assert.equal(isCardAvailable(buried,new Date('2026-08-28T08:00:00.000Z')),true);
  assert.equal(progress[suspended.id].reviews,1);
});

test('routes order new knowledge and recall is derived from personal timing data', () => {
  const route=LEARNING_ROUTES.find(item=>item.id==='jvm-concurrency')!;
  assert.ok(questionsForRoute(DEFAULT_QUESTIONS,route).every(item=>['JVM','Java 并发'].includes(item.category)));
  const item=scheduleReview(question,undefined,'good',80,now);
  const recall=estimatedRecall(item,new Date('2026-08-29T08:00:00.000Z'));assert.ok(recall!==null&&recall<90&&recall>80);
  assert.equal(estimatedRecall(undefined,now),null);
});

test('CSV and Markdown can be imported as cards', () => {
  const csv=parseImportedCards('题目,分类,评分要点,参考答案\n什么是索引？,数据库,加速查询|空间换时间,索引是有序数据结构','cards.csv');
  const markdown=parseImportedCards('# TCP 三次握手\n- 确认双方收发能力\n- 同步序列号','cards.md');
  assert.equal(csv.length,1); assert.deepEqual(csv[0].keyPoints,['加速查询','空间换时间']);
  assert.equal(markdown.length,1); assert.equal(markdown[0].keyPoints.length,2);
});

test('built-in Java bank is complete and structurally valid', () => {
  assert.ok(DEFAULT_QUESTIONS.length>=600&&DEFAULT_QUESTIONS.length<=800);
  assert.equal(new Set(DEFAULT_QUESTIONS.map(item=>item.id)).size,DEFAULT_QUESTIONS.length);
  assert.equal(new Set(DEFAULT_QUESTIONS.map(item=>item.title)).size,DEFAULT_QUESTIONS.length);
  for(const item of DEFAULT_QUESTIONS){
    assert.ok(item.category); assert.ok(item.title); assert.ok(item.hint); assert.ok(item.reference.length>=20,`${item.id} needs a useful reference answer`);
    assert.ok(item.keyPoints.length>=3,`${item.id} needs at least 3 key points`);
    assert.ok([1,2,3].includes(item.difficulty));
    assert.ok(item.roleIds?.length,`${item.id} needs a role`);
    assert.ok(item.levels?.length,`${item.id} needs a career level`);
  }
  const categories=new Set(DEFAULT_QUESTIONS.map(item=>item.category));
  for(const required of ['Java 基础','集合框架','JVM','Java 并发','Spring','数据库','Redis','分布式']) assert.ok(categories.has(required));
});

test('bank migration preserves custom cards and existing edits without duplicates', () => {
  const edited={...DEFAULT_QUESTIONS[0],title:'用户改过的题目'};
  const custom={...DEFAULT_QUESTIONS[1],id:'custom-1',title:'我的自定义题'};
  const merged=mergeBuiltInQuestions([edited,custom]);
  assert.equal(merged.find(item=>item.id===edited.id)?.title,'用户改过的题目');
  assert.equal(merged.filter(item=>item.id===edited.id).length,1);
  assert.equal(merged.find(item=>item.id==='custom-1')?.title,'我的自定义题');
  assert.equal(merged.length,DEFAULT_QUESTIONS.length+1);
});

test('career bank covers six roles plus junior, mid and senior routes', () => {
  for(const routeId of ['java-backend','frontend','go-backend','python-backend','qa','devops']){
    const route=LEARNING_ROUTES.find(item=>item.id===routeId)!;
    const minimum=routeId==='java-backend'?250:70;
    assert.ok(questionsForRoute(DEFAULT_QUESTIONS,route).length>=minimum,`${routeId} needs at least ${minimum} curated cards`);
  }
  for(const routeId of ['junior-foundation','mid-engineering','senior-architecture']){
    const route=LEARNING_ROUTES.find(item=>item.id===routeId)!;
    assert.ok(questionsForRoute(DEFAULT_QUESTIONS,route).length>0);
  }
});

test('snapshot v7 preserves word books, prompts, retrospectives and upgraded metadata', () => {
  const customRoute={id:'jd-test',name:'JD 测试',description:'岗位路线',categories:[],questionIds:[question.id],source:'jd' as const};
  const retrospective={id:'retro-1',createdAt:'2026-08-28T00:00:00.000Z',role:'Java 后端',summary:'复盘完成',overallFeedback:'继续补强事务',strengths:['表达清楚'],weaknesses:['事务隔离'],topics:[],actionPlan:['复习'],questionIds:[question.id],transcriptPreview:'面试文字稿摘要',source:'ai' as const};
  const snapshot=createSnapshot([question],{},[],DEFAULT_SETTINGS,[],[customRoute],{streakFreezes:0,freezeDates:['2026-08-25']},[retrospective]);
  assert.equal(snapshot.version,7);assert.equal(snapshot.customRoutes[0].id,'jd-test');assert.equal(snapshot.interviewRetrospectives[0].id,'retro-1');assert.ok(snapshot.settings.prompts.interviewReview.includes('{transcript}'));assert.deepEqual(snapshot.retention.freezeDates,['2026-08-25']);assert.ok(snapshot.questions[0].levels?.length);
});

test('question bank groups 643 cards into 299 topics with five-card related sets',()=>{
  const topics=groupQuestionTopics(DEFAULT_QUESTIONS.map(normalizeQuestion));
  assert.equal(topics.length,299);assert.equal(topics.filter(topic=>topic.questions.length===5).length,86);
  assert.ok(topics.filter(topic=>topic.questions.length===5).every(topic=>new Set(topic.questions.map(card=>card.siblingKind)).size===5));
});

test('daily queue spaces related cards and buries siblings after one topic review',()=>{
  const topic=groupQuestionTopics(DEFAULT_QUESTIONS.map(normalizeQuestion)).find(item=>item.questions.length===5)!;const route={id:'topic-test',name:'主题测试',description:'',categories:[],questionIds:topic.questions.map(card=>card.id)};
  const first=buildDailyQueue(topic.questions,{},[],{...DEFAULT_SETTINGS,dailyNewLimit:5},route,now);assert.equal(first.newScheduled,1);
  const record={id:'topic-review',questionId:topic.questions[0].id,category:topic.category,score:80,rating:'good' as const,reviewedAt:now.toISOString()};
  const after=buildDailyQueue(topic.questions,{[topic.questions[0].id]:scheduleReview(topic.questions[0],undefined,'good',80,now)},[record],{...DEFAULT_SETTINGS,dailyNewLimit:5},route,now);assert.equal(after.questions.length,0);
});

test('interview plan switches between catch-up and final review phases',()=>{
  const route=LEARNING_ROUTES.find(item=>item.id==='frontend')!;const catchUp=buildInterviewStudyPlan(DEFAULT_QUESTIONS,{},route,{...DEFAULT_SETTINGS,targetDate:'2026-09-09',interviewPlanEnabled:true,dailyNewLimit:2},now);assert.equal(catchUp.phase,'catch-up');assert.ok(catchUp.dailyNewTarget>2);
  const final=buildInterviewStudyPlan(DEFAULT_QUESTIONS,{},route,{...DEFAULT_SETTINGS,targetDate:'2026-08-29',interviewPlanEnabled:true},now);assert.equal(final.phase,'final-review');assert.equal(final.dailyNewTarget,0);
});

test('retention helpers create reports, calendars, estimates and safe streak freezes', () => {
  const records=['2026-08-22','2026-08-24','2026-08-26'].map((date,index)=>({id:`r${index}`,questionId:DEFAULT_QUESTIONS[index].id,category:DEFAULT_QUESTIONS[index].category,score:70+index*10,rating:'good' as const,reviewedAt:`${date}T08:00:00.000Z`,durationSeconds:120}));
  const report=buildWeeklyReport(records,DEFAULT_QUESTIONS,now);assert.equal(report.activeDays,3);assert.equal(report.reviews,3);assert.equal(report.minutes,6);
  const calendar=learningCalendar(records,{},7,now);assert.equal(calendar.length,7);assert.equal(calendar.at(-1)?.completed,1);
  const frontendRoute=LEARNING_ROUTES.find(item=>item.id==='frontend')!;
  const completion=estimateCompletion(DEFAULT_QUESTIONS,{},frontendRoute,{...DEFAULT_SETTINGS,dailyNewLimit:5},now);assert.equal(completion.days,Math.ceil(questionsForRoute(DEFAULT_QUESTIONS,frontendRoute).length/5));
  const frozen=consumeStreakFreeze(DEFAULT_RETENTION,records,new Date('2026-08-28T08:00:00.000Z'));assert.equal(frozen?.streakFreezes,0);assert.deepEqual(frozen?.freezeDates,['2026-08-27']);
  assert.equal(reviewStreak(records,new Date('2026-08-28T08:00:00.000Z'),['2026-08-27']),2);
});

test('adaptive daily limits reduce overload and reward stable completion', () => {
  const weak=Array.from({length:3},(_,index)=>({id:`w${index}`,questionId:question.id,category:question.category,score:45,rating:'hard' as const,reviewedAt:`2026-08-${24+index}T08:00:00.000Z`}));
  const reduced=adaptiveDailyLimits(weak,{...DEFAULT_SETTINGS,dailyNewLimit:10,dailyGoal:30},now);assert.ok(reduced.newLimit<10);assert.ok(reduced.reviewLimit<30);
  const strong=Array.from({length:6},(_,index)=>({id:`s${index}`,questionId:question.id,category:question.category,score:90,rating:'easy' as const,reviewedAt:`2026-08-${21+index}T08:00:00.000Z`}));
  const increased=adaptiveDailyLimits(strong,{...DEFAULT_SETTINGS,dailyNewLimit:5,dailyGoal:20},now);assert.equal(increased.newLimit,6);assert.equal(increased.reviewLimit,25);
});

test('auth redirects accept safe destinations and reject ambiguous URLs', () => {
  assert.equal(safeAuthUrl('/auth/github?return_to=%2F'),'/auth/github?return_to=%2F');
  assert.equal(safeAuthUrl('https://accounts.example.com/sign-in'),'https://accounts.example.com/sign-in');
  assert.equal(safeAuthUrl('//evil.example/sign-in'),undefined);
  assert.equal(safeAuthUrl('/\\evil.example'),undefined);
  assert.equal(safeAuthUrl('http://accounts.example.com/sign-in'),undefined);
  assert.equal(safeAuthUrl('https://user:secret@accounts.example.com/sign-in'),undefined);
});

test('proxy secret comparison requires exact content and length', () => {
  assert.equal(safeEqual('same-secret','same-secret'),true);
  assert.equal(safeEqual('same-secret','other-value'),false);
  assert.equal(safeEqual('short','shorter'),false);
});
