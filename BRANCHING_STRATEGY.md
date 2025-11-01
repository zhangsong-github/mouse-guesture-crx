# Git 分支管理策略

本项目采用 **Git Flow** 简化版本作为分支管理策略，适合 Chrome 扩展开发的场景。

## 📋 分支类型

### 长期分支

#### `main` (主分支)
- **用途**: 生产环境代码，每个提交都代表一个可发布的稳定版本
- **特点**: 
  - 只接受来自 `release/*` 和 `hotfix/*` 分支的合并
  - 每次合并都应该打上版本标签 (如 `v1.1.1`)
  - 对应 Chrome Web Store 上发布的版本
- **保护规则**: 不允许直接推送，必须通过 Pull Request

#### `develop` (开发分支)
- **用途**: 日常开发的主分支，包含下一版本的最新开发代码
- **特点**:
  - 从 `main` 分支创建
  - 接受来自 `feature/*` 分支的合并
  - 相对稳定，可以进行集成测试
- **保护规则**: 建议通过 Pull Request 合并

### 临时分支

#### `feature/*` (功能分支)
- **命名规范**: `feature/功能描述` (如 `feature/gesture-recording`)
- **用途**: 开发新功能
- **生命周期**:
  ```bash
  # 从 develop 创建
  git checkout develop
  git checkout -b feature/new-feature
  
  # 开发完成后合并回 develop
  git checkout develop
  git merge --no-ff feature/new-feature
  git branch -d feature/new-feature
  ```
- **说明**: 功能开发完成后删除该分支

#### `release/*` (发布分支)
- **命名规范**: `release/版本号` (如 `release/1.2.0`)
- **用途**: 准备新版本发布，进行版本号更新、bug修复、文档更新
- **生命周期**:
  ```bash
  # 从 develop 创建
  git checkout develop
  git checkout -b release/1.2.0
  
  # 更新版本号并进行测试修复
  # 完成后合并到 main 和 develop
  git checkout main
  git merge --no-ff release/1.2.0
  git tag -a v1.2.0 -m "Release version 1.2.0"
  
  git checkout develop
  git merge --no-ff release/1.2.0
  git branch -d release/1.2.0
  ```

#### `hotfix/*` (紧急修复分支)
- **命名规范**: `hotfix/问题描述` (如 `hotfix/gesture-crash`)
- **用途**: 修复生产环境的紧急问题
- **生命周期**:
  ```bash
  # 从 main 创建
  git checkout main
  git checkout -b hotfix/critical-bug
  
  # 修复后合并到 main 和 develop
  git checkout main
  git merge --no-ff hotfix/critical-bug
  git tag -a v1.1.2 -m "Hotfix version 1.1.2"
  
  git checkout develop
  git merge --no-ff hotfix/critical-bug
  git branch -d hotfix/critical-bug
  ```

## 🔄 工作流程

### 开发新功能
```bash
# 1. 更新 develop 分支
git checkout develop
git pull origin develop

# 2. 创建功能分支
git checkout -b feature/awesome-feature

# 3. 开发并提交
git add .
git commit -m "feat: add awesome feature"

# 4. 推送到远程（用于备份或协作）
git push origin feature/awesome-feature

# 5. 创建 Pull Request 到 develop
# (在 GitHub 网页上操作)

# 6. 代码审查通过后合并，删除远程分支
```

### 发布新版本
```bash
# 1. 从 develop 创建 release 分支
git checkout develop
git checkout -b release/1.2.0

# 2. 更新版本号
# 编辑 package.json 和 manifest.json
npm version 1.2.0 --no-git-tag-version

# 3. 构建和测试
npm run build:prod
npm run validate

# 4. 提交版本更新
git commit -am "chore: bump version to 1.2.0"

# 5. 合并到 main
git checkout main
git merge --no-ff release/1.2.0

# 6. 打标签
git tag -a v1.2.0 -m "Release version 1.2.0"

# 7. 合并回 develop
git checkout develop
git merge --no-ff release/1.2.0

# 8. 推送所有内容
git push origin main develop --tags

# 9. 删除 release 分支
git branch -d release/1.2.0
```

### 紧急修复
```bash
# 1. 从 main 创建 hotfix 分支
git checkout main
git checkout -b hotfix/critical-issue

# 2. 修复问题
git commit -am "fix: resolve critical issue"

# 3. 更新版本号（patch 版本）
npm version patch --no-git-tag-version
git commit -am "chore: bump version to 1.1.2"

# 4. 合并到 main 并打标签
git checkout main
git merge --no-ff hotfix/critical-issue
git tag -a v1.1.2 -m "Hotfix version 1.1.2"

# 5. 合并回 develop
git checkout develop
git merge --no-ff hotfix/critical-issue

# 6. 推送并删除分支
git push origin main develop --tags
git branch -d hotfix/critical-issue
```

## 📝 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响代码运行）
- `refactor`: 重构（既不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动
- `build`: 构建系统或外部依赖的变动

### 示例
```bash
feat(gesture): add double-tap gesture support
fix(tracker): resolve motion detection on high-DPI displays
docs(readme): update installation instructions
chore(deps): upgrade vite to v5.0.0
```

## 🏷️ 版本标签

- 格式: `vX.Y.Z` (如 `v1.2.0`)
- 遵循 [语义化版本](https://semver.org/lang/zh-CN/)
  - **主版本号 (X)**: 不兼容的 API 修改
  - **次版本号 (Y)**: 向下兼容的功能性新增
  - **修订号 (Z)**: 向下兼容的问题修正

## 🔒 分支保护建议

在 GitHub 仓库设置中配置：

### `main` 分支
- ✅ 要求 Pull Request 审查后才能合并
- ✅ 要求状态检查通过后才能合并
- ✅ 要求分支是最新的
- ✅ 禁止直接推送
- ✅ 禁止强制推送

### `develop` 分支
- ✅ 要求 Pull Request 审查后才能合并
- ✅ 要求状态检查通过后才能合并
- ⚠️ 允许管理员绕过上述要求（便于快速修复）

## 📊 分支可视化

```
main     ──●────────────●─────────────●────→ (v1.0.0)  (v1.1.0)  (v1.2.0)
            ╲            ╲             ╲
             ╲            ╲             ╲
develop      ●────●────●──●────●────●──●───→
             │    │    │       │    │
             │    │    │       │    │
feature/a    ●────●────●       │    │
                              │    │
feature/b                     ●────●
```

## 🎯 最佳实践

1. **小步提交**: 每次提交应该是一个逻辑单元
2. **频繁同步**: 定期从 `develop` 拉取最新代码到功能分支
3. **及时清理**: 合并后及时删除已完成的功能分支
4. **代码审查**: 所有合并到 `develop` 和 `main` 的代码都应经过 Pull Request 审查
5. **自动化测试**: 在 Pull Request 中运行自动化构建和验证
6. **清晰的 PR 描述**: 说明改动内容、相关 Issue、测试情况

## 🚀 快速参考

| 操作 | 命令 |
|------|------|
| 创建功能分支 | `git checkout -b feature/name develop` |
| 创建发布分支 | `git checkout -b release/1.2.0 develop` |
| 创建修复分支 | `git checkout -b hotfix/name main` |
| 查看所有分支 | `git branch -a` |
| 删除本地分支 | `git branch -d branch-name` |
| 删除远程分支 | `git push origin --delete branch-name` |
| 查看分支图 | `git log --graph --oneline --all` |

---

**注意**: 这个策略是指导性的，可以根据实际项目规模和团队大小进行调整。对于个人项目，可以简化流程；对于团队项目，建议严格执行。
