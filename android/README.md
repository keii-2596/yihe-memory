# 忆核 Android

这是忆核网页端的 Trusted Web Activity（TWA）客户端。它由设备上的 Chrome 渲染，因此与网页共用登录状态、云同步、离线缓存、语音输入和 AI 判题配置；不是一个单独的数据孤岛。

## 本地构建

1. 安装 JDK 17、Android SDK 36 与 Gradle 9.1。
2. 在 `android` 目录运行 `./gradlew assembleDebug`。
3. APK 位于 `app/build/outputs/apk/debug/app-debug.apk`。

发布版需要使用长期保存的签名证书，并把证书 SHA-256 指纹填入网站的 `/.well-known/assetlinks.json`。没有匹配的 Digital Asset Links 时，应用仍会以带浏览器栏的 Custom Tab 安全打开网站。

构建任务接受 `YIHE_KEYSTORE_PATH`、`YIHE_KEYSTORE_PASSWORD`、`YIHE_KEY_ALIAS` 和 `YIHE_KEY_PASSWORD` 四个 Gradle 属性。签名文件和密码不要提交到 Git。
