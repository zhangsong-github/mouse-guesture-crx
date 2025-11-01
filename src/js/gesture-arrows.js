/**
 * 手势箭头显示工具
 * 将手势模式转换为箭头符号显示
 */

(function() {
    'use strict';
    
    // 箭头映射 - 使用更粗的箭头符号以保持风格一致
    const ARROW_MAP = {
        'L': '⬅',
        'R': '➡',
        'U': '⬆',
        'D': '⬇'
    };
    
    /**
     * 将手势模式转换为箭头符号
     * @param {string} pattern - 手势模式，如 "LR", "UDR"
     * @returns {string} 箭头符号，如 "←→", "↑↓→"
     */
    function getArrowsForPattern(pattern) {
        if (!pattern || typeof pattern !== 'string') {
            return '';
        }
        
        return pattern
            .split('')
            .map(char => ARROW_MAP[char] || char)
            .join('');
    }
    
    /**
     * 将箭头符号转换回手势模式
     * @param {string} arrows - 箭头符号，如 "←→"
     * @returns {string} 手势模式，如 "LR"
     */
    function getPatternForArrows(arrows) {
        if (!arrows || typeof arrows !== 'string') {
            return '';
        }
        
        const reverseMap = {
            '⬅': 'L',
            '➡': 'R',
            '⬆': 'U',
            '⬇': 'D'
        };
        
        return arrows
            .split('')
            .map(char => reverseMap[char] || char)
            .join('');
    }
    
    /**
     * 获取手势的描述性名称
     * @param {string} pattern - 手势模式
     * @returns {string} 描述
     */
    function getPatternDescription(pattern) {
        const descriptions = {
            'L': '向左',
            'R': '向右',
            'U': '向上',
            'D': '向下',
            'LR': '左右',
            'RL': '右左',
            'UD': '上下',
            'DU': '下上',
            'UL': '上左',
            'UR': '上右',
            'DL': '下左',
            'DR': '下右',
            'URD': '上右下',
            'DLU': '下左上',
            'ULD': '上左下',
            'RUL': '右上左'
        };
        
        return descriptions[pattern] || getArrowsForPattern(pattern);
    }
    
    /**
     * 创建手势的可视化元素
     * @param {string} pattern - 手势模式
     * @returns {HTMLElement} 手势视觉元素
     */
    function createGestureVisual(pattern) {
        const container = document.createElement('div');
        container.className = 'gesture-visual';
        
        const arrows = document.createElement('div');
        arrows.className = 'gesture-arrows';
        arrows.textContent = getArrowsForPattern(pattern);
        
        container.appendChild(arrows);
        return container;
    }
    
    // 导出到全局
    window.GestureArrowDisplay = {
        getArrowsForPattern,
        getPatternForArrows,
        getPatternDescription,
        createGestureVisual,
        ARROW_MAP
    };
    
    console.log('Gesture Arrow Display utility loaded');
})();
