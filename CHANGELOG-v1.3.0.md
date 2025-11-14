# 2Pass v1.3.0 更新日志

## 🌐 国际化功能

### ✨ 新增功能

#### 多语言支持
- 支持简体中文和英文界面切换
- 所有界面元素完整翻译
- 语言设置持久化保存

#### 📱 移动端适配
- **模块化响应式架构**: 采用分离式设计，不同平台样式独立管理
- **移动端优化**: 
  - 自动隐藏分组侧边栏，节省屏幕空间
  - 密码列表全屏显示
  - 导航栏和按钮适配触摸操作
  - 表单弹窗适配小屏幕
- **响应式 Hook**: 提供 `useResponsive` Hook，方便组件根据设备类型条件渲染
- **断点定义**:
  - 移动端: ≤768px
  - 平板端: 769px - 1024px
  - 桌面端: >1024px

#### 🎨 主题优化
- TOTP 组件跟随主题颜色变化
- 数字标签使用主题色彩系统

#### 💡 用户体验改进
- 密码生成器复制按钮布局优化
- 添加复制成功反馈机制

### 📁 新增文件

#### 国际化相关
- `src/i18n/index.ts` - i18n 配置
- `src/i18n/locales/zh-CN.json` - 简体中文翻译
- `src/i18n/locales/en-US.json` - 英文翻译

#### 响应式系统
- `src/hooks/useResponsive.ts` - 响应式状态管理 Hook
- `src/styles/responsive/index.css` - 响应式样式统一入口
- `src/styles/responsive/mobile.css` - 移动端专用样式
- `src/styles/responsive/tablet.css` - 平板端专用样式
- `src/styles/responsive/desktop.css` - 桌面端专用样式
- `src/styles/responsive/README.md` - 响应式系统文档

### 🔧 技术改进

- **代码模块化**: 响应式样式按平台分离，提高可维护性
- **性能优化**: 移动端避免加载不必要的组件
- **可扩展性**: 易于添加新的设备类型支持和断点

---
**版本**: v1.3.0 | **发布**: 2025-01-13