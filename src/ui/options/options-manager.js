/**
 * 重构后的设置页面管理器
 * 使用新的命名规范和模块化架构
 */
class ExtensionOptionsManager {
    constructor() {
        this.isInitialized = false;
        this.currentSettings = null;
        this.originalSettings = null;
        this.isDirty = false;
        
        // UI 状态管理
        this.activeTab = 'general';
        this.validationErrors = new Map();
        this.pendingChanges = new Map();
        
        // 绑定方法
        this.handleSettingChange = this.handleSettingChange.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.handleReset = this.handleReset.bind(this);
        this.handleExport = this.handleExport.bind(this);
        this.handleImport = this.handleImport.bind(this);
    }
    
    /**
     * 初始化设置页面
     */
    async initialize() {
        try {
            console.log('ExtensionOptionsManager initializing...');
            
            // 加载设置
            await this.loadExtensionSettings();
            
            // 设置UI结构
            this.setupUI();
            
            // 绑定事件
            this.bindEvents();
            
            // 初始化表单
            this.initializeForm();
            
            // 应用主题
            this.applyTheme();
            
            this.isInitialized = true;
            console.log('ExtensionOptionsManager initialized successfully');
            
        } catch (error) {
            console.error('ExtensionOptionsManager initialization failed:', error);
            this.showError('设置页面初始化失败，请刷新页面重试');
        }
    }
    
    /**
     * 加载扩展设置
     */
    async loadExtensionSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
            
