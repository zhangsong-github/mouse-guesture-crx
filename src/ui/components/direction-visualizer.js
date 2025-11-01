/**
 * 方向可视化器 - 运动方向的视觉展示工具
 * 重构自原GestureArrowDisplay类，功能更加完善
 */

class DirectionVisualizer {
    // 方向映射
    static DIRECTION_MAP = {
        'U': '↑',
        'D': '↓', 
        'L': '←',
        'R': '→'
    };

    // 方向描述
    static DIRECTION_NAMES = {
        zh: {
            'U': '上',
            'D': '下',
            'L': '左',
            'R': '右'
        },
        en: {
            'U': 'Up',
            'D': 'Down',
            'L': 'Left',
            'R': 'Right'
        }
    };

    // 高级箭头符号
    static ADVANCED_ARROWS = {
        'U': '⬆',
        'D': '⬇',
        'L': '⬅',
        'R': '➡'
    };

    // SVG箭头路径
    static SVG_PATHS = {
        'U': 'M12 4l8 8H4l8-8z',
        'D': 'M12 20l-8-8h16l-8 8z',
        'L': 'M4 12l8-8v16l-8-8z',
        'R': 'M20 12l-8-8v16l8-8z'
    };

    /**
     * 获取单个方向的箭头符号
     * @param {string} direction - 方向字符
     * @param {string} style - 样式类型：'simple'|'advanced'
     * @returns {string} 箭头符号
     */
    static getArrowForDirection(direction, style = 'simple') {
        const map = style === 'advanced' ? this.ADVANCED_ARROWS : this.DIRECTION_MAP;
        return map[direction] || direction;
    }

    /**
     * 获取模式的箭头字符串
     * @param {string} pattern - 运动模式字符串
     * @param {string} style - 样式类型
     * @param {string} separator - 分隔符
     * @returns {string} 箭头字符串
     */
    static getArrowsForPattern(pattern, style = 'simple', separator = ' ') {
        if (!pattern || typeof pattern !== 'string') {
            return '';
        }
        
        return pattern
            .split('')
            .map(dir => this.getArrowForDirection(dir, style))
            .join(separator);
    }

    /**
     * 创建简单的箭头元素
     * @param {string} pattern - 运动模式
     * @param {Object} options - 选项
     * @returns {HTMLElement} 箭头元素
     */
    static createArrowElement(pattern, options = {}) {
        const {
            style = 'simple',
            separator = ' ',
            className = 'direction-arrows',
            fontSize = '16px'
        } = options;

        const span = document.createElement('span');
        span.className = className;
        span.textContent = this.getArrowsForPattern(pattern, style, separator);
        
        if (fontSize) {
            span.style.fontSize = fontSize;
        }
        
        return span;
    }

    /**
     * 创建运动视觉展示组件
     * @param {string} pattern - 运动模式
     * @param {Object} options - 配置选项
     * @returns {HTMLElement} 可视化容器
     */
    static createMotionVisual(pattern, options = {}) {
        const {
            showPattern = true,
            showDescription = true,
            arrowStyle = 'advanced',
            language = 'zh',
            size = 'medium'
        } = options;

        const container = document.createElement('div');
        container.className = `motion-visual motion-visual-${size}`;
        
        // 箭头显示区域
        const arrows = document.createElement('div');
        arrows.className = 'motion-arrows-large';
        arrows.textContent = this.getArrowsForPattern(pattern, arrowStyle);
        
        container.appendChild(arrows);
        
        // 模式文本显示
        if (showPattern) {
            const patternText = document.createElement('div');
            patternText.className = 'motion-pattern-text';
            patternText.textContent = pattern;
            container.appendChild(patternText);
        }
        
        // 描述文本显示
        if (showDescription) {
            const description = document.createElement('div');
            description.className = 'motion-description';
            description.textContent = this.getPatternDescription(pattern, language);
            container.appendChild(description);
        }
        
        return container;
    }

