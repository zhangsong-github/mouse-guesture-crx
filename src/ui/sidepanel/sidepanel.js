/**
 * Chrome Extension Side Panel Script
 * 鼠标手势扩展侧边栏功能实现
 */

// 调试：检查依赖是否加载
console.log('🔍 Sidepanel.js loading...');
console.log('  - i18nManager available:', typeof window.i18nManager !== 'undefined');
console.log('  - GestureArrowDisplay available:', typeof window.GestureArrowDisplay !== 'undefined');

// 状态管理
let extensionState = {
    enabled: false,
    gestures: [],
    customGestures: [],
    stats: {
        totalGestures: 0,
        todayUsage: 0,
        favoriteGesture: 'L'
    },
    currentPage: {
        url: '',
        title: '',
        supported: false,
        type: 'unknown'
    }
};

// 动作描述映射 - 使用函数以支持多语言
const getActionDescription = (action) => {
    const i18nKey = `action${action.charAt(0).toUpperCase()}${action.slice(1)}`;
    
    if (window.i18nManager && window.i18nManager.messages[i18nKey]) {
        return {
            name: window.i18nManager.getMessage(i18nKey),
            category: getCategoryForAction(action)
        };
    }
    
    // 后备方案
    const actionDescriptions = {
        'goBack': { name: '后退', category: 'navigation' },
        'goForward': { name: '前进', category: 'navigation' },
        'previousTab': { name: '前一标签', category: 'tab' },
        'nextTab': { name: '下一标签', category: 'tab' },
        'scrollToTop': { name: '页面顶部', category: 'scroll' },
        'scrollToBottom': { name: '页面底部', category: 'scroll' },
        'newTab': { name: '新标签页', category: 'tab' },
        'closeTab': { name: '关闭标签', category: 'tab' },
        'refreshTab': { name: '刷新页面', category: 'page' },
        'reopenTab': { name: '重新打开', category: 'tab' },
        'duplicateTab': { name: '复制标签', category: 'tab' },
        'minimizeWindow': { name: '最小化窗口', category: 'window' },
        'toggleFullscreen': { name: '全屏切换', category: 'view' },
        'togglePinTab': { name: '固定标签', category: 'tab' }
    };
    return actionDescriptions[action] || { name: action, category: 'other' };
};

const getCategoryForAction = (action) => {
    const categoryMap = {
        'goBack': 'navigation',
        'goForward': 'navigation',
        'previousTab': 'tab',
        'nextTab': 'tab',
        'scrollToTop': 'scroll',
        'scrollToBottom': 'scroll',
        'newTab': 'tab',
        'closeTab': 'tab',
        'refreshTab': 'page',
        'reopenTab': 'tab',
        'duplicateTab': 'tab',
        'minimizeWindow': 'window',
        'toggleFullscreen': 'view',
        'togglePinTab': 'tab'
    };
    return categoryMap[action] || 'other';
};

// 将手势模式转换为箭头符号（使用像素风格的粗箭头）
function patternToArrows(pattern) {
    const arrowMap = {
        'L': '⬅',
        'R': '➡',
        'U': '⬆',
        'D': '⬇'
    };
    
    return pattern.split('').map(char => arrowMap[char] || char).join('');
}

// DOM 元素引用
let elements = {};

// 初始化
document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
    console.log('Side Panel initializing...');
    
    // 初始化多语言系统
    await initializeI18n();
    
    // 获取DOM元素
    cacheElements();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 加载扩展状态
    await loadExtensionState();
    
    // 更新页面信息
    await updateCurrentPageInfo();
    
    // 渲染界面
    renderUI();
    
    // 启动定时器
    startPeriodicUpdates();
    
    console.log('Side Panel initialized successfully');
}

