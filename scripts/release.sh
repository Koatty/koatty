#!/bin/bash

# Koatty Monorepo - 统一发布脚本
# 用法: ./scripts/release.sh <package-name> [release-type] [--dry-run] [--sync] [--no-npm]
# 
# release-type: patch (默认), minor, major, prerelease
# --dry-run: 模拟运行
# --sync: 自动同步到独立仓库
# --no-npm: 跳过 npm 发布（仅更新版本）

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认参数
PACKAGE_NAME=""
RELEASE_TYPE="patch"
DRY_RUN=false
AUTO_SYNC=false
SKIP_NPM=false

# 包名映射（monorepo中的目录名 -> 独立仓库URL）
declare -A PACKAGE_REPOS=(
    ["koatty"]="https://github.com/koatty/koatty.git"
    ["koatty-router"]="https://github.com/koatty/koatty_router.git"
    ["koatty-core"]="https://github.com/koatty/koatty_core.git"
    ["koatty-container"]="https://github.com/koatty/koatty_container.git"
    ["koatty-validation"]="https://github.com/koatty/koatty_validation.git"
    ["koatty-config"]="https://github.com/koatty/koatty_config.git"
    ["koatty-exception"]="https://github.com/koatty/koatty_exception.git"
    ["koatty-serve"]="https://github.com/koatty/koatty_serve.git"
    ["koatty-trace"]="https://github.com/koatty/koatty_trace.git"
)

# 帮助信息
function show_help() {
    echo -e "${BLUE}用法:${NC}"
    echo "  ./scripts/release.sh <package-name> [release-type] [options]"
    echo ""
    echo -e "${BLUE}Release Type:${NC}"
    echo "  patch       补丁版本 (默认, 1.0.0 -> 1.0.1)"
    echo "  minor       次版本 (1.0.0 -> 1.1.0)"
    echo "  major       主版本 (1.0.0 -> 2.0.0)"
    echo "  prerelease  预发布版本 (1.0.0 -> 1.0.1-0)"
    echo ""
    echo -e "${BLUE}选项:${NC}"
    echo "  --dry-run   模拟发布流程，不实际执行"
    echo "  --sync      发布成功后自动同步到独立仓库"
    echo "  --no-npm    跳过 npm 发布，仅更新版本"
    echo ""
    echo -e "${BLUE}示例:${NC}"
    echo "  ./scripts/release.sh koatty-router"
    echo "  ./scripts/release.sh koatty-router patch"
    echo "  ./scripts/release.sh koatty-router minor --sync"
    echo "  ./scripts/release.sh koatty-router major --dry-run"
    echo "  ./scripts/release.sh koatty-router prerelease"
    echo "  ./scripts/release.sh koatty-core --no-npm  # 仅更新版本，不发布到 npm"
    echo ""
    echo -e "${BLUE}等价命令:${NC}"
    echo "  npm run release          -> ./scripts/release.sh <pkg> patch"
    echo "  npm run release:minor    -> ./scripts/release.sh <pkg> minor"
    echo "  npm run release:major    -> ./scripts/release.sh <pkg> major"
    echo "  npm run release:pre      -> ./scripts/release.sh <pkg> prerelease"
    echo ""
    echo -e "${BLUE}支持的包:${NC}"
    for package in "${!PACKAGE_REPOS[@]}"; do
        echo "  - $package"
    done | sort
    echo ""
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --sync)
            AUTO_SYNC=true
            shift
            ;;
        --no-npm)
            SKIP_NPM=true
            shift
            ;;
        *)
            if [ -z "$PACKAGE_NAME" ]; then
                PACKAGE_NAME=$1
            elif [ -z "$RELEASE_TYPE" ] || [ "$RELEASE_TYPE" = "patch" ]; then
                RELEASE_TYPE=$1
            fi
            shift
            ;;
    esac
done

# 验证参数
if [ -z "$PACKAGE_NAME" ]; then
    show_help
    exit 0
fi

# 验证 release type
case $RELEASE_TYPE in
    patch|minor|major|prerelease)
        ;;
    *)
        echo -e "${RED}错误: 无效的 release type: $RELEASE_TYPE${NC}"
        echo "支持的类型: patch, minor, major, prerelease"
        exit 1
        ;;
esac

PACKAGE_DIR="packages/$PACKAGE_NAME"
ROOT_DIR=$(pwd)

# 检查包目录是否存在
if [ ! -d "$PACKAGE_DIR" ]; then
    echo -e "${RED}错误: 包目录 $PACKAGE_DIR 不存在${NC}"
    exit 1
