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
    
    # 先构建前端
    pnpm build
    
    # 使用 cargo 构建 Rust 后端
    # Tauri 会自动从 ../dist 目录嵌入前端资源（根据 tauri.conf.json 中的 frontendDist 配置）
    cd src-tauri
    cargo build --release
    
    # 验证二进制文件已创建
    if [ ! -f "target/release/pass" ]; then
        echo "Error: Binary file not created!"
        exit 1
    fi
    
    echo "✅ Build successful: binary created at src-tauri/target/release/pass"
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

