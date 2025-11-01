/**
 * 内容脚本主文件 - 运动追踪扩展
 * 重构后的入口文件，使用模块化架构
 */

console.log('运动追踪扩展内容脚本加载中...', {
    url: window.location.href,
    isMainFrame: window.self === window.top,
    timestamp: new Date().toISOString()
});

// 全局变量声明
let motionTracker = null;

/**
 * 初始化运动追踪器
 */
function initializeMotionTracker() {
    console.log('initializeMotionTracker called', {
        readyState: document.readyState,
        url: window.location.href,
        isMainFrame: window.self === window.top
    });
    
    // 首先注入样式
    injectStyles();
    
    if (!motionTracker) {
        // 检查依赖是否加载
        if (!window.MotionTracker) {
            console.error('MotionTracker class not found. Please check if core modules are loaded.');
            return;
        }
        
        try {
            motionTracker = new window.MotionTracker();
            console.log('运动追踪器已创建 - 新架构版本');
        } catch (error) {
            console.error('运动追踪器创建失败:', error);
        }
    }
}

/**
 * 注入CSS样式
 */
function injectStyles() {
    // 检查是否已经注入过样式
    if (document.getElementById('motion-extension-styles')) {
        console.log('Styles already injected');
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'motion-extension-styles';
    style.textContent = `
        .motion-tracking-hint {
            position: fixed !important;
            top: 30% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: rgba(0, 0, 0, 0.8) !important;
            color: white !important;
            padding: 15px 25px !important;
            border-radius: 10px !important;
            font-family: Arial, sans-serif !important;
            font-size: 16px !important;
            z-index: 999998 !important;
            text-align: center !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            display: none !important;
            pointer-events: none !important;
        }
        
        .motion-pattern {
            font-size: 24px !important;
            font-weight: bold !important;
            margin-bottom: 5px !important;
            color: #4CAF50 !important;
        }
        
        .motion-label {
            font-size: 12px !important;
            opacity: 0.8 !important;
        }
        
        .motion-cancel-zone {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            border: 3px solid rgba(255, 0, 0, 0.5) !important;
            box-sizing: border-box !important;
            pointer-events: none !important;
            z-index: 999997 !important;
            background: rgba(255, 0, 0, 0.05) !important;
            display: none !important;
            justify-content: center !important;
            align-items: center !important;
        }
        
        .motion-cancel-zone::after {
            content: "拖动到页面边缘取消运动" !important;
            background: rgba(255, 255, 255, 0.9) !important;
            color: #d32f2f !important;
            padding: 8px 16px !important;
            border-radius: 20px !important;
            font-size: 14px !important;
            font-weight: bold !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
        }
        
        .motion-execution-hint {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: rgba(76, 175, 80, 0.9) !important;
            color: white !important;
            padding: 15px 25px !important;
            border-radius: 8px !important;
            font-family: Arial, sans-serif !important;
            font-size: 16px !important;
            font-weight: bold !important;
            z-index: 999999 !important;
            pointer-events: none !important;
            text-align: center !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            display: none !important;
        }
        
        .motion-execution-hint.error {
            background: rgba(244, 67, 54, 0.9) !important;
        }

        /* 扩展消息提示样式 */
        .extension-message-toast {
            position: fixed !important;
            z-index: 999999 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-weight: normal !important;
            line-height: 1.4 !important;
            box-sizing: border-box !important;
            border: none !important;
            outline: none !important;
            user-select: none !important;
            pointer-events: none !important;
        }

        /* 运动视觉组件样式 */
        .motion-visual {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 4px !important;
        }
        
        .motion-visual-small .motion-arrows-large { font-size: 16px !important; }
        .motion-visual-medium .motion-arrows-large { font-size: 20px !important; }
        .motion-visual-large .motion-arrows-large { font-size: 24px !important; }
        
        .motion-arrows-large {
            font-weight: bold !important;
            color: #007bff !important;
            letter-spacing: 2px !important;
        }
        
        .motion-pattern-text {
            font-size: 11px !important;
            color: #6c757d !important;
            font-family: monospace !important;
        }
        
        .motion-description {
            font-size: 10px !important;
            color: #6c757d !important;
            text-align: center !important;
        }
    `;

    if (document.head) {
        document.head.appendChild(style);
        console.log('Styles injected successfully');
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.head) {
                document.head.appendChild(style);
                console.log('Styles injected after DOMContentLoaded');
            }
        });
    }
}

