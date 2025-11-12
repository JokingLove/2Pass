<div align="center">

# 🔐 2Pass

**A secure, modern password manager built with Tauri and React**

[![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)](https://github.com/yourusername/2pass)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)

[English](README.md) | [简体中文](README_CN.md)

![2Pass Screenshot](https://via.placeholder.com/800x500?text=2Pass+Screenshot)

</div>

---

## ✨ Features

- 🔒 **AES-256-GCM Encryption** - Industry-standard encryption for your data
- 🔑 **Master Password Protection** - Secured with Argon2 hashing algorithm
- 📝 **Full CRUD Operations** - Add, edit, delete, and view password entries
- 🔍 **Real-time Search** - Quickly find passwords by title, username, or URL
- 🎯 **Drag & Drop Sorting** - Freely arrange your password cards
- 🎲 **Password Generator** - Generate strong passwords with customizable options
- ⏱️ **TOTP Support** - Built-in Google Authenticator for 2FA codes
- 🔗 **Combined Passwords** - Auto-combine password with TOTP code
- 📋 **One-Click Copy** - Quick copy username, password, or combined password
- 👁️ **Show/Hide Passwords** - Toggle password visibility
- 💾 **Local Storage** - All data encrypted and stored locally
- 🎨 **Modern UI** - Beautiful and intuitive user interface
- 🌈 **Multiple Themes** - 6 beautiful color themes to choose from
- 📱 **Responsive Design** - Collapsible sidebar with multi-view support
- 👥 **Group Management** - Organize passwords into custom groups

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) (or npm/yarn)
- [Rust](https://www.rust-lang.org/) (required by Tauri)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/2pass.git
cd 2pass

# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm tauri dev
```

### Build

```bash
# Build for production
pnpm tauri build
```

The executable will be located in `src-tauri/target/release/bundle/`.

## 📖 Usage

### First Time Setup

1. **Create Master Password**
   - On first launch, create a master password (min. 8 characters)
   - ⚠️ Remember it well - it cannot be recovered if lost!

2. **Add Password Entry**
   - Click "➕ Add Password" button
   - Fill in title, username, password, etc.
   - Use password generator for strong passwords

3. **Manage Passwords**
   - 👁️ View password
   - 📋 Copy username or password
   - ✏️ Edit entry
   - 🗑️ Delete entry

4. **Search Passwords**
   - Use search bar to find passwords
   - Supports searching by title, username, and URL

5. **Configure TOTP (Optional)**
   - Click "➕ Add TOTP" when adding/editing
   - Generate or input TOTP secret
   - Scan QR code with Google Authenticator
   - View real-time verification codes (refreshes every 30s)

6. **Organize with Groups**
   - Create custom groups to organize passwords
   - Drag and drop passwords between groups
   - Filter passwords by group

## 🔐 Security

- **Encryption**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: Argon2id (Memory-hard hash function)
- **Data Storage**: All sensitive data encrypted locally
- **No Cloud Sync**: All data stays on your device

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **DnD Kit** - Drag and Drop

### Backend
- **Tauri 2.0** - Desktop App Framework
- **Rust** - Systems Programming Language
- **aes-gcm** - AES-GCM Encryption
- **argon2** - Password Hashing
- **totp-lite** - TOTP Code Generation
- **uuid** - Unique Identifiers

## 📁 Project Structure

```
2pass/
├── src/                      # React frontend
│   ├── components/          # React components
│   ├── styles/             # CSS styles
│   ├── hooks/              # Custom hooks
│   ├── types.ts            # TypeScript types
│   └── App.tsx             # Main app component
├── src-tauri/               # Tauri backend
│   ├── src/
│   │   ├── lib.rs          # Core Rust logic
│   │   └── main.rs         # Tauri entry
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri config
└── .github/
    └── workflows/          # GitHub Actions
```

## 🎨 Themes

2Pass comes with 6 beautiful themes:
- 🌟 **2Pass Purple** - Default gradient theme
- ☁️ **Sky Blue** - Calm blue tones
- 🌌 **Purple Pink** - Dreamy gradient
- 🌿 **Turquoise** - Fresh green-blue
- 🍃 **Mint** - Clean mint colors
- 🪟 **Glass** - Frosted glass effect

## 📦 Download

### Pre-built Binaries

Download the latest release for your platform:

- **macOS (Apple Silicon)**: `2Pass_1.2.1_aarch64.dmg`
- **macOS (Intel)**: `2Pass_1.2.1_x64.dmg`
- **Windows**: `2Pass_1.2.1_x64-setup.exe` or `.msi`
- **Linux**: `2pass_1.2.1_amd64.deb` or `.AppImage`

[Download Latest Release →](https://github.com/yourusername/2pass/releases)

> ⚠️ **macOS Users**: If you see "Cannot verify" error, run: `sudo xattr -rd com.apple.quarantine /Applications/2Pass.app`

## ⚠️ Important Notes

1. **Master Password Cannot Be Recovered** - Keep it safe!
2. **Regular Backups** - Export your data regularly
3. **Production Use** - Consider changing the salt in `lib.rs` for production

## 📝 Data Storage Location

Encrypted data files are stored at:

- **macOS**: `~/Library/Application Support/com.twopass.password-manager/data.json`
- **Windows**: `%APPDATA%\2pass\2pass\data\data.json`
- **Linux**: `~/.local/share/2pass/data.json`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Thanks to these amazing open source projects:
- [Tauri](https://tauri.app/) - Desktop app framework
- [React](https://react.dev/) - UI library
- [Rust](https://www.rust-lang.org/) - Programming language
- [DnD Kit](https://dndkit.com/) - Drag and drop library

---

<div align="center">

Made with Tauri

[⬆ Back to Top](#-2pass)

</div>