    /**
     * 创建SVG箭头
     * @param {string} direction - 方向
     * @param {Object} options - SVG选项
     * @returns {SVGElement} SVG箭头元素
     */
    static createSVGArrow(direction, options = {}) {
        const {
            size = 24,
            color = '#333',
            strokeWidth = 2
        } = options;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', color);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', this.SVG_PATHS[direction] || this.SVG_PATHS['R']);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', strokeWidth);

        svg.appendChild(path);
        return svg;
    }

    /**
     * 创建运动模式的SVG可视化
     * @param {string} pattern - 运动模式
     * @param {Object} options - 配置选项
     * @returns {HTMLElement} SVG容器
     */
    static createSVGVisualization(pattern, options = {}) {
        const {
            arrowSize = 20,
            spacing = 5,
            color = '#007bff'
        } = options;

        const container = document.createElement('div');
        container.className = 'motion-svg-container';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = `${spacing}px`;

        pattern.split('').forEach((direction, index) => {
            const arrow = this.createSVGArrow(direction, {
                size: arrowSize,
                color: color
            });
            container.appendChild(arrow);
        });

        return container;
    }

    /**
     * 获取模式的描述文本
     * @param {string} pattern - 运动模式
     * @param {string} language - 语言：'zh'|'en'
     * @returns {string} 描述文本
     */
    static getPatternDescription(pattern, language = 'zh') {
        if (!pattern || typeof pattern !== 'string') {
            return '';
        }

        const dict = this.DIRECTION_NAMES[language] || this.DIRECTION_NAMES.zh;
        
        return pattern
            .split('')
            .map(char => dict[char] || char)
            .join(language === 'zh' ? '' : '-');
    }

    /**
     * 创建动画箭头序列
     * @param {string} pattern - 运动模式
     * @param {Object} options - 动画选项
     * @returns {HTMLElement} 动画容器
     */
    static createAnimatedArrows(pattern, options = {}) {
        const {
            duration = 2000,
            delay = 200,
            loop = true
        } = options;

        const container = document.createElement('div');
        container.className = 'motion-animated-arrows';
        container.style.display = 'flex';
        container.style.alignItems = 'center';

        pattern.split('').forEach((direction, index) => {
            const arrow = document.createElement('span');
            arrow.textContent = this.getArrowForDirection(direction, 'advanced');
            arrow.className = 'animated-arrow';
            arrow.style.opacity = '0.3';
            arrow.style.transition = 'opacity 0.3s ease';
            arrow.style.margin = '0 2px';
            arrow.style.fontSize = '20px';

            // 设置动画延迟
            const animationDelay = index * delay;
            
            const animate = () => {
                setTimeout(() => {
                    arrow.style.opacity = '1';
                    setTimeout(() => {
                        arrow.style.opacity = '0.3';
                    }, 300);
                }, animationDelay);
            };

            // 开始动画
            animate();
            
            // 循环动画
            if (loop) {
                setInterval(animate, duration);
            }

            container.appendChild(arrow);
        });

        return container;
    }

    /**
     * 创建运动路径预览
     * @param {string} pattern - 运动模式
     * @param {Object} options - 预览选项
     * @returns {HTMLElement} 路径预览容器
     */
    static createPathPreview(pattern, options = {}) {
        const {
            gridSize = 100,
            pathColor = '#007bff',
            startColor = '#28a745',
            endColor = '#dc3545'
        } = options;

        const container = document.createElement('div');
        container.className = 'motion-path-preview';
        container.style.position = 'relative';
        container.style.width = `${gridSize}px`;
        container.style.height = `${gridSize}px`;
        container.style.border = '1px solid #ddd';
        container.style.background = '#f8f9fa';

        // 绘制路径
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';

        let x = gridSize / 2;
        let y = gridSize / 2;
        const step = gridSize / 6;
        const points = [{ x, y }];

        // 根据模式计算路径点
        pattern.split('').forEach(direction => {
            switch (direction) {
                case 'U': y -= step; break;
                case 'D': y += step; break;
                case 'L': x -= step; break;
                case 'R': x += step; break;
            }
            points.push({ x: Math.max(5, Math.min(gridSize - 5, x)), 
                         y: Math.max(5, Math.min(gridSize - 5, y)) });
        });

        // 绘制路径线
        if (points.length > 1) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = `M ${points[0].x} ${points[0].y} ` + 
                           points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
            
            path.setAttribute('d', pathData);
            path.setAttribute('stroke', pathColor);
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            svg.appendChild(path);
        }

        // 绘制起点
        const startPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startPoint.setAttribute('cx', points[0].x);
        startPoint.setAttribute('cy', points[0].y);
        startPoint.setAttribute('r', '4');
        startPoint.setAttribute('fill', startColor);
        svg.appendChild(startPoint);

        // 绘制终点
        if (points.length > 1) {
            const endPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const lastPoint = points[points.length - 1];
            endPoint.setAttribute('cx', lastPoint.x);
            endPoint.setAttribute('cy', lastPoint.y);
            endPoint.setAttribute('r', '4');
            endPoint.setAttribute('fill', endColor);
            svg.appendChild(endPoint);
        }

        container.appendChild(svg);
        return container;
    }

    /**
     * 验证运动模式格式
     * @param {string} pattern - 运动模式
     * @returns {boolean} 是否有效
     */
    static isValidPattern(pattern) {
        if (!pattern || typeof pattern !== 'string') {
            return false;
        }
        
        const validChars = Object.keys(this.DIRECTION_MAP);
        return pattern.split('').every(char => validChars.includes(char));
    }

    /**
     * 获取模式复杂度评分
     * @param {string} pattern - 运动模式
     * @returns {Object} 复杂度信息
     */
    static getPatternComplexity(pattern) {
        if (!this.isValidPattern(pattern)) {
            return { score: 0, level: 'invalid' };
        }

        const length = pattern.length;
        const uniqueDirections = [...new Set(pattern.split(''))].length;
        const changes = this._countDirectionChanges(pattern);

        let score = length + (uniqueDirections * 2) + changes;
        let level = 'simple';

        if (score >= 8) level = 'complex';
        else if (score >= 5) level = 'medium';

        return {
            score,
            level,
            length,
            uniqueDirections,
            directionChanges: changes
        };
    }

    /**
     * 计算方向变化次数
     * @private
     */
    static _countDirectionChanges(pattern) {
        let changes = 0;
        for (let i = 1; i < pattern.length; i++) {
            if (pattern[i] !== pattern[i - 1]) {
                changes++;
            }
        }
        return changes;
    }

    /**
     * 生成CSS样式
     * @param {Object} options - 样式选项
     * @returns {string} CSS字符串
     */
    static generateCSS(options = {}) {
        const {
            arrowSize = '24px',
            spacing = '4px',
            primaryColor = '#007bff',
            secondaryColor = '#6c757d'
        } = options;

        return `
            .motion-visual {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: ${spacing};
            }
            
            .motion-arrows-large {
                font-size: ${arrowSize};
                font-weight: bold;
                color: ${primaryColor};
                letter-spacing: ${spacing};
            }
            
            .motion-pattern-text {
                font-size: 12px;
                color: ${secondaryColor};
                font-family: monospace;
            }
            
            .motion-description {
                font-size: 11px;
                color: ${secondaryColor};
                text-align: center;
            }
            
            .direction-arrows {
                color: ${primaryColor};
                font-weight: bold;
            }
            
            .animated-arrow {
                transition: all 0.3s ease;
                transform-origin: center;
            }
            
            .animated-arrow:hover {
                transform: scale(1.1);
            }
        `;
    }
}

// 注入样式
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = DirectionVisualizer.generateCSS();
    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(style);
        });
    }
}

// 导出类
if (typeof window !== 'undefined') {
    window.DirectionVisualizer = DirectionVisualizer;
}

export default DirectionVisualizer;