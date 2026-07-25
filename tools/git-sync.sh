#!/bin/bash
# ============================================================
# git-sync.sh - 足球搭子项目 日常同步脚本
# ============================================================
# 用途: 一键同步 frontend + backend + docs 到 GitHub
# 作者: 懂王 (for 宏哥)
# 日期: 2026-07-25
# 用法:
#   ./git-sync.sh "commit message"     # 自定义 commit 信息
#   ./git-sync.sh                      # 自动生成默认 commit 信息 (chore: 同步更新)
# ============================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 路径定义
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
DOCS_DIR="$PROJECT_ROOT/docs"

# 函数: 打印带颜色的消息
info() { echo -e "${BLUE}ℹ ${NC}$1"; }
ok() { echo -e "${GREEN}✅ ${NC}$1"; }
warn() { echo -e "${YELLOW}⚠️  ${NC}$1"; }
err() { echo -e "${RED}❌ ${NC}$1"; }

# 函数: 检测仓库是否有改动
has_changes() {
    local dir=$1
    cd "$dir"
    # 检查是否有 uncommitted 改动 或 未推送的 commits
    if [ -n "$(git status --porcelain)" ]; then
        return 0  # 有改动
    fi
    local ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0)
    if [ "$ahead" -gt 0 ]; then
        return 0  # 有未推送
    fi
    return 1  # 干净
}

# 函数: 同步单个仓库
sync_repo() {
    local name=$1
    local dir=$2
    local msg=$3

    info "===== 同步 $name ($dir) ====="

    if ! has_changes "$dir"; then
        ok "$name 已是最新, 跳过"
        return 0
    fi

    cd "$dir"

    # 显示改动
    echo "--- 改动文件 ---"
    git status --short | head -20
    echo ""

    # 询问是否确认
    printf "${YELLOW}提交并推送 $name? [y/N] ${NC}"
    read -n 1 -r REPLY
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "$name 取消同步"
        return 0
    fi

    # add + commit + push
    git add -A
    git commit -m "$msg" || true
    git push origin HEAD 2>&1 | tail -3
    ok "$name 同步完成"
    echo ""
}

# ============================================================
# 主流程
# ============================================================

echo "=================================================="
echo "  🚀 足球搭子项目 · Git 同步工具"
echo "=================================================="
echo ""

# 确定 commit 信息
if [ -z "$1" ]; then
    COMMIT_MSG="chore: 同步更新 $(date '+%Y-%m-%d %H:%M')"
else
    COMMIT_MSG="$1"
fi

info "commit 信息: $COMMIT_MSG"
echo ""

# 同步 frontend
sync_repo "frontend (小程序)" "$FRONTEND_DIR" "$COMMIT_MSG"

# 同步 backend
sync_repo "backend (后端)" "$BACKEND_DIR" "$COMMIT_MSG"

# docs 不在 git 仓库内（暂存）, 但提示用户
if [ -d "$DOCS_DIR" ]; then
    info "docs/ 目录 (本地管理, 不推送)"
    echo "  └─ 如需推送 docs, 建议: 复制到 frontend/docs 后 git add"
fi

echo ""
echo "=================================================="
ok "🎉 同步完成"
echo "=================================================="