# 多语言功能实现说明

## 功能概述

Chrome鼠标手势扩展现已支持多语言功能，包括：
- **英文 (English)**
- **简体中文 (简体中文)**
- **德语 (Deutsch)**
- **日语 (日本語)**

## 实现内容

### 1. 多语言资源文件结构

创建了完整的多语言资源包，位于：
```
src/assets/locales/
├── en/
│   └── messages.json        # 英文翻译
├── zh_CN/
│   └── messages.json        # 简体中文翻译
├── de/
│   └── messages.json        # 德语翻译
└── ja/
    └── messages.json        # 日语翻译
```

每个 `messages.json` 文件包含所有界面文本的翻译，包括：
- 扩展名称和描述
- 选项页面所有文本
- 侧边栏所有文本
- 手势动作名称
- 提示信息和错误消息

### 2. 多语言管理工具 (i18n-manager.js)

创建了独立的多语言管理工具类，位于 `src/utils/i18n-manager.js`，提供以下功能：

- **自动语言检测**：根据浏览器语言自动选择界面语言
- **手动语言切换**：用户可以在设置中手动选择语言
- **语言持久化**：用户选择的语言会被保存，下次打开时自动应用
- **动态文本更新**：切换语言时，页面所有文本自动更新
- **语言选择器UI**：自动生成像素风格的语言选择器

#### 核心方法：

```javascript
// 初始化多语言系统
await i18nManager.initialize();

// 获取翻译文本
const text = i18nManager.getMessage('keyName');

// 切换语言
await i18nManager.changeLocale('de');

// 创建语言选择器
i18nManager.createLanguageSelector(container, onChangeCallback);
```

### 3. HTML页面多语言支持

#### 选项页面 (options.html)

- 在页面顶部添加了语言选择器容器
- 为所有文本元素添加了 `data-i18n` 属性
- 支持的属性类型：
  - `data-i18n`: 普通文本内容
  - `data-i18n-html`: 支持HTML的内容
  - `data-i18n-placeholder`: 输入框占位符
  - `data-i18n-title`: 元素标题属性

示例：
```html
<h1 data-i18n="optionsTitle">手势扩展设置</h1>
<input type="text" data-i18n-placeholder="gestureNamePlaceholder" placeholder="输入手势名称">
<option value="goBack" data-i18n="actionGoBack">后退</option>
```

#### 侧边栏页面 (sidepanel.html)

- 在顶部添加了语言选择器容器
- 为所有静态文本元素添加了 `data-i18n` 属性
- 支持动态生成内容的多语言显示

### 4. JavaScript集成

#### options.js 集成

- 在初始化时调用 `initializeI18n()` 方法
- 创建了 `getI18nMessage()` 辅助方法
- 更新了 `getActionDisplayName()` 方法以使用多语言
- 动态生成的内容（如手势列表）使用 i18n 获取文本

#### sidepanel.js 集成

- 添加了 `initializeI18n()` 初始化方法
- 创建了 `getI18nMessage()` 和 `getActionDescription()` 辅助方法
- 更新了状态显示（启用/禁用）以使用多语言
- 动态内容使用多语言系统获取文本

### 5. CSS样式优化

#### 长文本处理 (options.css 和 sidepanel.css)

添加了专门的CSS类来处理长文本：

