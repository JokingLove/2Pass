#!/bin/bash

echo "🚀 开始构建 2Pass..."
echo ""

# 检查平台
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 检测到 macOS 平台"
    echo "将构建 DMG 和 APP 安装包"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 检测到 Linux 平台"
    echo "将构建 DEB 和 AppImage 安装包"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "🪟 检测到 Windows 平台"
    echo "将构建 MSI 和 NSIS 安装包"
fi

echo ""
echo "📦 安装依赖..."
pnpm install

echo ""
echo "🔨 开始编译..."
pnpm tauri build

echo ""
echo "✅ 构建完成！"
echo ""
echo "📂 输出位置："
echo "   src-tauri/target/release/bundle/"
echo ""

# 列出生成的文件
if [ -d "src-tauri/target/release/bundle" ]; then
    echo "生成的安装包："
    find src-tauri/target/release/bundle -type f \( -name "*.dmg" -o -name "*.app" -o -name "*.deb" -o -name "*.AppImage" -o -name "*.msi" -o -name "*.exe" \) -exec ls -lh {} \;
fi