async function initializeI18n() {
    try {
        // 等待 i18nManager 加载（最多等待2秒）
        let attempts = 0;
        while (!window.i18nManager && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // 初始化 i18n manager
        if (window.i18nManager) {
            await window.i18nManager.initialize();
            
            // 创建语言选择器
            const container = document.getElementById('languageSelectorContainer');
            if (container) {
                window.i18nManager.createLanguageSelector(container, (locale) => {
                    console.log('Language changed to:', locale);
                    // 重新初始化页面文本（更新所有 data-i18n 元素）
                    window.i18nManager.initializePageTexts();
                    // 重新渲染动态内容
                    renderUI();
                    showNotification(window.i18nManager.getMessage('messageSaved'), 'success');
                });
            }
            
            // 初始化页面文本
            window.i18nManager.initializePageTexts();
            
            // 更新HTML lang属性
            document.documentElement.lang = window.i18nManager.getHtmlLangCode(
                window.i18nManager.getCurrentLocale()
            );
            
            console.log('✅ I18n initialized for sidepanel');
        } else {
            console.warn('⚠️ i18nManager not available after waiting');
            console.log('Available window properties:', Object.keys(window));
        }
    } catch (error) {
        console.error('❌ Failed to initialize i18n:', error);
    }
}

/**
 * 获取国际化文本的辅助方法
 * @param {string} key - 消息键
 * @param {string} fallback - 后备文本
 * @returns {string} 翻译后的文本
 */
function getI18nMessage(key, fallback = '') {
    if (window.i18nManager) {
        return window.i18nManager.getMessage(key) || fallback;
    }
    return fallback;
}

function cacheElements() {
    elements = {
        // 顶部控件
        enableToggle: document.getElementById('mainToggle'),
        refreshBtn: document.getElementById('refreshBtn'),
        helpBtn: document.getElementById('helpBtn'),
        
        // 页面信息
        pageUrl: document.getElementById('currentUrl'),
        pageTitle: document.getElementById('currentTitle'),
        pageStatus: document.getElementById('pageStatus'),
        pageDetails: document.getElementById('pageDetails'),
        
        // 快速操作
        quickActions: document.querySelectorAll('.quick-action-btn'),
        
        // 手势相关
        gestureContainer: document.getElementById('gestureContainer'),
        gestureList: document.getElementById('gestureList'),
        
        // 自定义手势
        customContainer: document.getElementById('customGesturesContainer'),
        customPreview: document.getElementById('customGesturesPreview'),
        
        // 帮助和其他
        helpSection: document.getElementById('helpSection'),
        closeHelpBtn: document.getElementById('closeHelp'),
        mainContent: document.getElementById('mainContent'),
        disabledMessage: document.getElementById('disabledMessage'),
        unsupportedMessage: document.getElementById('unsupportedMessage')
    };
}

function setupEventListeners() {
    // 主开关
    if (elements.enableToggle) {
        elements.enableToggle.addEventListener('change', handleEnableToggle);
    }
    
    // 刷新按钮
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', handleRefresh);
    }
    
    // 帮助按钮 (在header中)
    if (elements.helpBtn) {
        elements.helpBtn.addEventListener('click', showHelp);
    }
    
    // 专门处理HTML中独立的按钮
    const independentButtons = {
        'openOptionsBtn': () => executeQuickAction('options'),
        'testGestureBtn': () => showNotification('手势测试功能开发中', 'info'),
        'exportBtn': () => showNotification('导出配置功能开发中', 'info'),
        'openOptionsFromUnsupported': () => {
            chrome.runtime.openOptionsPage();
        },
        'manageCustomBtn': () => executeQuickAction('options'),
        'enableBtn': () => {
            // 点击"立即启用"按钮
            if (elements.enableToggle) {
                elements.enableToggle.checked = true;
                // 手动触发change事件
                elements.enableToggle.dispatchEvent(new Event('change'));
            }
        }
    };
    
    Object.entries(independentButtons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    });
    
    // 关闭帮助
    if (elements.closeHelpBtn) {
        elements.closeHelpBtn.addEventListener('click', hideHelp);
    }
    
    // 快速操作
    setupQuickActionListeners();
    
    // 点击帮助区域外关闭
    if (elements.helpSection) {
        elements.helpSection.addEventListener('click', (e) => {
            if (e.target === elements.helpSection) {
                hideHelp();
            }
        });
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboard);
}

function setupQuickActionListeners() {
    elements.quickActions.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            await executeQuickAction(action);
        });
    });
}

