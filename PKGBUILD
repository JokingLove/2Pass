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
        rsync -a --exclude='node_modules' --exclude='target' --exclude='dist' \
              --exclude='*.pkg.tar.zst' --exclude='pkg' \
              "${startdir}/" "${srcdir}/"
    else
        cp -r "${startdir}"/* "${srcdir}/"
    fi
    
    cd "${srcdir}"
    
    # 清理可能存在的 PKGBUILD 相关文件
    rm -f PKGBUILD *.pkg.tar.zst
    
    # 安装依赖
    pnpm install
}

build() {
    cd "${srcdir}"
    # 只构建 Rust 二进制文件，不创建 bundle（AppImage/deb）
    # 这样可以避免 linuxdeploy 依赖
    pnpm build
    cd src-tauri
    cargo build --release
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

