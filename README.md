# 足球搭子 · 广州业余足球场地预订小程序

> 微信小程序 · 运动风 + 圆角设计 · 完整 MVP 实现

---

## 🚀 3 步导入微信开发者工具

```bash
# 1. 打开微信开发者工具
# 2. 项目目录选择：
/Users/zehong/Desktop/懂王专属/市场分析/广州足球小程序开发

# 3. AppID 选择「测试号」 → 点击「导入」→ 即可预览
```

📖 **详细教程见：`微信开发者工具导入教程.md`**

---

## ✅ 已完成功能（PRD 全覆盖）

| 模块 | 页面数 | 状态 |
|------|--------|------|
| 🏠 首页（P1） | 1 | ✅ 完成 |
| ⚽ 场地预订（PRD §4.A） | 4 | ✅ 完成 |
| 👥 凑人约战（PRD §4.B） | 3 | ✅ 完成 |
| 🏆 球队管理（PRD §4.C） | 5 | ✅ 完成 |
| 👤 用户中心（PRD §4.D） | 2 | ✅ 完成 |
| 📋 订单管理 | 2 | ✅ 完成 |
| **总计** | **17 个页面** | ✅ MVP 100% |

---

## 🎨 设计系统

- **主色**：活力橙 `#FF6B00`
- **圆角**：按钮全圆角 + 卡片 24rpx
- **渐变**：3 套运动风渐变（橙/蓝/绿）
- **字体**：PingFang SC / 思源黑体

---

## 📂 项目结构

```
广州足球小程序开发/
├── app.js / app.json / app.wxss    # 全局
├── pages/
│   ├── index/         # 首页
│   ├── court/         # 场地（list/detail/book/eval）
│   ├── lfg/           # 凑人（lfg/detail/publish）
│   ├── team/          # 球队（team/detail/create/checkin/aa）
│   ├── order/         # 订单（list/detail）
│   ├── mine/          # 个人中心
│   └── login/         # 登录
├── utils/
│   ├── api.js         # 模拟接口（替换为真实 API）
│   └── util.js        # 工具函数
├── images/tab/        # 4 个 tabBar 图标（PNG）
└── 微信开发者工具导入教程.md
```

---

## 🔌 接入真实后端

修改 `utils/api.js`，把 `setTimeout + resolve` 替换为 `wx.request`：

```js
getNearbyCourts(params = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://your-api.com/api/v1/courts/nearby',
      method: 'GET',
      data: params,
      header: { Authorization: wx.getStorageSync('token') },
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}
```

API 接口完整定义见 PRD 第八章。

---

## 📊 数据来源

- **mock 数据**：内置于 `utils/api.js`
- **真实数据**：替换为后端 API 后即可使用
- **图片资源**：当前用 emoji 占位，上线时替换为场地方实际图片

---

## 📞 问题反馈

- 编译报错 → 检查 `images/tab/` 目录 PNG 文件
- 页面空白 → 检查 `app.json` 中页面路径是否正确
- tabBar 不显示 → 重新生成 8 个 PNG 图标（见教程 §2）

---

**项目状态**：✅ 可立即导入预览
**完成时间**：2026-07-23
**作者**：懂王 · 林泽宏专属 AI 策略专家