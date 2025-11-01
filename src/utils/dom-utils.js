/**
 * DOM操作和样式管理工具
 * 用于统一处理DOM创建、样式设置和z-index管理
 */

class DOMUtils {
    /**
     * 获取动态z-index值，确保元素显示在最顶层
     * @param {string} layer - 层级类型：canvas/hint/cancel/default
     * @returns {number} z-index值
     */
    static getDynamicZIndex(layer = 'default') {
        let maxZ = 999999; // 默认最小值
        
        try {
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
                const z = parseInt(window.getComputedStyle(el).zIndex);
                if (!isNaN(z) && z > maxZ) {
                    maxZ = z;
                }
            });
        } catch (error) {
            console.warn('Failed to calculate max z-index:', error);
        }
        
        // 根据层级返回不同的z-index值
        const layerOffsets = {
            canvas: 1000,    // 轨迹画布最高
            hint: 800,       // 提示信息
            cancel: 600,     // 取消区域
            default: 100     // 默认
        };
        
        const offset = layerOffsets[layer] || layerOffsets.default;
        const maxSafeInt = 2147483647; // 32位整数最大值
        
        return Math.min(maxZ + offset, maxSafeInt);
    }

    /**
     * 创建带有内联样式的元素
     * @param {string} tagName - 元素标签名
     * @param {Object} styles - 样式对象
     * @param {Object} attributes - 属性对象
     * @param {string} innerHTML - 内部HTML
     * @returns {Element} 创建的元素
     */
    static createElement(tagName, styles = {}, attributes = {}, innerHTML = '') {
        const element = document.createElement(tagName);
        
        // 设置属性
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'id') {
                element.id = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // 设置样式
        this.applyStyles(element, styles);
        
        // 设置内容
        if (innerHTML) {
            element.innerHTML = innerHTML;
        }
        
        return element;
    }

    /**
     * 应用样式到元素（支持important标记）
     * @param {Element} element - 目标元素
     * @param {Object} styles - 样式对象
     * @param {boolean} important - 是否使用!important
     */
    static applyStyles(element, styles, important = true) {
        if (!element || !styles) return;
        
        Object.entries(styles).forEach(([property, value]) => {
            try {
                if (important) {
                    element.style.setProperty(property, value, 'important');
                } else {
                    element.style[property] = value;
                }
            } catch (error) {
                console.warn(`Failed to set style ${property}: ${value}`, error);
            }
        });
    }

    /**
     * 显示消息提示
     * @param {string} text - 消息文本
     * @param {string} type - 消息类型：success/error/warning/info
     * @param {number} duration - 显示时间（毫秒）
     * @param {Object} position - 位置配置
     */
    static showMessage(text, type = 'info', duration = 3000, position = { top: '50%', left: '50%' }) {
        // 移除现有消息
        const existingMessage = document.querySelector('.extension-message-toast');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const typeColors = {
            success: 'rgba(76, 175, 80, 0.9)',
            error: 'rgba(244, 67, 54, 0.9)',
            warning: 'rgba(255, 152, 0, 0.9)',
            info: 'rgba(33, 150, 243, 0.9)'
        };
        
        const message = this.createElement('div', {
            position: 'fixed',
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -50%)',
            background: typeColors[type] || typeColors.info,
            color: 'white',
            padding: '12px 20px',
            'border-radius': '6px',
            'font-family': 'Arial, sans-serif',
            'font-size': '14px',
            'font-weight': 'normal',
            'z-index': this.getDynamicZIndex('hint'),
            'text-align': 'center',
            'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'block',
            'max-width': '300px',
            'word-wrap': 'break-word'
        }, {
            className: 'extension-message-toast'
        }, text);
        
        document.body.appendChild(message);
        
        // 自动消失
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, duration);
    }

    /**
     * 安全地获取元素的计算样式
     * @param {Element} element - 目标元素
     * @param {string} property - 样式属性名
     * @returns {string} 样式值
     */
    static getComputedStyle(element, property) {
        if (!element) return '';
        
        try {
            return window.getComputedStyle(element)[property] || '';
        } catch (error) {
            console.warn(`Failed to get computed style ${property}:`, error);
            return '';
        }
    }

    /**
     * 检查元素是否在视窗内可见
     * @param {Element} element - 目标元素
     * @returns {boolean} 是否可见
     */
    static isElementVisible(element) {
        if (!element) return false;
        
        try {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        } catch (error) {
            console.warn('Failed to check element visibility:', error);
            return false;
        }
    }

    /**
     * 安全地移除元素
     * @param {Element|string} elementOrSelector - 元素或选择器
     */
    static safeRemove(elementOrSelector) {
        try {
            let element;
            
            if (typeof elementOrSelector === 'string') {
                element = document.querySelector(elementOrSelector);
            } else {
                element = elementOrSelector;
            }
            
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        } catch (error) {
            console.warn('Failed to remove element:', error);
        }
    }

    /**
     * 等待DOM元素出现
     * @param {string} selector - 元素选择器
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<Element>} 元素Promise
     */
    static waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations) => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 限制时间间隔（毫秒）
     * @returns {Function} 节流后的函数
     */
    static throttle(func, limit = 100) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 导出工具类
if (typeof window !== 'undefined') {
    window.DOMUtils = DOMUtils;
}

export default DOMUtils;