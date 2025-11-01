// Chrome扩展验证脚本
// 用于验证构建产物的完整性和正确性

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExtensionValidator {
  constructor() {
    this.distDir = path.join(__dirname, '..', 'dist');
    this.errors = [];
    this.warnings = [];
  }

  // 记录错误
  addError(message) {
    this.errors.push(message);
    console.error(`❌ ${message}`);
  }

  // 记录警告
  addWarning(message) {
    this.warnings.push(message);
    console.warn(`⚠️  ${message}`);
  }

  // 验证文件是否存在
  validateFileExists(filePath, required = true) {
    const fullPath = path.join(this.distDir, filePath);
    const exists = fs.existsSync(fullPath);
    
    if (!exists) {
      if (required) {
        this.addError(`必需文件缺失: ${filePath}`);
      } else {
        this.addWarning(`可选文件缺失: ${filePath}`);
      }
      return false;
    }
    
    console.log(`✅ 文件存在: ${filePath}`);
    return true;
  }

  // 验证manifest.json
  validateManifest() {
    console.log('\n📋 验证 manifest.json...');
    
    const manifestPath = path.join(this.distDir, 'manifest.json');
    if (!this.validateFileExists('manifest.json')) {
      return false;
    }

    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // 验证必需字段
      const requiredFields = ['manifest_version', 'name', 'version', 'description'];
      for (const field of requiredFields) {
        if (!manifest[field]) {
          this.addError(`manifest.json 缺少必需字段: ${field}`);
        }
      }

      // 验证manifest版本
      if (manifest.manifest_version !== 3) {
        this.addError('manifest_version 应该是 3 (Manifest V3)');
      }

      // 验证权限声明
      if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
        this.addWarning('未声明 permissions');
      }

      // 验证背景脚本
      if (!manifest.background || !manifest.background.service_worker) {
        this.addError('未正确配置 background service_worker');
      }

      // 验证内容脚本
      if (!manifest.content_scripts || !Array.isArray(manifest.content_scripts)) {
        this.addWarning('未配置 content_scripts');
      }

      // 验证图标
      if (!manifest.icons) {
        this.addWarning('未配置扩展图标');
      }

      console.log(`✅ manifest.json 版本: ${manifest.version}`);
      console.log(`✅ manifest.json 名称: ${manifest.name}`);

    } catch (error) {
      this.addError(`manifest.json 解析失败: ${error.message}`);
      return false;
    }

    return true;
  }

  // 验证核心JS文件
  validateCoreFiles() {
    console.log('\n📄 验证核心文件...');
    
    const coreFiles = [
      'background.js',
      'content/content.js',
      'popup/popup.js',
      'optionsExt.js'
    ];

    let allValid = true;
    for (const file of coreFiles) {
      if (!this.validateFileExists(file)) {
        allValid = false;
        continue;
      }

      // 检查文件大小
      const filePath = path.join(this.distDir, file);
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        this.addError(`文件为空: ${file}`);
        allValid = false;
      } else {
        console.log(`✅ ${file} 大小: ${(stats.size / 1024).toFixed(2)} KB`);
      }
    }

    return allValid;
  }

  // 验证HTML文件
  validateHtmlFiles() {
    console.log('\n🌐 验证HTML文件...');
    
    const htmlFiles = [
      'popup/popup.html',
      'options.html'
    ];

    let allValid = true;
    for (const file of htmlFiles) {
      if (!this.validateFileExists(file)) {
        allValid = false;
        continue;
      }

      // 检查HTML文件内容
      const filePath = path.join(this.distDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查基本HTML结构
      if (!content.includes('<!DOCTYPE html>') && !content.includes('<html')) {
        this.addWarning(`${file} 可能不是有效的HTML文件`);
      }

      // 检查脚本引用
      if (file === 'popup/popup.html' && !content.includes('popup.js')) {
        this.addWarning(`${file} 未引用对应的JS文件`);
      }
    }

    return allValid;
  }

  // 验证CSS文件
  validateCssFiles() {
    console.log('\n🎨 验证CSS文件...');
    
    const cssFiles = [
      'popup/popup.css',
      'content/content.css',
      'css/options.css'
    ];

    for (const file of cssFiles) {
      this.validateFileExists(file, false); // CSS文件是可选的
    }

    return true;
  }

  // 验证静态资源
  validateAssets() {
    console.log('\n🖼️  验证静态资源...');
    
    const assetDirs = [
      'icons',
      'image',
      '_locales'
    ];

    for (const dir of assetDirs) {
      const dirPath = path.join(this.distDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath, { recursive: true });
        console.log(`✅ ${dir}/ 包含 ${files.length} 个文件`);
      } else {
        this.addWarning(`静态资源目录缺失: ${dir}/`);
      }
    }

    return true;
  }

  // 检查文件大小合理性
  validateFileSizes() {
    console.log('\n📊 检查文件大小...');
    
    const sizeChecks = [
      { file: 'background.js', maxSize: 1024 * 100 }, // 100KB
      { file: 'content/content.js', maxSize: 1024 * 500 }, // 500KB
      { file: 'popup/popup.js', maxSize: 1024 * 200 }, // 200KB
      { file: 'optionsExt.js', maxSize: 1024 * 300 } // 300KB
    ];

    for (const check of sizeChecks) {
      const filePath = path.join(this.distDir, check.file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > check.maxSize) {
          this.addWarning(`文件过大: ${check.file} (${(stats.size / 1024).toFixed(2)} KB)`);
        }
      }
    }

    return true;
  }

  // 生成验证报告
  generateReport() {
    console.log('\n📋 验证报告');
    console.log('==========================================');
    
    const totalIssues = this.errors.length + this.warnings.length;
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 验证通过！扩展包完全正常');
    } else {
      console.log(`📊 发现 ${totalIssues} 个问题:`);
      console.log(`   - ${this.errors.length} 个错误`);
      console.log(`   - ${this.warnings.length} 个警告`);
    }

    if (this.errors.length > 0) {
      console.log('\n❌ 错误列表:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告列表:');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    console.log('==========================================');
    
    return this.errors.length === 0;
  }

  // 主验证流程
  async validate() {
    console.log('🔍 Chrome扩展验证开始...');
    
    // 检查dist目录是否存在
    if (!fs.existsSync(this.distDir)) {
      console.error('❌ dist 目录不存在，请先运行 npm run build');
      process.exit(1);
    }

    let validationPassed = true;

    // 执行所有验证
    validationPassed &= this.validateManifest();
    validationPassed &= this.validateCoreFiles();
    validationPassed &= this.validateHtmlFiles();
    validationPassed &= this.validateCssFiles();
    validationPassed &= this.validateAssets();
    validationPassed &= this.validateFileSizes();

    // 生成报告
    const success = this.generateReport();
    
    if (!success) {
      process.exit(1);
    }
    
    console.log('✅ 验证完成，扩展可以安装使用！');
  }
}

// 运行验证
const validator = new ExtensionValidator();
validator.validate();
