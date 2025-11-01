# Mouse Gesture Pilot 🖱️

一个功能强大的 Chrome 鼠标手势扩展，支持可视化轨迹效果。

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1.1-green.svg)](https://github.com/zhangsong-github/chrome-guesture-extension)

## ✨ 特性

- 🎯 **直观的鼠标手势识别** - 支持上下左右及组合手势
- 🌈 **可视化轨迹效果** - 实时显示手势轨迹
- ⚡ **14+ 预设手势** - 常用操作一键完成
- 🎨 **自定义手势** - 创建您自己的手势映射
- 📱 **侧边栏面板** - 快速查看和管理手势
- 🔧 **完整的配置选项** - 灵活调整灵敏度和行为
- 🌍 **多语言支持** - 中文/英文界面

## 🚀 快速开始

### 从源码安装

1. **克隆仓库**
   ```bash
   git clone https://github.com/zhangsong-github/chrome-guesture-extension.git
   cd chrome-guesture-extension
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **构建扩展**
   ```bash
   # 开发模式（包含 source maps）
   npm run build:dev
   
   # 生产模式（压缩优化）
   npm run build:prod
   ```

4. **加载到 Chrome**
   - 打开 Chrome 扩展管理页面 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目中的 `dist` 目录

## 📋 预设手势

| 手势 | 动作 | 说明 |
|------|------|------|
| ← | 后退 | 返回上一页 |
| → | 前进 | 前进到下一页 |
| ↑ | 滚动到顶部 | 页面滚动到顶部 |
| ↓ | 滚动到底部 | 页面滚动到底部 |
| ↑↓ | 刷新页面 | 重新加载当前页面 |
| ↓← | 新建标签页 | 打开新标签页 |
| ↓→ | 关闭标签页 | 关闭当前标签页 |
| →← | 重新打开 | 恢复最近关闭的标签页 |
| ↑→↓ | 复制标签页 | 复制当前标签页 |
| ↑← | 前一标签 | 切换到前一个标签页 |
| ↑→ | 后一标签 | 切换到后一个标签页 |
| →↑← | 固定标签 | 固定/取消固定标签页 |
| ↓←↑ | 最小化窗口 | 最小化当前窗口 |
| ↑←↓ | 全屏切换 | 切换全屏模式 |

## 🎨 使用方法

### 基本操作
1. **按住鼠标右键** 并移动鼠标绘制手势
2. 松开鼠标右键完成手势
3. 扩展会识别并执行对应动作

### 自定义手势
1. 点击扩展图标打开侧边栏
2. 进入"选项"页面
3. 点击"添加自定义手势"
4. 绘制您的手势并选择动作
5. 保存即可使用

### 配置选项
- **识别灵敏度**: 调整手势识别的精确度
- **轨迹持续时间**: 设置轨迹显示时长
- **启用/禁用**: 快速切换手势功能

## 🛠️ 开发

### 项目结构
```
chrome-guesture-extension/
├── src/
│   ├── background/        # Background Service Worker
│   ├── content/           # Content Scripts
│   ├── core/              # 核心功能模块
│   ├── ui/                # UI 组件
│   │   ├── options/       # 选项页
│   │   └── sidepanel/     # 侧边栏
│   └── utils/             # 工具函数
├── manifest.json          # 扩展配置
├── vite.config.js         # 构建配置
└── package.json
```

### 开发命令
```bash
# 开发模式（监听文件变化）
npm run dev

# 开发构建
npm run build:dev

# 生产构建
npm run build:prod

# 清理构建文件
npm run clean

# 验证配置
npm run validate
```

### 技术栈
- **Manifest V3** - 最新 Chrome 扩展标准
- **Vanilla JavaScript** - 无框架依赖
- **Vite** - 现代化构建工具
- **NES.css** - 像素风格 UI 库

## 📦 构建

构建后的文件位于 `dist/` 目录，包含：
- 压缩和优化的 JavaScript
- 静态资源文件
- manifest.json 配置

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔒 安全说明

本仓库不包含任何私钥或扩展签名密钥。`manifest.json` 中的 `key` 字段已被移除以保护开发者隐私。

如果您 fork 此项目并需要固定的扩展 ID，请在本地生成您自己的密钥，但**不要**将其提交到 Git。

## 📧 联系方式

- GitHub: [@zhangsong-github](https://github.com/zhangsong-github)
- Email: zhangsongai3@gmail.com

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

**注意**: 此扩展正在积极开发中。如果遇到问题，请在 [Issues](https://github.com/zhangsong-github/chrome-guesture-extension/issues) 页面报告。
