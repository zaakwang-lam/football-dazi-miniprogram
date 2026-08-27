# 📋 足球搭子 · CHANGELOG

> 项目演进记录 · 微信小程序「足球搭子」+ 配套后端 / 管理后台 / 文档
> **当前版本**: v0.1.0 (2026-07-25)
> **遵循规范**: [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)
> **版本格式**: [语义化版本](https://semver.org/lang/zh-CN/) (Semantic Versioning)

---

## 🚧 [未发布] / Unreleased

### 🔄 变更 (Changed)

- ♻️ **appid 切换到企业新主体** `wxb3f1e355853399c8`（`ebb0a12`）→ 上传版本 `v1.3.2` 已在 mp 后台可见

### 计划中

- 🔲 SSL 证书申请（腾讯云免费证书）
- 🔲 微信个人主体认证
- 🔲 ICP 备案（预计 8/15 完成）
- 🔲 PRD v2.1：补充阶段 A 个人号切到阶段 B 企业号的迁移 SOP
- 🔲 Git 工作流实操：`dz-sync` 首次正式推送

---

## [v0.1.0] - 2026-07-25 🎉 首个 MVP

> 🎯 **里程碑**: PRD v2 个人号方案定稿 · 前端 17 页面 MVP · 后端 monorepo v1 · Git 工作流就绪
> **Git 仓库**:
> - frontend: `zaakwang-lam/football-dazi-miniprogram`
> - backend: `zaakwang-lam/football-dazi-backend`

### ✨ 新增 (Added)

#### 前端 (frontend · 小程序)
- ✅ **17 个页面 MVP 完整开发**（覆盖 5 大模块：场地/凑人/球队/订单/我的）
  - `pages/court/`: list / detail / book / eval (4 页)
  - `pages/lfg/`: lfg / detail / publish (3 页)
  - `pages/team/`: team / detail / create / checkin / aa (5 页)
  - `pages/order/`: list / detail (2 页)
  - `pages/index/` / `pages/login/` / `pages/mine/` (3 页)
- ✅ Tab 图标（4 个 tab × 普通/选中态 = 8 张 PNG）
- ✅ `utils/api.js` 统一接口封装
- ✅ `utils/util.js` 时间格式化 / 防抖 / Toast / 分享

#### 后端 (backend · monorepo)
- ✅ **Node.js + Express 后端**
  - 13 个 Sequelize 模型（User/Court/Order/Team/AaPayment/...）
  - 7 个 controller（auth/court/lfg/order/team/dashboard）
  - JWT + Refresh Token 鉴权
  - 错误处理 / 日志 / 数据库工具
- ✅ **admin-web (Vue 3 + Vite)**
  - 场地方后台 (`/admin/court`) + 平台运营后台 (`/admin/ops`)
  - 13 个 Vue 组件 + 路由 + 状态管理
  - Dockerfile + Nginx 反代配置
- ✅ **nginx 配置**：`/admin` 反代 admin-web
- ✅ **docker-compose.yml**：一键启动 backend + admin-web + nginx
- ✅ `DEPLOY.md` 完整部署手册

#### 文档 (docs/)
- ✅ `PRD_v2_个人号方案_20260725.md` — 当前 PRD（个人号 MVP + 内置交易代码等企业号切换）
- ✅ `跟进事项清单_20260725.md` — 15 项任务状态全景
- ✅ `项目进度甘特图_20260725.html` — 12 周开发计划可视化
- ✅ `backend/后端管理系统PRD.md` — B 端后台 PRD
- ✅ `backend/支付系统PRD.md` — 支付系统 PRD（内置代码待启用）
- ✅ `backend/运营物料/` — 5 份运营 SOP（用户协议/隐私政策/入驻申请/推广/客服）

#### Git 工作流 🛠️
- ✅ `frontend/tools/setup.sh` — 首次配置（shell aliases + 环境验证）
- ✅ `frontend/tools/git-sync.sh` — 一键同步 frontend + backend 到 GitHub
- ✅ `frontend/tools/release.sh` — 打 tag + 版本发布 + 自动生成 release notes
- ✅ `frontend/tools/README.md` — 完整使用文档
- ✅ Shell aliases: `dz-sync` / `dz-rel` / `dz-proj`（写入 `~/.bash_profile` 和 `~/.zshrc`）
- ✅ `docs/legacy/广州足球场地预订PRD.docx/.html` — v1.0 企业版 PRD（已归档）

### 🔧 修复 (Fixed)

- 🐛 修复后端在 `wx.login` 失败时崩溃的 bug (`ead63ea`)
- 🐛 修复 Sequelize 模型关联冲突 (`aed843d`)
- 🐛 修复场地排期接口 500 错误（DATEONLY 字段不是 Date 对象）(`58e246f`)
- 🐛 删掉 `auth.js` 中重复的 `logger require` (`8ee1749`)
- 🐛 撤掉 admin login debug 日志（已定位问题）(`812d007`)
- 🐛 修正小程序 AppID 为 `wx3971d03720057db3` (`5d7e0cc`)

### 📝 文档 (Documentation)

- 📚 完整 DEPLOY.md 部署手册（backend）(`f823a69`)
- 📚 微信开发者工具导入教程（frontend）—— 已更新到新路径
- 📚 README.md（frontend + backend + tools 三个仓库各自有）

### 🔄 重构 (Changed)

- ♻️ **小程序切换到正式 AppID** `wxb3f1e355853399c8` (`2579d76`) → 最终修正为 `wx3971d03720057db3`
- ♻️ **apiBase 演进**：
  - 初版：本地 mock
  - 中间版：云服务器 IP `43.136.84.244` (`383f131`)
  - 当前：Cloudflare Tunnel HTTPS 域名 (`cdb0730`)
- ♻️ **项目结构整合**：从 `市场分析/广州足球小程序开发` + `市场分析/足球搭子后端` 整合到统一目录 `懂王专属/足球搭子项目/`（frontend + backend + docs）
- ♻️ **后端 monorepo 化**：从分散的 backend / admin-web 合并到 monorepo，admin-web 嵌套 git 已排除 (`48562a4`)

### 🗑️ 移除 (Removed)

- ❌ 后端仓库的 `docs/` 目录（已迁移到项目级 `docs/backend/`）(`bc77af9`)

---

## 🎯 版本里程碑路线图

| 版本 | 目标 | 预计时间 | 状态 |
|------|------|---------|------|
| **v0.1.0** | MVP 完整开发 + 文档就绪 | 2026-07-25 | ✅ 当前 |
| **v0.2.0** | 个人号备案完成 + 内测上线 | 2026-08-15 | 📋 计划中 |
| **v0.3.0** | 种子用户运营（50+ 球员）+ 场地签约（5+ 场地方） | 2026-09-30 | 📋 计划中 |
| **v1.0.0** | 企业号 + 微信支付 + 完整交易闭环 | 营业执照下来后 1-2 周 | 📋 待启动 |

---

## 📊 关键数据（v0.1.0 快照）

| 指标 | 数值 |
|------|------|
| 前端页面 | 17 个 |
| 后端模型 | 13 个 |
| 后端 controllers | 7 个 |
| API 接口 | 42 个 |
| Vue 组件 | 13 个 |
| 文档（PRD/SOP/教程） | 11 份 |
| GitHub commits（frontend） | 11 个 |
| GitHub commits（backend） | 11 个 |
| 代码总行数（不含 lock/node_modules） | ~5000 行 |

---

## 🔗 相关资源

- **PRD v2 当前版**: `docs/PRD_v2_个人号方案_20260725.md`
- **跟进事项清单**: `docs/跟进事项清单_20260725.md`
- **甘特图**: `docs/项目进度甘特图_20260725.html`
- **GitHub frontend**: https://github.com/zaakwang-lam/football-dazi-miniprogram
- **GitHub backend**: https://github.com/zaakwang-lam/football-dazi-backend
- **Git 工作流工具**: `frontend/tools/`

---

## 📝 更新日志维护规则

每次 `dz-rel` 发布新版本时：

1. 在本文档顶部 `[未发布]` 区域写新版本条目
2. `dz-rel` 会自动生成 commit 列表，但人工要补充：
   - 用户可见的功能（不仅是技术 commit）
   - 业务决策（PRD 变更、运营调整）
   - 数据里程碑
3. 把 `[未发布]` 内容移到新版本号下
4. 推送到 GitHub

---

_最后更新: 2026-07-25 · v0.1.0 发布_