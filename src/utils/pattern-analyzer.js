/**
 * 运动模式识别和分析工具
 * 用于分析用户输入轨迹并识别运动模式
 */

class PatternAnalyzer {
    // 方向常量
    static DIRECTIONS = {
        UP: 'U',
        DOWN: 'D', 
        LEFT: 'L',
        RIGHT: 'R'
    };

    // 配置参数
    static CONFIG = {
        MIN_DISTANCE: 30,          // 最小识别距离
        MIN_PATH_LENGTH: 5,        // 最小路径点数
        SAMPLE_RATE_FACTOR: 20,    // 采样率因子
        DIRECTION_THRESHOLD: 1,    // 方向重复阈值
        ANGLE_ZONES: {             // 角度区间
            RIGHT: [-45, 45],
            DOWN: [45, 135],
            LEFT: [135, -135],
            UP: [-135, -45]
        }
    };

    /**
     * 分析轨迹数据并识别模式
     * @param {Array} pathData - 轨迹点数组，每个点包含{x, y, timestamp}
     * @param {Object} options - 配置选项
     * @returns {string|null} 识别的模式字符串
     */
    static analyzePattern(pathData, options = {}) {
        if (!Array.isArray(pathData) || pathData.length < this.CONFIG.MIN_PATH_LENGTH) {
            console.warn('路径数据不足，无法识别模式');
            return null;
        }

        const config = { ...this.CONFIG, ...options };
        
        try {
            // 提取方向序列
            const directions = this.extractDirections(pathData, config);
            
            if (directions.length === 0) {
                console.warn('未检测到有效方向');
                return null;
            }

            // 清理和优化方向序列
            const cleanedDirections = this.cleanDirections(directions);
            
            // 构建模式字符串
            const pattern = cleanedDirections.join('');
            
            console.log('模式识别结果:', {
                原始路径点数: pathData.length,
                识别方向: directions,
                清理后: cleanedDirections,
                最终模式: pattern
            });
            
            return pattern.length > 0 ? pattern : null;
        } catch (error) {
            console.error('模式分析出错:', error);
            return null;
        }
    }

    /**
     * 从轨迹数据中提取方向序列
     * @param {Array} pathData - 轨迹点数组
     * @param {Object} config - 配置参数
     * @returns {Array} 方向字符串数组
     */
    static extractDirections(pathData, config) {
        const directions = [];
        let lastDirection = null;
        
        // 计算采样率：每隔几个点分析一次以减少噪声
        const sampleRate = Math.max(1, Math.floor(pathData.length / config.SAMPLE_RATE_FACTOR));
        
        for (let i = 0; i < pathData.length - sampleRate; i += sampleRate) {
            const current = pathData[i];
            const next = pathData[i + sampleRate];
            
            if (!current || !next) continue;
            
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 距离太小则跳过
            if (distance < config.MIN_DISTANCE) continue;
            
            // 根据角度确定方向
            const direction = this.angleToDirection(Math.atan2(dy, dx));
            
            // 只记录方向变化
            if (direction !== lastDirection) {
                directions.push(direction);
                lastDirection = direction;
            }
        }
        
        return directions;
    }

    /**
     * 角度转换为方向
     * @param {number} angle - 角度（弧度）
     * @returns {string} 方向字符
     */
    static angleToDirection(angle) {
        // 将弧度转换为角度
        const degrees = angle * 180 / Math.PI;
        
        // 根据角度范围确定方向
        if (degrees >= -45 && degrees < 45) {
            return this.DIRECTIONS.RIGHT;
        } else if (degrees >= 45 && degrees < 135) {
            return this.DIRECTIONS.DOWN;
        } else if (degrees >= 135 || degrees < -135) {
            return this.DIRECTIONS.LEFT;
        } else {
            return this.DIRECTIONS.UP;
        }
    }

    /**
     * 清理方向序列，去除噪声和重复
     * @param {Array} directions - 原始方向数组
     * @returns {Array} 清理后的方向数组
     */
    static cleanDirections(directions) {
        if (directions.length === 0) return [];
        
        const cleaned = [];
        let currentDirection = directions[0];
        let count = 1;
        
        // 合并相邻相同方向
        for (let i = 1; i < directions.length; i++) {
            if (directions[i] === currentDirection) {
                count++;
            } else {
                // 只有移动距离足够才记录
                if (count >= this.CONFIG.DIRECTION_THRESHOLD) {
                    cleaned.push(currentDirection);
                }
                currentDirection = directions[i];
                count = 1;
            }
        }
        
        // 添加最后一个方向
        if (count >= this.CONFIG.DIRECTION_THRESHOLD) {
            cleaned.push(currentDirection);
        }
        
        return cleaned;
    }

