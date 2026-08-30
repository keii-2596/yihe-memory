# 技术面试知识库

内置知识库目前包含 299 个主题、643 道卡片，按六本岗位词书组织：

| 岗位词书 | 题数 | 主要范围 |
| --- | ---: | --- |
| Java 后端 | 263 | Java、JVM、并发、Spring、MySQL、Redis、消息与分布式系统 |
| 前端 | 80 | JavaScript、TypeScript、React、浏览器、工程化、性能与安全 |
| Go 后端 | 75 | 语言模型、并发、Runtime、网络、诊断与服务架构 |
| Python 后端 | 75 | 数据模型、运行时、异步、Web、工程、性能与安全 |
| 测试与质量 | 75 | 测试设计、自动化、接口、性能、CI、安全与可靠性 |
| SRE / 运维 | 75 | Linux、网络、容器、Kubernetes、交付、可观测性与容灾 |

Java 后端词书同时包含 163 道独立基础题和 100 道工程迁移题。其他五本词书各包含 10 道独立基础题及围绕 13–14 个主题生成的定义、机制、边界、排障和落地题。这样既保留常见八股的快速复习，也训练面试中的追问与场景表达。

其中 86 个工程主题各包含 5 张关联卡。题库页以主题为一级结构展示，卡片保留稳定的主题 ID、关联类型和顺序；每日学习会自动错开同主题卡片，避免刚答完“定义”就被“机制”题的相似内容提示答案。其余 213 道基础卡各自构成独立主题。

## 内容来源与校准方法

题库以技术官方文档为事实基线，并参考成熟面试知识库的主题组织方式。主要依据包括 [Java](https://docs.oracle.com/en/java/)、[Spring](https://docs.spring.io/spring-framework/reference/)、[MySQL](https://dev.mysql.com/doc/)、[Redis](https://redis.io/docs/latest/)、[MDN Web Docs](https://developer.mozilla.org/)、[Go](https://go.dev/doc/)、[Python](https://docs.python.org/3/) 和 [Kubernetes](https://kubernetes.io/docs/) 官方文档，以及 [JavaGuide](https://github.com/Snailclimb/JavaGuide) 与 [CS-Notes](https://github.com/CyC2018/CS-Notes) 等公开知识库的覆盖目录。题目和答案均为重新编写，不复制面经原文或第三方付费内容。

## 卡片质量标准

每张卡必须包含可独立理解的问题、渐进提示、至少三个可评分要点、参考答案、难度、岗位、级别、标签和来源。评分点用于本地匹配和 AI 判题，参考答案用于用户自查；它们不是要求用户逐字复述的唯一标准答案。

自动测试会阻止以下退化：

- 总题量低于 600 或超过 800；
- ID 或问题标题重复；
- 缺少提示、参考答案、三个评分点、合法难度或岗位元数据；
- 任一核心岗位词书少于 70 题，或 Java 后端少于 250 题。

应用升级时会按稳定 ID 补充缺失的内置卡片，同时保留用户对现有卡片的修改和自定义卡片。新增卡片的人工审核标准见 [CONTRIBUTING.md](../CONTRIBUTING.md)。