fi

# 检查是否安装了 standard-version
if ! command -v standard-version &> /dev/null; then
    echo -e "${RED}错误: 未安装 standard-version${NC}"
    echo "请运行: npm install -g standard-version"
    exit 1
fi

# 进入包目录
cd "$PACKAGE_DIR"

# 验证当前目录
CURRENT_DIR=$(pwd)
echo -e "${CYAN}当前目录:${NC}   $CURRENT_DIR"

# 读取当前版本信息
PACKAGE_JSON_NAME=$(node -p "require('./package.json').name")
CURRENT_VERSION=$(node -p "require('./package.json').version")

# 验证包名匹配
EXPECTED_PKG_NAME=$(echo "$PACKAGE_NAME" | sed 's/-/_/g')
if [[ "$PACKAGE_JSON_NAME" != "koatty_"* ]] && [[ "$PACKAGE_JSON_NAME" != "koatty" ]]; then
    echo -e "${RED}错误: package.json 中的包名格式不正确: $PACKAGE_JSON_NAME${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Koatty 包发布流程${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${CYAN}包名:${NC}       $PACKAGE_JSON_NAME"
echo -e "${CYAN}当前版本:${NC}   $CURRENT_VERSION"
echo -e "${CYAN}发布类型:${NC}   $RELEASE_TYPE"
echo -e "${CYAN}包目录:${NC}     $PACKAGE_DIR"
if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}模式:${NC}       ${YELLOW}DRY RUN${NC}"
fi
if [ "$SKIP_NPM" = true ]; then
    echo -e "${CYAN}NPM发布:${NC}    ${YELLOW}跳过${NC}"
fi
if [ "$AUTO_SYNC" = true ]; then
    echo -e "${CYAN}自动同步:${NC}   ${GREEN}启用${NC}"
fi
echo ""

# 检查是否登录 npm (除非跳过 npm 发布)
if [ "$SKIP_NPM" = false ] && [ "$DRY_RUN" = false ]; then
    if ! npm whoami &> /dev/null; then
        echo -e "${RED}错误: 未登录 npm${NC}"
        echo "请先运行: npm login"
        exit 1
    fi
    NPM_USER=$(npm whoami)
    echo -e "${GREEN}✓${NC} npm 用户: $NPM_USER"
    echo ""
fi

# 检查是否有未提交的变更
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}警告: 检测到未提交的变更${NC}"
    echo ""
    git status --short
    echo ""
    if [ "$DRY_RUN" = false ]; then
        read -p "是否继续? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}步骤 1/6: 运行测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if npm test; then
    echo -e "${GREEN}✓${NC} 测试通过"
else
    echo -e "${RED}✗${NC} 测试失败"
    exit 1
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}步骤 2/6: 构建项目${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if npm run build; then
    echo -e "${GREEN}✓${NC} 构建成功"
else
    echo -e "${RED}✗${NC} 构建失败"
    exit 1
fi

# 检查 dist 目录
if [ ! -d "dist" ]; then
    echo -e "${RED}错误: dist 目录不存在${NC}"
    exit 1
fi

# 验证 workspace:* 依赖
if grep -q "workspace:\*" dist/package.json 2>/dev/null; then
    echo -e "${RED}✗ 错误: dist/package.json 仍包含 workspace:* 依赖${NC}"
    echo -e "${YELLOW}提示: 请确保 build:fix 步骤在构建脚本中${NC}"
    echo ""
    echo "发现的 workspace:* 依赖:"
    grep "workspace:\*" dist/package.json
    echo ""
    exit 1
fi
echo -e "${GREEN}✓${NC} 构建产物验证通过"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}步骤 3/6: 更新版本 (standard-version)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 构建 standard-version 参数
# 在monorepo中，每个包使用独立的tag格式: packagename@version
TAG_PREFIX="${PACKAGE_NAME}@"
SV_ARGS="--tag-prefix \"$TAG_PREFIX\""

case $RELEASE_TYPE in
    prerelease)
        SV_ARGS="$SV_ARGS --prerelease"
        ;;
    major)
        SV_ARGS="$SV_ARGS --release-as major"
        ;;
    minor)
        SV_ARGS="$SV_ARGS --release-as minor"
        ;;
    patch)
        SV_ARGS="$SV_ARGS --release-as patch"
        ;;
esac

if [ "$DRY_RUN" = true ]; then
    SV_ARGS="$SV_ARGS --dry-run"
fi

echo "运行: standard-version $SV_ARGS"
echo "Tag格式: ${TAG_PREFIX}{version}"
echo ""

