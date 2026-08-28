# 忆核（Yihe Memory）

面向 Java 面试知识的开源 AI 间隔重复学习应用。用户用文字或语音回答开放题，系统按概念覆盖、准确性与表达质量给出反馈，再通过个性化间隔调度安排复习。

## 核心能力

- 163 道内置 Java 八股卡片，覆盖语言基础、集合、JVM、并发、Spring、数据库、Redis、消息队列、分布式与系统设计
- 官方与自定义学习词书：支持复制、改名、增删知识点，以及从 JD 自动生成
- 面试复盘：上传录音或文字稿，由 AI 提取薄弱知识并生成复习题与专属词书
- Prompt 工作台：判题、追问、制卡、JD、转写和复盘均可在前端自定义提示词
- AI 判题、个人 API 配置与连通性测试、参考答案自查、追问、本地评分回退与每日调用额度
- 文字回答、浏览器语音识别与服务端录音转写
- 分级提示、按需查看答案、间隔重复与个人预计记住率
- Anki 式免费复习控制：撤销上次复习、今天隐藏、暂停/恢复、反复遗忘筛选与自定义学习
- 每日新学/复习独立上限、复习积压保护、提醒与日历订阅
- Java、前端、Go、Python、测试、SRE 六类岗位题库，以及初级/中级/高级和公司方向路线
- 粘贴 JD 生成个人路线；从 Markdown、CSV、JSON、公开网页和 PDF 生成记忆卡
- 动态任务量、学习周报、六周日历、完成预测、隐私分享和连续学习补签卡
- 浏览器、邮箱和企业微信群提醒（邮箱/群提醒需要部署者配置发送服务）
- 回答历史、同题对比、掌握度统计与反复遗漏诊断
- JSON / CSV / Markdown 导入、AI 从材料制卡、知识包分享
- 匿名本机模式，以及可选 ChatGPT、GitHub、Google、邮箱、Cloudflare Access 和自托管 SSO 接入
- D1 账号隔离同步、离线缓存和每日版本备份；原始面试录音不会长期保存
- PWA、移动端布局、键盘操作与无障碍焦点样式

## 快速开始

需要 Node.js 22 和 pnpm 10：

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

未配置 AI 密钥时应用仍可完整运行，并使用本地评分算法。提交改动前运行：

```bash
pnpm verify
```

## AI 配置

服务端接口默认兼容 OpenAI Chat Completions：

- `AI_EVALUATION_ENDPOINT`
- `AI_EVALUATION_API_KEY`
- `AI_EVALUATION_MODEL`
- `AI_ALLOWED_ENDPOINT_HOSTS`（允许个人配置使用的额外 HTTPS 域名，逗号分隔）
- `AI_TRANSCRIPTION_ENDPOINT`
- `AI_TRANSCRIPTION_MODEL`
- `NEXT_PUBLIC_SITE_ORIGIN`

部署者密钥只保存在服务端，`GET /api/evaluate` 不会返回任何密钥。用户也可以在“设置 → AI 判题 → 配置个人 API”中填写 OpenAI Chat Completions 兼容接口、Key 和模型并测试连接。个人 Key 只进入当前标签页的 `sessionStorage`，判题时经站内服务端临时转发，不进入 D1 云同步、导出备份或服务器日志；关闭标签页后自动清除。

个人接口默认允许 OpenAI、DeepSeek、Moonshot、智谱 GLM 和阿里百炼的官方 HTTPS 域名。自托管兼容接口需要部署者把精确域名加入 `AI_ALLOWED_ENDPOINT_HOSTS`；服务端拒绝 HTTP、凭据式 URL、查询参数、非标准端口和重定向，以降低 SSRF 风险。

## 账号方案

默认无需注册，学习数据只在本机保存。开源部署者可以选择：

- OpenAI Sites 的 ChatGPT 身份；
- oauth2-proxy、Authelia、Authentik 或企业网关提供的可信身份头；
- Cloudflare Access；
- Auth.js、Supabase、Clerk 等承载的 GitHub、Google 或邮箱登录页。

详细安全边界与环境变量见 [认证接入文档](docs/AUTHENTICATION.md)。仅填写 GitHub/Google 登录 URL 不会自动完成 OAuth；身份仍必须由可信服务验证后传给应用。

所有身份头默认不受信任。Sites 部署需要显式开启 `AUTH_TRUST_CHATGPT_HEADERS`；其他部署只应开启自己已用网关保护的身份方式。

## 题库与贡献

题库结构、分类和升级规则见 [Java 题库说明](docs/QUESTION_BANK.md)，每日任务、学习词书与记忆指标见 [学习机制说明](docs/LEARNING_METHOD.md)。欢迎按 [贡献指南](CONTRIBUTING.md) 补题、纠错和改进功能。安全问题请遵循 [安全策略](SECURITY.md) 私密报告。

## 部署与存储

项目使用 Next.js/Vinext，可部署到 OpenAI Sites 或兼容 Cloudflare Workers 的环境。持久化云同步需要 D1；不绑定云存储时仍可作为本地优先应用使用。

留存与多渠道提醒的部署方式见 [留存与提醒文档](docs/RETENTION_AND_REMINDERS.md)。可安装 Android 客户端工程位于 [`android/`](android/README.md)，采用 Android 官方推荐的 Trusted Web Activity，与网页共用登录和云数据。

## 开源许可

[MIT](LICENSE) © 2026 keii-2596
