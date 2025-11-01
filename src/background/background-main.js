/**
 * 后台服务工作者 - 运动追踪扩展
 * 重构后的后台脚本，使用模块化架构和新命名规范
 */

console.log('Motion Tracker Extension Background Service Worker starting...');

// 设置管理器类 - 重构为MotionSettingsManager
class MotionSettingsManager {
    constructor() {
        this.defaultConfig = {
            patternSensitivity: 10,
            enableTrail: true,
            trailDuration: 500,
            enableHints: true,
            enableSounds: false,
            enableExecution: true,
            customGestures: [], // 自定义手势列表
            actionMappings: {
                // === 页面导航 (最常用) ===
                'L': 'goBack',              // 后退
                'R': 'goForward',           // 前进
                
                // === 页面滚动 ===
                'U': 'scrollToTop',         // 滚动到顶部
                'D': 'scrollToBottom',      // 滚动到底部
                
                // === 页面刷新 ===
                'UD': 'refreshTab',         // 刷新页面
                
                // === 标签页管理 (高频操作) ===
                'DL': 'newTab',             // 新建标签页
                'DR': 'closeTab',           // 关闭标签页
                'RL': 'reopenTab',          // 恢复标签页
                'URD': 'duplicateTab',      // 复制标签页
                
                // === 标签页切换 ===
                'UL': 'previousTab',        // 前一个标签页
                'UR': 'nextTab',            // 后一个标签页
                
                // === 标签页状态 ===
                'RUL': 'togglePinTab',      // 固定/取消固定
                
                // === 窗口管理 ===
                'DLU': 'minimizeWindow',    // 最小化窗口
                'ULD': 'toggleFullscreen'   // 全屏切换
            }
        };
        
        // 初始化缓存
        this.cachedSettings = null;
        this.initializationPromise = null;
        // 注意：不在构造函数中调用 initializeSettings，而是在需要时调用
        // 这样可以避免与 onInstalled 事件处理器产生竞态条件
    }
    
    /**
     * 初始化设置（确保只执行一次）
     */
    async initializeSettings() {
        // 如果已经在初始化中，返回现有的 Promise
        if (this.initializationPromise) {
            console.log('⏳ 设置初始化已在进行中，等待完成...');
            return this.initializationPromise;
        }
        
        // 创建初始化 Promise
        this.initializationPromise = this._doInitialize();
        return this.initializationPromise;
    }
    
    /**
     * 执行实际的初始化逻辑
     * @private
     */
    async _doInitialize() {
        try {
            console.log('🔄 初始化设置...');
            
            // 尝试从存储中读取现有设置
            const result = await chrome.storage.sync.get(['extensionSettings']);
            
            if (result.extensionSettings) {
                // 智能合并：保留用户设置，同时添加新的默认手势
                console.log('📦 检测到现有设置，执行智能合并...');
                
                const storedSettings = result.extensionSettings;
                const storedMappings = storedSettings.actionMappings || {};
                const defaultMappings = this.defaultConfig.actionMappings;
                
                // 合并策略：
                // 1. 保留所有默认手势（包括新增的）
                // 2. 如果用户修改了某个手势，保持用户的修改
                const mergedMappings = { ...defaultMappings };
                
                // 检查是否有新增的手势
                const newGestures = [];
                for (const pattern in defaultMappings) {
                    if (!(pattern in storedMappings)) {
                        newGestures.push(pattern);
                    }
                }
                
                if (newGestures.length > 0) {
                    console.log('✨ 发现新手势:', newGestures);
                }
                
                const mergedSettings = {
                    ...this.defaultConfig,
                    ...storedSettings,
                    actionMappings: mergedMappings
                };
                
                // 如果有新手势，更新存储
                if (newGestures.length > 0) {
                    await this.saveSettings(mergedSettings);
                    console.log('✅ 已添加新手势到配置');
                }
                
                this.cachedSettings = mergedSettings;
                console.log('✅ 使用合并后的设置:', {
                    enableExecution: this.cachedSettings.enableExecution,
                    mappingsCount: Object.keys(this.cachedSettings.actionMappings || {}).length
                });
                return;
            }
            
            // 没有现有设置，使用默认设置
            console.log('📝 使用默认设置（首次安装）');
            await this.saveSettings(this.defaultConfig);
            this.cachedSettings = { ...this.defaultConfig };
            
            console.log('✅ 设置初始化完成:', {
                enableExecution: this.cachedSettings.enableExecution
            });
        } catch (error) {
            console.error('❌ 设置初始化失败:', error);
            this.cachedSettings = { ...this.defaultConfig };
        } finally {
            // 重置 Promise，允许后续强制重新初始化（如果需要）
            this.initializationPromise = null;
        }
    }
    
