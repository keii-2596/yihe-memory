import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_QUESTIONS, dueQuestions, mergeBuiltInQuestions, parseImportedCards, reviewStreak, scheduleReview } from './model.ts';

const now = new Date('2026-08-26T08:00:00.000Z');
const question = DEFAULT_QUESTIONS[0];

test('new cards receive increasing intervals by rating', () => {
  assert.equal(scheduleReview(question, undefined, 'again', 60, now).interval, 10 / 1440);
  assert.equal(scheduleReview(question, undefined, 'hard', 70, now).interval, 1);
  assert.equal(scheduleReview(question, undefined, 'good', 80, now).interval, 3);
  assert.equal(scheduleReview(question, undefined, 'easy', 90, now).interval, 7);
});

test('scheduled cards disappear until their review time', () => {
  const item = scheduleReview(question, undefined, 'good', 85, now);
  assert.equal(dueQuestions([question], { [question.id]:item }, new Date('2026-08-27T08:00:00.000Z')).length, 0);
  assert.equal(dueQuestions([question], { [question.id]:item }, new Date('2026-08-30T08:00:00.000Z')).length, 1);
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

test('CSV and Markdown can be imported as cards', () => {
  const csv=parseImportedCards('题目,分类,评分要点,参考答案\n什么是索引？,数据库,加速查询|空间换时间,索引是有序数据结构','cards.csv');
  const markdown=parseImportedCards('# TCP 三次握手\n- 确认双方收发能力\n- 同步序列号','cards.md');
  assert.equal(csv.length,1); assert.deepEqual(csv[0].keyPoints,['加速查询','空间换时间']);
  assert.equal(markdown.length,1); assert.equal(markdown[0].keyPoints.length,2);
});

test('built-in Java bank is complete and structurally valid', () => {
  assert.ok(DEFAULT_QUESTIONS.length>=160);
  assert.equal(new Set(DEFAULT_QUESTIONS.map(item=>item.id)).size,DEFAULT_QUESTIONS.length);
  assert.equal(new Set(DEFAULT_QUESTIONS.map(item=>item.title)).size,DEFAULT_QUESTIONS.length);
  for(const item of DEFAULT_QUESTIONS){
    assert.ok(item.category); assert.ok(item.title); assert.ok(item.reference);
    assert.ok(item.keyPoints.length>=3,`${item.id} needs at least 3 key points`);
    assert.ok([1,2,3].includes(item.difficulty));
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
