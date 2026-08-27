# 认证与账号接入

忆核把“身份认证”交给可信平台或反向代理，自身只负责按稳定用户 ID 隔离学习数据。默认匿名模式不需要账号，数据只保存在当前浏览器。

## 支持的方式

### 1. 匿名本机模式

无需配置，适合个人使用、演示和静态体验。用户可随时导出完整 JSON 备份。

### 2. ChatGPT / OpenAI Sites

Sites 会提供经过验证的 `oai-authenticated-user-*` 请求头。设置 `AUTH_MODE=auto`、`AUTH_ENABLE_CHATGPT=true` 和 `AUTH_TRUST_CHATGPT_HEADERS=true`，即可显示登录入口并启用 D1 云同步。普通自托管环境必须保持后一个开关为 `false`，避免信任客户端自行构造的同名请求头。

### 3. 通用反向代理与 SSO

适合 oauth2-proxy、Authelia、Authentik 和企业网关。代理完成 GitHub、Google、OIDC 或邮箱认证后，向应用注入用户 ID、邮箱和姓名请求头，并同时注入仅服务器知道的 `x-yihe-proxy-secret`。

配置 `AUTH_PROXY_SECRET`，必要时修改 `AUTH_USER_ID_HEADER`、`AUTH_EMAIL_HEADER` 和 `AUTH_NAME_HEADER`。代理必须删除客户端自行发送的同名身份头；应用也不应绕过代理直接暴露到公网。

### 4. Cloudflare Access

只有在应用的每一条公网路径都被 Access 保护时，才设置 `AUTH_TRUST_CLOUDFLARE_ACCESS=true`。该选项会信任 Access 注入的身份头，不适合裸露的 Worker。

### 5. GitHub、Google 与邮箱验证码

可以用 Auth.js、Supabase、Clerk 或其他身份服务承载 OAuth/魔法链接页面，再将身份通过上述可信代理协议传给忆核。设置 `AUTH_GITHUB_SIGNIN_URL`、`AUTH_GOOGLE_SIGNIN_URL` 或 `AUTH_EMAIL_SIGNIN_URL` 后，设置页会展示对应入口。

这些变量只是登录入口，不等于完成身份验证；不要把 OAuth client secret 放入 `NEXT_PUBLIC_*` 变量或提交到仓库。

### 6. 开发模式

本地调试可以使用 `AUTH_MODE=development`。该模式在生产环境中自动失效，不能作为正式认证方案。

## 数据隔离

服务端使用认证提供方给出的稳定用户 ID 作为 D1 所有者键。ChatGPT 用户保持历史 ID 不变，以兼容旧版本数据；其他提供方使用命名空间前缀，避免不同系统的 ID 冲突。
