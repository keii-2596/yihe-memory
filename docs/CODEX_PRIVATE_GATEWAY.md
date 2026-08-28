# Codex 私人账号连接（实验分支）

这一版本只面向站点所有者本人。浏览器不会接触 Codex 登录凭证；网站服务端使用共享密钥访问私人网关，网关调用本机已登录的 Codex CLI。

## 本机启动

1. 在运行网关的电脑上安装 Codex，并执行 `codex login --device-auth` 登录自己的 ChatGPT/Codex 账号。
2. 生成一个至少 24 字符的随机密钥，并设置 `YIHE_CODEX_GATEWAY_TOKEN`。
3. 执行 `pnpm codex:gateway`。默认只监听 `127.0.0.1:4317`。
4. 为网站服务端配置 `CODEX_GATEWAY_URL`、相同的 `CODEX_GATEWAY_TOKEN`，以及 `CODEX_OWNER_EMAIL` 或 `CODEX_OWNER_USER_ID`。

本地联调时，`CODEX_GATEWAY_URL` 可以使用 `http://127.0.0.1:4317`。远程网站只能配置 HTTPS 网关地址；不要把网关端口裸露到公网，应在前面使用带 TLS 的反向代理或安全隧道。

## 隔离边界

- 只有白名单中的站点登录账号可以调用 `/api/codex` 和 Codex 判题。
- Codex 凭证只存在网关机器的 Codex 配置目录中，不进入 D1、浏览器存储或学习数据备份。
- 当前网关一次只处理一个请求，并设置执行超时；网关不可用时，判题自动退回原有本地评估。
- 当前只把 Codex 接入 AI 判题。追问、制卡、JD 路线和面试复盘仍使用原有 AI 配置。

## 以后开放多用户

公开给其他用户前，需要把单一 CLI 会话升级为每用户独立的 `CODEX_HOME`、加密凭证存储、进程池、撤销授权、审计和限流。不要直接复制当前单用户网关来承载多用户。