async function loadExtensionState() {
    try {
        // 检查扩展上下文是否有效
        if (!chrome.runtime?.id) {
            console.log('⚠️ 扩展上下文已失效，等待重新加载...');
            return;
        }
        
        // 使用正确的消息格式从background script获取设置
        const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
        
        if (response) {
            extensionState.enabled = response.enableExecution || false;
            
            // 从 actionMappings 和 customGestures 生成手势列表
            extensionState.gestures = [];
            
            // 首先加载预设手势
            if (response.actionMappings) {
                const customPatterns = new Set(
                    (response.customGestures || []).map(g => g.pattern)
                );
                
                for (const [pattern, action] of Object.entries(response.actionMappings)) {
                    // 跳过自定义手势，后面单独处理
                    if (customPatterns.has(pattern)) continue;
                    
                    const actionInfo = getActionDescription(action);
                    
                    extensionState.gestures.push({
                        pattern: pattern,
                        name: actionInfo.name,
                        action: action,
                        enabled: true,
                        custom: false,
                        category: actionInfo.category
                    });
                }
            }
            
            // 然后加载自定义手势
            extensionState.customGestures = response.customGestures || [];
            
            // 将自定义手势也添加到总列表（用于统一管理）
            extensionState.customGestures.forEach(customGesture => {
                const actionInfo = getActionDescription(customGesture.action);
                
                extensionState.gestures.push({
                    pattern: customGesture.pattern,
                    name: customGesture.name || actionInfo.name, // 优先使用自定义名称
                    action: customGesture.action,
                    enabled: customGesture.enabled !== false,
                    custom: true,
                    category: 'custom'
                });
            });
        }
        
        console.log('✅ Extension state loaded:', {
            enabled: extensionState.enabled,
            totalGestures: extensionState.gestures.length,
            customGestures: extensionState.customGestures.length,
            gestures: extensionState.gestures
        });
    } catch (error) {
        if (error.message?.includes('Extension context invalidated')) {
            console.log('⚠️ 扩展上下文已失效，页面将自动重新加载');
            // 等待一小段时间后重新加载页面
            setTimeout(() => window.location.reload(), 1000);
            return;
        }
        console.error('❌ 加载设置失败:', error);
        // 使用空状态
        extensionState.gestures = [];
        extensionState.enabled = false;
    }
}

async function saveExtensionState() {
    try {
        // 使用正确的消息格式保存设置到background script
        const settings = {
            enableExecution: extensionState.enabled,
            actionMappings: extensionState.gestures.reduce((acc, gesture) => {
                acc[gesture.pattern] = gesture.action;
                return acc;
            }, {}),
            customGestures: extensionState.customGestures
        };
        
        const response = await chrome.runtime.sendMessage({
            type: 'SAVE_SETTINGS',
            settings: settings
        });
        
        if (response && response.success) {
            console.log('Extension state saved successfully');
        } else {
            console.error('Failed to save settings:', response);
        }
    } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
            console.log('Extension context invalidated during settings save, sidepanel will be reloaded');
            return;
        }
        console.error('Failed to save extension state:', error);
    }
}

async function updateCurrentPageInfo() {
    try {
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab) {
            extensionState.currentPage = {
                url: tab.url || '',
                title: tab.title || 'Unknown',
                supported: isSupportedUrl(tab.url),
                type: getPageType(tab.url)
            };
        }
    } catch (error) {
        console.error('Failed to get current page info:', error);
        extensionState.currentPage = {
            url: 'chrome://extensions/',
            title: 'Extensions',
            supported: false,
            type: 'system'
        };
    }
}

function isSupportedUrl(url) {
    if (!url) return false;
    
    const unsupportedProtocols = [
        'chrome://',
        'chrome-extension://',
        'chrome-search://',
        'edge://',
        'about:',
        'moz-extension://'
    ];
    
    return !unsupportedProtocols.some(protocol => url.startsWith(protocol));
}

function getPageType(url) {
    if (!url) return 'unknown';
    
    if (url.startsWith('https://')) return 'secure';
    if (url.startsWith('http://')) return 'http';
    if (url.startsWith('chrome://')) return 'system';
    if (url.startsWith('file://')) return 'file';
    if (url.startsWith('chrome-extension://')) return 'extension';
    
    return 'unknown';
}

function renderUI() {
    updateHeader();
    updateCurrentPageSection();
    updateGestureSection();
    updateStatsSection();
    updateVisibility();
}

function updateHeader() {
    if (elements.enableToggle) {
        elements.enableToggle.checked = extensionState.enabled;
    }
    
    // 更新toggle标签
    const toggleLabel = document.getElementById('toggleLabel');
    if (toggleLabel) {
        const statusKey = extensionState.enabled ? 'enabled' : 'disabled';
        toggleLabel.textContent = getI18nMessage(statusKey, extensionState.enabled ? '已启用' : '已禁用');
    }
}

