# 贡献指南

感谢你对 Mouse Gesture Pilot 的关注！我们欢迎任何形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)

## 🤝 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺让参与项目和社区的每个人都能获得无骚扰的体验。

### 我们的标准

**积极行为包括**:
- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

**不可接受的行为包括**:
- 使用性化的语言或图像
- 侮辱/贬损的评论，人身攻击
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他在专业场合可被认为不适当的行为

## 🚀 如何贡献

### 报告 Bug

如果你发现了 Bug，请在 [GitHub Issues](https://github.com/zhangsong-github/mouse-guesture-crx/issues) 中创建一个新的 issue，并包含：

- **清晰的标题**: 简明扼要地描述问题
- **详细描述**: 提供足够的信息以重现问题
- **重现步骤**: 一步步说明如何触发问题
- **预期行为**: 说明应该发生什么
- **实际行为**: 说明实际发生了什么
- **环境信息**:
  - Chrome 版本
  - 操作系统
  - 扩展版本
- **截图或视频**: 如果适用

**Bug 报告模板**:
```markdown
### 问题描述
简要描述问题

### 重现步骤
1. 打开...
2. 点击...
3. 看到错误...

### 预期行为
应该显示...

### 实际行为
实际显示...

### 环境
- Chrome 版本: 119.0.6045.105
- 操作系统: Windows 11
- 扩展版本: 1.1.1

### 截图
(如果适用)
```

### 建议新功能

我们欢迎新功能建议！请创建一个 issue 并包含：

- **功能描述**: 清晰地描述你想要的功能
- **使用场景**: 解释为什么这个功能有用
- **可能的实现**: 如果有想法，描述如何实现
- **替代方案**: 考虑过的其他解决方案

**功能请求模板**:
```markdown
### 功能描述
我希望能够...

### 使用场景
这个功能可以帮助...

### 建议的实现方式
可以通过...实现

### 替代方案
也可以考虑...
```

### 改进文档

文档改进也是重要的贡献！包括：
- 修正拼写或语法错误
- 改进说明的清晰度
- 添加缺失的说明
- 翻译文档

## 💻 开发流程

### 1. Fork 仓库

点击 GitHub 页面右上角的 "Fork" 按钮

### 2. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/mouse-guesture-crx.git
cd chrome-guesture-extension
```

### 3. 添加上游仓库

```bash
git remote add upstream https://github.com/zhangsong-github/mouse-guesture-crx.git
```

### 4. 创建分支

```bash
# 更新 develop 分支
git checkout develop
git pull upstream develop

# 创建功能分支
git checkout -b feature/your-feature-name
```

### 5. 安装依赖

```bash
npm install
```

### 6. 开发

```bash
# 开发模式（监听文件变化）
npm run dev

# 在 Chrome 中加载扩展
# 1. 打开 chrome://extensions/
# 2. 启用 "开发者模式"
# 3. 点击 "加载已解压的扩展程序"
# 4. 选择项目的 dist 目录
```

### 7. 测试

```bash
# 构建生产版本
npm run build:prod

# 验证配置
npm run validate

# 手动测试所有功能
```

### 8. 提交代码

```bash
git add .
git commit -m "feat: add your feature description"
```

### 9. 保持同步

```bash
# 定期同步上游代码
git fetch upstream
git rebase upstream/develop
```

### 10. 推送分支

```bash
git push origin feature/your-feature-name
```

### 11. 创建 Pull Request

在 GitHub 上创建 PR，目标分支为 `develop`

## 📏 代码规范

### JavaScript 风格

- 使用 **ES6+** 语法
- 使用 **2 空格** 缩进
- 使用 **单引号** 表示字符串
- **分号**: 建议使用
- **命名规范**:
  - 变量和函数: `camelCase`
  - 类: `PascalCase`
  - 常量: `UPPER_SNAKE_CASE`
  - 私有成员: `_leadingUnderscore`

**示例**:
```javascript
// ✅ 好的
const MAX_GESTURE_LENGTH = 8;

class GestureRecognizer {
  constructor(options) {
    this._sensitivity = options.sensitivity;
    this.patterns = [];
  }

  recognizePattern(points) {
    // 实现...
  }
}

// ❌ 不好的
var max_length = 8;

class gesture_recognizer {
  constructor(options) {
    this.sensitivity = options.sensitivity;
  }
}
```

### 文件组织

```
src/
├── background/      # Background Service Worker
├── content/         # Content Scripts
├── core/            # 核心业务逻辑（可复用）
├── ui/              # UI 组件
│   ├── components/  # 可复用组件
│   ├── options/     # 选项页
│   ├── popup/       # 弹出窗口
│   └── sidepanel/   # 侧边栏
└── utils/           # 工具函数（纯函数）
```

### 注释规范

```javascript
/**
 * 识别鼠标手势模式
 * @param {Array<Point>} points - 轨迹点数组
 * @param {Object} options - 识别选项
 * @param {number} options.sensitivity - 灵敏度 (0-100)
 * @returns {string|null} 识别到的手势模式，如 'L', 'R', 'UDLR' 等
 */
function recognizeGesture(points, options = {}) {
  // 实现...
}

// 单行注释：解释为什么这样做，而不是做了什么
// 过滤掉距离太近的点，避免抖动
const filteredPoints = points.filter((p, i) => {
  if (i === 0) return true;
  return distance(p, points[i - 1]) > MIN_DISTANCE;
});
```

### Chrome API 使用

```javascript
// ✅ 好的：使用 Manifest V3 API
chrome.storage.local.get(['settings'], (result) => {
  const settings = result.settings || {};
});

// 使用 async/await
async function getSettings() {
  const result = await chrome.storage.local.get(['settings']);
  return result.settings || {};
}

// ❌ 避免：不要使用废弃的 API
chrome.extension.sendMessage(...); // 已废弃
```

## 📝 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(gesture): add pinch gesture support` |
| `fix` | Bug 修复 | `fix(tracker): resolve memory leak in path renderer` |
| `docs` | 文档更新 | `docs(readme): update installation steps` |
| `style` | 代码格式 | `style: format code with prettier` |
| `refactor` | 重构 | `refactor(core): simplify gesture recognition logic` |
| `perf` | 性能优化 | `perf(renderer): optimize canvas drawing` |
| `test` | 测试 | `test(utils): add unit tests for pattern analyzer` |
| `chore` | 构建/工具 | `chore(deps): upgrade vite to v5.0.0` |
| `build` | 构建系统 | `build: update build script for manifest v3` |

### Scope（可选）

常用 scope:
- `gesture`: 手势识别相关
- `tracker`: 轨迹跟踪
- `renderer`: 渲染引擎
- `ui`: 用户界面
- `options`: 选项页
- `sidepanel`: 侧边栏
- `i18n`: 国际化
- `deps`: 依赖管理

### Subject

- 使用祈使句，现在时态："add" 而不是 "added" 或 "adds"
- 首字母小写
- 结尾不加句号
- 限制在 50 字符以内

### Body（可选）

- 详细描述改动的原因和内容
- 使用祈使句
- 每行限制在 72 字符以内

### Footer（可选）

- 引用相关 issue: `Closes #123`
- 说明破坏性变更: `BREAKING CHANGE: ...`

### 示例

```bash
# 简单提交
git commit -m "feat(gesture): add double-click detection"

# 详细提交
git commit -m "feat(gesture): add double-click detection

Add support for detecting double-click gestures in addition to
mouse trail gestures. This allows users to trigger actions with
quick double-clicks.

Closes #45"

# 破坏性变更
git commit -m "refactor(api)!: change gesture pattern format

BREAKING CHANGE: Gesture patterns now use array format instead
of string format. Users need to update custom gestures.

Migration guide: 'UDLR' -> ['U', 'D', 'L', 'R']"
```

## 🔄 Pull Request 流程

### PR 标题

使用与提交信息相同的格式：
```
feat(gesture): add new gesture recognition algorithm
```

### PR 描述模板

```markdown
## 改动说明
简要描述这个 PR 做了什么

## 改动类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化
- [ ] 其他

## 相关 Issue
Closes #123

## 测试情况
- [ ] 在 Chrome 中手动测试
- [ ] 测试了所有受影响的功能
- [ ] 测试了边界情况

## 截图/视频
(如果适用)

## 检查清单
- [ ] 代码遵循项目的代码规范
- [ ] 进行了自我代码审查
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 我的改动没有产生新的警告
- [ ] 所有测试都通过
```

### 代码审查

PR 提交后：
1. 自动检查会运行（如果配置了 CI）
2. 维护者会进行代码审查
3. 根据反馈进行修改
4. 审查通过后会被合并

### 合并后

- 你的功能分支会被删除
- 更新会出现在 `develop` 分支
- 在下一个版本发布时会合并到 `main`

## 🏗️ 项目结构

```
chrome-guesture-extension/
├── .github/                 # GitHub 配置
│   ├── ISSUE_TEMPLATE/     # Issue 模板
│   └── PULL_REQUEST_TEMPLATE.md
├── chore/                   # 发布相关文档
├── docs/                    # 文档和图片
├── src/                     # 源代码
│   ├── assets/             # 静态资源
│   ├── background/         # Background Service Worker
│   ├── content/            # Content Scripts
│   ├── core/               # 核心模块
│   ├── ui/                 # UI 组件
│   └── utils/              # 工具函数
├── scripts/                # 构建脚本
├── manifest.json           # 扩展清单
├── vite.config.js          # Vite 配置
├── package.json            # 项目配置
├── BRANCHING_STRATEGY.md   # 分支策略
└── CONTRIBUTING.md         # 本文件
```

## 🎯 开发建议

### 性能考虑

- 避免在 content script 中进行大量计算
- 使用 `requestAnimationFrame` 进行动画
- 及时清理事件监听器
- 注意内存泄漏

### 兼容性

- 目标 Chrome 版本: 88+
- 使用 Manifest V3
- 测试不同操作系统（Windows, macOS, Linux）

### 安全性

- 不要在代码中硬编码密钥
- 验证所有用户输入
- 使用最小权限原则
- 注意 XSS 和注入攻击

## 📞 联系方式

- **GitHub Issues**: [提交 Issue](https://github.com/zhangsong-github/mouse-guesture-crx/issues)
- **Email**: zhangsongai3@gmail.com
- **讨论**: [GitHub Discussions](https://github.com/zhangsong-github/mouse-guesture-crx/discussions)

## 🙏 致谢

感谢所有贡献者！你们的贡献让这个项目变得更好。

---

**再次感谢你的贡献！** 🎉
