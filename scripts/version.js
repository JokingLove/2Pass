#!/usr/bin/env node

/**
 * 版本号更新脚本 (Node.js 版本，跨平台)
 * 使用方法: node scripts/version.js 1.2.2
 * 或: pnpm version 1.2.2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = process.argv[2];

if (!VERSION) {
  console.error('❌ 错误: 请提供版本号');
  console.error('使用方法: node scripts/version.js <version>');
  console.error('示例: node scripts/version.js 1.2.2');
  process.exit(1);
}

// 验证版本号格式
if (!/^\d+\.\d+\.\d+$/.test(VERSION)) {
  console.error('❌ 错误: 版本号格式不正确，应为 x.y.z (例如: 1.2.2)');
  process.exit(1);
}

console.log(`🚀 开始更新版本号到 ${VERSION}...\n`);

// 更新 package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = VERSION;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✅ 已更新 package.json');
} else {
  console.log('⚠️  未找到 package.json');
}

// 更新 Cargo.toml
const cargoTomlPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
  cargoToml = cargoToml.replace(/^version = ".*"/m, `version = "${VERSION}"`);
  fs.writeFileSync(cargoTomlPath, cargoToml);
  console.log('✅ 已更新 src-tauri/Cargo.toml');
} else {
  console.log('⚠️  未找到 src-tauri/Cargo.toml');
}

// 更新 tauri.conf.json
const tauriConfPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = VERSION;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log('✅ 已更新 src-tauri/tauri.conf.json');
} else {
  console.log('⚠️  未找到 src-tauri/tauri.conf.json');
}

console.log(`\n✨ 版本号已全部更新到 ${VERSION}\n`);
console.log('📝 下一步操作:');
console.log(`   1. 检查更改: git diff`);
console.log(`   2. 提交更改: git add . && git commit -m "chore: bump version to ${VERSION}"`);
console.log(`   3. 创建标签: git tag v${VERSION}`);
console.log(`   4. 推送代码和标签: git push && git push --tags`);

