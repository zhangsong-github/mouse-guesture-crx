/**
 * 路径渲染器 - 负责绘制和管理运动轨迹
 * 重构自原TrailCanvas类，职责更加明确
 */

class PathRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.trackingPoints = []; // 原trailPoints
        this.fadeTimer = null;
        this.animationFrame = null;
        this.isActive = false;
        
        // 渲染配置
        this.config = {
            lineWidth: 3,
            strokeStyle: 'rgba(70, 130, 180, 0.8)',
            fadeStep: 0.02,
            backgroundColor: 'transparent'
        };
    }
    
    /**
     * 创建渲染画布
     * @param {Object} options - 配置选项
     */
    create(options = {}) {
        try {
            // 如果已存在画布，先清理
            if (this.canvas) {
                this.destroy();
            }
            
            // 确保body元素存在
            if (!document.body) {
                console.warn('Document body not ready for path renderer');
                return false;
            }
            
            this._resetState();
            this._createCanvas(options);
            this._setupCanvasStyles();
            this._appendToDOM();
            
            this.isActive = true;
            console.log('PathRenderer created successfully');
            return true;
        } catch (error) {
            console.error('Failed to create PathRenderer:', error);
            return false;
        }
    }
    
    /**
     * 重置内部状态
     * @private
     */
    _resetState() {
        this.trackingPoints = [];
        this.isActive = false;
        this._clearTimers();
    }
    
    /**
     * 创建画布元素
     * @private
     */
    _createCanvas(options) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'motion-path-canvas'; // 原gesture-trail-canvas
        
        // 获取画布上下文
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Failed to get canvas 2d context');
        }
        
        // 设置画布绘制属性
        this._setupRenderingContext();
    }
    
    /**
     * 设置渲染上下文属性
     * @private
     */
    _setupRenderingContext() {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = this.config.lineWidth;
        this.ctx.strokeStyle = this.config.strokeStyle;
    }
    
    /**
     * 设置画布样式
     * @private
     */
    _setupCanvasStyles() {
        // 获取页面缩放比例
        const pageZoom = this._getPageZoom();
        
        // 获取动态z-index
        const zIndex = window.DOMUtils ? 
            window.DOMUtils.getDynamicZIndex('canvas') : 2147483647;
        
        // 使用视口的实际可见尺寸，避免sidepanel打开时的宽度偏移问题
        // 优先使用visualViewport，因为它代表真实的可视区域
        const documentWidth = window.visualViewport ? 
            window.visualViewport.width : 
            document.documentElement.clientWidth;
        const documentHeight = window.visualViewport ? 
            window.visualViewport.height : 
            document.documentElement.clientHeight;
        
        console.log('🎨 PathRenderer Canvas Setup:', {
            visualViewportWidth: window.visualViewport?.width,
            documentClientWidth: document.documentElement.clientWidth,
            windowInnerWidth: window.innerWidth,
            chosenWidth: documentWidth,
            chosenHeight: documentHeight
        });
        
        // 设置画布尺寸
        this.canvas.width = documentWidth;
        this.canvas.height = documentHeight;
        
        // 应用CSS样式 - 使用viewport相关单位确保覆盖可见区域
        const styles = {
            position: 'fixed',
            top: '0',
            left: '0',
            width: `${documentWidth}px`,
            height: `${documentHeight}px`,
            'z-index': zIndex,
            background: this.config.backgroundColor,
            'pointer-events': 'none'
        };
        
        // 处理页面缩放
        if (pageZoom !== 1) {
            styles.transform = `scale(${1/pageZoom})`;
            styles['transform-origin'] = '0 0';
        }
        
        if (window.DOMUtils) {
            window.DOMUtils.applyStyles(this.canvas, styles);
        } else {
            // 回退方案
            Object.entries(styles).forEach(([prop, value]) => {
                this.canvas.style.setProperty(prop, value, 'important');
            });
        }
    }
    
    /**
     * 将画布添加到DOM
     * @private
     */
    _appendToDOM() {
        document.body.appendChild(this.canvas);
        
        // 添加窗口resize监听器以处理布局变化
        this._setupResizeHandler();
    }
    
    /**
     * 设置resize事件处理
     * @private
     */
    _setupResizeHandler() {
        this._resizeHandler = () => {
            if (this.canvas && this.isActive) {
                // 延迟执行，避免频繁重绘
                clearTimeout(this._resizeTimeout);
                this._resizeTimeout = setTimeout(() => {
                    this._updateCanvasSize();
                }, 100);
            }
        };
        
        window.addEventListener('resize', this._resizeHandler);
        // 监听侧边栏或开发工具的变化
        window.addEventListener('orientationchange', this._resizeHandler);
    }
    
    /**
     * 更新画布尺寸
     * @private
     */
    _updateCanvasSize() {
        if (!this.canvas) return;
        
        // 使用视口的实际可见尺寸，避免sidepanel打开时的宽度偏移问题
        const documentWidth = window.visualViewport ? 
            window.visualViewport.width : 
            document.documentElement.clientWidth;
        const documentHeight = window.visualViewport ? 
            window.visualViewport.height : 
            document.documentElement.clientHeight;
        
        // 只有尺寸真正改变时才更新
        if (this.canvas.width !== documentWidth || this.canvas.height !== documentHeight) {
            this.canvas.width = documentWidth;
            this.canvas.height = documentHeight;
            this.canvas.style.width = `${documentWidth}px`;
            this.canvas.style.height = `${documentHeight}px`;
            
            // 重新设置绘制属性
            this._setupRenderingContext();
            
            // 如果有轨迹正在显示，重新绘制
            if (this.trackingPoints.length > 0) {
                this._redrawPath();
            }
        }
    }
    
    /**
     * 重新绘制路径（当canvas尺寸变化时）
     * @private
     */
    _redrawPath() {
        if (!this.ctx || !this.isActive || this.trackingPoints.length === 0) {
            return;
        }
        
        console.log('PathRenderer: redrawing path with', this.trackingPoints.length, 'points');
        this.renderPath();
    }
    
    /**
     * 获取页面缩放比例
     * @private
     */
    _getPageZoom() {
        if (window.CoordinateUtils) {
            return window.CoordinateUtils.getPageZoom();
        }
        
        // 回退方案
        const bodyZoom = window.getComputedStyle(document.body).zoom || '1';
        const htmlZoom = window.getComputedStyle(document.documentElement).zoom || '1';
        return parseFloat(bodyZoom) * parseFloat(htmlZoom);
    }
    
    /**
     * 添加轨迹点
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Object} options - 点的额外属性
     */
    addPoint(x, y, options = {}) {
        if (!this.isActive || !this.ctx) {
            console.log('PathRenderer: addPoint called but renderer not active');
            return;
        }
        
        console.log('🎯 PathRenderer addPoint:', {
            x, y,
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            visualViewportWidth: window.visualViewport?.width,
            windowInnerWidth: window.innerWidth
        });
        
        const point = {
            x: x,
            y: y,
            timestamp: Date.now(),
            alpha: 1.0,
            ...options
        };
        
        // 添加插值点以平滑轨迹
        this._addInterpolatedPoints(point);
        
        this.trackingPoints.push(point);
        this.renderPath();
    }
    
    /**
     * 添加插值点以平滑轨迹
     * @private
     */
    _addInterpolatedPoints(newPoint) {
        if (this.trackingPoints.length === 0) return;
        
        const lastPoint = this.trackingPoints[this.trackingPoints.length - 1];
        const distance = window.CoordinateUtils ? 
            window.CoordinateUtils.getDistance(newPoint.x, newPoint.y, lastPoint.x, lastPoint.y) :
            Math.sqrt(Math.pow(newPoint.x - lastPoint.x, 2) + Math.pow(newPoint.y - lastPoint.y, 2));
        
        // 如果距离较大，添加插值点
        if (distance > 10) {
            const steps = Math.floor(distance / 5);
            for (let i = 1; i < steps; i++) {
                const ratio = i / steps;
                const interpPoint = {
                    x: lastPoint.x + (newPoint.x - lastPoint.x) * ratio,
                    y: lastPoint.y + (newPoint.y - lastPoint.y) * ratio,
                    timestamp: Date.now(),
                    alpha: 1.0
                };
                this.trackingPoints.push(interpPoint);
            }
        }
    }
    
    /**
     * 渲染路径
     */
    renderPath() {
        if (!this.ctx || !this.isActive) return;
        
        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.trackingPoints.length < 2) return;
        
        this._drawPath();
    }
    
    /**
     * 绘制路径
     * @private
     */
    _drawPath() {
        this.ctx.strokeStyle = this.config.strokeStyle;
        this.ctx.lineWidth = this.config.lineWidth;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.trackingPoints[0].x, this.trackingPoints[0].y);
        
        for (let i = 1; i < this.trackingPoints.length; i++) {
            this.ctx.lineTo(this.trackingPoints[i].x, this.trackingPoints[i].y);
        }
        
        this.ctx.stroke();
    }
    
    /**
     * 开始淡出动画
     */
    startFadeOut() {
        if (!this.isActive) return;
        
        this._fadeStep();
    }
    
    /**
     * 淡出动画步骤
     * @private
     */
    _fadeStep() {
        if (!this.ctx || !this.isActive) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        let hasVisiblePoints = false;
        
        // 降低所有点的透明度
        for (let i = 0; i < this.trackingPoints.length; i++) {
            this.trackingPoints[i].alpha -= this.config.fadeStep;
            if (this.trackingPoints[i].alpha > 0) {
                hasVisiblePoints = true;
            }
        }
        
        // 如果还有可见点，继续绘制
        if (hasVisiblePoints && this.trackingPoints.length >= 2) {
            this._drawFadingPath();
            this.animationFrame = requestAnimationFrame(() => this._fadeStep());
        } else {
            this.destroy();
        }
    }
    
    /**
     * 绘制淡出中的路径
     * @private
     */
    _drawFadingPath() {
        const maxAlpha = Math.max(...this.trackingPoints.map(p => p.alpha));
        if (maxAlpha <= 0) return;
        
        // 使用最大透明度绘制整条路径
        const rgba = this.config.strokeStyle.replace('0.8)', `${maxAlpha})`);
        this.ctx.strokeStyle = rgba;
        this.ctx.lineWidth = this.config.lineWidth;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.trackingPoints[0].x, this.trackingPoints[0].y);
        
        for (let i = 1; i < this.trackingPoints.length; i++) {
            this.ctx.lineTo(this.trackingPoints[i].x, this.trackingPoints[i].y);
        }
        
        this.ctx.stroke();
    }
    
    /**
     * 清除定时器
     * @private
     */
    _clearTimers() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.fadeTimer) {
            clearTimeout(this.fadeTimer);
            this.fadeTimer = null;
        }
    }
    
    /**
     * 销毁渲染器
     */
    destroy() {
        console.log('PathRenderer: destroy called');
        
        // 立即设置为非活动状态
        this.isActive = false;
        
        // 清除所有定时器
        this._clearTimers();
        
        // 移除事件监听器
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            window.removeEventListener('orientationchange', this._resizeHandler);
            this._resizeHandler = null;
        }
        
        // 清除resize延时
        if (this._resizeTimeout) {
            clearTimeout(this._resizeTimeout);
            this._resizeTimeout = null;
        }
        
        // 移除画布元素
        if (this.canvas && this.canvas.parentNode) {
            console.log('PathRenderer: removing canvas from DOM');
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // 重置所有属性
        this.canvas = null;
        this.ctx = null;
        this.trackingPoints = [];
        
        console.log('PathRenderer: destroyed completely');
    }
    
    /**
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.ctx) {
            this._setupRenderingContext();
        }
    }
    
    /**
     * 获取当前状态
     * @returns {Object} 当前状态信息
     */
    getStatus() {
        return {
            isActive: this.isActive,
            pointCount: this.trackingPoints.length,
            canvasSize: this.canvas ? {
                width: this.canvas.width,
                height: this.canvas.height
            } : null,
            config: { ...this.config }
        };
    }
    
    /**
     * 清除轨迹（不销毁渲染器）
     */
    clear() {
        this.trackingPoints = [];
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// 导出类
if (typeof window !== 'undefined') {
    window.PathRenderer = PathRenderer;
}

export default PathRenderer;