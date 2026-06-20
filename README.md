# 双人星图

面向手机浏览器和微信内置浏览器的双人友谊探索原型。

## 已实现

- 房间码和微信邀请链接
- 双方独立填写对方称呼
- WebSocket实时加入、确认和进度同步
- 12个核心关卡与6个可选隐藏关卡
- 当前等级、期待等级、自评和互评分离
- 一位小数的共同关系进度
- 每人最多3道实时支线加问
- 双方提交前不公开答案
- 房间令牌、24小时过期和断线重连

## 本地运行

```powershell
pnpm install
pnpm run build
pnpm run serve
```

默认地址：`http://127.0.0.1:4173`

## 微信公开访问

将构建产物和`server.mjs`部署到支持Node.js、HTTPS和WebSocket的服务即可通过微信链接打开。当前房间数据保存在服务器内存中，服务重启后会丢失；正式上线应替换为Redis或数据库，并设置独立的隐私政策、内容举报和数据删除入口。

## 验证

- `pnpm run build`
- `node scripts/capture.mjs`
- QA报告见`design-qa.md`
