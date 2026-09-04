import test from 'node:test';
import assert from 'node:assert/strict';
import { interviewReviewFileName, interviewReviewMarkdown } from './interview-export.ts';

test('interview review exports a private, complete markdown report',()=>{
  const markdown=interviewReviewMarkdown({summary:'整体结论',overallFeedback:'教练反馈',strengths:['表达清楚'],weaknesses:['TLS 不熟'],topics:[{name:'TLS 握手',category:'网络安全',evidence:'未能说明证书校验',priority:'high'}],actionPlan:['复习 TLS'],cards:[{title:'HTTPS 如何验证证书？',category:'网络安全',hint:'从信任链思考',keyPoints:['证书链','域名校验'],reference:'浏览器会验证证书链和域名。',difficulty:2}],source:'ai',model:'test-model'},'Java 后端',new Date('2026-09-04T08:00:00Z'));
  assert.match(markdown,/# 面试复盘 · Java 后端/);assert.match(markdown,/## 下一步行动/);assert.match(markdown,/## 复习题/);assert.match(markdown,/浏览器会验证证书链和域名/);assert.match(markdown,/不包含原始录音和完整面试文字稿/);
  assert.equal(interviewReviewFileName('Java / 支付',new Date(2026,8,4)),'忆核面试复盘-Java---支付-2026-09-04.md');
});
