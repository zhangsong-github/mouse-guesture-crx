/**
 * 统一输入管理器 - 跨平台事件处理
 * 重构自原CrossPlatformEventHandler，提供更清晰的API
 */

class UnifiedInputManager {
    constructor() {
        this.platform = this._detectPlatform();
        this.inputType = this._detectInputType();
        this.touchSupported = 'ontouchstart' in window;
        this.pointerSupported = 'onpointerdown' in window;
        
        // 事件配置
        this.eventConfig = this._buildEventConfig();
        this.activeConfig = this._getActiveConfig();
        
        console.log(`UnifiedInputManager initialized:`, {
            platform: this.platform,
            inputType: this.inputType,
            config: this.activeConfig
        });
    }
    
    /**
     * 检测运行平台
     * @private
     */
    _detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        if (/mac|darwin/.test(platform) || /mac os/.test(userAgent)) {
            return 'mac';
        } else if (/win/.test(platform)) {
            return 'windows';
        } else if (/linux/.test(platform)) {
            return 'linux';
        } else if (/android/.test(userAgent)) {
            return 'android';
        } else if (/iphone|ipad|ipod/.test(userAgent)) {
            return 'ios';
        }
        return 'unknown';
    }
    
    /**
     * 检测输入设备类型
     * @private
     */
    _detectInputType() {
        if (this.touchSupported && this._isMobileDevice()) {
            return 'touch';
        } else if (this.pointerSupported) {
            return 'pointer';
        } else {
            return 'mouse';
        }
    }
    
    /**
     * 检测是否为移动设备
     * @private
     */
    _isMobileDevice() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (this.platform === 'android' || this.platform === 'ios');
    }
    
    /**
     * 构建事件配置
     * @private
     */
    _buildEventConfig() {
        return {
            windows: {
                startEvents: ['mousedown'],
                moveEvents: ['mousemove'],
                endEvents: ['mouseup'],
                contextEvents: ['contextmenu'],
                button: 2, // 右键
                preventContext: true
            },
            mac: {
                startEvents: ['mousedown'],
                moveEvents: ['mousemove'], 
                endEvents: ['mouseup'],
                contextEvents: ['contextmenu'],
                button: [0, 2], // 左键+Ctrl 或 右键
                preventContext: true,
                modifierKey: 'ctrlKey'
            },
            mobile: {
                startEvents: ['touchstart'],
                moveEvents: ['touchmove'],
                endEvents: ['touchend', 'touchcancel'],
                contextEvents: [],
                preventContext: false,
                longPressDelay: 500
            },
            pointer: {
                startEvents: ['pointerdown'],
                moveEvents: ['pointermove'],
                endEvents: ['pointerup', 'pointercancel'],
                contextEvents: ['contextmenu'],
                button: 2,
                preventContext: true
            }
        };
    }
    
    /**
     * 获取当前活动配置
     * @private
     */
    _getActiveConfig() {
        if (this.inputType === 'touch') {
            return this.eventConfig.mobile;
        } else if (this.inputType === 'pointer') {
            return this.eventConfig.pointer;
        } else if (this.platform === 'mac') {
            return this.eventConfig.mac;
        } else {
            return this.eventConfig.windows;
        }
    }
    
    /**
     * 添加事件监听器
     * @param {Element} element - 目标元素
     * @param {Object} eventHandler - 事件处理器对象
     */
    addEventListener(element, eventHandler) {
        if (!element || !eventHandler) {
            throw new Error('Element and event handler are required');
        }
        
        const config = this.activeConfig;
        
        // 添加开始事件监听器
        this._addEventListeners(config.startEvents, element, (event) => {
            this._handleStart(event, eventHandler);
        });
        
        // 添加移动事件监听器（在document层面捕获）
        this._addEventListeners(config.moveEvents, document, (event) => {
            this._handleMove(event, eventHandler);
        });
        
        // 添加备用移动监听器（在window层面）
        this._addEventListeners(config.moveEvents, window, (event) => {
            this._handleMove(event, eventHandler);
        });
        
        // 添加结束事件监听器
        this._addEventListeners(config.endEvents, document, (event) => {
            this._handleEnd(event, eventHandler);
        });
        
        this._addEventListeners(config.endEvents, window, (event) => {
            this._handleEnd(event, eventHandler);
        });
        
        // 添加右键菜单阻止监听器
        if (config.contextEvents.length > 0) {
            this._addEventListeners(config.contextEvents, element, (event) => {
                this._handleContextMenu(event, eventHandler);
            });
        }
        
        // 安卓平台特殊处理
        if (this.platform === 'android') {
            this._addAndroidSpecificListeners(eventHandler);
        }
    }
    
    /**
     * 添加事件监听器的通用方法
     * @private
     */
    _addEventListeners(eventTypes, target, handler) {
        eventTypes.forEach(eventType => {
            target.addEventListener(eventType, handler, { 
                passive: false, 
                capture: true 
            });
        });
    }
    
    /**
     * 安卓平台特殊事件监听器
     * @private
     */
    _addAndroidSpecificListeners(eventHandler) {
        // 监听滚动事件，防止滚动打断手势
        document.addEventListener('scroll', (event) => {
            if (eventHandler.isRecording) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, { passive: false, capture: true });
        
        // 监听触摸取消事件
        document.addEventListener('touchcancel', (event) => {
            if (eventHandler.isRecording) {
                console.log('Touch cancelled, attempting to continue tracking');
                this._handleTouchCancel(event, eventHandler);
            }
        }, { passive: false, capture: true });
        
        // 监听页面失焦
        window.addEventListener('blur', (event) => {
            if (eventHandler.isRecording) {
                console.log('Page blur during tracking, maintaining state');
            }
        }, { passive: true });
        
        // 处理交互元素
        this._handleInteractiveElements(eventHandler);
    }
    
    /**
     * 处理交互元素事件
     * @private
     */
    _handleInteractiveElements(eventHandler) {
        const interactiveSelectors = 'input, button, select, textarea, a, [onclick], [ontouchstart]';
        
        const handleInteractiveEvent = (event) => {
            if (eventHandler.isRecording) {
                event.preventDefault();
                event.stopPropagation();
                console.log('Prevented interactive element from interrupting tracking');
            }
        };
        
        // 处理现有元素
        document.querySelectorAll(interactiveSelectors).forEach(element => {
            element.addEventListener('touchstart', handleInteractiveEvent, { passive: false, capture: true });
            element.addEventListener('touchmove', handleInteractiveEvent, { passive: false, capture: true });
        });
        
        // 监听新增元素
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const elements = node.querySelectorAll(interactiveSelectors);
                            elements.forEach(element => {
                                element.addEventListener('touchstart', handleInteractiveEvent, { passive: false, capture: true });
                                element.addEventListener('touchmove', handleInteractiveEvent, { passive: false, capture: true });
                            });
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * 处理触摸取消事件
     * @private
     */
    _handleTouchCancel(event, eventHandler) {
        // 给一个短暂的恢复期
        setTimeout(() => {
            if (eventHandler.isRecording) {
                const coords = this._getEventCoordinates(event);
                const unifiedEvent = this._createUnifiedEvent('end', coords, event);
                eventHandler.handleTrackingEnd(unifiedEvent); // 重命名后的方法
            }
        }, 100);
    }
    
    /**
     * 处理开始事件
     * @private
     */
    _handleStart(event, eventHandler) {
        console.log('🐭 _handleStart called:', {
            type: event.type,
            button: event.button,
            target: event.target.tagName,
            valid: this._isValidStartEvent(event)
        });
        
        if (!this._isValidStartEvent(event)) {
            console.log('🚫 Start event not valid, skipping');
            return;
        }
        
        const coords = this._getEventCoordinates(event);
        if (!coords) {
            console.log('🚫 No coordinates found, skipping');
            return;
        }
        
        console.log('✅ Calling handleTrackingStart');
        const unifiedEvent = this._createUnifiedEvent('start', coords, event);
        eventHandler.handleTrackingStart(unifiedEvent); // 重命名后的方法
        
        if (this._shouldPreventDefault(event)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
    
    /**
     * 处理移动事件
     * @private
     */
    _handleMove(event, eventHandler) {
        const coords = this._getEventCoordinates(event);
        if (!coords) return;
        
        const unifiedEvent = this._createUnifiedEvent('move', coords, event);
        // console.log('🐭 _handleMove calling handleTrackingMove, isRecording:', eventHandler.isRecording);
        eventHandler.handleTrackingMove(unifiedEvent); // 重命名后的方法
        
        if (eventHandler.isRecording && this._shouldPreventDefault(event)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
    
    /**
     * 处理结束事件
     * @private
     */
    _handleEnd(event, eventHandler) {
        const coords = this._getEventCoordinates(event);
        const unifiedEvent = this._createUnifiedEvent('end', coords, event);
        
        eventHandler.handleTrackingEnd(unifiedEvent); // 重命名后的方法
        
        if (this._shouldPreventDefault(event)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
    
    /**
     * 处理右键菜单事件
     * @private
     */
    _handleContextMenu(event, eventHandler) {
        if (eventHandler.isRecording || eventHandler.shouldPreventContextMenu()) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
    
    /**
     * 创建统一事件对象
     * @private
     */
    _createUnifiedEvent(type, coords, originalEvent) {
        return {
            type: type,
            x: coords ? coords.x : 0,
            y: coords ? coords.y : 0,
            clientX: coords ? coords.clientX : 0,
            clientY: coords ? coords.clientY : 0,
            originalEvent: originalEvent,
            platform: this.platform,
            inputType: this.inputType
        };
    }
    
    /**
     * 验证是否为有效的开始事件
     * @private
     */
    _isValidStartEvent(event) {
        const config = this.activeConfig;
        
        console.log('🔍 _isValidStartEvent check:', {
            inputType: this.inputType,
            platform: this.platform,
            button: event.button,
            expectedButton: config.button,
            touches: event.touches?.length,
            ctrlKey: event.ctrlKey
        });
        
        if (this.inputType === 'touch') {
            const valid = event.touches && event.touches.length === 1;
            console.log('📱 Touch validation:', valid);
            return valid;
        } else if (this.inputType === 'pointer') {
            const valid = event.button === config.button;
            console.log('👆 Pointer validation:', valid, `(expected: ${config.button}, actual: ${event.button})`);
            return valid;
        } else {
            let valid;
            if (this.platform === 'mac') {
                valid = (event.button === 2) || (event.button === 0 && event.ctrlKey);
                console.log('🍎 Mac validation:', valid, `(button: ${event.button}, ctrlKey: ${event.ctrlKey})`);
            } else {
                // 临时修改：允许右键(2)，也允许中键(1)用于测试
                valid = event.button === 2 || event.button === 1;
                console.log('🖱️ Non-Mac validation:', valid, `(button: ${event.button}, expected: 2 or 1)`);
            }
            return valid;
        }
    }
    
    /**
     * 获取事件坐标
     * @private
     */
    _getEventCoordinates(event) {
        let coords = null;
        
        if (this.inputType === 'touch') {
            if (event.touches && event.touches.length > 0) {
                const touch = event.touches[0];
                coords = {
                    x: touch.pageX,
                    y: touch.pageY,
                    clientX: touch.clientX,
                    clientY: touch.clientY
                };
            } else if (event.changedTouches && event.changedTouches.length > 0) {
                const touch = event.changedTouches[0];
                coords = {
                    x: touch.pageX,
                    y: touch.pageY,
                    clientX: touch.clientX,
                    clientY: touch.clientY
                };
            }
        } else {
            coords = {
                x: event.pageX || event.clientX,
                y: event.pageY || event.clientY,
                clientX: event.clientX,
                clientY: event.clientY
            };
        }
        
        if (coords) {
            console.log('🖱️ InputManager coords:', {
                clientX: coords.clientX,
                clientY: coords.clientY,
                pageX: coords.x,
                pageY: coords.y,
                visualViewportWidth: window.visualViewport?.width,
                windowInnerWidth: window.innerWidth,
                documentClientWidth: document.documentElement.clientWidth
            });
        }
        
        return coords;
    }
    
    /**
     * 判断是否应该阻止默认行为
     * @private
     */
    _shouldPreventDefault(event) {
        const config = this.activeConfig;
        
        if (this.inputType === 'touch') {
            return true; // 移动设备：防止滚动和缩放
        } else if (this.platform === 'mac' && event.ctrlKey) {
            return true; // Mac的Ctrl+点击：防止右键菜单
        } else {
            return config.preventContext;
        }
    }
    
    /**
     * 获取设备像素比
     */
    getDevicePixelRatio() {
        return window.devicePixelRatio || 1;
    }
    
    /**
     * 获取视口缩放比例
     */
    getViewportScale() {
        if (this.inputType === 'touch') {
            return this._getViewportZoom();
        }
        return 1;
    }
    
    /**
     * 获取视口缩放
     * @private
     */
    _getViewportZoom() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            const content = viewport.getAttribute('content');
            const scaleMatch = content.match(/initial-scale=([0-9.]+)/);
            if (scaleMatch) {
                return parseFloat(scaleMatch[1]);
            }
        }
        return 1;
    }
    
    /**
     * 获取调试信息
     */
    getDebugInfo() {
        return {
            platform: this.platform,
            inputType: this.inputType,
            touchSupported: this.touchSupported,
            pointerSupported: this.pointerSupported,
            devicePixelRatio: this.getDevicePixelRatio(),
            viewportScale: this.getViewportScale(),
            userAgent: navigator.userAgent,
            activeConfig: this.activeConfig
        };
    }
    
    /**
     * 移除事件监听器
     * @param {Element} element - 目标元素
     */
    removeEventListeners(element) {
        // 注意：这是一个简化的实现
        // 在实际使用中，应该保存监听器引用以便正确移除
        console.warn('removeEventListeners is a simplified implementation');
    }
    
    /**
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        this.eventConfig = { ...this.eventConfig, ...newConfig };
        this.activeConfig = this._getActiveConfig();
    }
}

// 导出类
if (typeof window !== 'undefined') {
    window.UnifiedInputManager = UnifiedInputManager;
}

export default UnifiedInputManager;