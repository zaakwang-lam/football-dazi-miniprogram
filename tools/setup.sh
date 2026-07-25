#!/bin/bash
# ============================================================
# setup.sh - 足球搭子项目 Git 工作流 首次配置脚本
# ============================================================
# 用途: 一键配置 shell aliases + 验证工具可用性
# 作者: 懂王 (for 宏哥)
# 日期: 2026-07-25
# 用法: ./setup.sh
# ============================================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}ℹ ${NC}$1"; }
ok() { echo -e "${GREEN}✅ ${NC}$1"; }
warn() { echo -e "${YELLOW}⚠️  ${NC}$1"; }
err() { echo -e "${RED}❌ ${NC}$1"; }

TOOLS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$TOOLS_DIR/.." && pwd)"

echo "=================================================="
echo "  🛠️  足球搭子项目 · Git 工作流 首次配置"
echo "=================================================="
echo ""

# ============================================================
# 1. 检查脚本可执行权限
# ============================================================
info "Step 1: 检查脚本权限..."

for script in git-sync.sh release.sh; do
    if [ -x "$TOOLS_DIR/$script" ]; then
        ok "$script 可执行"
    else
        warn "$script 不可执行, 修复中..."
        chmod +x "$TOOLS_DIR/$script"
        ok "$script 权限已修复"
    fi
done

echo ""

# ============================================================
# 2. 配置 shell aliases
# ============================================================
info "Step 2: 配置 shell aliases..."

ALIASES="
# === 足球搭子项目 Git 工作流 (2026-07-25 by 懂王) ===
alias dz-sync='$TOOLS_DIR/git-sync.sh'
alias dz-rel='$TOOLS_DIR/release.sh'
alias dz-proj='cd $PROJECT_ROOT'
"

configure_rc() {
    local rc=$1
    local rc_name=$(basename "$rc")

    if [ ! -f "$rc" ]; then
        info "$rc_name 不存在, 跳过 (创建空文件可选, 默认跳过)"
        return 0
    fi

    if grep -q "dz-sync" "$rc" 2>/dev/null; then
        ok "$rc_name 已配置 dz-sync, 跳过"
    else
        echo "$ALIASES" >> "$rc"
        ok "$rc_name 已追加 dz aliases"
    fi
}

configure_rc "$HOME/.bash_profile"
configure_rc "$HOME/.zshrc"

echo ""

# ============================================================
# 3. 验证 git 仓库
# ============================================================
info "Step 3: 验证 git 仓库..."

check_repo() {
    local name=$1
    local dir=$2

    if [ ! -d "$dir/.git" ]; then
        err "$name 不是 git 仓库 ($dir)"
        return 1
    fi

    cd "$dir"
    local remote=$(git remote get-url origin 2>/dev/null || echo "无远程")
    local branch=$(git branch --show-current 2>/dev/null || echo "无分支")
    ok "$name: branch=$branch, remote=$remote"
}

check_repo "frontend" "$PROJECT_ROOT/frontend"
check_repo "backend" "$PROJECT_ROOT/backend"

echo ""

# ============================================================
# 4. 检查 git 配置
# ============================================================
info "Step 4: 检查 git 全局配置..."

GIT_NAME=$(git config --global user.name 2>/dev/null || echo "")
GIT_EMAIL=$(git config --global user.email 2>/dev/null || echo "")

if [ -n "$GIT_NAME" ] && [ -n "$GIT_EMAIL" ]; then
    ok "git user.name: $GIT_NAME"
    ok "git user.email: $GIT_EMAIL"
else
    warn "git 用户未配置"
    if [ -z "$GIT_NAME" ]; then
        printf "请输入 git user.name (留空跳过): "
        read input_name
        [ -n "$input_name" ] && git config --global user.name "$input_name" && ok "已设置 user.name=$input_name"
    fi
    if [ -z "$GIT_EMAIL" ]; then
        printf "请输入 git user.email (留空跳过): "
        read input_email
        [ -n "$input_email" ] && git config --global user.email "$input_email" && ok "已设置 user.email=$input_email"
    fi
fi

echo ""

# ============================================================
# 5. 测试 GitHub 连接
# ============================================================
info "Step 5: 测试 GitHub SSH 连接..."

if ssh -T -o ConnectTimeout=5 git@github.com 2>&1 | grep -q "successfully authenticated"; then
    ok "GitHub SSH 连接正常"
else
    warn "GitHub SSH 连接测试未通过 (可能是首次访问, 已有 key 但未被 GitHub 识别)"
    info "  如需推送失败, 请检查 ~/.ssh/config 和 GitHub SSH key 设置"
fi

echo ""

# ============================================================
# 6. 总结
# ===========================================================
echo "=================================================="
ok "🎉 配置完成!"
echo "=================================================="
echo ""
info "下一步:"
echo "  1. 打开新终端 (或运行: source ~/.bash_profile)"
echo "  2. 输入 dz-proj 进入项目"
echo "  3. 输入 dz-sync 测试同步"
echo ""
info "可用命令:"
echo "  dz-sync [msg]    一键同步 frontend + backend 到 GitHub"
echo "  dz-rel vX.Y.Z    打 tag + 发布版本"
echo "  dz-proj          进入项目根目录"
echo ""
info "完整文档: $TOOLS_DIR/README.md"
echo "=================================================="