    /**
     * 获取设置（确保初始化完成）
     */
    async getSettings() {
        // 确保设置已初始化
        if (!this.cachedSettings) {
            console.log('⚠️ 设置未初始化，执行初始化...');
            await this.initializeSettings();
        }
        
        // 如果有缓存，直接返回
        if (this.cachedSettings) {
            console.log('📖 获取设置 - 使用缓存');
            return { ...this.cachedSettings };
        }
        
        // 如果初始化后仍然没有缓存，从存储中读取
        try {
            const result = await chrome.storage.sync.get(['extensionSettings']);
            if (result.extensionSettings) {
                this.cachedSettings = result.extensionSettings;
                console.log('📖 获取设置 - 从存储读取');
                return { ...this.cachedSettings };
            }
        } catch (error) {
            console.error('读取设置失败:', error);
        }
        
        // 如果都失败了，返回默认配置
        console.log('📖 获取设置 - 使用默认配置');
        return { ...this.defaultConfig };
    }
    
    /**
     * 保存设置
     */
    async saveSettings(settings) {
        try {
            const mergedSettings = { ...this.defaultConfig, ...settings };
            await chrome.storage.sync.set({ extensionSettings: mergedSettings });
            this.cachedSettings = mergedSettings;
            console.log('设置已保存:', mergedSettings);
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }
    
    /**
     * 获取动作映射
     */
    async getActionMapping(pattern) {
        const settings = await this.getSettings();
        return settings.actionMappings[pattern] || null;
    }
    
    /**
     * 更新动作映射
     */
    async updateActionMapping(pattern, action) {
        const settings = await this.getSettings();
        settings.actionMappings[pattern] = action;
        return await this.saveSettings(settings);
    }
    
    /**
     * 重置设置到默认值
     */
    async resetToDefaults() {
        this.cachedSettings = { ...this.defaultConfig };
        return await this.saveSettings(this.cachedSettings);
    }
}

// 创建设置管理器实例
const settingsManager = new MotionSettingsManager();

// 立即开始初始化设置（异步，不阻塞）
settingsManager.initializeSettings().then(() => {
    console.log('✅ 设置管理器初始化完成');
}).catch(error => {
    console.error('❌ 设置管理器初始化失败:', error);
});

/**
 * 标签页操作处理器
 */
class TabActionHandler {
    constructor() {
        this.actionMap = {
            'goBack': this.goBack.bind(this),
            'goForward': this.goForward.bind(this),
            'previousTab': this.switchToPreviousTab.bind(this),
            'nextTab': this.switchToNextTab.bind(this),
            'newTab': this.createNewTab.bind(this),
            'closeTab': this.closeCurrentTab.bind(this),
            'refreshTab': this.refreshCurrentTab.bind(this),
            'reopenTab': this.reopenRecentlyClosedTab.bind(this),
            'scrollToTop': this.scrollToTop.bind(this),
            'scrollToBottom': this.scrollToBottom.bind(this),
            'duplicateTab': this.duplicateCurrentTab.bind(this),
            'minimizeWindow': this.minimizeWindow.bind(this),
            'toggleFullscreen': this.toggleFullscreen.bind(this),
            'togglePinTab': this.togglePinTab.bind(this)
        };
    }
    
