// 构建平台配置工具
// 用于在构建时选择正确的manifest文件

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PlatformConfigManager {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.distDir = path.join(this.rootDir, 'dist');
  }

  /**
   * 获取当前构建平台
   */
  getCurrentPlatform() {
    const platform = process.env.BUILD_PLATFORM || 'chrome';
    
    if (!['chrome', 'edge'].includes(platform)) {
      console.warn(`⚠️  未知平台: ${platform}，使用默认平台: chrome`);
      return 'chrome';
    }
    
    return platform;
  }

  /**
   * 从 package.json 读取版本号
   */
  getPackageVersion() {
    const packagePath = path.join(this.rootDir, 'package.json');
    if (!fs.existsSync(packagePath)) {
      console.warn('⚠️  找不到 package.json，使用manifest中的版本号');
      return null;
    }
    
    try {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageContent.version;
    } catch (error) {
      console.warn('⚠️  读取 package.json 失败，使用manifest中的版本号');
      return null;
    }
  }

  /**
   * 准备平台特定的manifest文件
   */
  prepareManifest() {
    const platform = this.getCurrentPlatform();
    const sourcePath = path.join(this.rootDir, 'manifest.json');
    
    // 确保 dist 目录存在
    if (!fs.existsSync(this.distDir)) {
      fs.mkdirSync(this.distDir, { recursive: true });
    }
    const targetPath = path.join(this.distDir, 'manifest.json');

    console.log(`📦 准备 ${platform.toUpperCase()} 平台的manifest...`);
    
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ 找不到 manifest.json 文件`);
      process.exit(1);
    }

    // 读取根目录的 manifest.json
    const manifestContent = fs.readFileSync(sourcePath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // 从 package.json 同步版本号
    const packageVersion = this.getPackageVersion();
    if (packageVersion) {
      if (manifest.version !== packageVersion) {
        console.log(`🔄 同步版本号: ${manifest.version} → ${packageVersion}`);
        manifest.version = packageVersion;
        // 同步主目录 manifest.json 的 version 字段
        try {
          const rootManifestPath = path.join(this.rootDir, 'manifest.json');
          const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf8'));
          rootManifest.version = packageVersion;
          fs.writeFileSync(rootManifestPath, JSON.stringify(rootManifest, null, 2));
          console.log('✅ 已同步主目录 manifest.json 的版本号');
        } catch (err) {
          console.warn('⚠️  无法同步主目录 manifest.json 版本号:', err);
        }
      }
    }

    // 写入到构建输出目录的 manifest.json，而不是修改仓库根目录文件
    fs.writeFileSync(targetPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ 已生成 ${platform.toUpperCase()} 平台的 dist/manifest.json`);
    console.log(`   版本: ${manifest.version}`);
    console.log(`   名称: ${manifest.name}`);
    console.log(`   平台: ${platform}`);
    
    return manifest;
  }

  /**
   * 清理构建临时文件（已废弃，不再需要）
   */
  cleanupBuild() {
    console.log('ℹ️  清理功能已废弃：manifest 不再包含构建标识字段');
  }

  /**
   * 验证平台兼容性
   */
  validatePlatformCompatibility(platform) {
    const sourcePath = path.join(this.rootDir, 'manifest.json');
    
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ 找不到 manifest.json 文件`);
      return false;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      
      // 检查必需字段
      const requiredFields = ['manifest_version', 'name', 'version', 'description'];
      const missingFields = requiredFields.filter(field => !manifest[field]);
      
      if (missingFields.length > 0) {
        console.error(`❌ Manifest缺少必需字段: ${missingFields.join(', ')}`);
        return false;
      }

      console.log(`✅ ${platform.toUpperCase()} 平台manifest验证通过`);
      return true;
      
    } catch (error) {
      console.error(`❌ 验证manifest失败:`, error);
      return false;
    }
  }

  /**
   * 显示平台信息
   */
  showPlatformInfo() {
    const platform = this.getCurrentPlatform();
    
    console.log('');
    console.log('==========================================');
    console.log('📦 构建平台信息');
    console.log('==========================================');
    console.log(`平台: ${platform.toUpperCase()}`);
    console.log(`源文件: manifest.json`);
    console.log(`输出目录: ${this.distDir}`);
    console.log('==========================================');
    console.log('');
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new PlatformConfigManager();
  const command = process.argv[2];

  switch (command) {
    case 'prepare':
      manager.showPlatformInfo();
      manager.prepareManifest();
      break;
      
    case 'validate':
      const platform = process.argv[3] || manager.getCurrentPlatform();
      manager.validatePlatformCompatibility(platform);
      break;
      
    case 'cleanup':
      manager.cleanupBuild();
      break;
      
    default:
      console.log('用法:');
      console.log('  node platform-config.js prepare   - 准备平台manifest');
      console.log('  node platform-config.js validate  - 验证平台兼容性');
      console.log('  node platform-config.js cleanup   - 清理构建标识');
      console.log('');
      console.log('环境变量:');
      console.log('  BUILD_PLATFORM=chrome|edge  - 指定构建平台');
  }
}

export default PlatformConfigManager;
