/**
 * 运动追踪器 - 核心运动检测和处理逻辑
 * 重构自原GestureDetector类，职责更加明确
 */

class MotionTracker {
    constructor() {
        // 追踪状态
        this.isRecording = false;
        this.trackingStartX = 0; // 原gestureStartX
        this.trackingStartY = 0; // 原gestureStartY
        this.trackingLastX = 0;  // 原gestureLastX
        this.trackingLastY = 0;  // 原gestureLastY
        this.trackingPath = [];  // 原gesturePath
        this.motionPattern = ''; // 原gesturePattern
        this.trackingCancelled = false; // 原gestureWasCancelled
        
        // 配置和状态
        this.settings = null;
        this.minDistance = 30;
        this.pathRenderer = null; // 将在初始化时创建
        this.contextMenuPreventTimer = null;
        
    // i18n（内容脚本内独立维护，优先使用用户在选项页/侧边栏选择的语言）
    this.i18nMessages = null; // { key: { message: string } }
    this.selectedLocale = null; // en | zh_CN | de | ja
        
        // 防止频繁提示的时间戳
        this.lastDisabledHintTime = 0;
        this.disabledHintCooldown = 5000; // 5秒内不重复提示
        
        // 标签页切换检测
        this.tabSwitchDetected = false;
        this.lastVisibilityState = document.visibilityState;
        this.trackingStartTime = 0; // 原gestureStartTime
        
        // 右键菜单逻辑
        this.hasMovedSinceMouseDown = false;
        this.moveThreshold = 5;
        this.isRightClickOnly = false;
        this.rightClickStartTime = 0;
        this.trackingActivationDelay = 150; // 原gestureActivationDelay
        
        // 初始化输入管理器
        this.inputManager = null; // 将在初始化时创建
        
        this.init();
    }
    
    /**
     * 初始化追踪器
     */
    async init() {
        console.log('MotionTracker initializing...', {
            url: window.location.href
        });
        
        try {
            // 优先初始化 i18n（尽量在 UI 使用前准备好翻译）
            await this._initI18n();
            // 先初始化输入管理器和路径渲染器（不依赖settings）
            this._initializeInputManager();
            this._initializePathRenderer();
            this._attachEventListeners();
            this._setupVisibilityHandlers();
            
            // 异步加载settings，但不阻塞初始化
            this._loadSettings().then(() => {
                console.log('MotionTracker settings loaded successfully', {
                    url: window.location.href,
                    settingsLoaded: !!this.settings,
                    enableExecution: this.settings?.enableExecution
                });
            }).catch(error => {
                console.error('MotionTracker settings load failed, using defaults:', error);
                // 确保有默认值
                if (!this.settings) {
                    this.settings = {
                        enableExecution: true,
                        patternSensitivity: 10,
                        enableTrail: true,
                        trailDuration: 500,
                        actionMappings: {}
                    };
                }
            });
            
            console.log('MotionTracker initialized successfully (settings loading async)', {
                url: window.location.href
            });
        } catch (error) {
            console.error('MotionTracker initialization failed:', error);
        }
    }

