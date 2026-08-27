# 安全策略

请不要在公开 Issue 中披露尚未修复的安全问题。请在 GitHub 仓库的 **Security → Report a vulnerability** 中创建私密报告，并包含复现步骤、影响范围和建议修复方式。

我们会优先处理身份伪造、跨账号数据访问、密钥泄露、任意文件访问与代码执行问题。部署者应只在可信反向代理之后启用代理身份头或 Cloudflare Access 信任，并且永远不要把 AI 或 OAuth 密钥暴露给浏览器。
