# 留存与提醒

忆核会在本地计算周报、连续学习、六周日历、路线完成预测和动态每日任务量。分享周报时只包含学习天数、次数、新学数量和平均分，不包含账号、原回答、题目详情或 API Key。

## 动态任务量

开启“动态调整每日任务”后，系统读取当前用户最近 7 天的活跃天数与平均得分：负担偏高时缩减约 20%—30%，稳定高质量完成时小幅增加。到期复习始终优先；存在复习积压时暂停引入新知识。

## 邮箱和企业微信

登录用户可以在设置页保存邮箱或企业微信群机器人 Webhook。个人微信没有稳定的官方机器人接口，因此本项目不模拟个人微信推送。

部署者需要配置：

- `REMINDER_CRON_SECRET`：保护 `/api/reminders/dispatch` 的随机长密钥。
- `RESEND_API_KEY` 与 `REMINDER_EMAIL_FROM`：启用邮箱发送。

外部定时器每天或每 5—15 分钟调用一次：

```bash
curl -X POST https://your-domain.example/api/reminders/dispatch \
  -H "Authorization: Bearer $REMINDER_CRON_SECRET"
```

调度接口会按每个订阅者的时区和提醒时间判断是否发送，并保证同一自然日每个渠道最多发送一次。企业微信群消息直接通过用户提供的 `qyapi.weixin.qq.com` Webhook 发送；Webhook 不会返回给浏览器，只显示掩码。