    /**
     * 初始化内容脚本内的 i18n
     * 优先使用用户在 UI 中选择的语言（chrome.storage.local.selectedLocale）
     * 回退到浏览器 UI 语言，然后再回退到 Chrome i18n API 或内置中文
     * @private
     */
    async _initI18n() {
        try {
            // 读取用户选择的语言
            let savedLocale = null;
            try {
                const result = await chrome.storage.local.get('selectedLocale');
                savedLocale = result.selectedLocale || null;
            } catch (e) {
                // 忽略读取失败
            }

            // 支持的语言映射
            const supported = ['en', 'zh_CN', 'de', 'ja'];

            if (savedLocale && supported.includes(savedLocale)) {
                this.selectedLocale = savedLocale;
            } else {
                // 使用浏览器 UI 语言做一次映射
                const ui = (chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') ? chrome.i18n.getUILanguage() : 'en';
                if (ui.startsWith('zh')) this.selectedLocale = 'zh_CN';
                else if (ui.startsWith('de')) this.selectedLocale = 'de';
                else if (ui.startsWith('ja')) this.selectedLocale = 'ja';
                else this.selectedLocale = 'en';
            }

            // 从扩展资源中加载对应语言的 messages.json
            const url = chrome.runtime.getURL(`src/assets/locales/${this.selectedLocale}/messages.json`);
            const res = await fetch(url);
            if (res.ok) {
                this.i18nMessages = await res.json();
                console.log('✅ Content i18n loaded:', this.selectedLocale, Object.keys(this.i18nMessages || {}).length);
            } else {
                console.warn('⚠️ Failed to load i18n messages for', this.selectedLocale, res.status);
                this.i18nMessages = null; // 回退到 chrome.i18n / 默认
            }
        } catch (err) {
            console.warn('⚠️ _initI18n failed, will use chrome.i18n/fallback:', err);
            this.i18nMessages = null;
        }
    }

    /**
     * 内容脚本获取翻译的辅助函数
     * 优先使用 this.i18nMessages（与 UI 选择保持一致），其次使用 Chrome i18n API，最后用传入的后备文案
     * @param {string} key
     * @param {string} fallback
     * @returns {string}
     * @private
     */
    _t(key, fallback = '') {
        // 1) 使用与 UI 同步的消息集合
        if (this.i18nMessages && this.i18nMessages[key] && this.i18nMessages[key].message) {
            return this.i18nMessages[key].message;
        }
        // 2) 回退到 Chrome i18n
        if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
            const msg = chrome.i18n.getMessage(key);
            if (msg) return msg;
        }
        // 3) 最后回退
        return fallback || key;
    }
    
