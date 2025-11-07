# 🔐 2Pass - 密码管理器

一个使用 Tauri 和 React 构建的安全、现代化的密码管理应用。

> 📖 **详细使用说明请查看** → [使用手册.md](./使用手册.md)

## ✨ 功能特点

- 🔒 **AES-256-GCM 加密** - 使用业界标准的加密算法保护你的数据
- 🔑 **主密码保护** - 使用 Argon2 哈希算法保护主密码
- 📝 **完整的 CRUD 操作** - 添加、编辑、删除和查看密码条目
- 🔍 **实时搜索** - 快速搜索标题、用户名或网址
- 🎯 **拖动排序** - 自由调整密码卡片顺序
- 🎲 **密码生成器** - 生成强密码，可自定义长度和字符类型
- ⏱️ **TOTP 支持** - 集成 Google Authenticator，支持二次验证码
- 🔗 **组合密码** - 自动将密码和 TOTP 验证码组合
- 📋 **一键复制** - 快速复制用户名、密码和组合密码到剪贴板
- 👁️ **密码显示/隐藏** - 控制密码的可见性
- 💾 **本地存储** - 所有数据加密存储在本地
- 🎨 **现代化 UI** - 美观且易用的用户界面
- 📱 **侧边栏导航** - 可折叠的功能菜单，支持多视图切换

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) (推荐 v18 或更高版本)
- [pnpm](https://pnpm.io/) (或 npm/yarn)
- [Rust](https://www.rust-lang.org/) (Tauri 依赖)

### 安装依赖

```bash
# 安装前端依赖
pnpm install

# Rust 依赖会在构建时自动安装
```

### 开发模式

```bash
# 启动开发服务器
pnpm tauri dev
```

### 构建应用

```bash
# 构建生产版本
pnpm tauri build
```

构建完成后，可执行文件将位于 `src-tauri/target/release/` 目录下。

## 📖 使用说明

### 首次使用

1. **创建主密码** - 首次启动应用时，你需要创建一个主密码
   - 主密码至少需要 8 个字符
   - 请务必记住主密码，丢失后无法恢复！

2. **添加密码条目**
   - 点击"➕ 添加密码"按钮
   - 填写标题、用户名、密码等信息
   - 可以使用密码生成器创建强密码

3. **管理密码**
   - 点击 👁️ 查看密码
   - 点击 📋 复制用户名或密码
   - 点击 ✏️ 编辑条目
   - 点击 🗑️ 删除条目

4. **搜索密码**
   - 使用顶部搜索框快速查找密码
   - 支持搜索标题、用户名和网址

5. **配置 TOTP（可选）**
   - 在添加/编辑密码时，点击"➕ 添加 TOTP"
   - 生成或输入 TOTP 密钥
   - 使用 Google Authenticator 扫描二维码
   - 查看实时更新的验证码（每 30 秒刷新）
   - 点击复制按钮获取组合密码（密码+验证码）

6. **调整侧边栏宽度**
   - 将鼠标移到侧边栏右边缘
   - 出现 ↔ 光标时拖动调整宽度
   - 范围：180px - 400px
   - 自动保存设置

详细使用说明请查看 → **[使用手册.md](./使用手册.md)**

## 🔐 安全性

- **加密算法**: AES-256-GCM (认证加密)
- **密钥派生**: Argon2id (内存困难型哈希函数)
- **数据存储**: 所有敏感数据都经过加密后存储在本地
- **无云同步**: 所有数据仅保存在本地，不会上传到任何服务器

## 🛠️ 技术栈

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具

### 后端
- **Tauri 2.0** - 桌面应用框架
- **Rust** - 系统编程语言
- **aes-gcm** - AES-GCM 加密
- **argon2** - 密码哈希
- **totp-lite** - TOTP 验证码生成
- **data-encoding** - Base32 编码
- **directories** - 跨平台目录管理

## 📁 项目结构

```
2pass/
├── src/                      # React 前端源码
│   ├── components/          # React 组件
│   │   ├── Login.tsx       # 登录/创建主密码
│   │   ├── Sidebar.tsx     # 侧边栏菜单（可折叠）
│   │   ├── PasswordList.tsx # 密码列表
│   │   ├── PasswordForm.tsx # 添加/编辑表单
│   │   ├── PasswordGenerator.tsx # 密码生成器
│   │   ├── GeneratorView.tsx # 密码生成器视图
│   │   ├── TotpConfig.tsx  # TOTP 配置界面
│   │   ├── TotpDisplay.tsx # TOTP 验证码显示
│   │   ├── Settings.tsx    # 设置页面
│   │   └── About.tsx       # 关于页面
│   ├── styles/             # CSS 样式文件
│   ├── types.ts            # TypeScript 类型定义
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # 应用入口
├── src-tauri/               # Tauri 后端
│   ├── src/
│   │   ├── lib.rs          # Rust 核心逻辑（含 TOTP）
│   │   └── main.rs         # Tauri 入口
│   ├── Cargo.toml          # Rust 依赖配置
│   └── tauri.conf.json     # Tauri 配置
├── README.md                # 项目说明
├── 使用手册.md               # 完整使用手册（所有功能说明）
└── package.json             # Node.js 依赖配置
```

## ⚠️ 重要提示

1. **主密码无法恢复** - 如果忘记主密码，将无法访问你的密码库
2. **定期备份** - 建议定期备份数据文件 (位于系统数据目录)
3. **生产环境** - 在生产环境使用时，建议修改 `lib.rs` 中的固定盐值

## 📝 数据存储位置

加密的数据文件存储位置：

- **macOS**: `~/Library/Application Support/com.2pass.2pass/data.json`
- **Windows**: `%APPDATA%\2pass\2pass\data\data.json`
- **Linux**: `~/.local/share/2pass/data.json`

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📚 文档

- **[README.md](./README.md)** - 项目概述和快速开始
- **[使用手册.md](./使用手册.md)** - 完整的使用指南（推荐阅读）

## 📄 许可证

MIT License

## 🙏 致谢

感谢以下开源项目：
- [Tauri](https://tauri.app/)
- [React](https://react.dev/)
- [Rust](https://www.rust-lang.org/)
