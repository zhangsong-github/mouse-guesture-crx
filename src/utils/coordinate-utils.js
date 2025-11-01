/**
 * 坐标转换和页面缩放处理工具
 * 用于处理不同浏览器和设备下的坐标系统一化
 */

class CoordinateUtils {
    /**
     * 获取真实坐标（考虑页面缩放）
     * @param {number} clientCoord - 客户端坐标
     * @param {string} inputType - 输入类型：mouse/touch/pointer
     * @param {number} devicePixelRatio - 设备像素比
     * @param {number} viewportScale - 视口缩放
     * @returns {number} 真实坐标
     */
    static getRealCoordinate(clientCoord, inputType = 'mouse', devicePixelRatio = 1, viewportScale = 1) {
        if (typeof clientCoord !== 'number') {
            console.warn('Invalid client coordinate:', clientCoord);
            return 0;
        }

        let realCoord = clientCoord;
        
        // 触摸设备需要考虑视口缩放
        if (inputType === 'touch') {
            realCoord = realCoord / viewportScale;
        }
        
        return realCoord;
    }

    /**
     * 获取页面缩放比例
     * @param {Element} bodyElement - body元素
     * @param {Element} htmlElement - html元素
     * @returns {number} 页面缩放比例
     */
    static getPageZoom(bodyElement = document.body, htmlElement = document.documentElement) {
        const bodyZoom = this.getElementZoom(bodyElement);
        const htmlZoom = this.getElementZoom(htmlElement);
        
        let browserZoom = 1;
        if (window.outerWidth && window.innerWidth) {
            browserZoom = window.outerWidth / window.innerWidth;
        }
        
        let cssZoom = 1;
        if (window.visualViewport) {
            cssZoom = window.innerWidth / window.visualViewport.width;
        }
        
        return bodyZoom * htmlZoom * Math.max(browserZoom, cssZoom);
    }

    /**
     * 获取单个元素的缩放比例
     * @param {Element} element - DOM元素
     * @returns {number} 元素缩放比例
     */
    static getElementZoom(element) {
        if (!element) return 1;
        
        const style = window.getComputedStyle(element);
        const zoom = style.zoom;
        const transform = style.transform;
        
        let zoomFactor = 1;
        
        // 处理CSS zoom属性
        if (zoom && zoom !== 'normal' && zoom !== 'auto') {
            const zoomValue = parseFloat(zoom);
            if (!isNaN(zoomValue)) {
                zoomFactor *= zoomValue;
            }
        }
        
        // 处理transform scale
        if (transform && transform !== 'none') {
            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            if (scaleMatch) {
                const scaleValue = parseFloat(scaleMatch[1]);
                if (!isNaN(scaleValue)) {
                    zoomFactor *= scaleValue;
                }
            }
        }
        
        return zoomFactor;
    }

    /**
     * 获取视口缩放比例（移动设备）
     * @returns {number} 视口缩放比例
     */
    static getViewportScale() {
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
     * 获取设备像素比
     * @returns {number} 设备像素比
     */
    static getDevicePixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * 将屏幕坐标转换为画布坐标
     * @param {number} screenX - 屏幕X坐标
     * @param {number} screenY - 屏幕Y坐标
     * @param {Element} canvas - 画布元素
     * @returns {Object} 画布坐标 {x, y}
     */
    static screenToCanvas(screenX, screenY, canvas) {
        if (!canvas) {
            console.warn('Canvas element is required for coordinate conversion');
            return { x: screenX, y: screenY };
        }

        const rect = canvas.getBoundingClientRect();
        return {
            x: screenX - rect.left,
            y: screenY - rect.top
        };
    }

    /**
     * 检查坐标是否在元素边界内
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Element} element - 目标元素
     * @returns {boolean} 是否在边界内
     */
    static isWithinBounds(x, y, element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && 
               y >= rect.top && y <= rect.bottom;
    }

    /**
     * 计算两点间距离
     * @param {number} x1 - 第一点X坐标
     * @param {number} y1 - 第一点Y坐标
     * @param {number} x2 - 第二点X坐标
     * @param {number} y2 - 第二点Y坐标
     * @returns {number} 距离
     */
    static getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// 导出工具类
if (typeof window !== 'undefined') {
    window.CoordinateUtils = CoordinateUtils;
}

export default CoordinateUtils;