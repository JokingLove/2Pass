#!/bin/bash
# 本地构建脚本 - 用于在 macOS 上测试构建

set -e

echo "🔨 开始本地构建..."

# 检查依赖
if ! command -v pnpm &> /dev/null; then
    echo "❌ 错误: 未安装 pnpm"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ 错误: 未安装 Rust/Cargo"
    exit 1
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
pnpm install

# 构建前端
echo "🎨 构建前端..."
pnpm build

# 构建 Rust 后端
echo "🦀 构建 Rust 后端..."
cd src-tauri
cargo build --release

echo "✅ 构建完成!"
echo ""
echo "📍 二进制文件位置:"
echo "   src-tauri/target/release/2pass"
echo ""
echo "🚀 运行应用:"
echo "   ./src-tauri/target/release/2pass"