            if (response && typeof response === 'object') {
                this.currentSettings = { ...response };
                this.originalSettings = { ...response };
                console.log('Settings loaded:', this.currentSettings);
            } else {
                throw new Error('Invalid settings response');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            // 使用默认设置
            this.currentSettings = this.getDefaultSettings();
            this.originalSettings = { ...this.currentSettings };
        }
    }
    
    /**
     * 设置UI结构
     */
    setupUI() {
        const container = document.getElementById('options-container');
        if (!container) {
            throw new Error('Options container not found');
        }
        
        container.innerHTML = `
            <div class="options-header">
                <h1>运动追踪扩展 - 设置</h1>
                <div class="header-actions">
                    <button id="export-btn" class="btn btn-outline">导出设置</button>
                    <button id="import-btn" class="btn btn-outline">导入设置</button>
                    <button id="reset-btn" class="btn btn-danger">重置默认</button>
                    <button id="save-btn" class="btn btn-primary">保存设置</button>
                </div>
            </div>
            
            <div class="options-body">
                <nav class="options-nav">
                    <ul class="nav-tabs">
                        <li><a href="#general" class="nav-tab active" data-tab="general">常规设置</a></li>
                        <li><a href="#patterns" class="nav-tab" data-tab="patterns">运动模式</a></li>
                        <li><a href="#visual" class="nav-tab" data-tab="visual">视觉效果</a></li>
                        <li><a href="#advanced" class="nav-tab" data-tab="advanced">高级选项</a></li>
                        <li><a href="#about" class="nav-tab" data-tab="about">关于</a></li>
                    </ul>
                </nav>
                
                <div class="options-content">
                    <div id="general-tab" class="tab-content active">
                        ${this.generateGeneralTab()}
                    </div>
                    <div id="patterns-tab" class="tab-content">
                        ${this.generatePatternsTab()}
                    </div>
                    <div id="visual-tab" class="tab-content">
                        ${this.generateVisualTab()}
                    </div>
                    <div id="advanced-tab" class="tab-content">
                        ${this.generateAdvancedTab()}
                    </div>
                    <div id="about-tab" class="tab-content">
                        ${this.generateAboutTab()}
                    </div>
                </div>
            </div>
            
            <div id="notification-area"></div>
        `;
    }
    
    /**
     * 生成常规设置标签页
     */
    generateGeneralTab() {
        return `
            <div class="settings-section">
                <h2>基本设置</h2>
                
                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" id="enable-execution" ${this.currentSettings.enableExecution ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        启用运动执行
                    </label>
                    <p class="setting-description">开启后，执行运动手势时会触发相应的动作</p>
                </div>
                
                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" id="enable-hints" ${this.currentSettings.enableHints ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        显示运动提示
                    </label>
                    <p class="setting-description">在运动过程中显示当前模式和对应动作</p>
                </div>
                
                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" id="enable-sounds" ${this.currentSettings.enableSounds ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        启用声音反馈
                    </label>
                    <p class="setting-description">运动识别和执行时播放提示音</p>
                </div>
                
                <div class="setting-item">
                    <label for="pattern-sensitivity">模式识别敏感度</label>
                    <div class="slider-container">
                        <input type="range" id="pattern-sensitivity" min="5" max="50" value="${this.currentSettings.patternSensitivity}">
                        <span class="slider-value">${this.currentSettings.patternSensitivity}px</span>
                    </div>
                    <p class="setting-description">调整运动识别的敏感程度，值越小越敏感</p>
                </div>
                
                <div class="setting-item">
                    <label for="recognition-timeout">识别超时时间</label>
                    <div class="input-container">
                        <input type="number" id="recognition-timeout" min="500" max="5000" step="100" value="${this.currentSettings.recognitionTimeout || 1000}">
                        <span class="input-unit">毫秒</span>
                    </div>
                    <p class="setting-description">运动停止后多长时间开始执行动作</p>
                </div>
            </div>
            
            <div class="settings-section">
                <h2>页面兼容性</h2>
                
                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" id="enable-on-all-sites" ${this.currentSettings.enableOnAllSites !== false ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        在所有网站启用
                    </label>
                    <p class="setting-description">在所有网页上启用运动识别功能</p>
                </div>
                
                <div class="setting-item">
                    <label for="excluded-sites">排除网站列表</label>
                    <textarea id="excluded-sites" rows="4" placeholder="每行一个网站域名，例如：&#10;example.com&#10;*.google.com">${(this.currentSettings.excludedSites || []).join('\n')}</textarea>
                    <p class="setting-description">在这些网站上禁用运动识别功能</p>
                </div>
            </div>
        `;
    }
    
    /**
     * 生成运动模式标签页
     */
    generatePatternsTab() {
        const mappings = this.currentSettings.actionMappings || {};
        
        return `
            <div class="settings-section">
                <h2>运动模式配置</h2>
                <p class="section-description">配置不同运动模式对应的动作。点击右侧的动作选择器可以修改映射。</p>
                
                <div class="pattern-list">
                    ${this.generatePatternMappingList(mappings)}
                </div>
                
                <div class="pattern-actions">
                    <button id="add-pattern-btn" class="btn btn-outline">
                        <i class="icon-plus"></i> 添加自定义模式
                    </button>
                    <button id="reset-patterns-btn" class="btn btn-outline">
                        <i class="icon-reset"></i> 重置为默认
                    </button>
                </div>
            </div>
            
            <div class="settings-section">
                <h2>模式测试</h2>
                <div class="pattern-tester">
                    <div class="test-area" id="pattern-test-area">
                        <p>在此区域内绘制运动来测试识别效果</p>
                        <canvas id="test-canvas" width="300" height="200"></canvas>
                    </div>
                    <div class="test-results">
                        <div class="result-item">
                            <label>识别模式:</label>
                            <span id="recognized-pattern">-</span>
                        </div>
                        <div class="result-item">
                            <label>对应动作:</label>
                            <span id="mapped-action">-</span>
                        </div>
                        <button id="clear-test-btn" class="btn btn-small">清除</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 生成视觉效果标签页
     */
    generateVisualTab() {
        return `
            <div class="settings-section">
                <h2>轨迹显示</h2>
                
                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" id="enable-trail" ${this.currentSettings.enableTrail ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        显示运动轨迹
                    </label>
                    <p class="setting-description">在运动过程中显示鼠标轨迹</p>
                </div>
                
                <div class="setting-item">
                    <label for="trail-duration">轨迹持续时间</label>
                    <div class="slider-container">
                        <input type="range" id="trail-duration" min="100" max="2000" step="50" value="${this.currentSettings.trailDuration || 500}">
                        <span class="slider-value">${this.currentSettings.trailDuration || 500}ms</span>
                    </div>
                    <p class="setting-description">轨迹线条的显示时长</p>
                </div>
                
                <div class="setting-item">
                    <label for="trail-color">轨迹颜色</label>
                    <div class="color-picker-container">
                        <input type="color" id="trail-color" value="${this.currentSettings.trailColor || '#007bff'}">
                        <input type="text" id="trail-color-text" value="${this.currentSettings.trailColor || '#007bff'}">
                    </div>
                    <p class="setting-description">运动轨迹的颜色</p>
                </div>
                
                <div class="setting-item">
                    <label for="trail-width">轨迹宽度</label>
                    <div class="slider-container">
                        <input type="range" id="trail-width" min="1" max="10" value="${this.currentSettings.trailWidth || 3}">
                        <span class="slider-value">${this.currentSettings.trailWidth || 3}px</span>
                    </div>
                    <p class="setting-description">轨迹线条的宽度</p>
                </div>
                
                <div class="setting-item">
                    <label for="trail-opacity">轨迹透明度</label>
                    <div class="slider-container">
                        <input type="range" id="trail-opacity" min="0.1" max="1" step="0.1" value="${this.currentSettings.trailOpacity || 0.7}">
                        <span class="slider-value">${Math.round((this.currentSettings.trailOpacity || 0.7) * 100)}%</span>
                    </div>
                    <p class="setting-description">轨迹线条的透明程度</p>
                </div>
            </div>
            
            <div class="settings-section">
                <h2>提示显示</h2>
                
                <div class="setting-item">
                    <label for="hint-position">提示位置</label>
                    <select id="hint-position">
                        <option value="center" ${(this.currentSettings.hintPosition || 'center') === 'center' ? 'selected' : ''}>屏幕中央</option>
                        <option value="top" ${this.currentSettings.hintPosition === 'top' ? 'selected' : ''}>屏幕顶部</option>
                        <option value="bottom" ${this.currentSettings.hintPosition === 'bottom' ? 'selected' : ''}>屏幕底部</option>
                        <option value="cursor" ${this.currentSettings.hintPosition === 'cursor' ? 'selected' : ''}>鼠标旁边</option>
                    </select>
                    <p class="setting-description">运动提示信息的显示位置</p>
                </div>
                
                <div class="setting-item">
                    <label for="hint-duration">提示持续时间</label>
                    <div class="slider-container">
                        <input type="range" id="hint-duration" min="500" max="5000" step="250" value="${this.currentSettings.hintDuration || 2000}">
                        <span class="slider-value">${this.currentSettings.hintDuration || 2000}ms</span>
                    </div>
                    <p class="setting-description">提示信息的显示时长</p>
                </div>
            </div>
            
            <div class="settings-section">
                <h2>预览效果</h2>
                <div class="visual-preview">
                    <canvas id="preview-canvas" width="400" height="200"></canvas>
                    <div class="preview-controls">
                        <button id="preview-trail-btn" class="btn btn-small">预览轨迹</button>
                        <button id="preview-hint-btn" class="btn btn-small">预览提示</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 生成高级选项标签页
     */
    generateAdvancedTab() {
        return `
            <div class="settings-section">
                <h2>性能设置</h2>
                
                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" id="performance-mode" ${this.currentSettings.performanceMode ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        性能优化模式
                    </label>
                    <p class="setting-description">启用后会减少视觉效果以提高性能</p>
                </div>
                
                <div class="setting-item">
                    <label for="max-trail-points">最大轨迹点数</label>
                    <div class="input-container">
                        <input type="number" id="max-trail-points" min="10" max="200" value="${this.currentSettings.maxTrailPoints || 50}">
                        <span class="input-unit">个</span>
                    </div>
                    <p class="setting-description">限制轨迹点数量以优化内存使用</p>
                </div>
            </div>
            
            <div class="settings-section">
                <h2>调试选项</h2>
                
                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" id="debug-mode" ${this.currentSettings.debugMode ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        启用调试模式
                    </label>
                    <p class="setting-description">在控制台输出详细的调试信息</p>
                </div>
                
                <div class="setting-item">
                    <label for="log-level">日志级别</label>
                    <select id="log-level">
                        <option value="error" ${(this.currentSettings.logLevel || 'info') === 'error' ? 'selected' : ''}>仅错误</option>
                        <option value="warn" ${this.currentSettings.logLevel === 'warn' ? 'selected' : ''}>警告及以上</option>
                        <option value="info" ${(this.currentSettings.logLevel || 'info') === 'info' ? 'selected' : ''}>信息及以上</option>
                        <option value="debug" ${this.currentSettings.logLevel === 'debug' ? 'selected' : ''}>全部日志</option>
                    </select>
                    <p class="setting-description">控制台日志的详细程度</p>
                </div>
            </div>
            
            <div class="settings-section">
                <h2>数据管理</h2>
                
                <div class="setting-item">
                    <div class="data-info">
                        <div class="info-item">
                            <label>存储使用量:</label>
                            <span id="storage-usage">计算中...</span>
                        </div>
                        <div class="info-item">
                            <label>设置数据大小:</label>
                            <span id="settings-size">计算中...</span>
                        </div>
                    </div>
                    <div class="data-actions">
                        <button id="clear-data-btn" class="btn btn-danger">清除所有数据</button>
                        <button id="backup-data-btn" class="btn btn-outline">备份数据</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 生成关于标签页
     */
    generateAboutTab() {
        const manifest = chrome.runtime.getManifest();
        
        return `
            <div class="about-section">
                <div class="extension-info">
                    <img src="../icons/icon128.png" alt="Extension Icon" class="extension-icon">
                    <h2>运动追踪扩展</h2>
                    <p class="version">版本 ${manifest.version}</p>
                    <p class="description">${manifest.description || '高级鼠标手势识别扩展'}</p>
                </div>
                
                <div class="feature-list">
                    <h3>主要功能</h3>
                    <ul>
                        <li>智能运动模式识别</li>
                        <li>可自定义的动作映射</li>
                        <li>实时轨迹显示</li>
                        <li>跨平台兼容性</li>
                        <li>性能优化模式</li>
                    </ul>
                </div>
                
                <div class="help-links">
                    <h3>帮助与支持</h3>
                    <div class="link-buttons">
                        <button id="view-changelog-btn" class="btn btn-outline">更新日志</button>
                        <button id="report-issue-btn" class="btn btn-outline">反馈问题</button>
                        <button id="view-tutorial-btn" class="btn btn-outline">使用教程</button>
                    </div>
                </div>
                
                <div class="system-info">
                    <h3>系统信息</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>浏览器:</label>
                            <span id="browser-info">Chrome ${navigator.userAgent}</span>
                        </div>
                        <div class="info-item">
                            <label>操作系统:</label>
                            <span id="os-info">${navigator.platform}</span>
                        </div>
                        <div class="info-item">
                            <label>扩展权限:</label>
                            <span id="permissions-info">正在检查...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 生成模式映射列表
     */
    generatePatternMappingList(mappings) {
        const patternList = [];
        
        for (const [pattern, action] of Object.entries(mappings)) {
            patternList.push(`
                <div class="pattern-item" data-pattern="${pattern}">
                    <div class="pattern-display">
                        <span class="pattern-text">${pattern}</span>
                        <div class="pattern-visual">${this.generatePatternVisualization(pattern)}</div>
                    </div>
                    <div class="pattern-arrow">→</div>
                    <div class="action-selector">
                        <select class="action-dropdown" data-pattern="${pattern}">
                            ${this.generateActionOptions(action)}
                        </select>
                    </div>
                    <div class="pattern-controls">
                        <button class="btn-icon delete-pattern" data-pattern="${pattern}" title="删除此映射">
                            <i class="icon-delete"></i>
                        </button>
                    </div>
                </div>
            `);
        }
        
        return patternList.join('');
    }
    
    /**
     * 生成动作选项
     */
    generateActionOptions(selectedAction) {
        const actions = [
            { value: 'previousTab', label: '切换到上一个标签页' },
            { value: 'nextTab', label: '切换到下一个标签页' },
            { value: 'newTab', label: '新建标签页' },
            { value: 'closeTab', label: '关闭当前标签页' },
            { value: 'refreshTab', label: '刷新当前页面' },
            { value: 'reopenTab', label: '重新打开关闭的标签页' },
            { value: 'scrollToTop', label: '滚动到页面顶部' },
            { value: 'scrollToBottom', label: '滚动到页面底部' },
            { value: 'duplicateTab', label: '复制当前标签页' },
            { value: 'minimizeWindow', label: '最小化当前窗口' },
            { value: 'toggleFullscreen', label: '切换全屏模式' },
            { value: 'togglePinTab', label: '切换标签页固定状态' }
        ];
        
        return actions.map(action => 
            `<option value="${action.value}" ${action.value === selectedAction ? 'selected' : ''}>${action.label}</option>`
        ).join('');
    }
    
    /**
     * 生成模式可视化
     */
    generatePatternVisualization(pattern) {
        const arrows = {
            'L': '←',
            'R': '→',
            'U': '↑',
            'D': '↓'
        };
        
        return pattern.split('').map(dir => arrows[dir] || dir).join('');
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 标签页切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', this.handleTabSwitch);
        });
        
        // 设置变更
        document.addEventListener('change', this.handleSettingChange);
        document.addEventListener('input', this.handleSettingChange);
        
        // 操作按钮
        const saveBtn = document.getElementById('save-btn');
        const resetBtn = document.getElementById('reset-btn');
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        
        if (saveBtn) saveBtn.addEventListener('click', this.handleSave);
        if (resetBtn) resetBtn.addEventListener('click', this.handleReset);
        if (exportBtn) exportBtn.addEventListener('click', this.handleExport);
        if (importBtn) importBtn.addEventListener('click', this.handleImport);
        
        // 监听窗口关闭前的保存提醒
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = '你有未保存的设置更改，确定要离开吗？';
                return e.returnValue;
            }
        });
    }
    
    /**
     * 处理标签页切换
     */
    handleTabSwitch(event) {
        event.preventDefault();
        
        const targetTab = event.target.dataset.tab;
        if (targetTab === this.activeTab) return;
        
        // 更新导航状态
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // 切换内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        this.activeTab = targetTab;
        
        // 特定标签页的初始化
        if (targetTab === 'patterns') {
            this.initializePatternTester();
        } else if (targetTab === 'visual') {
            this.initializeVisualPreview();
        } else if (targetTab === 'advanced') {
            this.updateStorageInfo();
        }
    }
    
    /**
     * 处理设置变更
     */
    handleSettingChange(event) {
        const element = event.target;
        const settingKey = this.getSettingKeyFromElement(element);
        
        if (!settingKey) return;
        
        let value;
        
        // 根据元素类型获取值
        if (element.type === 'checkbox') {
            value = element.checked;
        } else if (element.type === 'number' || element.type === 'range') {
            value = parseFloat(element.value);
        } else {
            value = element.value;
        }
        
        // 验证值
        if (!this.validateSetting(settingKey, value)) {
            this.showValidationError(element, '设置值无效');
            return;
        }
        
        // 更新设置
        this.updateSetting(settingKey, value);
        
        // 实时预览效果
        if (settingKey.startsWith('trail') || settingKey.startsWith('hint')) {
            this.updateVisualPreview();
        }
    }
    
    /**
     * 从元素获取设置键名
     */
    getSettingKeyFromElement(element) {
        const idMappings = {
            'enable-execution': 'enableExecution',
            'enable-hints': 'enableHints',
            'enable-sounds': 'enableSounds',
            'pattern-sensitivity': 'patternSensitivity',
            'recognition-timeout': 'recognitionTimeout',
            'enable-trail': 'enableTrail',
            'trail-duration': 'trailDuration',
            'trail-color': 'trailColor',
            'trail-width': 'trailWidth',
            'trail-opacity': 'trailOpacity',
            'hint-position': 'hintPosition',
            'hint-duration': 'hintDuration',
            'performance-mode': 'performanceMode',
            'debug-mode': 'debugMode',
            'log-level': 'logLevel',
            'max-trail-points': 'maxTrailPoints'
        };
        
        return idMappings[element.id];
    }
    
    /**
     * 验证设置值
     */
    validateSetting(key, value) {
        const validators = {
            'patternSensitivity': (v) => v >= 5 && v <= 50,
            'recognitionTimeout': (v) => v >= 500 && v <= 5000,
            'trailDuration': (v) => v >= 100 && v <= 2000,
            'trailWidth': (v) => v >= 1 && v <= 10,
            'trailOpacity': (v) => v >= 0.1 && v <= 1,
            'hintDuration': (v) => v >= 500 && v <= 5000,
            'maxTrailPoints': (v) => v >= 10 && v <= 200
        };
        
        const validator = validators[key];
        return !validator || validator(value);
    }
    
    /**
     * 更新设置值
     */
    updateSetting(key, value) {
        if (this.currentSettings[key] !== value) {
            this.currentSettings[key] = value;
            this.pendingChanges.set(key, value);
            this.isDirty = true;
            this.updateSaveButtonState();
        }
    }
    
    /**
     * 更新保存按钮状态
     */
    updateSaveButtonState() {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.textContent = this.isDirty ? '保存设置 *' : '保存设置';
            saveBtn.disabled = !this.isDirty;
        }
    }
    
    /**
     * 处理保存操作
     */
    async handleSave() {
        try {
            this.showLoading('正在保存设置...');
            
            const response = await chrome.runtime.sendMessage({
                type: 'SAVE_SETTINGS',
                settings: this.currentSettings
            });
            
            if (response && response.success) {
                this.originalSettings = { ...this.currentSettings };
                this.pendingChanges.clear();
                this.isDirty = false;
                this.updateSaveButtonState();
                this.showSuccess('设置已保存');
            } else {
                throw new Error('保存失败');
            }
            
        } catch (error) {
            console.error('Save failed:', error);
            this.showError('保存设置失败，请重试');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 处理重置操作
     */
    async handleReset() {
        if (!confirm('确定要重置所有设置为默认值吗？此操作不可撤销。')) {
            return;
        }
        
        try {
            this.showLoading('正在重置设置...');
            
            const response = await chrome.runtime.sendMessage({ type: 'RESET_SETTINGS' });
            
            if (response && response.success) {
                await this.loadExtensionSettings();
                this.initializeForm();
                this.isDirty = false;
                this.updateSaveButtonState();
                this.showSuccess('设置已重置为默认值');
            } else {
                throw new Error('重置失败');
            }
            
        } catch (error) {
            console.error('Reset failed:', error);
            this.showError('重置设置失败，请重试');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 处理导出操作
     */
    handleExport() {
        try {
            const exportData = {
                version: chrome.runtime.getManifest().version,
                timestamp: new Date().toISOString(),
                settings: this.currentSettings
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `motion-tracker-settings-${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccess('设置已导出');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('导出设置失败');
        }
    }
    
    /**
     * 处理导入操作
     */
    handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importData = JSON.parse(text);
                
                if (!importData.settings) {
                    throw new Error('无效的设置文件格式');
                }
                
                // 验证设置数据
                if (!this.validateImportData(importData.settings)) {
                    throw new Error('设置数据验证失败');
                }
                
                if (confirm('确定要导入这些设置吗？当前设置将被覆盖。')) {
                    this.currentSettings = { ...this.currentSettings, ...importData.settings };
                    this.initializeForm();
                    this.isDirty = true;
                    this.updateSaveButtonState();
                    this.showSuccess('设置已导入，请点击保存按钮应用更改');
                }
                
            } catch (error) {
                console.error('Import failed:', error);
                this.showError('导入设置失败：' + error.message);
            }
        };
        
        input.click();
    }
    
    /**
     * 验证导入数据
     */
    validateImportData(settings) {
        // 基本类型检查
        if (!settings || typeof settings !== 'object') {
            return false;
        }
        
        // 检查必要字段
        const requiredFields = ['patternSensitivity', 'enableExecution'];
        for (const field of requiredFields) {
            if (!(field in settings)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 初始化表单
     */
    initializeForm() {
        // 更新所有表单控件的值
        Object.entries(this.currentSettings).forEach(([key, value]) => {
            const element = this.getElementBySettingKey(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
                
                // 更新相关的显示元素
                this.updateRelatedDisplays(element);
            }
        });
    }
    
    /**
     * 根据设置键名获取元素
     */
    getElementBySettingKey(key) {
        const keyMappings = {
            'enableExecution': 'enable-execution',
            'enableHints': 'enable-hints',
            'enableSounds': 'enable-sounds',
            'patternSensitivity': 'pattern-sensitivity',
            'recognitionTimeout': 'recognition-timeout',
            'enableTrail': 'enable-trail',
            'trailDuration': 'trail-duration',
            'trailColor': 'trail-color',
            'trailWidth': 'trail-width',
            'trailOpacity': 'trail-opacity',
            'hintPosition': 'hint-position',
            'hintDuration': 'hint-duration',
            'performanceMode': 'performance-mode',
            'debugMode': 'debug-mode',
            'logLevel': 'log-level',
            'maxTrailPoints': 'max-trail-points'
        };
        
        const elementId = keyMappings[key];
        return elementId ? document.getElementById(elementId) : null;
    }
    
    /**
     * 更新相关显示元素
     */
    updateRelatedDisplays(element) {
        // 更新滑块值显示
        if (element.type === 'range') {
            const valueDisplay = element.parentElement.querySelector('.slider-value');
            if (valueDisplay) {
                let unit = '';
                if (element.id.includes('sensitivity')) unit = 'px';
                else if (element.id.includes('duration') || element.id.includes('timeout')) unit = 'ms';
                else if (element.id.includes('width')) unit = 'px';
                else if (element.id.includes('opacity')) unit = '%';
                
                const displayValue = element.id.includes('opacity') ? 
                    Math.round(element.value * 100) : element.value;
                
                valueDisplay.textContent = displayValue + unit;
            }
        }
        
        // 更新颜色文本框
        if (element.type === 'color') {
            const textInput = document.getElementById(element.id + '-text');
            if (textInput) {
                textInput.value = element.value;
            }
        }
    }
    
    /**
     * 初始化模式测试器
     */
    initializePatternTester() {
        const canvas = document.getElementById('test-canvas');
        if (canvas && !canvas.hasPatternTester) {
            // 为测试画布添加运动识别功能
            // 这里可以集成运动追踪器的测试版本
            canvas.hasPatternTester = true;
            console.log('Pattern tester initialized');
        }
    }
    
    /**
     * 初始化视觉预览
     */
    initializeVisualPreview() {
        const canvas = document.getElementById('preview-canvas');
        if (canvas && !canvas.hasPreview) {
            // 初始化预览画布
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 绘制示例轨迹
            this.drawPreviewTrail(ctx);
            
            canvas.hasPreview = true;
        }
    }
    
    /**
     * 绘制预览轨迹
     */
    drawPreviewTrail(ctx) {
        const points = [
            { x: 50, y: 150 },
            { x: 150, y: 50 },
            { x: 250, y: 150 },
            { x: 350, y: 100 }
        ];
        
        ctx.strokeStyle = this.currentSettings.trailColor || '#007bff';
        ctx.lineWidth = this.currentSettings.trailWidth || 3;
        ctx.globalAlpha = this.currentSettings.trailOpacity || 0.7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.stroke();
    }
    
    /**
     * 更新存储信息
     */
    async updateStorageInfo() {
        try {
            const storageData = await chrome.storage.sync.get();
            const dataSize = new Blob([JSON.stringify(storageData)]).size;
            const maxSize = chrome.storage.sync.QUOTA_BYTES || 102400;
            
            const usagePercent = Math.round((dataSize / maxSize) * 100);
            
            const usageElement = document.getElementById('storage-usage');
            const sizeElement = document.getElementById('settings-size');
            
            if (usageElement) {
                usageElement.textContent = `${dataSize} / ${maxSize} 字节 (${usagePercent}%)`;
            }
            
            if (sizeElement) {
                sizeElement.textContent = `${dataSize} 字节`;
            }
            
        } catch (error) {
            console.error('Failed to get storage info:', error);
        }
    }
    
    /**
     * 应用主题
     */
    applyTheme() {
        // 可以根据用户偏好或系统设置应用主题
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDarkMode) {
            document.body.classList.add('dark-theme');
        }
    }
    
    /**
     * 获取默认设置
     */
    getDefaultSettings() {
        return {
            enableExecution: true,
            enableHints: true,
            enableSounds: false,
            patternSensitivity: 10,
            recognitionTimeout: 1000,
            enableTrail: true,
            trailDuration: 500,
            trailColor: '#007bff',
            trailWidth: 3,
            trailOpacity: 0.7,
            hintPosition: 'center',
            hintDuration: 2000,
            performanceMode: false,
            debugMode: false,
            logLevel: 'info',
            maxTrailPoints: 50,
            actionMappings: {
                'L': 'previousTab',
                'R': 'nextTab',
                'U': 'newTab',
                'D': 'closeTab',
                'LR': 'refreshTab',
                'RL': 'reopenTab',
                'UD': 'scrollToTop',
                'DU': 'scrollToBottom'
            }
        };
    }
    
    /**
     * 显示加载状态
     */
    showLoading(message) {
        // 实现加载指示器
        console.log('Loading:', message);
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        // 隐藏加载指示器
    }
    
    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    /**
     * 显示错误消息
     */
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    /**
     * 显示验证错误
     */
    showValidationError(element, message) {
        element.classList.add('validation-error');
        this.validationErrors.set(element.id, message);
        
        // 移除之前的错误提示
        const existingError = element.parentElement.querySelector('.validation-message');
        if (existingError) {
            existingError.remove();
        }
        
        // 添加新的错误提示
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-message error';
        errorElement.textContent = message;
        element.parentElement.appendChild(errorElement);
        
        // 3秒后自动移除
        setTimeout(() => {
            element.classList.remove('validation-error');
            this.validationErrors.delete(element.id);
            if (errorElement.parentElement) {
                errorElement.remove();
            }
        }, 3000);
    }
    
    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        const notificationArea = document.getElementById('notification-area');
        if (notificationArea) {
            notificationArea.appendChild(notification);
            
            // 绑定关闭按钮
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.remove();
            });
            
            // 自动移除
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        } else {
            // 降级到 alert
            alert(message);
        }
    }
    
    /**
     * 更新视觉预览
     */
    updateVisualPreview() {
        const canvas = document.getElementById('preview-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.drawPreviewTrail(ctx);
        }
    }
    
    /**
     * 销毁管理器
     */
    destroy() {
        // 清理事件监听器和定时器
        this.isInitialized = false;
    }
}

// 全局实例
let optionsManager = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        optionsManager = new ExtensionOptionsManager();
        await optionsManager.initialize();
        
        // 提供全局调试接口
        if (typeof window !== 'undefined') {
            window.optionsManager = optionsManager;
        }
        
    } catch (error) {
        console.error('Failed to initialize options page:', error);
        
        // 显示错误页面
        document.body.innerHTML = `
            <div class="error-page">
                <h1>设置页面加载失败</h1>
                <p>扩展设置页面无法正常加载，请尝试以下解决方案：</p>
                <ul>
                    <li>刷新此页面</li>
                    <li>重新启动浏览器</li>
                    <li>检查扩展是否正确安装</li>
                    <li>查看浏览器控制台中的详细错误信息</li>
                </ul>
                <button onclick="location.reload()" class="retry-btn">重新加载</button>
            </div>
        `;
    }
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (optionsManager) {
        optionsManager.destroy();
    }
});

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionOptionsManager;
}

console.log('ExtensionOptionsManager module loaded');