function updateCurrentPageSection() {
    if (elements.pageUrl) {
        elements.pageUrl.textContent = extensionState.currentPage.url;
    }
    
    if (elements.pageTitle) {
        elements.pageTitle.textContent = extensionState.currentPage.title;
    }
    
    if (elements.pageStatus) {
        const supported = extensionState.currentPage.supported;
        elements.pageStatus.className = `page-status ${supported ? 'supported' : 'unsupported'}`;
        elements.pageStatus.textContent = supported ? '✓ 支持手势' : '✗ 不支持';
    }
    
    if (elements.pageDetails) {
        elements.pageDetails.innerHTML = `
            <div class="detail-item">
                <label>页面类型:</label>
                <span>${getPageTypeText(extensionState.currentPage.type)}</span>
            </div>
            <div class="detail-item">
                <label>手势状态:</label>
                <span>${extensionState.enabled ? '启用' : '禁用'}</span>
            </div>
            <div class="detail-item">
                <label>今日使用:</label>
                <span>${extensionState.stats.todayUsage} 次</span>
            </div>
        `;
    }
    
    // 更新不支持页面的提示内容
    updateUnsupportedMessage();
}

function updateUnsupportedMessage() {
    const unsupportedReason = document.getElementById('unsupportedReason');
    if (unsupportedReason && !extensionState.currentPage.supported) {
        const url = extensionState.currentPage.url;
        let reason = '当前页面不支持手势扩展';
        
        if (url.startsWith('chrome://')) {
            reason = 'Chrome内置页面不支持手势扩展功能';
        } else if (url.startsWith('chrome-extension://')) {
            reason = '扩展管理页面不支持手势功能';
        } else if (url.startsWith('edge://')) {
            reason = 'Edge内置页面不支持手势扩展功能';
        } else if (url.startsWith('about:')) {
            reason = '浏览器系统页面不支持手势功能';
        } else if (url.startsWith('file://')) {
            reason = '本地文件页面暂不支持手势功能';
        }
        
        unsupportedReason.textContent = reason;
    }
}

function getPageTypeText(type) {
    const typeMap = {
        'secure': 'HTTPS安全页面',
        'http': 'HTTP页面',
        'system': '浏览器系统页面',
        'file': '本地文件',
        'extension': '扩展页面',
        'unknown': '未知类型'
    };
    return typeMap[type] || '未知类型';
}

function updateGestureSection() {
    // 分离预设和自定义手势
    const presetGestures = extensionState.gestures.filter(g => !g.custom);
    const customGestures = extensionState.gestures.filter(g => g.custom);
    
    // 渲染预设手势到 gestureList
    if (elements.gestureList) {
        const html = presetGestures.map(gesture => `
            <div class="gesture-item ${gesture.enabled ? '' : 'disabled'}">
                <span class="gesture-pattern" title="${gesture.pattern}">${patternToArrows(gesture.pattern)}</span>
                <div class="gesture-info">
                    <div class="gesture-name">${gesture.name}</div>
                    <div class="gesture-action">${gesture.action}</div>
                </div>
                <label class="gesture-toggle">
                    <input type="checkbox" ${gesture.enabled ? 'checked' : ''} data-pattern="${gesture.pattern}" class="nes-checkbox">
                    <span></span>
                </label>
            </div>
        `).join('');
        
        elements.gestureList.innerHTML = html;
        
        // 添加开关事件监听
        const toggleInputs = elements.gestureList.querySelectorAll('.nes-checkbox');
        toggleInputs.forEach(input => {
            input.addEventListener('change', handleGestureToggle);
        });
    }
    
    // 渲染自定义手势到 customGesturesPreview
    if (elements.customPreview) {
        if (customGestures.length > 0) {
            const html = customGestures.map(gesture => `
                <div class="gesture-item ${gesture.enabled ? '' : 'disabled'}" style="background: rgba(255, 215, 0, 0.05);">
                    <span class="gesture-pattern" title="${gesture.pattern}">${patternToArrows(gesture.pattern)}</span>
                    <div class="gesture-info">
                        <div class="gesture-name" style="color: #ffa500;">⭐ ${gesture.name}</div>
                        <div class="gesture-action">${gesture.action}</div>
                    </div>
                    <label class="gesture-toggle">
                        <input type="checkbox" ${gesture.enabled ? 'checked' : ''} data-pattern="${gesture.pattern}" class="nes-checkbox">
                        <span></span>
                    </label>
                </div>
            `).join('');
            
            elements.customPreview.innerHTML = html;
            
            // 添加开关事件监听
            const toggleInputs = elements.customPreview.querySelectorAll('.nes-checkbox');
            toggleInputs.forEach(input => {
                input.addEventListener('change', handleGestureToggle);
            });
        } else {
            // 没有自定义手势时显示提示
            const noGesturesMsg = getI18nMessage('noCustomGestures') || '还没有自定义手势';
            const noGesturesHint = getI18nMessage('noCustomGesturesHint') || '点击下方按钮创建你的专属手势';
            
            elements.customPreview.innerHTML = `
                <div class="empty-message nes-container is-rounded" style="text-align: center; padding: 20px;">
                    <p class="nes-text is-disabled">${noGesturesMsg}</p>
                    <p class="nes-text is-disabled" style="font-size: 12px; margin-top: 8px;">${noGesturesHint}</p>
                </div>
            `;
        }
    }
}

