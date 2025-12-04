#!/bin/bash
# 测试 PKGBUILD 构建过程（用于 Arch Linux）

set -e

echo "🔍 检查 PKGBUILD 构建过程..."

# 检查是否在 Arch Linux 上
if ! command -v makepkg &> /dev/null; then
    echo "❌ 错误: 此脚本只能在 Arch Linux 上运行（需要 makepkg 命令）"
    exit 1
fi

echo "📦 检查依赖..."
MISSING_DEPS=()

for cmd in pnpm cargo rustc; do
    if ! command -v $cmd &> /dev/null; then
        MISSING_DEPS+=($cmd)
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo "❌ 缺少以下依赖: ${MISSING_DEPS[*]}"
    echo "请先安装: sudo pacman -S --needed base-devel rust nodejs pnpm webkit2gtk gtk3"
    exit 1
fi

echo "✅ 所有依赖已安装"

echo ""
echo "🔨 开始构建..."
echo "这可能需要几分钟..."
echo ""

# 清理之前的构建
makepkg -c 2>/dev/null || true

# 开始构建
makepkg -s

echo ""
echo "✅ 构建完成!"
echo ""
echo "📦 生成的包文件:"
ls -lh *.pkg.tar.zst 2>/dev/null || echo "未找到包文件"

echo ""
echo "💡 安装包:"
echo "   sudo pacman -U 2pass-*.pkg.tar.zst"
echo ""
echo "或重新运行构建并自动安装:"
echo "   makepkg -si"

