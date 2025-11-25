// Edge Add-ons 发布打包脚本
// 用于生成可上传到 Edge Add-ons 的 ZIP 包

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EdgeStorePackager {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.distDir = path.join(this.rootDir, 'dist');
    this.packageDir = path.join(this.rootDir, 'packages');
  }

  // 确保目录存在
  ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 读取manifest.json版本号
  getVersion() {
    const manifestPath = path.join(this.distDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return manifest.version || '1.0.0';
    }
    return '1.0.0';
  }

  // 打包成适合 Edge Add-ons 的 ZIP 文件
  async packageForEdge() {
    console.log('📦 开始打包 Edge Add-ons 发布包...');
    
    // 确保dist目录存在
    if (!fs.existsSync(this.distDir)) {
      console.error('❌ dist 目录不存在，请先运行: npm run build:edge');
      process.exit(1);
    }

    // 验证manifest是否为Edge平台（通过构建日志确认，不再依赖 manifest 字段）
    console.log('ℹ️  提示：请确保使用 npm run build:edge 构建了 Edge 版本');

    // 确保packages目录存在
    this.ensureDir(this.packageDir);

    const version = this.getVersion();
    const zipName = `mouse-gesture-edge-v${version}.zip`;
    const zipPath = path.join(this.packageDir, zipName);

    // 如果文件已存在，删除旧文件
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log('🗑️  删除旧的打包文件');
    }

    // 创建ZIP文件
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log('');
        console.log('✅ 打包完成！');
        console.log('==========================================');
        console.log(`📦 文件名称: ${zipName}`);
        console.log(`📁 文件位置: ${zipPath}`);
        console.log(`📊 文件大小: ${(archive.pointer() / 1024).toFixed(2)} KB`);
        resolve(zipPath);
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('⚠️  警告:', err);
        } else {
          reject(err);
        }
      });

      archive.on('error', (err) => {
        console.error('❌ 打包失败:', err);
        reject(err);
      });

      archive.pipe(output);

      // 添加dist目录下的所有文件
      console.log('📂 正在添加构建文件...');
      archive.directory(this.distDir, false);

      console.log('🔄 正在压缩文件...');
      archive.finalize();
    });
  }

  // 验证打包内容
  validatePackage() {
    console.log('🔍 验证扩展包内容...');
    
    const requiredFiles = [
      'manifest.json'
    ];

    const missingFiles = [];
    
    for (const file of requiredFiles) {
      const filePath = path.join(this.distDir, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      console.error('❌ 以下必需文件缺失:');
      missingFiles.forEach(file => console.error(`   - ${file}`));
      return false;
    }

    // 检查manifest.json内容
    const manifestPath = path.join(this.distDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    console.log('📋 Manifest 信息:');
    console.log(`   名称: ${manifest.name}`);
    console.log(`   版本: ${manifest.version}`);
    console.log(`   描述: ${manifest.description}`);
    
    // Edge Add-ons 的特殊要求检查
    if (!manifest.name || manifest.name.length < 3) {
      console.error('❌ 扩展名称太短（至少3个字符）');
      return false;
    }
    
    if (!manifest.description || manifest.description.length < 10) {
      console.error('❌ 扩展描述太短（至少10个字符）');
      return false;
    }
    
    if (!manifest.version) {
      console.error('❌ 缺少版本号');
      return false;
    }
    
    if (!manifest.icons || !manifest.icons['128']) {
      console.error('❌ 缺少128x128图标（Edge Add-ons必需）');
      return false;
    }

    // Edge特定检查
    if (manifest.key) {
      console.warn('⚠️  警告: Edge Add-ons不需要key字段，建议移除');
    }

    console.log('✅ 扩展包验证通过');
    return true;
  }

  // 主打包流程
  async build() {
    console.log('🚀 Edge Add-ons 打包流程开始...');
    console.log('==========================================');
    console.log('');
    
    try {
      // 验证包完整性
      if (!this.validatePackage()) {
        process.exit(1);
      }

      console.log('');

      // 打包扩展
      await this.packageForEdge();

      console.log('🎉 EDGE 打包完成！');
      
    } catch (error) {
      console.error('❌ 打包失败:', error);
      process.exit(1);
    }
  }
}

// 运行打包
const packager = new EdgeStorePackager();
packager.build();