```css
/* 文本省略 */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 文本换行 */
.text-wrap {
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* 多行省略 */
.text-multiline {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

#### 语言选择器样式

添加了像素风格的语言选择器样式：
- 适配 NES.css 框架
- 响应式设计
- 深色主题支持

### 6. Manifest.json 配置

更新了 manifest.json 以支持多语言：

```json
{
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "default_locale": "en"
}
```

## 使用说明

### 用户使用

1. **自动检测**：首次安装时，扩展会自动检测浏览器语言并应用相应的界面语言
2. **手动切换**：
   - 打开扩展的选项页面或侧边栏
   - 在顶部找到"语言"选择器
   - 选择您想要的语言（English / 简体中文 / Deutsch / 日本語）
   - 界面会立即切换到所选语言
   - 设置会自动保存，下次打开时保持所选语言

### 开发者扩展

如果需要添加新的语言支持：

1. 在 `src/assets/locales/` 目录下创建新的语言文件夹（如 `fr/`）
2. 复制 `en/messages.json` 并翻译所有文本
3. 更新 `i18n-manager.js` 中的 `supportedLocales` 和 `localeNames`：
   ```javascript
   this.supportedLocales = ['en', 'zh_CN', 'de', 'ja', 'fr'];
   this.localeNames = {
       'en': 'English',
       'zh_CN': '简体中文',
       'de': 'Deutsch',
       'ja': '日本語',
       'fr': 'Français'
   };
   ```

## 技术特性

### 性能优化

- **按需加载**：只加载当前语言的消息文件
- **缓存机制**：消息加载后会被缓存，避免重复请求
- **异步初始化**：不阻塞页面主要功能的加载

### 用户体验

- **无缝切换**：语言切换时页面不会刷新
- **即时反馈**：切换语言后立即显示成功提示
- **持久化存储**：使用 Chrome Storage API 保存用户选择

### 兼容性

- **向后兼容**：如果 i18n 系统未加载，会使用默认文本作为后备
- **容错处理**：如果某个翻译键不存在，会返回键名或后备文本
- **浏览器支持**：支持所有基于 Chromium 的浏览器（Chrome, Edge, Brave等）

## 文件清单

新增/修改的文件：

```
src/
├── assets/
│   ├── locales/
│   │   ├── de/
│   │   │   └── messages.json          (新增)
│   │   ├── ja/
│   │   │   └── messages.json          (新增)
│   │   ├── en/
│   │   │   └── messages.json          (更新)
│   │   └── zh_CN/
│   │       └── messages.json          (更新)
│   └── styles/
│       ├── options.css                (更新 - 添加长文本处理)
│       └── sidepanel.css              (更新 - 添加长文本处理)
├── ui/
│   ├── options/
│   │   ├── options.html               (更新 - 添加i18n属性)
│   │   └── options.js                 (更新 - 集成i18n)
│   └── sidepanel/
│       ├── sidepanel.html             (更新 - 添加i18n属性)
│       └── sidepanel.js               (更新 - 集成i18n)
└── utils/
    └── i18n-manager.js                (新增)

manifest.json                          (更新 - 支持多语言)
```

## 测试建议

1. **语言切换测试**：
   - 在每个支持的语言中切换
   - 验证所有文本正确显示
   - 确认设置被正确保存

2. **长文本测试**：
   - 测试德语和日语（这些语言的某些翻译可能较长）
   - 验证文本不会破坏布局
   - 确认省略号正确显示

3. **浏览器语言测试**：
   - 更改浏览器语言设置
   - 首次安装扩展
   - 验证自动检测是否正确

4. **边缘情况**：
   - 测试不支持的语言代码
   - 测试翻译文件加载失败的情况
   - 验证后备文本显示

## 已知限制

1. **动态生成内容**：某些动态生成的内容（如通知消息）可能需要刷新页面才能完全更新
2. **Content Script**：当前实现主要针对选项页面和侧边栏，内容脚本的多语言支持有限
3. **RTL语言**：当前不支持从右到左（RTL）的语言布局

## 未来改进

- [ ] 添加更多语言支持（法语、西班牙语、俄语等）
- [ ] 为内容脚本添加完整的多语言支持
- [ ] 添加 RTL 语言支持
- [ ] 实现语言包的懒加载优化
- [ ] 添加翻译质量检查工具

## 贡献翻译

如果您发现翻译错误或想要改进翻译质量，欢迎提交 Pull Request 或创建 Issue。

---

**实现完成日期**: 2025-01-18
**版本**: v1.1.1