# 使用eval来正确处理带引号的参数
if eval "standard-version $SV_ARGS"; then
    echo -e "${GREEN}✓${NC} 版本更新成功"
else
    echo -e "${RED}✗${NC} 版本更新失败"
    exit 1
fi

# 读取新版本
NEW_VERSION=$(node -p "require('./package.json').version")
echo ""
echo -e "${GREEN}版本变更: $CURRENT_VERSION → $NEW_VERSION${NC}"
echo ""

# 如果是 dry-run，在这里停止
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}DRY RUN 模式 - 剩余步骤将被跳过${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}如果继续执行，将会:${NC}"
    echo "  4. 发布到 npm (如果未使用 --no-npm)"
    echo "  5. 创建 git tag 并推送到远程"
    echo "  6. 同步到独立仓库 (如果使用 --sync)"
    echo ""
    exit 0
fi

# 跳过 npm 发布
if [ "$SKIP_NPM" = true ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}步骤 4/6: 发布到 npm${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}跳过 npm 发布 (--no-npm)${NC}"
    echo ""
else
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}步骤 4/6: 发布到 npm${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 检查版本是否已发布
    NPM_VERSION=$(npm view "$PACKAGE_JSON_NAME" version 2>/dev/null || echo "")
    if [ "$NPM_VERSION" = "$NEW_VERSION" ]; then
        echo -e "${YELLOW}警告: 版本 $NEW_VERSION 已在 npm 上发布${NC}"
        read -p "是否继续? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    read -p "确认发布 $PACKAGE_JSON_NAME@$NEW_VERSION 到 npm? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "发布已取消"
        exit 1
    fi

    if npm publish --ignore-scripts; then
        echo -e "${GREEN}✓${NC} 发布到 npm 成功"
    else
        echo -e "${RED}✗${NC} 发布失败"
        exit 1
    fi
    echo ""
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}步骤 5/6: 推送到 Git 远程仓库${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$ROOT_DIR"

TAG_NAME="${PACKAGE_NAME}@${NEW_VERSION}"

# 推送代码和标签
echo "推送提交到远程仓库..."
if git push --follow-tags origin HEAD; then
    echo -e "${GREEN}✓${NC} 推送成功"
    echo -e "${GREEN}✓${NC} 创建 tag: $TAG_NAME"
else
    echo -e "${RED}✗${NC} 推送失败"
    exit 1
fi
echo ""

# 同步到独立仓库
if [ "$AUTO_SYNC" = true ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}步骤 6/6: 同步到独立仓库${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ -n "${PACKAGE_REPOS[$PACKAGE_NAME]}" ]; then
        echo "运行同步脚本..."
        if bash "$ROOT_DIR/scripts/sync-standalone.sh" "$PACKAGE_NAME"; then
            echo -e "${GREEN}✓${NC} 同步到独立仓库成功"
        else
            echo -e "${YELLOW}⚠${NC}  同步失败（但包已成功发布）"
        fi
    else
        echo -e "${YELLOW}⚠${NC}  未找到独立仓库配置"
    fi
else
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}步骤 6/6: 同步到独立仓库${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}跳过自动同步 (使用 --sync 启用)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 发布完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}发布信息:${NC}"
echo "  包名:   $PACKAGE_JSON_NAME"
echo "  版本:   $NEW_VERSION"
echo "  Tag:    $TAG_NAME"
echo ""
echo -e "${BLUE}下一步操作:${NC}"
echo ""
if [ "$SKIP_NPM" = false ]; then
    echo "1. 验证 npm 发布:"
    echo "   npm view $PACKAGE_JSON_NAME"
    echo ""
fi
if [ "$AUTO_SYNC" = false ] && [ -n "${PACKAGE_REPOS[$PACKAGE_NAME]}" ]; then
    echo "2. 手动同步到独立仓库:"
    echo "   ./scripts/sync-standalone.sh $PACKAGE_NAME"
    echo ""
fi
echo "3. 在 GitHub 创建 Release:"
echo "   https://github.com/koatty/koatty-monorepo/releases/new?tag=$TAG_NAME"
echo ""
if [ -n "${PACKAGE_REPOS[$PACKAGE_NAME]}" ]; then
    STANDALONE_REPO=${PACKAGE_REPOS[$PACKAGE_NAME]}
    STANDALONE_REPO_URL=$(echo "$STANDALONE_REPO" | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//')
    echo "4. 在独立仓库创建 Release:"
    echo "   $STANDALONE_REPO_URL/releases/new"
    echo ""
fi