/**
 * 添加调试测试函数
 */
function addDebugFunctions() {
    // 测试运动UI元素
    window.testMotionUI = function() {
        console.log('Testing motion UI elements...');
        
        if (!motionTracker) {
            console.error('Motion tracker not initialized');
            return;
        }
        
        // 测试显示运动提示
        console.log('Testing motion hint...');
        motionTracker.motionPattern = 'LRU';
        motionTracker._showTrackingHint();
        
        // 测试显示取消区域
        console.log('Testing cancel zone...');
        motionTracker._showCancelZone();
        
        // 3秒后自动隐藏
        setTimeout(() => {
            console.log('Hiding test elements...');
            motionTracker._hideTrackingHint();
            motionTracker._hideCancelZone();
            motionTracker.motionPattern = '';
        }, 3000);
        
        console.log('Test elements should now be visible for 3 seconds');
    };

    // 测试页面缩放效果
    window.testPageZoom = function() {
        console.log('Testing page zoom effects...');
        
        const originalZoom = document.body.style.zoom || '1';
        const zoomLevels = ['0.5', '0.8', '1.2', '1.5'];
        let currentIndex = 0;
        
        const testNextZoom = () => {
            if (currentIndex < zoomLevels.length) {
                const zoom = zoomLevels[currentIndex];
                console.log(`Setting page zoom to ${zoom}`);
                document.body.style.zoom = zoom;
                
                if (motionTracker) {
                    motionTracker._showCancelZone();
                    motionTracker._showTrackingHint();
                    
                    console.log(`Window size: ${window.innerWidth}x${window.innerHeight}`);
                    console.log(`Page zoom: ${zoom}`);
                    console.log('Zone should cover entire window regardless of zoom');
                }
                
                setTimeout(() => {
                    if (motionTracker) {
                        motionTracker._hideTrackingHint();
                        motionTracker._hideCancelZone();
                    }
                    currentIndex++;
                    setTimeout(testNextZoom, 1000);
                }, 3000);
            } else {
                document.body.style.zoom = originalZoom;
                console.log('Page zoom test completed');
            }
        };
        
        testNextZoom();
    };

    // 显示扩展状态
    window.getExtensionStatus = function() {
        if (!motionTracker) {
            console.log('Motion tracker not initialized');
            return null;
        }
        
        const status = {
            isRecording: motionTracker.isRecording,
            motionPattern: motionTracker.motionPattern,
            settings: motionTracker.settings,
            pathRenderer: motionTracker.pathRenderer ? 
                motionTracker.pathRenderer.getStatus() : null,
            inputManager: motionTracker.inputManager ? 
                motionTracker.inputManager.getDebugInfo() : null
        };
        
        console.log('Extension Status:', status);
        return status;
    };

    console.log('Debug functions added to window object');
}

/**
 * 检查依赖加载情况
 */
function checkDependencies() {
    const requiredClasses = [
        'MotionTracker',
        'PathRenderer', 
        'UnifiedInputManager',
        'DirectionVisualizer',
        'CoordinateUtils',
        'DOMUtils',
        'MessageUtils',
        'PatternAnalyzer'
    ];
    
    const missing = requiredClasses.filter(className => !window[className]);
    
    if (missing.length > 0) {
        console.warn('Missing dependencies:', missing);
        console.warn('Extension may not work properly without these modules');
    } else {
        console.log('All dependencies loaded successfully');
    }
    
    return missing.length === 0;
}

/**
 * 主初始化流程
 */
function main() {
    console.log('运动追踪扩展主初始化开始');
    
    // 检查依赖
    const dependenciesLoaded = checkDependencies();
    
    if (!dependenciesLoaded) {
        console.warn('Proceeding with partial functionality due to missing dependencies');
    }
    
    // 注入样式
    injectStyles();
    
    // 添加调试函数
    addDebugFunctions();
    
    // 等待DOM就绪
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMotionTracker);
    } else {
        initializeMotionTracker();
    }
    
    console.log('运动追踪扩展主初始化完成');
}

// 立即执行主函数
main();

/**
 * 兼容性处理 - 为旧代码提供过渡支持
 */
if (typeof window !== 'undefined') {
    // 为了向后兼容，保留一些旧的全局变量引用
    window.motionTracker = motionTracker;
    
    // 提供旧API的映射
    window.gestureDetector = motionTracker; // 旧变量名映射
    
    console.log('Compatibility layer initialized');
}