    /**
     * 加载设置
     * @private
     */
    async _loadSettings() {
        try {
            console.log('🔄 _loadSettings called, URL:', window.location.href);
            
            if (window.MessageUtils) {
                this.settings = await window.MessageUtils.loadSettings();
            } else {
                console.log('⚠️ MessageUtils not available, using fallback');
                // 回退方案 - 使用正确的消息格式
                const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
                this.settings = response;
            }
            
            // 确保设置有效
            if (!this.settings) {
                throw new Error('Settings is null');
            }
            
            console.log('✅ 运动追踪器设置已加载:', {
                enableExecution: this.settings.enableExecution,
                actionMappings: this.settings.actionMappings,
                totalMappings: this.settings.actionMappings ? Object.keys(this.settings.actionMappings).length : 0,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ 加载设置失败:', error, 'URL:', window.location.href);
            // 使用默认设置
            this.settings = { 
                enableExecution: true, 
                patternSensitivity: 10, 
                enableTrail: true,
                trailDuration: 500,
                actionMappings: {
                    'L': 'goBack',
                    'R': 'goForward',
                    'U': 'scrollToTop',
                    'D': 'scrollToBottom',
                    'UD': 'refreshTab',
                    'DL': 'newTab',
                    'DR': 'closeTab',
                    'RL': 'reopenTab'
                }
            };
            console.log('📝 使用默认设置（因加载失败）');
        }
    }
    
    /**
     * 初始化输入管理器
     * @private
     */
    _initializeInputManager() {
        this.inputManager = new (window.UnifiedInputManager || UnifiedInputManager)();
        console.log('输入管理器初始化:', this.inputManager.getDebugInfo());
    }
    
    /**
     * 初始化路径渲染器
     * @private
     */
    _initializePathRenderer() {
        this.pathRenderer = new (window.PathRenderer || PathRenderer)();
    }
    
    /**
     * 添加事件监听器
     * @private
     */
    _attachEventListeners() {
        console.log('Attaching event listeners...', {
            url: window.location.href
        });
        
        // 使用统一输入管理器
        this.inputManager.addEventListener(document, this);
        
        console.log('Event listeners attached successfully');
    }
    
    /**
     * 设置可见性变化处理器
     * @private
     */
    _setupVisibilityHandlers() {
        // 监听来自background的消息
        if (window.MessageUtils) {
            window.MessageUtils.setMessageListener((request, sender, sendResponse) => {
                this._handleMessage(request, sender, sendResponse);
            });
        } else {
            // 回退方案
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                this._handleMessage(request, sender, sendResponse);
            });
        }
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            this._handleVisibilityChange();
        });
        
        // 监听窗口焦点变化
        window.addEventListener('focus', () => {
            this._handleWindowFocus();
        });
        
        window.addEventListener('blur', () => {
            this._handleWindowBlur();
        });
    }
    
    /**
     * 处理消息
     * @private
     */
    _handleMessage(request, sender, sendResponse) {
        try {
            console.log('📨 _handleMessage received:', { type: request.type, action: request.action });
            
            // 处理新的SCROLL_COMMAND格式
            if (request.type === 'SCROLL_COMMAND') {
                if (request.action === 'scrollToTop') {
                    console.log('⬆️ 执行滚动到顶部');
                    this._performScroll('top');
                    sendResponse({ success: true, action: 'scrollToTop' });
                    return true; // 表示异步响应
                } else if (request.action === 'scrollToBottom') {
                    console.log('⬇️ 执行滚动到底部');
                    this._performScroll('bottom');
                    sendResponse({ success: true, action: 'scrollToBottom' });
                    return true; // 表示异步响应
                }
                return;
            }
            
            // 兼容旧的action格式
            if (request.action === 'scrollTop') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                sendResponse({ success: true });
            } else if (request.action === 'scrollBottom') {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                sendResponse({ success: true });
            } else if (request.action === 'reloadSettings') {
                this.settings = request.settings;
                console.log('Settings reloaded in real-time:', this.settings);
                
                if (!this.settings.enableExecution && this.isRecording) {
                    this._resetTrackingState();
                    this._showDisabledHintWithCooldown();
                }
                
                sendResponse({ success: true });
            }
        } catch (error) {
            console.error('执行操作失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    /**
     * 处理可见性变化
     * @private
     */
    _handleVisibilityChange() {
        if (!document.hidden) {
            this._refreshSettingsIfNeeded();
            
            if (this.lastVisibilityState === 'hidden' && this.isRecording) {
                this.tabSwitchDetected = true;
                console.log('Tab switch detected during motion tracking');
            }
        } else {
            if (this.isRecording) {
                console.log('Tab hidden during tracking, cancelling');
                this.trackingCancelled = true;
                this._resetTrackingState();
            }
        }
        this.lastVisibilityState = document.visibilityState;
    }
    
    /**
     * 处理窗口获得焦点
     * @private
     */
    _handleWindowFocus() {
        this._refreshSettingsIfNeeded();
        
        if (this.tabSwitchDetected) {
            this.contextMenuPreventTimer = Date.now();
            console.log('Window focus after tab switch, extending context menu prevention');
        }
    }
    
    /**
     * 处理窗口失焦
     * @private
     */
    _handleWindowBlur() {
        if (this.isRecording) {
            this.tabSwitchDetected = true;
            console.log('Window blur during tracking, marking tab switch');
        }
    }
    
    /**
     * 刷新设置（如果需要）
     * @private
     */
    async _refreshSettingsIfNeeded() {
        try {
            console.log('🔄 刷新设置...');
            const latestSettings = window.MessageUtils ? 
                await window.MessageUtils.loadSettings() :
                await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });  // ✅ 修复：使用正确的消息类型
            
            if (!latestSettings) {
                console.warn('⚠️ 刷新设置失败，settings 为空');
                return;
            }
            
            if (!this.settings || JSON.stringify(this.settings) !== JSON.stringify(latestSettings)) {
                console.log('✅ 检测到设置变化，更新中...', {
                    oldEnabled: this.settings?.enableExecution,
                    newEnabled: latestSettings.enableExecution
                });
                this.settings = latestSettings;
                
                if (!this.settings.enableExecution && this.isRecording) {
                    this._resetTrackingState();
                    this._showDisabledHintWithCooldown();
                }
            } else {
                console.log('✓ 设置无变化');
            }
        } catch (error) {
            console.error('❌ Failed to refresh settings:', error);
            
            // 如果刷新失败但 settings 为空，尝试重新初始化
            if (!this.settings) {
                console.log('🔄 Settings 为空，尝试重新加载...');
                try {
                    await this._loadSettings();
                } catch (retryError) {
                    console.error('❌ 重新加载设置也失败:', retryError);
                }
            }
        }
    }
    
    /**
     * 重置追踪状态
     * @private
     */
    _resetTrackingState() {
        console.log('🚨 resetTrackingState called - stopping all tracking activities');
        
        this.isRecording = false;
        this.trackingCancelled = false;
        this.trackingStartX = 0;
        this.trackingStartY = 0;
        this.trackingLastX = 0;
        this.trackingLastY = 0;
        this.trackingPath = [];
        this.motionPattern = '';
        this.trackingStartTime = 0;
        
        this.hasMovedSinceMouseDown = false;
        this.isRightClickOnly = false;
        
        setTimeout(() => {
            this.tabSwitchDetected = false;
        }, 3000);
        
        this._hideTrackingHint();
        this._hideCancelZone();

        if (this.pathRenderer && this.pathRenderer.canvas) {
            console.log('🎯 Destroying path renderer');
            this.pathRenderer.destroy();
        }
        
        console.log('Tracking state reset completed');
    }
    
    /**
     * 处理追踪开始
     */
    async handleTrackingStart(unifiedEvent) {
        const debugInfo = {
            eventType: unifiedEvent.type,
            clientX: unifiedEvent.clientX,
            clientY: unifiedEvent.clientY,
            url: window.location.href,
            settings: !!this.settings,
            enableExecution: this.settings?.enableExecution,
            timestamp: new Date().toISOString()
        };
        
        console.log('🚀 handleTrackingStart called:', debugInfo);
        
        // 如果设置为空，尝试重新加载（异步加载但不阻塞）
        if (!this.settings) {
            console.warn('⚠️ Settings 为空，尝试同步等待加载...');
            // 改为同步等待加载完成
            try {
                await this._loadSettings();
                console.log('✅ Settings 加载完成:', {
                    enableExecution: this.settings?.enableExecution,
                    hasSettings: !!this.settings
                });
            } catch (err) {
                console.error('❌ 同步加载设置失败:', err);
                // 使用临时默认设置允许手势启动
                this.settings = {
                    enableExecution: true,
                    patternSensitivity: 10,
                    enableTrail: true,
                    trailDuration: 500,
                    actionMappings: {}
                };
                console.log('📝 使用临时默认设置（因加载失败）');
            }
        }
        
        if (!this.settings.enableExecution) {
            console.log('⚠️ Motion tracking disabled - settings:', {
                hasSettings: !!this.settings,
                enableExecution: this.settings?.enableExecution
            });
            this._showDisabledHintWithCooldown();
            return;
        }

        console.log('✅ Tracking start approved:', unifiedEvent.platform, unifiedEvent.inputType);
        
        this._resetTrackingState();
        
        this.isRecording = true;
        this.trackingCancelled = false;
        this.trackingStartTime = Date.now();
        this.rightClickStartTime = Date.now();
        this.tabSwitchDetected = false;
        this.hasMovedSinceMouseDown = false;
        this.isRightClickOnly = true;

        const realX = this._getRealCoordinate(unifiedEvent.clientX);
        const realY = this._getRealCoordinate(unifiedEvent.clientY);

        this.trackingStartX = realX;
        this.trackingStartY = realY;
        this.trackingLastX = realX;
        this.trackingLastY = realY;
        this.trackingPath = [];
        this.motionPattern = '';

        // 延迟显示UI
        setTimeout(() => {
            if (this.isRecording && (Date.now() - this.rightClickStartTime) >= this.trackingActivationDelay) {
                this.isRightClickOnly = false;
                this._showCancelZone();
                this._showTrackingHint();
                this.pathRenderer.create();
                this.pathRenderer.addPoint(realX, realY);
                console.log('Tracking UI activated after delay');
            }
        }, this.trackingActivationDelay);

        console.log('Tracking started at:', realX, realY);
    }
    
    /**
     * 处理追踪移动
     */
    handleTrackingMove(unifiedEvent) {
        if (!this.isRecording) {
            // console.log('🔍 handleTrackingMove called but not recording - ignoring');
            return;
        }

        const realX = this._getRealCoordinate(unifiedEvent.clientX);
        const realY = this._getRealCoordinate(unifiedEvent.clientY);

        const deltaX = realX - this.trackingStartX;
        const deltaY = realY - this.trackingStartY;
        const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const timeSinceStart = Date.now() - this.rightClickStartTime;
        const shouldActivateTracking = totalDistance > this.moveThreshold || 
                                      timeSinceStart >= this.trackingActivationDelay;

        if (!this.hasMovedSinceMouseDown && shouldActivateTracking) {
            this.hasMovedSinceMouseDown = true;
            this.isRightClickOnly = false;

            if (!this.pathRenderer.canvas) {
                this._showCancelZone();
                this._showTrackingHint();
                this.pathRenderer.create();
                this.pathRenderer.addPoint(this.trackingStartX, this.trackingStartY);
            }

            this.contextMenuPreventTimer = Date.now();
            console.log('Tracking activated - movement or time threshold reached');
        }

        if (!this.isRightClickOnly) {
            // 检查取消区域
            if (this._isInCancelZone(unifiedEvent.clientX, unifiedEvent.clientY)) {
                this.isRecording = false;
                this.trackingCancelled = true;
                this._hideTrackingHint();
                this.motionPattern = '';
                this.pathRenderer.startFadeOut();
                
                this._showExecutionHint('运动追踪已取消', false);
                return;
            }

            // 更新轨迹
            this.pathRenderer.addPoint(realX, realY);

            const deltaXFromLast = realX - this.trackingLastX;
            const deltaYFromLast = realY - this.trackingLastY;
            const distance = Math.sqrt(deltaXFromLast * deltaXFromLast + deltaYFromLast * deltaYFromLast);

            const adjustedMinDistance = unifiedEvent.inputType === 'touch' ? 
                this.minDistance * 1.5 : this.minDistance;
            
            if (distance > adjustedMinDistance) {
                let direction = '';
                
                // 添加详细的方向识别调试信息
                console.log('🧭 方向识别调试:', {
                    deltaXFromLast,
                    deltaYFromLast,
                    absX: Math.abs(deltaXFromLast),
                    absY: Math.abs(deltaYFromLast),
                    isHorizontal: Math.abs(deltaXFromLast) > Math.abs(deltaYFromLast),
                    currentPattern: this.motionPattern
                });
                
                if (Math.abs(deltaXFromLast) > Math.abs(deltaYFromLast)) {
                    direction = deltaXFromLast > 0 ? 'R' : 'L';
                    console.log(`➡️ 水平移动: ${deltaXFromLast > 0 ? '向右(R)' : '向左(L)'}`);
                } else {
                    direction = deltaYFromLast > 0 ? 'D' : 'U';
                    console.log(`⬆️ 垂直移动: ${deltaYFromLast > 0 ? '向下(D)' : '向上(U)'}`);
                }
                
                if (this.motionPattern.charAt(this.motionPattern.length - 1) !== direction) {
                    this.motionPattern += direction;
                    console.log(`✅ 添加方向: ${direction}, 完整模式: ${this.motionPattern}`);
                    this._showTrackingHint();
                }
                
                this.trackingLastX = realX;
                this.trackingLastY = realY;
            }
        }
    }
    
    /**
     * 处理追踪结束
     */
    handleTrackingEnd(unifiedEvent) {
        console.log('🔥 handleTrackingEnd called:', {
            pattern: this.motionPattern,
            cancelled: this.trackingCancelled,
            rightClickOnly: this.isRightClickOnly,
            isRecording: this.isRecording,
            hasCanvas: !!this.pathRenderer?.canvas
        });
        
        this._hideCancelZone();
        
        if (this.tabSwitchDetected) {
            this.contextMenuPreventTimer = Date.now();
            console.log('Tab switch detected, extending context menu prevention');
        }
        
        if (this.trackingCancelled) {
            this._resetTrackingState();
            return;
        }
        
        if (this.isRightClickOnly) {
            console.log('Right click only detected, allowing default context menu');
            this._resetTrackingState();
            return;
        }
        
        if (this.isRecording && this.motionPattern.length > 0 && this.hasMovedSinceMouseDown) {
            this.contextMenuPreventTimer = Date.now();
            this._executeMotion();
        } else {
            if (this.hasMovedSinceMouseDown) {
                this.contextMenuPreventTimer = Date.now();
            }
        }
        
        this._resetTrackingState();
    }
    
    /**
     * 判断是否应该阻止右键菜单
     */
    shouldPreventContextMenu() {
        const timeSinceTracking = this.contextMenuPreventTimer ? 
            (Date.now() - this.contextMenuPreventTimer) : Infinity;
        
        const preventDuration = this.tabSwitchDetected ? 2000 : 500;
        
        const timeSinceRightClick = Date.now() - this.rightClickStartTime;
        if (this.isRightClickOnly && timeSinceRightClick < this.trackingActivationDelay) {
            return false;
        }
        
        return timeSinceTracking < preventDuration || 
               (this.isRecording && this.hasMovedSinceMouseDown);
    }
    
    /**
     * 获取真实坐标
     * @private
     */
    _getRealCoordinate(clientCoord) {
        if (window.CoordinateUtils) {
            return window.CoordinateUtils.getRealCoordinate(
                clientCoord, 
                this.inputManager.inputType,
                this.inputManager.getDevicePixelRatio(),
                this.inputManager.getViewportScale()
            );
        }
        
        // 回退方案
        return clientCoord;
    }
    
    /**
     * 执行运动操作
     * @private
     */
    _executeMotion() {
        console.log('🚀 _executeMotion called:', {
            settings: !!this.settings,
            enableExecution: this.settings?.enableExecution,
            motionPattern: this.motionPattern,
            actionMappings: this.settings?.actionMappings
        });
        
        if (!this.settings || !this.settings.enableExecution) {
            console.log('❌ Motion execution disabled or no settings');
            return;
        }
        
        // 检查动作映射而不是手势列表
        const actionMapping = this.settings.actionMappings;
        if (!actionMapping || !actionMapping[this.motionPattern]) {
            console.log('❌ 没有找到动作映射:', {
                pattern: this.motionPattern,
                hasActionMapping: !!actionMapping,
                availablePatterns: actionMapping ? Object.keys(actionMapping) : []
            });
            return;
        }
        
        console.log('✅ 执行动作映射:', this.motionPattern, '->', actionMapping[this.motionPattern]);
        
        if (window.MessageUtils) {
            window.MessageUtils.executeMotionAction(null, this.motionPattern);
        } else {
            console.log('⚠️ MessageUtils not found, using fallback');
            // 回退方案
            chrome.runtime.sendMessage({
                type: 'EXECUTE_MOTION',
                pattern: this.motionPattern,
                timestamp: Date.now()
            }).catch(error => {
                console.error('发送运动消息失败:', error);
                this._showExecutionHint('运动执行失败', true);
            });
        }
    }
    
    /**
     * 显示追踪提示
     * @private
     */
    _showTrackingHint() {
        console.log('showTrackingHint called');
        
        if (!document.body) {
            console.log('document.body not ready');
            return;
        }
        
        let hint = document.getElementById('motion-tracking-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'motion-tracking-hint';
            document.body.appendChild(hint);
            console.log('Created new tracking hint element');
        }
        
        // 获取 i18n 文本（提前到 if-else 外部）
    const currentMotionLabel = this._t('currentMotion', '当前运动');
    const drawGestureLabel = this._t('drawGesture', '拖动绘制运动');
        
        let content = '';
        if (this.motionPattern && this.motionPattern.length > 0) {
            if (window.DirectionVisualizer) {
                const arrows = window.DirectionVisualizer.getArrowsForPattern(this.motionPattern);
                content = `<div class="motion-pattern">${arrows}</div><div class="motion-label">${currentMotionLabel}</div>`;
            } else {
                const simpleArrows = this.motionPattern.split('').map(dir => {
                    switch(dir) {
                        case 'U': return '↑';
                        case 'D': return '↓';
                        case 'L': return '←';
                        case 'R': return '→';
                        default: return dir;
                    }
                }).join(' ');
                content = `<div class="motion-pattern">${simpleArrows}</div><div class="motion-label">${currentMotionLabel}</div>`;
            }
        } else {
            content = `<div class="motion-pattern">📱</div><div class="motion-label">${drawGestureLabel}</div>`;
        }
        
        hint.innerHTML = content;
        
        const zIndex = window.DOMUtils ? 
            window.DOMUtils.getDynamicZIndex('hint') : 999999;
            
        const styles = {
            position: 'fixed',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px 25px',
            'border-radius': '10px',
            'font-family': 'Arial, sans-serif',
            'font-size': '16px',
            'z-index': zIndex,
            'text-align': 'center',
            'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'block'
        };
        
        if (window.DOMUtils) {
            window.DOMUtils.applyStyles(hint, styles);
        } else {
            Object.entries(styles).forEach(([prop, value]) => {
                hint.style.setProperty(prop, value, 'important');
            });
        }
        
        console.log('Set tracking hint display');
    }
    
    /**
     * 隐藏追踪提示
     * @private
     */
    _hideTrackingHint() {
        const hint = document.getElementById('motion-tracking-hint');
        if (hint) {
            hint.style.setProperty('display', 'none', 'important');
        }
    }
    
    /**
     * 显示取消区域
     * @private
     */
    _showCancelZone() {
        console.log('showCancelZone called');
        
        if (!document.body) {
            console.log('document.body not ready for cancel zone');
            return;
        }
        
        let cancelZone = document.getElementById('motion-cancel-zone');
        if (!cancelZone) {
            cancelZone = document.createElement('div');
            cancelZone.id = 'motion-cancel-zone';
            
            // 创建消息元素（使用 i18n）
            const message = document.createElement('div');
            message.className = 'motion-cancel-zone-message';
            message.textContent = chrome.i18n ? chrome.i18n.getMessage('dragToCancelMotion') : '拖动到页面边缘取消运动';
            cancelZone.appendChild(message);
            
            document.body.appendChild(cancelZone);
            console.log('Created new cancel zone element with i18n message');
        }
        
        const zIndex = window.DOMUtils ? 
            window.DOMUtils.getDynamicZIndex('cancel') : 999998;
        
        // 使用 visualViewport 或 documentElement 来获取实际可见区域
        // 避免 sidepanel 打开时的宽度计算问题
        const viewportWidth = window.visualViewport ? 
            window.visualViewport.width : 
            document.documentElement.clientWidth;
        const viewportHeight = window.visualViewport ? 
            window.visualViewport.height : 
            document.documentElement.clientHeight;
        
        const styles = {
            position: 'fixed',
            top: '0',
            left: '0',
            width: viewportWidth + 'px',
            height: viewportHeight + 'px',
            border: '1px solid rgba(60, 60, 60, 0.3)',
            'box-sizing': 'border-box',
            'z-index': zIndex,
            background: 'rgba(40, 40, 40, 0.02)',
            display: 'flex',
            'justify-content': 'center',
            'align-items': 'center'
        };
        
        if (window.DOMUtils) {
            window.DOMUtils.applyStyles(cancelZone, styles);
        } else {
            Object.entries(styles).forEach(([prop, value]) => {
                cancelZone.style.setProperty(prop, value, 'important');
            });
        }
        
    // 使用 i18n 获取取消提示文本
    const cancelMsg = this._t('dragToCancelMotion', '拖动到边缘取消运动');
        
        cancelZone.innerHTML = `
            <div style="
                background: rgba(50, 50, 50, 0.85) !important;
                color: #e0e0e0 !important;
                padding: 6px 12px !important;
                border-radius: 16px !important;
                font-size: 13px !important;
                font-weight: normal !important;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15) !important;
                border: 1px solid rgba(80, 80, 80, 0.4) !important;
            ">${cancelMsg}</div>
        `;
        
        console.log('Set cancel zone display');
    }
    
    /**
     * 隐藏取消区域
     * @private
     */
    _hideCancelZone() {
        const cancelZone = document.getElementById('motion-cancel-zone');
        if (cancelZone) {
            cancelZone.remove();
        }
    }
    
    /**
     * 检查是否在取消区域
     * @private
     */
    _isInCancelZone(x, y) {
        const margin = 25;
        // 使用 visualViewport 或 documentElement 来获取实际可见区域
        // 这样可以避免 sidepanel 打开时的宽度计算问题
        const viewportWidth = window.visualViewport ? 
            window.visualViewport.width : 
            document.documentElement.clientWidth;
        const viewportHeight = window.visualViewport ? 
            window.visualViewport.height : 
            document.documentElement.clientHeight;
            
        return (x < margin || x > viewportWidth - margin || 
                y < margin || y > viewportHeight - margin);
    }
    
    /**
     * 执行滚动操作（多种方法尝试）
     * @private
     */
    _performScroll(direction) {
        // 获取页面信息
        const pageInfo = {
            bodyHeight: document.body.scrollHeight,
            windowHeight: window.innerHeight,
            documentHeight: document.documentElement.scrollHeight,
            currentScrollTop: window.pageYOffset || document.documentElement.scrollTop,
            bodyScrollTop: document.body.scrollTop
        };
        
        console.log('📊 页面滚动信息:', pageInfo);
        
        // 检查页面是否可滚动
        const canScroll = pageInfo.bodyHeight > pageInfo.windowHeight || 
                         pageInfo.documentHeight > pageInfo.windowHeight;
        
        if (!canScroll) {
            console.warn('⚠️ 页面内容不足，无法滚动');
            return;
        }
        
        // 计算目标位置
        let targetY = 0;
        if (direction === 'bottom') {
            targetY = Math.max(
                pageInfo.bodyHeight - pageInfo.windowHeight,
                pageInfo.documentHeight - pageInfo.windowHeight,
                document.body.scrollHeight - window.innerHeight
            );
        }
        
        console.log(`🎯 尝试滚动到: ${direction}, 目标位置: ${targetY}`);
        
        // 方法1: window.scrollTo (标准方法)
        try {
            window.scrollTo({ top: targetY, behavior: 'smooth' });
            console.log('✅ 方法1: window.scrollTo 已执行');
        } catch (error) {
            console.error('❌ 方法1失败:', error);
        }
        
        // 方法2: document.documentElement.scrollTop (回退方案)
        setTimeout(() => {
            try {
                if (window.pageYOffset === pageInfo.currentScrollTop) {
                    console.log('🔄 方法1未生效，尝试方法2');
                    document.documentElement.scrollTop = targetY;
                    console.log('✅ 方法2: documentElement.scrollTop 已执行');
                }
            } catch (error) {
                console.error('❌ 方法2失败:', error);
            }
        }, 100);
        
        // 方法3: document.body.scrollTop (最后回退)
        setTimeout(() => {
            try {
                if (window.pageYOffset === pageInfo.currentScrollTop) {
                    console.log('🔄 方法2未生效，尝试方法3');
                    document.body.scrollTop = targetY;
                    console.log('✅ 方法3: body.scrollTop 已执行');
                }
            } catch (error) {
                console.error('❌ 方法3失败:', error);
            }
        }, 200);
        
        // 方法4: scrollBy (增量滚动)
        setTimeout(() => {
            try {
                const currentPos = window.pageYOffset || document.documentElement.scrollTop;
                if (currentPos === pageInfo.currentScrollTop) {
                    console.log('🔄 前面方法都无效，尝试方法4: scrollBy');
                    const delta = direction === 'bottom' ? 
                        pageInfo.bodyHeight : -pageInfo.currentScrollTop;
                    window.scrollBy({ top: delta, behavior: 'smooth' });
                    console.log('✅ 方法4: scrollBy 已执行', delta);
                }
            } catch (error) {
                console.error('❌ 方法4失败:', error);
            }
        }, 300);
    }
    
    /**
     * 显示禁用提示（带防抖）
     * @private
     */
    _showDisabledHintWithCooldown() {
        const now = Date.now();
        if (now - this.lastDisabledHintTime > this.disabledHintCooldown) {
            this.lastDisabledHintTime = now;
            const disabledMsg = this._t('gestureDisabledSidepanel', '鼠标手势功能已禁用（请关闭扩展侧边栏）');
            this._showExecutionHint(disabledMsg, false);
            console.log('💡 显示禁用提示（防抖生效）');
        } else {
            console.log('🔇 跳过禁用提示（防抖冷却中）');
        }
    }
    
    /**
     * 显示执行提示
     * @private
     */
    _showExecutionHint(text, isError = false) {
        if (window.DOMUtils) {
            window.DOMUtils.showMessage(text, isError ? 'error' : 'success', 3000);
        } else {
            // 回退方案
            if (!document.body) return;
            
            let hint = document.getElementById('motion-execution-hint');
            if (!hint) {
                hint = document.createElement('div');
                hint.id = 'motion-execution-hint';
                document.body.appendChild(hint);
            }
            
            hint.textContent = text;
            hint.style.setProperty('position', 'fixed', 'important');
            hint.style.setProperty('top', '50%', 'important');
            hint.style.setProperty('left', '50%', 'important');
            hint.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
            hint.style.setProperty('background', isError ? 'rgba(244, 67, 54, 0.9)' : 'rgba(76, 175, 80, 0.9)', 'important');
            hint.style.setProperty('color', 'white', 'important');
            hint.style.setProperty('padding', '15px 25px', 'important');
            hint.style.setProperty('border-radius', '8px', 'important');
            hint.style.setProperty('z-index', '999999', 'important');
            hint.style.setProperty('display', 'block', 'important');
            
            setTimeout(() => {
                if (hint) {
                    hint.style.setProperty('display', 'none', 'important');
                }
            }, 3000);
        }
    }
}

// 导出类
if (typeof window !== 'undefined') {
    window.MotionTracker = MotionTracker;
}

export default MotionTracker;