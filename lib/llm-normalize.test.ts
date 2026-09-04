import test from 'node:test';
import assert from 'node:assert/strict';
import { aiStringList, aiText } from './llm-normalize.ts';

test('AI object list items become readable text instead of object placeholders',()=>{
  assert.deepEqual(aiStringList([{title:'Agent 表达完整',evidence:'能解释工作流演进'},{point:'HTTPS 基础薄弱',reason:'未说明 TLS 握手'}]),['Agent 表达完整：能解释工作流演进','HTTPS 基础薄弱：未说明 TLS 握手']);
  assert.equal(aiText({summary:'先补网络基础',detail:'从 DNS 到 TLS'}),'先补网络基础：从 DNS 到 TLS');
  assert.equal(aiText({unexpected:{nested:true}},'默认内容'),'默认内容');
});
