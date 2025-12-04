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
    # 复制项目文件到构建目录
    cp -r "${startdir}"/* "${srcdir}/" 2>/dev/null || true
    cd "${srcdir}"
    
    # 清理可能存在的 PKGBUILD 相关文件
    rm -f PKGBUILD *.pkg.tar.zst
    
    # 安装依赖
    pnpm install
}

build() {
    cd "${srcdir}"
    pnpm tauri build
}

package() {
    cd "${srcdir}"
    
    # Install binary
    install -Dm755 "src-tauri/target/release/2pass" "${pkgdir}/usr/bin/2pass"
    
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