    /**
     * 执行动作
     */
    async executeAction(actionName, tabId = null) {
        try {
            console.log(`🎯 executeAction called:`, { actionName, tabId, hasHandler: !!this.actionMap[actionName] });
            const handler = this.actionMap[actionName];
            if (handler) {
                console.log(`✅ 执行动作: ${actionName}`, { tabId });
                await handler(tabId);
                console.log(`✅ 动作执行完成: ${actionName}`);
                return { success: true, action: actionName };
            } else {
                console.warn('❌ 未知动作:', actionName, '可用动作:', Object.keys(this.actionMap));
                return { success: false, error: 'Unknown action' };
            }
        } catch (error) {
            console.error(`❌ 执行动作失败 ${actionName}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // 标签页切换相关
    async goBack(tabId) {
        // 如果传入的是 tabId（数字），直接使用；否则查询当前活动标签页
        let targetTabId = tabId;
        if (!targetTabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            targetTabId = tabs[0]?.id;
        }
        
        if (targetTabId) {
            await chrome.tabs.goBack(targetTabId);
        }
    }
    
    async goForward(tabId) {
        // 如果传入的是 tabId（数字），直接使用；否则查询当前活动标签页
        let targetTabId = tabId;
        if (!targetTabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            targetTabId = tabs[0]?.id;
        }
        
        if (targetTabId) {
            await chrome.tabs.goForward(targetTabId);
        }
    }
    
    async switchToPreviousTab(tabId) {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const currentIndex = tabs.findIndex(tab => tab.active);
        const previousIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        await chrome.tabs.update(tabs[previousIndex].id, { active: true });
    }
    
    async switchToNextTab(tabId) {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const currentIndex = tabs.findIndex(tab => tab.active);
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        await chrome.tabs.update(tabs[nextIndex].id, { active: true });
    }
    
    // 标签页管理
    async createNewTab(tabId) {
        await chrome.tabs.create({});
    }
    
    async closeCurrentTab(tabId) {
        // 如果传入的是 tabId（数字），直接使用；否则查询当前活动标签页
        let targetTabId = tabId;
        if (!targetTabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            targetTabId = tabs[0]?.id;
        }
        
        if (targetTabId) {
            await chrome.tabs.remove(targetTabId);
        }
    }
    
    async refreshCurrentTab(tabId) {
        // 如果传入的是 tabId（数字），直接使用；否则查询当前活动标签页
        let targetTabId = tabId;
        if (!targetTabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            targetTabId = tabs[0]?.id;
        }
        
        if (targetTabId) {
            await chrome.tabs.reload(targetTabId);
        }
    }
    
    async duplicateCurrentTab(tabId) {
        // 如果传入的是 tabId（数字），直接使用；否则查询当前活动标签页
        let targetTabId = tabId;
        if (!targetTabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            targetTabId = tabs[0]?.id;
        }
        
        if (targetTabId) {
            await chrome.tabs.duplicate(targetTabId);
        }
    }
    
    async togglePinTab(tabId) {
        // 如果传入的是 tabId（数字），需要先获取 tab 对象以检查当前 pinned 状态
        let currentTab;
        if (tabId) {
            currentTab = await chrome.tabs.get(tabId);
        } else {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            currentTab = tabs[0];
        }
        
        if (currentTab && currentTab.id) {
            await chrome.tabs.update(currentTab.id, { pinned: !currentTab.pinned });
        }
    }
    
    // 特殊功能
    async reopenRecentlyClosedTab() {
        const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
        if (sessions.length > 0 && sessions[0].tab) {
            await chrome.sessions.restore(sessions[0].tab.sessionId);
        }
    }
    
    async scrollToTop(tabId) {
        console.log('📜 scrollToTop called:', { tabId });
        
        // 如果传入的是 tabId（数字），直接使用；否则查询当前活动标签页
        let targetTabId = tabId;
        if (!targetTabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            targetTabId = tabs[0]?.id;
        }
        
        console.log('📜 Target tab ID:', targetTabId);
        
        if (targetTabId) {
            try {
                console.log('📜 Sending SCROLL_COMMAND (scrollToTop) to tab:', targetTabId);
                const response = await chrome.tabs.sendMessage(targetTabId, {
                    type: 'SCROLL_COMMAND',
                    action: 'scrollToTop'
                });
                console.log('✅ scrollToTop message response:', response);
                return response;
            } catch (error) {
                console.error('❌ scrollToTop message failed:', error);
                throw error;
            }
        } else {
            console.error('❌ No valid tab found for scrollToTop');
            throw new Error('No valid tab found');
        }
    }
    
    async scrollToBottom(tabId) {
        console.log('📜 scrollToBottom called:', { tabId });
        
        // 如果传入的是 tabId（数字），直接使用；否则查询当前活动标签页
        let targetTabId = tabId;
        if (!targetTabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            targetTabId = tabs[0]?.id;
        }
        
        console.log('📜 Target tab ID:', targetTabId);
        
        if (targetTabId) {
            try {
                console.log('📜 Sending SCROLL_COMMAND to tab:', targetTabId);
                const response = await chrome.tabs.sendMessage(targetTabId, {
                    type: 'SCROLL_COMMAND',
                    action: 'scrollToBottom'
                });
                console.log('✅ scrollToBottom message response:', response);
                return response;
            } catch (error) {
                console.error('❌ scrollToBottom message failed:', error);
                throw error;
            }
        } else {
            console.error('❌ No valid tab found for scrollToBottom');
            throw new Error('No valid tab found');
        }
    }
    
    // 窗口管理
    async minimizeWindow() {
        const currentWindow = await chrome.windows.getCurrent();
        await chrome.windows.update(currentWindow.id, { state: 'minimized' });
    }
    
    async toggleFullscreen() {
        const currentWindow = await chrome.windows.getCurrent();
        const newState = currentWindow.state === 'fullscreen' ? 'normal' : 'fullscreen';
        await chrome.windows.update(currentWindow.id, { state: newState });
    }
}

// 创建动作处理器实例
const tabActionHandler = new TabActionHandler();

// 维护每个窗口的 sidepanel 状态
const sidePanelState = new Map();

/**
 * 消息处理器
 */
async function handleMessage(request, sender, sendResponse) {
    try {
        console.log('后台收到消息:', request, '来自:', sender.tab?.url);
        
        switch (request.type) {
            case 'EXECUTE_MOTION':
                return await handleMotionExecution(request, sender);
                
            case 'SIDEPANEL_OPENED':
                // sidepanel 已打开
                if (request.windowId) {
                    sidePanelState.set(request.windowId, true);
                    console.log('Sidepanel 已打开:', request.windowId);
                }
                return { success: true };
                
            case 'SIDEPANEL_CLOSED':
                // sidepanel 已关闭
                if (request.windowId) {
                    sidePanelState.set(request.windowId, false);
                    console.log('Sidepanel 已关闭:', request.windowId);
                }
                return { success: true };
                
            case 'GET_SETTINGS':
                return await settingsManager.getSettings();
                
            case 'SAVE_SETTINGS':
                const success = await settingsManager.saveSettings(request.settings);
                return { success };
                
            case 'toggleExtension':
                // 处理侧边栏或选项页的开关切换
                console.log('🔄 toggleExtension:', request.enabled);
                const currentSettings = await settingsManager.getSettings();
                currentSettings.enableExecution = request.enabled;
                const toggleSuccess = await settingsManager.saveSettings(currentSettings);
                
                // 通知所有标签页重新加载设置
                if (toggleSuccess) {
                    try {
                        const tabs = await chrome.tabs.query({});
                        const notifyPromises = tabs.map(tab => {
                            return chrome.tabs.sendMessage(tab.id, {
                                action: 'reloadSettings',
                                settings: currentSettings
                            }).catch(err => {
                                // 忽略无法发送消息的标签页
                                console.log(`Cannot notify tab ${tab.id}:`, err.message);
                            });
                        });
                        await Promise.all(notifyPromises);
                        console.log('✅ 已通知所有标签页更新设置');
                    } catch (error) {
                        console.error('通知标签页失败:', error);
                    }
                }
                
                return { success: toggleSuccess };
                
            case 'GET_ACTION_MAPPING':
                const mapping = await settingsManager.getActionMapping(request.pattern);
                return { action: mapping };
                
            case 'UPDATE_ACTION_MAPPING':
                const updateSuccess = await settingsManager.updateActionMapping(request.pattern, request.action);
                return { success: updateSuccess };
                
            case 'RESET_SETTINGS':
                const resetSuccess = await settingsManager.resetToDefaults();
                return { success: resetSuccess };
                
            case 'GET_EXTENSION_STATUS':
                return {
                    version: chrome.runtime.getManifest().version,
                    settings: await settingsManager.getSettings(),
                    activeTab: sender.tab?.id || null
                };
                
            default:
                console.warn('未知消息类型:', request.type);
                return { success: false, error: 'Unknown message type' };
        }
    } catch (error) {
        console.error('消息处理错误:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 处理运动执行请求
 */
async function handleMotionExecution(request, sender) {
    const { pattern, timestamp } = request;
    
    console.log(`处理运动执行: ${pattern}`, {
        timestamp,
        tabId: sender.tab?.id,
        url: sender.tab?.url
    });
    
    try {
        // 获取设置
        const settings = await settingsManager.getSettings();
        
        if (!settings.enableExecution) {
            console.log('运动执行已禁用');
            return { 
                success: false, 
                error: 'Execution disabled',
                message: '运动执行功能已被禁用' 
            };
        }
        
        // 获取动作映射
        const actionName = await settingsManager.getActionMapping(pattern);
        
        if (!actionName) {
            console.log(`未找到模式映射: ${pattern}`);
            return { 
                success: false, 
                error: 'No mapping found',
                message: `未找到模式 "${pattern}" 的动作映射` 
            };
        }
        
        // 执行动作
        const result = await tabActionHandler.executeAction(actionName, sender.tab?.id);
        
        if (result.success) {
            console.log(`运动执行成功: ${pattern} -> ${actionName}`);
            return {
                success: true,
                pattern,
                action: actionName,
                message: `已执行运动: ${pattern} -> ${actionName}`
            };
        } else {
            console.error(`运动执行失败: ${pattern} -> ${actionName}`, result.error);
            return {
                success: false,
                pattern,
                action: actionName,
                error: result.error,
                message: `执行失败: ${result.error}`
            };
        }
        
    } catch (error) {
        console.error('运动执行处理错误:', error);
        return {
            success: false,
            pattern,
            error: error.message,
            message: `处理失败: ${error.message}`
        };
    }
}

/**
 * 安装和启动处理
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('🔧 扩展安装/更新事件:', details);
    
    try {
        if (details.reason === 'install') {
            console.log('✨ 首次安装，初始化默认设置');
            // 首次安装时确保初始化设置
            await settingsManager.initializeSettings();
            console.log('✅ 首次安装初始化完成');
        } else if (details.reason === 'update') {
            console.log('🔄 扩展更新，检查设置兼容性');
            // 更新时也需要初始化（会智能合并新手势）
            await settingsManager.initializeSettings();
            console.log('✅ 更新后设置检查完成');
        } else if (details.reason === 'chrome_update') {
            console.log('🌐 浏览器更新');
        } else if (details.reason === 'shared_module_update') {
            console.log('📦 共享模块更新');
        }
    } catch (error) {
        console.error('❌ 安装/更新处理失败:', error);
    }
});

/**
 * 启动处理
 */
chrome.runtime.onStartup.addListener(async () => {
    console.log('🚀 扩展启动');
    try {
        // 启动时确保设置已加载
        await settingsManager.initializeSettings();
        console.log('✅ 启动时设置加载完成');
    } catch (error) {
        console.error('❌ 启动时设置加载失败:', error);
    }
});

// 注册消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 异步处理消息
    handleMessage(request, sender, sendResponse).then(result => {
        sendResponse(result);
    }).catch(error => {
        console.error('消息处理异常:', error);
        sendResponse({ success: false, error: error.message });
    });
    
    // 返回true表示异步响应
    return true;
});

/**
 * 标签页更新监听
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        console.log('标签页加载完成:', tab.url);
    }
});

/**
 * 扩展图标点击处理 - 自动打开侧边栏
 */
chrome.action.onClicked.addListener((tab) => {
    console.log('🖱️ 扩展图标被点击，打开侧边栏');
    const windowId = tab.windowId;
    
    // 直接打开侧边栏（必须在用户手势上下文中同步调用）
    chrome.sidePanel.open({ windowId: windowId }).then(() => {
        sidePanelState.set(windowId, true);
        console.log('✅ 侧边栏已打开');
    }).catch((error) => {
        // 忽略已经打开的情况
        if (!error.message?.includes('already open')) {
            console.error('❌ 打开侧边栏失败:', error);
        }
    });
});

// 监听窗口关闭，清理状态
chrome.windows.onRemoved.addListener((windowId) => {
    sidePanelState.delete(windowId);
    console.log('窗口关闭，清理 sidepanel 状态:', windowId);
});

/**
 * 错误处理
 */
chrome.runtime.onSuspend.addListener(() => {
    console.log('后台脚本即将暂停');
});

self.addEventListener('error', (event) => {
    console.error('后台脚本全局错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});

// 导出调试接口
if (typeof globalThis !== 'undefined') {
    globalThis.extensionDebug = {
        settingsManager,
        tabActionHandler,
        getStatus: async () => ({
            settings: await settingsManager.getSettings(),
            version: chrome.runtime.getManifest().version,
            timestamp: new Date().toISOString()
        })
    };
}

console.log('运动追踪扩展后台服务工作者初始化完成');