// 处理手势开关切换
async function handleGestureToggle(event) {
    const pattern = event.target.dataset.pattern;
    const enabled = event.target.checked;
    
    // 更新状态
    const gesture = extensionState.gestures.find(g => g.pattern === pattern);
    if (gesture) {
        gesture.enabled = enabled;
        
        // 保存到 background
        await saveExtensionState();
        
        // 只更新当前项的样式，不重新渲染整个列表
        const gestureItem = event.target.closest('.gesture-item');
        if (gestureItem) {
            if (enabled) {
                gestureItem.classList.remove('disabled');
            } else {
                gestureItem.classList.add('disabled');
            }
        }
        
        showNotification(
            enabled ? `手势 ${patternToArrows(pattern)} 已启用` : `手势 ${patternToArrows(pattern)} 已禁用`,
            'success'
        );
    }
}

function updateStatsSection() {
    if (elements.statsGrid) {
        elements.statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${extensionState.stats.totalGestures}</div>
                <div class="stat-label">总使用次数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${extensionState.stats.todayUsage}</div>
                <div class="stat-label">今日使用</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${extensionState.stats.favoriteGesture}</div>
                <div class="stat-label">常用手势</div>
            </div>
        `;
    }
}

function updateVisibility() {
    const isEnabled = extensionState.enabled;
    const isSupported = extensionState.currentPage.supported;
    
    // 优先级：不支持页面 > 扩展禁用 > 正常主内容
    if (!isSupported) {
        // 不支持的页面，显示不支持消息
        if (elements.mainContent) {
            elements.mainContent.style.display = 'none';
        }
        if (elements.disabledMessage) {
            elements.disabledMessage.style.display = 'none';
        }
        if (elements.unsupportedMessage) {
            elements.unsupportedMessage.style.display = 'block';
        }
    } else if (!isEnabled) {
        // 支持的页面但扩展被禁用
        if (elements.mainContent) {
            elements.mainContent.style.display = 'none';
        }
        if (elements.disabledMessage) {
            elements.disabledMessage.style.display = 'block';
        }
        if (elements.unsupportedMessage) {
            elements.unsupportedMessage.style.display = 'none';
        }
    } else {
        // 支持的页面且扩展启用，显示主内容
        if (elements.mainContent) {
            elements.mainContent.style.display = 'block';
        }
        if (elements.disabledMessage) {
            elements.disabledMessage.style.display = 'none';
        }
        if (elements.unsupportedMessage) {
            elements.unsupportedMessage.style.display = 'none';
        }
    }
}

// 事件处理器
async function handleEnableToggle(event) {
    extensionState.enabled = event.target.checked;
    
    // 保存状态
    await saveExtensionState();
    
    // 通知background script
    try {
        await chrome.runtime.sendMessage({
            type: 'toggleExtension',
            enabled: extensionState.enabled
        });
    } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
            console.log('Extension context invalidated during toggle, sidepanel will be reloaded');
            return;
        }
        console.error('Failed to notify background script:', error);
    }
    
    // 更新UI
    renderUI();
    
    // 显示反馈
    showNotification(
        extensionState.enabled ? '手势识别已启用' : '手势识别已禁用',
        'success'
    );
}

async function handleRefresh() {
    // 添加刷新动画
    const refreshIcon = elements.refreshBtn && elements.refreshBtn.querySelector('span');
    if (refreshIcon) {
        refreshIcon.style.animationPlayState = 'running';
        setTimeout(() => {
            refreshIcon.style.animationPlayState = 'paused';
        }, 1000);
    }
    
    // 重新加载状态
    await loadExtensionState();
    await updateCurrentPageInfo();
    renderUI();
    
    showNotification('界面已刷新', 'info');
}

async function executeQuickAction(action) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        switch (action) {
            case 'back':
                await chrome.tabs.goBack(tab.id);
                break;
            case 'forward':
                await chrome.tabs.goForward(tab.id);
                break;
            case 'reload':
                await chrome.tabs.reload(tab.id);
                break;
            case 'top':
                await chrome.tabs.sendMessage(tab.id, { action: 'scrollTop' });
                break;
            case 'bottom':
                await chrome.tabs.sendMessage(tab.id, { action: 'scrollBottom' });
                break;
            case 'newTab':
                await chrome.tabs.create({});
                break;
            case 'closeTab':
                if (tab.id) {
                    await chrome.tabs.remove(tab.id);
                }
                break;
            case 'options':
                await chrome.runtime.openOptionsPage();
                break;
        }
        
        // 更新统计
        extensionState.stats.todayUsage++;
        await saveExtensionState();
        updateStatsSection();
        
        const actionExecutedMsg = getI18nMessage('actionExecuted') || '操作已执行';
        showNotification(actionExecutedMsg, 'success');
    } catch (error) {
        console.error('Failed to execute quick action:', error);
        showNotification('操作执行失败', 'error');
    }
}

function showHelp() {
    if (elements.helpSection) {
        elements.helpSection.style.display = 'block';
        // 聚焦到帮助内容以便键盘导航
        elements.helpSection.focus();
    }
}

function hideHelp() {
    if (elements.helpSection) {
        elements.helpSection.style.display = 'none';
    }
}

function handleKeyboard(event) {
    // ESC 关闭帮助
    if (event.key === 'Escape') {
        hideHelp();
    }
    
    // F1 显示帮助
    if (event.key === 'F1') {
        event.preventDefault();
        showHelp();
    }
    
    // Ctrl+R 刷新
    if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        handleRefresh();
    }
}

function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 样式
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '13px',
        fontWeight: '500',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'all 0.3s ease'
    });
    
    // 根据类型设置背景色
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // 自动移除
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function startPeriodicUpdates() {
    // 每30秒更新一次页面信息
    setInterval(async () => {
        await updateCurrentPageInfo();
        updateCurrentPageSection();
    }, 30000);
    
    // 监听标签页变化
    if (chrome.tabs && chrome.tabs.onActivated) {
        chrome.tabs.onActivated.addListener(async () => {
            await updateCurrentPageInfo();
            renderUI();
        });
    }
    
    if (chrome.tabs && chrome.tabs.onUpdated) {
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
            if (changeInfo.url || changeInfo.title) {
                await updateCurrentPageInfo();
                updateCurrentPageSection();
            }
        });
    }
}

// 监听来自content script或background script的消息
if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'gestureExecuted':
                // 手势被执行，更新统计
                extensionState.stats.totalGestures++;
                extensionState.stats.todayUsage++;
                if (message.pattern) {
                    extensionState.stats.favoriteGesture = message.pattern;
                }
                saveExtensionState();
                updateStatsSection();
                break;
                
            case 'statusChanged':
                // 扩展状态变化
                extensionState.enabled = message.enabled;
                renderUI();
                break;
                
            case 'CLOSE_SIDEPANEL':
                // 收到关闭请求（虽然无法强制关闭，但可以提示用户）
                console.log('收到关闭 sidepanel 请求');
                // 可以在这里显示提示或执行其他操作
                break;
        }
        
        sendResponse({ success: true });
    });
}

// 当 sidepanel 加载时，通知 background 它已打开
window.addEventListener('load', async () => {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
            chrome.runtime.sendMessage({
                type: 'SIDEPANEL_OPENED',
                windowId: tabs[0].windowId
            }).catch(() => {
                // 忽略错误
            });
        }
    } catch (error) {
        console.error('通知 sidepanel 打开状态失败:', error);
    }
});

// 当 sidepanel 关闭时，通知 background
window.addEventListener('unload', async () => {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
            chrome.runtime.sendMessage({
                type: 'SIDEPANEL_CLOSED',
                windowId: tabs[0].windowId
            }).catch(() => {
                // 忽略错误
            });
        }
    } catch (error) {
        // 忽略错误
    }
});

// 导出供调试使用
window.sidePanelDebug = {
    extensionState,
    renderUI,
    updateCurrentPageInfo,
    executeQuickAction
};