    /**
     * 计算两个模式之间的相似度
     * @param {string} pattern1 - 第一个模式
     * @param {string} pattern2 - 第二个模式
     * @returns {number} 相似度分数 (0-1)
     */
    static calculateSimilarity(pattern1, pattern2) {
        if (!pattern1 || !pattern2) return 0;
        
        const len1 = pattern1.length;
        const len2 = pattern2.length;
        
        if (len1 === 0 || len2 === 0) return 0;
        
        // 使用编辑距离计算相似度
        const editDistance = this.levenshteinDistance(pattern1, pattern2);
        const maxLength = Math.max(len1, len2);
        
        return 1 - (editDistance / maxLength);
    }

    /**
     * 计算编辑距离（Levenshtein距离）
     * @param {string} str1 - 第一个字符串
     * @param {string} str2 - 第二个字符串
     * @returns {number} 编辑距离
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // 替换
                        matrix[i][j - 1] + 1,     // 插入
                        matrix[i - 1][j] + 1      // 删除
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * 验证模式是否有效
     * @param {string} pattern - 要验证的模式
     * @param {Object} criteria - 验证标准
     * @returns {Object} 验证结果
     */
    static validatePattern(pattern, criteria = {}) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        if (!pattern || typeof pattern !== 'string') {
            validation.isValid = false;
            validation.errors.push('模式必须是非空字符串');
            return validation;
        }
        
        // 检查长度
        const minLength = criteria.minLength || 1;
        const maxLength = criteria.maxLength || 10;
        
        if (pattern.length < minLength) {
            validation.isValid = false;
            validation.errors.push(`模式长度不能少于${minLength}个字符`);
        }
        
        if (pattern.length > maxLength) {
            validation.isValid = false;
            validation.errors.push(`模式长度不能超过${maxLength}个字符`);
        }
        
        // 检查字符有效性
        const validChars = Object.values(this.DIRECTIONS);
        const invalidChars = pattern.split('').filter(char => !validChars.includes(char));
        
        if (invalidChars.length > 0) {
            validation.isValid = false;
            validation.errors.push(`包含无效字符: ${invalidChars.join(', ')}`);
        }
        
        // 检查重复性
        const uniqueChars = [...new Set(pattern.split(''))];
        if (uniqueChars.length < 2 && pattern.length > 3) {
            validation.warnings.push('模式可能过于简单或重复');
        }
        
        return validation;
    }

    /**
     * 获取模式的描述性文本
     * @param {string} pattern - 模式字符串
     * @param {string} language - 语言 ('zh'|'en')
     * @returns {string} 描述文本
     */
    static getPatternDescription(pattern, language = 'zh') {
        if (!pattern) return '';
        
        const descriptions = {
            zh: {
                [this.DIRECTIONS.UP]: '上',
                [this.DIRECTIONS.DOWN]: '下',
                [this.DIRECTIONS.LEFT]: '左',
                [this.DIRECTIONS.RIGHT]: '右'
            },
            en: {
                [this.DIRECTIONS.UP]: 'Up',
                [this.DIRECTIONS.DOWN]: 'Down',
                [this.DIRECTIONS.LEFT]: 'Left',
                [this.DIRECTIONS.RIGHT]: 'Right'
            }
        };
        
        const dict = descriptions[language] || descriptions.zh;
        
        return pattern
            .split('')
            .map(char => dict[char] || char)
            .join(language === 'zh' ? '' : '-');
    }

    /**
     * 获取模式统计信息
     * @param {Array} patterns - 模式数组
     * @returns {Object} 统计信息
     */
    static getPatternStats(patterns) {
        if (!Array.isArray(patterns) || patterns.length === 0) {
            return {
                total: 0,
                unique: 0,
                averageLength: 0,
                mostCommon: null,
                lengthDistribution: {}
            };
        }
        
        const stats = {
            total: patterns.length,
            unique: [...new Set(patterns)].length,
            averageLength: patterns.reduce((sum, p) => sum + (p?.length || 0), 0) / patterns.length,
            mostCommon: null,
            lengthDistribution: {}
        };
        
        // 统计长度分布
        patterns.forEach(pattern => {
            if (pattern) {
                const len = pattern.length;
                stats.lengthDistribution[len] = (stats.lengthDistribution[len] || 0) + 1;
            }
        });
        
        // 找出最常见的模式
        const frequency = {};
        patterns.forEach(pattern => {
            if (pattern) {
                frequency[pattern] = (frequency[pattern] || 0) + 1;
            }
        });
        
        let maxCount = 0;
        Object.entries(frequency).forEach(([pattern, count]) => {
            if (count > maxCount) {
                maxCount = count;
                stats.mostCommon = pattern;
            }
        });
        
        return stats;
    }
}

// 导出工具类
if (typeof window !== 'undefined') {
    window.PatternAnalyzer = PatternAnalyzer;
}

export default PatternAnalyzer;