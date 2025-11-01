// Chrome扩展构建脚本
// 用于自动化构建、压缩和打包Chrome扩展

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChromeExtensionBuilder {
  constructor() {
    this.distDir = path.resolve(__dirname, '..', 'dist');
    this.packageDir = path.resolve(__dirname, '..', 'packages');
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

  // 打包成ZIP文件
  async packageExtension() {
    console.log('📦 开始打包Chrome扩展...');
    
    // 确保dist目录存在
    if (!fs.existsSync(this.distDir)) {
      console.error('❌ dist目录不存在，请先运行 npm run build');
      process.exit(1);
    }

    // 确保packages目录存在
    this.ensureDir(this.packageDir);

    const version = this.getVersion();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipName = `gesture-extension-v${version}-${timestamp}.zip`;
    const zipPath = path.join(this.packageDir, zipName);

    // 创建ZIP文件
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`✅ 打包完成: ${zipName}`);
        console.log(`📁 文件位置: ${zipPath}`);
        console.log(`📊 压缩大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        console.error('❌ 打包失败:', err);
        reject(err);
      });

      archive.pipe(output);

      // 添加dist目录下的所有文件
      archive.directory(this.distDir, false);

      archive.finalize();
    });
  }

  // 验证扩展包完整性
  validatePackage() {
    console.log('🔍 验证扩展包完整性...');
    
    const requiredFiles = [
      'manifest.json',
      'background.js',
      'content/content.js',
      'popup/popup.html',
      'popup/popup.js',
      'options.html',
      'optionsExt.js'
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

    console.log('✅ 扩展包完整性验证通过');
    return true;
  }

  // 生成安装说明
  generateInstallInstructions() {
    console.log('📝 生成安装说明...');
    
    // 确保packages目录存在
    this.ensureDir(this.packageDir);
    
    const version = this.getVersion();
    const instructions = `
# Chrome扩展安装说明

## 版本: ${version}
## 构建时间: ${new Date().toLocaleString()}

### 安装步骤:

1. 打开Chrome浏览器
2. 在地址栏输入: chrome://extensions/
3. 开启"开发者模式"（右上角开关）
4. 点击"加载已解压的扩展程序"
5. 选择 dist 文件夹
6. 扩展安装完成

### 开发调试:

- 开发环境: npm run dev
- 构建生产版本: npm run build  
- 打包扩展: npm run package

### 文件结构:

- background.js - 后台脚本
- content/ - 内容脚本
- popup/ - 弹出页面
- options.html - 选项页面
- css/ - 样式文件
- icons/ - 图标文件
- _locales/ - 多语言文件

### 注意事项:

1. 确保manifest.json版本号正确
2. 所有必需权限已声明
3. 图标文件格式正确
4. 内容脚本匹配模式正确

---
构建工具: Vite + Chrome Extension Builder
`;

    const readmePath = path.join(this.packageDir, `README-v${version}.md`);
    fs.writeFileSync(readmePath, instructions);
    console.log(`📝 安装说明已生成: README-v${version}.md`);
  }

  // 主构建流程
  async build() {
    console.log('🚀 Chrome扩展构建流程开始...');
    console.log('==========================================');
    
    try {
      // 验证包完整性
      if (!this.validatePackage()) {
        process.exit(1);
      }

      // 生成安装说明
      this.generateInstallInstructions();

      // 打包扩展
      await this.packageExtension();

      console.log('==========================================');
      console.log('🎉 构建完成！可以安装和发布扩展了');
      
    } catch (error) {
      console.error('❌ 构建失败:', error);
      process.exit(1);
    }
  }
}

// 运行构建
const builder = new ChromeExtensionBuilder();
builder.build();
