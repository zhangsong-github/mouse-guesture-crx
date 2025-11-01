/**
 * Chrome扩展消息通信工具
 * 用于统一处理background、content script和popup之间的消息传递
 */

class MessageUtils {
    // 消息类型常量
    static MESSAGE_TYPES = {
        GET_SETTINGS: 'getSettings',
        SAVE_SETTINGS: 'saveSettings',
        SETTINGS_CHANGED: 'settingsChanged',
        RELOAD_SETTINGS: 'reloadSettings',
        EXECUTE_MOTION: 'executeMotion', // 原executeGesture
        SCROLL_TO_TOP: 'scrollTop',
        SCROLL_TO_BOTTOM: 'scrollBottom',
        SCROLL_TO_SECTION: 'scrollToCustomGestures',
        TAB_QUERY: 'tabQuery',
        BROADCAST_UPDATE: 'broadcastUpdate'
    };

    /**
     * 发送消息到background script
     * @param {Object} message - 消息对象
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<any>} 响应结果
     */
    static async sendToBackground(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Message timeout: ${message.action || message.type}`));
            }, timeout);

            try {
                chrome.runtime.sendMessage(message, (response) => {
                    clearTimeout(timer);
                    
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /**
     * 发送消息到指定标签页
     * @param {number} tabId - 标签页ID
     * @param {Object} message - 消息对象
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<any>} 响应结果
     */
    static async sendToTab(tabId, message, timeout = 3000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Tab message timeout: ${tabId}`));
            }, timeout);

            try {
                chrome.tabs.sendMessage(tabId, message, (response) => {
                    clearTimeout(timer);
                    
                    if (chrome.runtime.lastError) {
                        // 某些标签页可能无法接收消息（如chrome://页面），不视为错误
                        console.log(`Cannot send message to tab ${tabId}:`, chrome.runtime.lastError.message);
                        resolve(null);
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /**
     * 获取当前活动标签页
     * @returns {Promise<chrome.tabs.Tab>} 活动标签页信息
     */
    static async getActiveTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            return tab;
        } catch (error) {
            console.error('获取活动标签页失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有标签页
     * @param {Object} queryInfo - 查询条件
     * @returns {Promise<chrome.tabs.Tab[]>} 标签页数组
     */
    static async getAllTabs(queryInfo = {}) {
        try {
            const tabs = await chrome.tabs.query(queryInfo);
            return tabs;
        } catch (error) {
            console.error('获取标签页列表失败:', error);
            throw error;
        }
    }

    /**
     * 广播设置更新到所有标签页
     * @param {Object} settings - 新的设置
     * @returns {Promise<Object>} 广播结果统计
     */
    static async broadcastSettingsUpdate(settings) {
        try {
            const tabs = await this.getAllTabs();
            
            const results = {
                total: tabs.length,
                success: 0,
                failed: 0,
                skipped: 0
            };
            
            const promises = tabs.map(async (tab) => {
                try {
                    // 只向http/https页面发送消息，避免chrome://等特殊页面报错
                    if (this.isValidTabForMessage(tab)) {
                        const response = await this.sendToTab(tab.id, {
                            action: this.MESSAGE_TYPES.RELOAD_SETTINGS,
                            settings: settings
                        });
                        
                        if (response !== null) {
                            results.success++;
                            console.log(`Settings broadcast to tab ${tab.id}: ${tab.url}`);
                        } else {
                            results.skipped++;
                        }
                    } else {
                        results.skipped++;
                        console.log(`Skipped tab ${tab.id}: ${tab.url} (unsupported URL)`);
                    }
                } catch (error) {
                    results.failed++;
                    console.log(`Failed to broadcast to tab ${tab.id}:`, error.message);
                }
            });
            
            await Promise.allSettled(promises);
            console.log('Settings broadcast completed:', results);
            
            return results;
        } catch (error) {
            console.error('Failed to broadcast settings:', error);
            throw error;
        }
    }

    /**
     * 检查标签页是否可以接收消息
     * @param {chrome.tabs.Tab} tab - 标签页对象
     * @returns {boolean} 是否可以发送消息
     */
    static isValidTabForMessage(tab) {
        if (!tab || !tab.url) return false;
        
        const unsupportedPatterns = [
            /^chrome:\/\//,
            /^chrome-extension:\/\//,
            /^edge:\/\//,
            /^about:/,
            /^moz-extension:\/\//,
            /^file:\/\//
        ];
        
        return !unsupportedPatterns.some(pattern => pattern.test(tab.url));
    }

    /**
     * 加载设置（封装消息发送）
     * @returns {Promise<Object>} 设置对象
     */
    static async loadSettings() {
        try {
            const response = await this.sendToBackground({
                type: 'GET_SETTINGS'
            });
            return response || {};
        } catch (error) {
            console.error('加载设置失败:', error);
            throw error;
        }
    }

    /**
     * 保存设置并通知所有相关组件
     * @param {Object} settings - 设置对象
     * @returns {Promise<boolean>} 保存是否成功
     */
    static async saveAndBroadcastSettings(settings) {
        try {
            // 通知后台脚本设置已更改
            await this.sendToBackground({
                type: this.MESSAGE_TYPES.SETTINGS_CHANGED,
                settings: settings
            });
            
            // 广播到所有标签页
            await this.broadcastSettingsUpdate(settings);
            
            return true;
        } catch (error) {
            console.error('保存和广播设置失败:', error);
            return false;
        }
    }

    /**
     * 执行动作命令（原手势执行）
     * @param {string} action - 动作类型
     * @param {string} pattern - 动作模式
     * @returns {Promise<boolean>} 执行是否成功
     */
    static async executeMotionAction(action, pattern) {
        try {
            console.log('📤 executeMotionAction called:', { action, pattern });
            const response = await this.sendToBackground({
                type: 'EXECUTE_MOTION',
                pattern: pattern,
                timestamp: Date.now()
            });
            console.log('📥 executeMotionAction response:', response);
            return true;
        } catch (error) {
            console.error('❌ 执行动作失败:', error);
            return false;
        }
    }

    /**
     * 检查页面是否支持扩展功能
     * @param {chrome.tabs.Tab} tab - 标签页对象（可选）
     * @returns {Promise<boolean>} 是否支持
     */
    static async isPageSupported(tab = null) {
        try {
            const currentTab = tab || await this.getActiveTab();
            return this.isValidTabForMessage(currentTab);
        } catch (error) {
            console.error('检查页面支持性失败:', error);
            return false;
        }
    }

    /**
     * 设置消息监听器
     * @param {Function} handler - 消息处理函数
     * @param {Array} messageTypes - 监听的消息类型（可选）
     */
    static setMessageListener(handler, messageTypes = null) {
        const listener = (request, sender, sendResponse) => {
            // 如果指定了消息类型过滤器
            if (messageTypes && !messageTypes.includes(request.action || request.type)) {
                return;
            }
            
            try {
                const result = handler(request, sender, sendResponse);
                
                // 如果处理函数返回Promise，保持消息通道开放
                if (result instanceof Promise) {
                    result.then(sendResponse).catch(error => {
                        console.error('Message handler error:', error);
                        sendResponse({ error: error.message });
                    });
                    return true; // 保持消息通道开放
                }
                
                return result;
            } catch (error) {
                console.error('Message listener error:', error);
                sendResponse({ error: error.message });
            }
        };
        
        chrome.runtime.onMessage.addListener(listener);
        return listener; // 返回监听器函数，便于后续移除
    }

    /**
     * 移除消息监听器
     * @param {Function} listener - 要移除的监听器函数
     */
    static removeMessageListener(listener) {
        if (chrome.runtime.onMessage.hasListener(listener)) {
            chrome.runtime.onMessage.removeListener(listener);
        }
    }

    /**
     * 发送滚动命令到活动标签页
     * @param {string} direction - 滚动方向：'top'或'bottom'
     * @returns {Promise<boolean>} 执行是否成功
     */
    static async scrollPage(direction) {
        try {
            const tab = await this.getActiveTab();
            if (!this.isValidTabForMessage(tab)) {
                console.warn('当前页面不支持滚动命令');
                return false;
            }
            
            const action = direction === 'top' ? 
                this.MESSAGE_TYPES.SCROLL_TO_TOP : 
                this.MESSAGE_TYPES.SCROLL_TO_BOTTOM;
            
            await this.sendToTab(tab.id, { action });
            return true;
        } catch (error) {
            console.error(`滚动页面失败 (${direction}):`, error);
            return false;
        }
    }

    /**
     * 获取扩展版本信息
     * @returns {string} 版本号
     */
    static getExtensionVersion() {
        return chrome.runtime.getManifest().version;
    }

    /**
     * 打开选项页面
     */
    static openOptionsPage() {
        chrome.runtime.openOptionsPage();
    }

    /**
     * 记录调试信息（仅在开发模式下）
     * @param {string} message - 消息
     * @param {any} data - 数据
     */
    static debugLog(message, data = null) {
        if (chrome.runtime.getManifest().key) {
            // 生产版本不输出调试信息
            return;
        }
        
        console.log(`[ExtensionMessage] ${message}`, data || '');
    }
}

// 导出工具类
if (typeof window !== 'undefined') {
    window.MessageUtils = MessageUtils;
}

export default MessageUtils;