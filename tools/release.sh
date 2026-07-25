#!/bin/bash
# ============================================================
# release.sh - 足球搭子项目 版本发布脚本
# ============================================================
# 用途: 打 tag + 生成 release notes + 推送到 GitHub
# 作者: 懂王 (for 宏哥)
# 日期: 2026-07-25
# 用法:
#   ./release.sh v0.2.0 "完成 MVP 第二阶段: 个人号方案 + 备案中"
#   ./release.sh                        # 交互式询问版本号和说明
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

info() { echo -e "${BLUE}ℹ ${NC}$1"; }
ok() { echo -e "${GREEN}✅ ${NC}$1"; }
warn() { echo -e "${YELLOW}⚠️  ${NC}$1"; }
err() { echo -e "${RED}❌ ${NC}$1"; }

# 路径
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

# ============================================================
# 1. 解析参数
# ============================================================
if [ -z "$1" ]; then
    printf "${YELLOW}版本号 (如 v0.2.0): ${NC}"
    read VERSION
else
    VERSION="$1"
fi

if [ -z "$2" ]; then
    printf "${YELLOW}版本说明 (一句话): ${NC}"
    read RELEASE_NOTE
else
    RELEASE_NOTE="$2"
fi

# 校验版本号格式
if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    err "版本号格式错误: $VERSION"
    echo "       应为 vX.Y.Z 格式 (如 v0.2.0)"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "  ${PURPLE}🎯 发布版本: $VERSION${NC}"
echo -e "  ${PURPLE}📝 版本说明: $RELEASE_NOTE${NC}"
echo "=================================================="
echo ""

# ============================================================
# 2. 检查仓库状态
# ============================================================
info "检查仓库状态..."

check_repo() {
    local name=$1
    local dir=$2

    cd "$dir"
    if [ -n "$(git status --porcelain)" ]; then
        err "$name 有未提交改动!"
        git status --short
        exit 1
    fi

    local ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0)
    local behind=$(git rev-list --count ..@{u} 2>/dev/null || echo 0)

    if [ "$ahead" -gt 0 ]; then
        err "$name 有 $ahead 个未推送 commit"
        exit 1
    fi

    if [ "$behind" -gt 0 ]; then
        warn "$name 落后远程 $behind 个 commit, 请先 git pull"
        exit 1
    fi

    # 检查 tag 是否已存在
    if git tag -l | grep -q "^$VERSION$"; then
        err "$name 已有 tag: $VERSION"
        exit 1
    fi

    ok "$name 干净 ✅"
}

check_repo "frontend" "$FRONTEND_DIR"
check_repo "backend" "$BACKEND_DIR"

# ============================================================
# 3. 确认发布
# ============================================================
printf "${YELLOW}确认发布 $VERSION? [y/N] ${NC}"
read -n 1 -r REPLY
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warn "取消发布"
    exit 0
fi

# ============================================================
# 4. 自动生成 release notes
# ============================================================
echo ""
info "生成 release notes..."

# 获取上一个 tag
PREV_TAG_FRONTEND=$(cd "$FRONTEND_DIR" && git describe --tags --abbrev=0 2>/dev/null || echo "")
PREV_TAG_BACKEND=$(cd "$BACKEND_DIR" && git describe --tags --abbrev=0 2>/dev/null || echo "")

RELEASE_NOTES_FILE="$PROJECT_ROOT/.tools/RELEASE_NOTES_$VERSION.md"
cat > "$RELEASE_NOTES_FILE" << EOF
# 🚀 $VERSION

> **版本说明**: $RELEASE_NOTE
> **发布日期**: $(date '+%Y-%m-%d %H:%M:%S %Z')
> **发布人**: 懂王 (for 宏哥)

---

## 📋 改动清单

### frontend (微信小程序)
EOF

if [ -n "$PREV_TAG_FRONTEND" ]; then
    cd "$FRONTEND_DIR"
    git log "$PREV_TAG_FRONTEND"..HEAD --oneline >> "$RELEASE_NOTES_FILE"
    echo "" >> "$RELEASE_NOTES_FILE"
else
    echo "- 首次发布" >> "$RELEASE_NOTES_FILE"
fi

cat >> "$RELEASE_NOTES_FILE" << EOF

### backend (后端)
EOF

if [ -n "$PREV_TAG_BACKEND" ]; then
    cd "$BACKEND_DIR"
    git log "$PREV_TAG_BACKEND"..HEAD --oneline >> "$RELEASE_NOTES_FILE"
    echo "" >> "$RELEASE_NOTES_FILE"
else
    echo "- 首次发布" >> "$RELEASE_NOTES_FILE"
fi

cat >> "$RELEASE_NOTES_FILE" << EOF

---

## 🎯 下一步

EOF

ok "Release notes 已生成: $RELEASE_NOTES_FILE"
echo ""
cat "$RELEASE_NOTES_FILE"
echo ""

# ============================================================
# 5. 打 tag + 推送
# ============================================================
info "打 tag 并推送..."

tag_and_push() {
    local name=$1
    local dir=$2

    cd "$dir"
    git tag -a "$VERSION" -m "$RELEASE_NOTE"
    git push origin "$VERSION" 2>&1 | tail -3
    ok "$name tag: $VERSION 已推送"
}

tag_and_push "frontend" "$FRONTEND_DIR"
tag_and_push "backend" "$BACKEND_DIR"

echo ""
echo "=================================================="
ok "🎉 版本 $VERSION 发布成功!"
echo ""
info "下一步建议:"
echo "  1. 访问 https://github.com/zaakwang-lam/football-dazi-miniprogram/releases"
echo "     点击 'Draft a new release' → 选择 tag $VERSION"
echo "     复制 RELEASE_NOTES_$VERSION.md 内容粘贴"
echo ""
echo "  2. 访问 https://github.com/zaakwang-lam/football-dazi-backend/releases"
echo "     同样操作"
echo ""
echo "  3. (可选) 把 RELEASE_NOTES_$VERSION.md 也提交到 frontend/docs/release-notes/"
echo "=================================================="