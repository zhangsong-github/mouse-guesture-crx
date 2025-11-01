// Chrome Web Store 发布打包脚本
// 用于生成可上传到 Chrome Web Store 的 ZIP 包

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChromeStorePackager {
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

  // 打包成适合 Chrome Web Store 的 ZIP 文件
  async packageForStore() {
    console.log('📦 开始打包 Chrome Web Store 发布包...');
    
    // 确保dist目录存在
    if (!fs.existsSync(this.distDir)) {
      console.error('❌ dist 目录不存在，请先运行: npm run build:prod');
      process.exit(1);
    }

    // 确保packages目录存在
    this.ensureDir(this.packageDir);

    const version = this.getVersion();
    const zipName = `mouse-gesture-v${version}.zip`;
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
        console.log('==========================================');
        console.log('');
        console.log('🚀 下一步操作:');
        console.log('1. 访问 Chrome Web Store 开发者控制台:');
        console.log('   https://chrome.google.com/webstore/devconsole');
        console.log('2. 点击"上传新版本"或"新增项目"');
        console.log(`3. 上传文件: packages/${zipName}`);
        console.log('4. 填写商店信息并提交审核');
        console.log('');
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

      // 添加dist目录下的所有文件（这是构建后的代码）
      console.log('📂 正在添加构建文件...');
      archive.directory(this.distDir, false);

      // 注意: 不要将 private_key.pem 添加到 Chrome Web Store 的包中
      // Chrome Web Store 会为你的扩展自动生成和管理密钥
      // private_key.pem 仅用于本地开发时生成 .crx 文件

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
    
    // Chrome Web Store 的特殊要求检查
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
      console.error('❌ 缺少128x128图标（Chrome Web Store必需）');
      return false;
    }

    console.log('✅ 扩展包验证通过');
    return true;
  }

  // 显示重要提示
  showImportantNotes() {
    console.log('');
    console.log('📌 重要提示:');
    console.log('==========================================');
    console.log('1. Chrome Web Store 不需要 private_key.pem');
    console.log('   商店会自动管理扩展的签名密钥');
    console.log('');
    console.log('2. 首次发布需要支付一次性开发者注册费（$5）');
    console.log('');
    console.log('3. 准备以下资料用于商店页面:');
    console.log('   - 扩展图标（128x128 已在包中）');
    console.log('   - 应用截图（1280x800 或 640x400）');
    console.log('   - 宣传图片（440x280，可选）');
    console.log('   - 详细描述（至少132个字符）');
    console.log('   - 隐私政策（如果需要权限）');
    console.log('');
    console.log('4. 审核时间通常为几小时到几天');
    console.log('==========================================');
    console.log('');
  }

  // 主打包流程
  async build() {
    console.log('🚀 Chrome Web Store 打包流程开始...');
    console.log('==========================================');
    console.log('');
    
    try {
      // 验证包完整性
      if (!this.validatePackage()) {
        process.exit(1);
      }

      console.log('');

      // 打包扩展
      await this.packageForStore();

      // 显示重要提示
      this.showImportantNotes();

      console.log('🎉 打包完成！可以上传到 Chrome Web Store 了');
      
    } catch (error) {
      console.error('❌ 打包失败:', error);
      process.exit(1);
    }
  }
}

// 运行打包
const packager = new ChromeStorePackager();
packager.build();
