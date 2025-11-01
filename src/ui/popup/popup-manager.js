/**
 * 弹出窗口管理器 - 处理扩展弹出窗口的交互逻辑
 * MotionExtensionPopup - 运动扩展弹出窗口主类
 */
class MotionExtensionPopup {
    constructor() {
        this.isEnabled = false;
        this.motions = [];
        this.customMotions = [];
        this.elements = {};
        this.visualizer = null;
        
        this.init();
    }

    /**
     * 初始化弹出窗口
     */
    async init() {
        this.bindElements();
        this.bindEvents();
        this.visualizer = new DirectionVisualizer();
        
        await this.loadSettings();
        await this.loadMotions();
        this.updateUI();
        this.checkPageSupport();
    }

    /**
     * 绑定页面元素
     */
    bindElements() {
        this.elements = {
            mainToggle: document.getElementById('mainToggle'),
            toggleLabel: document.getElementById('toggleLabel'),
            mainContent: document.getElementById('mainContent'),
            disabledMessage: document.getElementById('disabledMessage'),
            motionList: document.getElementById('motionList'),
            customMotionsPreview: document.getElementById('customMotionsPreview'),
            openOptionsBtn: document.getElementById('openOptionsBtn'),
            openOptionsBtn2: document.getElementById('openOptionsBtn2'),
            settingsBtn: document.getElementById('settingsBtn'),
            helpBtn: document.getElementById('helpBtn'),
            helpSection: document.getElementById('helpSection'),
            closeHelpBtn: document.getElementById('closeHelpBtn')
        };
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 主开关切换
        this.elements.mainToggle.addEventListener('change', (e) => {
            this.toggleExtension(e.target.checked);
        });

        // 打开设置页面
        [this.elements.openOptionsBtn, this.elements.openOptionsBtn2, this.elements.settingsBtn]
            .forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', this.openOptionsPage.bind(this));
                }
            });

        // 帮助功能
        if (this.elements.helpBtn) {
            this.elements.helpBtn.addEventListener('click', this.showHelp.bind(this));
        }
        
        if (this.elements.closeHelpBtn) {
            this.elements.closeHelpBtn.addEventListener('click', this.hideHelp.bind(this));
        }
    }

    /**
     * 加载扩展设置
     */
    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get(['motionEnabled']);
            this.isEnabled = settings.motionEnabled !== false;
            
            this.elements.mainToggle.checked = this.isEnabled;
            this.elements.toggleLabel.textContent = this.isEnabled ? '已启用' : '已禁用';
        } catch (error) {
            console.error('加载设置失败:', error);
            this.isEnabled = true; // 默认启用
        }
    }

    /**
     * 加载运动列表
     */
    async loadMotions() {
        try {
            // 加载预设运动
            const defaultMotions = await this.getDefaultMotions();
            this.motions = defaultMotions;
            
            // 加载自定义运动
            const customSettings = await chrome.storage.sync.get(['customMotions']);
            this.customMotions = customSettings.customMotions || [];
            
        } catch (error) {
            console.error('加载运动列表失败:', error);
            this.motions = [];
            this.customMotions = [];
        }
    }

    /**
     * 获取默认运动列表
     */
    async getDefaultMotions() {
        return [
            {
                id: 'L',
                name: '向左运动',
                description: '后退到上一页',
                pattern: 'L',
                action: 'goBack',
                icon: '⬅️'
            },
            {
                id: 'R',
                name: '向右运动',
                description: '前进到下一页',
                pattern: 'R',
                action: 'goForward',
                icon: '➡️'
            },
            {
                id: 'U',
                name: '向上运动',
                description: '滚动到页面顶部',
                pattern: 'U',
                action: 'scrollToTop',
                icon: '⬆️'
            },
            {
                id: 'D',
                name: '向下运动',
                description: '滚动到页面底部',
                pattern: 'D',
                action: 'scrollToBottom',
                icon: '⬇️'
            },
            {
                id: 'RU',
                name: '右上运动',
                description: '新建标签页',
                pattern: 'RU',
                action: 'newTab',
                icon: '📄'
            },
            {
                id: 'RD',
                name: '右下运动',
                description: '关闭当前标签',
                pattern: 'RD',
                action: 'closeTab',
                icon: '❌'
            },
            {
                id: 'LU',
                name: '左上运动',
                description: '刷新页面',
                pattern: 'LU',
                action: 'reload',
                icon: '🔄'
            },
            {
                id: 'LD',
                name: '左下运动',
                description: '复制当前页面链接',
                pattern: 'LD',
                action: 'copyURL',
                icon: '🔗'
            }
        ];
    }

    /**
     * 更新UI界面
     */
    updateUI() {
        // 根据启用状态显示对应内容
        if (this.isEnabled) {
            this.elements.mainContent.style.display = 'block';
            this.elements.disabledMessage.style.display = 'none';
            this.renderMotionList();
            this.renderCustomMotionsPreview();
        } else {
            this.elements.mainContent.style.display = 'none';
            this.elements.disabledMessage.style.display = 'block';
        }
    }

    /**
     * 渲染运动列表
     */
    renderMotionList() {
        if (!this.elements.motionList) return;
        
        this.elements.motionList.innerHTML = '';
        
        this.motions.forEach(motion => {
            const motionItem = this.createMotionItem(motion);
            this.elements.motionList.appendChild(motionItem);
        });
    }

    /**
     * 创建运动项目元素
     */
    createMotionItem(motion) {
        const item = document.createElement('div');
        item.className = 'motion-item';
        item.innerHTML = `
            <div class="motion-icon">${motion.icon}</div>
            <div class="motion-info">
                <div class="motion-name">${motion.name}</div>
                <div class="motion-description">${motion.description}</div>
                <div class="motion-pattern">运动: ${motion.pattern}</div>
            </div>
            <div class="motion-visual">
                ${this.visualizer ? this.visualizer.createMotionVisual(motion.pattern, 'small') : ''}
            </div>
        `;
        
        return item;
    }

    /**
     * 渲染自定义运动预览
     */
    renderCustomMotionsPreview() {
        if (!this.elements.customMotionsPreview) return;
        
        this.elements.customMotionsPreview.innerHTML = '';
        
        if (this.customMotions.length === 0) {
            this.elements.customMotionsPreview.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎨</div>
                    <p>还没有自定义运动</p>
                    <small>点击下方按钮创建新的运动</small>
                </div>
            `;
            return;
        }
        
        // 显示前3个自定义运动
        const previewMotions = this.customMotions.slice(0, 3);
        previewMotions.forEach(motion => {
            const preview = this.createCustomMotionPreview(motion);
            this.elements.customMotionsPreview.appendChild(preview);
        });
        
        if (this.customMotions.length > 3) {
            const moreIndicator = document.createElement('div');
            moreIndicator.className = 'more-indicator';
            moreIndicator.textContent = `还有 ${this.customMotions.length - 3} 个自定义运动...`;
            this.elements.customMotionsPreview.appendChild(moreIndicator);
        }
    }

    /**
     * 创建自定义运动预览元素
     */
    createCustomMotionPreview(motion) {
        const preview = document.createElement('div');
        preview.className = 'custom-motion-preview';
        preview.innerHTML = `
            <div class="preview-icon">${motion.icon || '🎯'}</div>
            <div class="preview-info">
                <div class="preview-name">${motion.name}</div>
                <div class="preview-pattern">${motion.pattern}</div>
            </div>
        `;
        
        return preview;
    }

    /**
     * 切换扩展启用状态
     */
    async toggleExtension(enabled) {
        try {
            this.isEnabled = enabled;
            await chrome.storage.sync.set({ motionEnabled: enabled });
            
            this.elements.toggleLabel.textContent = enabled ? '已启用' : '已禁用';
            this.updateUI();
            
            // 通知内容脚本状态变更
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'MOTION_TOGGLE',
                    enabled: enabled
                }).catch(err => {
                    console.log('页面还未加载扩展脚本:', err.message);
                });
            }
            
        } catch (error) {
            console.error('切换扩展状态失败:', error);
        }
    }

    /**
     * 打开设置页面
     */
    openOptionsPage() {
        chrome.runtime.openOptionsPage();
        window.close();
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        if (this.elements.helpSection) {
            this.elements.helpSection.style.display = 'block';
            this.elements.mainContent.style.display = 'none';
        }
    }

    /**
     * 隐藏帮助信息
     */
    hideHelp() {
        if (this.elements.helpSection) {
            this.elements.helpSection.style.display = 'none';
            this.elements.mainContent.style.display = this.isEnabled ? 'block' : 'none';
        }
    }

    /**
     * 检查当前页面是否支持运动功能
     */
    async checkPageSupport() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;
            
            // 检查是否为特殊页面（chrome:// 等）
            const unsupportedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:'];
            const isUnsupported = unsupportedProtocols.some(protocol => 
                tab.url.startsWith(protocol)
            );
            
            if (isUnsupported) {
                this.showUnsupportedMessage();
            }
            
        } catch (error) {
            console.error('检查页面支持状态失败:', error);
        }
    }

    /**
     * 显示不支持页面的提示
     */
    showUnsupportedMessage() {
        const message = document.createElement('div');
        message.className = 'unsupported-message';
        message.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <p>当前页面不支持运动功能</p>
            <small>扩展无法在浏览器内置页面上工作</small>
        `;
        
        // 在主内容区域前插入消息
        const app = document.getElementById('app');
        if (app.firstChild) {
            app.insertBefore(message, app.firstChild.nextSibling);
        }
    }
}

// 页面加载完成后初始化弹出窗口
document.addEventListener('DOMContentLoaded', () => {
    new MotionExtensionPopup();
});

// 将类导出到全局作用域以便调试
window.MotionExtensionPopup = MotionExtensionPopup;