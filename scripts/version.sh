#!/bin/bash

# 版本号更新脚本
# 使用方法: ./scripts/version.sh 1.2.2

if [ -z "$1" ]; then
    echo "❌ 错误: 请提供版本号"
    echo "使用方法: ./scripts/version.sh <version>"
    echo "示例: ./scripts/version.sh 1.2.2"
    exit 1
fi

VERSION=$1

# 验证版本号格式 (简单验证: x.y.z)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ 错误: 版本号格式不正确，应为 x.y.z (例如: 1.2.2)"
    exit 1
fi

echo "🚀 开始更新版本号到 $VERSION..."
echo ""

# 更新 package.json
if [ -f "package.json" ]; then
    # macOS 使用 sed -i '', Linux 使用 sed -i
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
    else
        sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
    fi
    echo "✅ 已更新 package.json"
else
    echo "⚠️  未找到 package.json"
fi

# 更新 Cargo.toml
if [ -f "src-tauri/Cargo.toml" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
    else
        sed -i "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
    fi
    echo "✅ 已更新 src-tauri/Cargo.toml"
else
    echo "⚠️  未找到 src-tauri/Cargo.toml"
fi

# 更新 tauri.conf.json
if [ -f "src-tauri/tauri.conf.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
    else
        sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
    fi
    echo "✅ 已更新 src-tauri/tauri.conf.json"
else
    echo "⚠️  未找到 src-tauri/tauri.conf.json"
fi

echo ""
echo "✨ 版本号已全部更新到 $VERSION"
echo ""
echo "📝 下一步操作:"
echo "   1. 检查更改: git diff"
echo "   2. 提交更改: git add . && git commit -m \"chore: bump version to $VERSION\""
echo "   3. 创建标签: git tag v$VERSION"
echo "   4. 推送代码和标签: git push && git push --tags"

