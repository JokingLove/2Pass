// 简单的 KDBX 查看器
// 编译: rustc view_kdbx.rs -L target/debug/deps
// 或者添加到 Cargo.toml 并运行: cargo run --bin view_kdbx

use std::env;
use std::path::Path;

fn main() {
    // 获取数据文件路径
    let home = env::var("HOME").expect("HOME not set");
    let kdbx_path = Path::new(&home).join("Library/Application Support/com.2pass.app/data.kdbx");

    println!("📂 KDBX 文件位置: {}", kdbx_path.display());

    if !kdbx_path.exists() {
        println!("❌ 文件不存在！");
        return;
    }

    println!("✅ 文件存在");
    println!("\n请使用以下方法之一查看内容：");
    println!("1. KeePassXC（推荐）: brew install --cask keepassxc");
    println!("2. 命令行: keepassxc-cli ls '{}'", kdbx_path.display());
    println!("3. 使用 2Pass 应用程序本身");
}
