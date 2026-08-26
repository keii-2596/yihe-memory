import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_QUESTIONS, dueQuestions, reviewStreak, scheduleReview } from './model.ts';

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
