# 🛠️ 足球搭子项目 · Git 工作流工具

> **位置**: `~/Desktop/懂王专属/足球搭子项目/.tools/`
> **作者**: 懂王 (for 宏哥)
> **日期**: 2026-07-25

---

## 📦 工具清单

| 脚本 | 用途 | 使用频率 |
|------|------|---------|
| `git-sync.sh` | 一键同步 frontend + backend 到 GitHub | 🔥 每天/每次改动 |
| `release.sh` | 打 tag + 发布版本 + 生成 release notes | 🎯 阶段性里程碑 |

---

## 🚀 快速上手

### 1. 配置 shell aliases（一次即可）

在 `~/.zshrc` 或 `~/.bash_profile` 末尾加上：

```bash
# === 足球搭子项目 Git 工作流 ===
alias dz-sync='~/Desktop/懂王专属/足球搭子项目/.tools/git-sync.sh'
alias dz-rel='~/Desktop/懂王专属/足球搭子项目/.tools/release.sh'
```

然后：
```bash
source ~/.zshrc  # 或 ~/.bash_profile
```

### 2. 日常使用

#### 🔄 同步代码（高频）

```bash
# 在项目根目录下
cd ~/Desktop/懂王专属/足球搭子项目
dz-sync "feat: 完善场地预订页面"

# 或不写 commit 信息（自动用 "chore: 同步更新 yyyy-mm-dd hh:mm"）
dz-sync
```

脚本会：
1. ✅ 检查 frontend + backend 是否有改动
2. ✅ 列出改动文件
3. ⏸ 询问确认 (y/N)
4. ✅ add + commit + push

#### 🎯 发布版本（低频 / 里程碑）

```bash
cd ~/Desktop/懂王专属/足球搭子项目
dz-rel v0.2.0 "完成 MVP 第二阶段: 个人号方案 + 备案中"
```

脚本会：
1. ✅ 校验版本号格式 `vX.Y.Z`
2. ✅ 校验仓库干净（无未提交/未推送）
3. ✅ 自动生成 release notes (从 git log)
4. ⏸ 询问确认
5. ✅ 打 tag + 推送到 GitHub
6. 📋 输出 GitHub Release 页面 URL

---

## 🎯 工作流（推荐）

```
开发循环                    版本发布
─────────                   ────────
  改代码                       重要里程碑
    ↓                            ↓
git add .                   dz-rel v0.2.0
git commit -m "feat: ..."        ↓
    ↓                       自动 tag + 推送
dz-sync (一键推送)              ↓
                            GitHub 创建 Release
                            粘贴 release notes
```

---

## 📊 commit 规范建议

沿用你已有的格式：

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat:` | 新功能 | `feat: 完善场地预订页面` |
| `fix:` | 修复 | `fix: 修正 AppID 错误` |
| `docs:` | 文档 | `docs: 更新项目路径引用` |
| `chore:` | 构建/工具 | `chore: 同步更新 2026-07-25` |
| `refactor:` | 重构 | `refactor: 重构 api.js 错误处理` |
| `style:` | 格式 | `style: 统一缩进为 2 空格` |
| `test:` | 测试 | `test: 添加 api.js 单元测试` |

---

## ⚠️ 安全提示

1. **不要把 secrets 写进代码**
   - `.env` 文件已在 `.gitignore`，但要确认
   - API key / 密码 / token 都用环境变量

2. **大改动前先建分支**
   ```bash
   cd frontend && git checkout -b feat/新功能
   # 改完后
   git add . && git commit -m "feat: 新功能"
   git push -u origin feat/新功能
   # 在 GitHub 上提 Pull Request
   ```

3. **遇到 push 失败**
   - 通常是远程有新 commit → `git pull --rebase` 再 push
   - 或网络问题 → 重试

---

## 📞 遇到问题

1. **脚本不能执行** → `chmod +x .tools/*.sh`
2. **找不到命令** → 检查 aliases 配置
3. **git 报错** → 复制报错信息给懂王

---

_最后更新: 2026-07-25_