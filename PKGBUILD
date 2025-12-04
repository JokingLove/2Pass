# Maintainer: Your Name <your.email@example.com>
pkgname=2pass
pkgver=1.2.2
pkgrel=1
pkgdesc="A secure and modern password manager built with Tauri"
arch=('x86_64')
url="https://github.com/yourusername/2pass"
license=('MIT')
depends=('webkit2gtk' 'gtk3')
makedepends=('rust' 'cargo' 'nodejs' 'pnpm')
source=("${pkgname}-${pkgver}.tar.gz::https://github.com/yourusername/${pkgname}/archive/v${pkgver}.tar.gz")
sha256sums=('SKIP')

prepare() {
    cd "${srcdir}/${pkgname}-${pkgver}"
    pnpm install
}

build() {
    cd "${srcdir}/${pkgname}-${pkgver}"
    pnpm tauri build
}

package() {
    cd "${srcdir}/${pkgname}-${pkgver}"
    
    # Install binary
    install -Dm755 "src-tauri/target/release/2pass" "${pkgdir}/usr/bin/2pass"
    
    # Install desktop file
    install -Dm644 "src-tauri/target/release/bundle/deb/2pass_${pkgver}_amd64/data/usr/share/applications/2pass.desktop" \
        "${pkgdir}/usr/share/applications/2pass.desktop"
    
    # Install icon
    install -Dm644 "src-tauri/icons/128x128.png" \
        "${pkgdir}/usr/share/pixmaps/2pass.png"
    
    # Install license (if available)
    if [ -f LICENSE ]; then
        install -Dm644 LICENSE "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE"
    fi
}

