export type ExportableInterviewReview={
  summary:string;overallFeedback:string;strengths:string[];weaknesses:string[];
  topics:{name:string;category:string;evidence:string;priority:'high'|'medium'|'low'}[];
  actionPlan:string[];
  cards:{title:string;category:string;hint:string;keyPoints:string[];reference:string;difficulty:number}[];
  source:'ai'|'local';model?:string;
};

const bulletList=(items:string[],empty='暂无')=>items.length?items.map(item=>`- ${item}`).join('\n'):`- ${empty}`;
const priorityLabel={high:'高优先',medium:'中优先',low:'低优先'} as const;

export function interviewReviewMarkdown(result:ExportableInterviewReview,role:string,exportedAt=new Date()):string{
  const topics=result.topics.length?result.topics.map((topic,index)=>`### ${index+1}. ${topic.name}\n\n- 分类：${topic.category}\n- 优先级：${priorityLabel[topic.priority]}\n- 依据：${topic.evidence||'未提供'}`).join('\n\n'):'暂无明确主题。';
  const cards=result.cards.length?result.cards.map((card,index)=>`### ${index+1}. ${card.title}\n\n- 分类：${card.category}\n- 难度：${card.difficulty}/3\n- 提示：${card.hint||'无'}\n\n**评分要点**\n\n${bulletList(card.keyPoints)}\n\n**参考答案**\n\n${card.reference||'暂无'}`).join('\n\n---\n\n'):'暂无生成题目。';
  return `# 面试复盘 · ${role||'技术岗位'}\n\n> 导出时间：${exportedAt.toLocaleString('zh-CN',{hour12:false})}\n> 复盘方式：${result.source==='ai'?'AI 分析':'本地提取'}${result.model?` · ${result.model}`:''}\n> 隐私说明：本文件不包含原始录音和完整面试文字稿。\n\n## 本次结论\n\n${result.summary}\n\n## 教练反馈\n\n${result.overallFeedback}\n\n## 做得不错\n\n${bulletList(result.strengths,'未识别出足够明确的优势证据')}\n\n## 优先补强\n\n${bulletList(result.weaknesses,'暂未识别出明确的知识缺口')}\n\n## 重点主题\n\n${topics}\n\n## 下一步行动\n\n${result.actionPlan.length?result.actionPlan.map((item,index)=>`${index+1}. ${item}`).join('\n'):'暂无行动建议'}\n\n## 复习题\n\n${cards}\n`;
}

export function interviewReviewFileName(role:string,date=new Date()):string{
  const safeRole=(role||'技术岗位').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').replace(/\s+/g,'-').slice(0,40)||'技术岗位';
  const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  return `忆核面试复盘-${safeRole}-${day}.md`;
}
