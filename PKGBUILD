# Maintainer: Your Name <your.email@example.com>
# 本地构建版本 - 使用当前目录的源代码
pkgname=2pass
pkgver=1.2.2
pkgrel=1
pkgdesc="A secure and modern password manager built with Tauri"
arch=('x86_64')
url="https://github.com/JokingLove/2Pass"
license=('MIT')
depends=('webkit2gtk' 'gtk3')
makedepends=('rust' 'cargo' 'nodejs' 'pnpm')
source=()
sha256sums=()

prepare() {
    # 复制项目文件到构建目录（排除不必要的大型目录以加快速度）
    if command -v rsync &> /dev/null; then
        rsync -a --exclude='node_modules' --exclude='src-tauri/target' \
              --exclude='*.pkg.tar.zst' --exclude='pkg' \
              "${startdir}/" "${srcdir}/"
    else
        cp -r "${startdir}"/* "${srcdir}/"
        # 如果使用 cp，手动清理大型目录
        rm -rf "${srcdir}/node_modules" "${srcdir}/src-tauri/target" 2>/dev/null || true
    fi
    
    cd "${srcdir}"
    
    # 清理可能存在的 PKGBUILD 相关文件
    rm -f PKGBUILD *.pkg.tar.zst
    
    # 清理旧的构建产物，确保全新构建
    rm -rf dist
    
    # 安装依赖
    pnpm install
}

build() {
    cd "${srcdir}"
    
    echo "🚀 Building Tauri application..."
    
    # 使用完整的 Tauri 构建流程
    # 即使 bundle 步骤失败（缺少 linuxdeploy），二进制文件应该已经构建好了
    pnpm tauri build 2>&1 | tee build.log || {
        echo "⚠️  Bundle creation may have failed, checking if binary was built..."
    }
    
    # 验证二进制文件已创建（这是最关键的）
    if [ ! -f "src-tauri/target/release/pass" ]; then
        echo "❌ Error: Binary file 'pass' not created!"
        echo "Checking what was built:"
        ls -la src-tauri/target/release/ 2>/dev/null || echo "target/release directory not found"
        
        # 显示构建日志的最后几行
        echo ""
        echo "Last 50 lines of build log:"
        tail -n 50 build.log 2>/dev/null || true
        exit 1
    fi
    
    echo "✅ Binary built successfully!"
    ls -lh src-tauri/target/release/pass
}

package() {
    cd "${srcdir}"
    
    # Install binary (注意：Cargo.toml 中的 name 是 "pass"，编译出的二进制文件名是 pass)
    install -Dm755 "src-tauri/target/release/pass" "${pkgdir}/usr/bin/2pass"
    
    # Install icon
    install -Dm644 "src-tauri/icons/128x128.png" \
        "${pkgdir}/usr/share/pixmaps/2pass.png"
    
    # 创建桌面文件
    mkdir -p "${pkgdir}/usr/share/applications"
    cat > "${pkgdir}/usr/share/applications/2pass.desktop" <<EOF
[Desktop Entry]
Name=2Pass
Comment=A secure and modern password manager
Exec=/usr/bin/2pass
Icon=2pass
Terminal=false
Type=Application
Categories=Utility;Security;
EOF
    
    # Install license (if available)
    if [ -f LICENSE ]; then
        install -Dm644 LICENSE "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE"
    fi
}

