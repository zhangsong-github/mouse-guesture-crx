/**
 * 多语言管理工具
 * I18n Manager for Chrome Extension
 * 
 * 功能：
 * - 自动检测浏览器语言
 * - 支持手动切换语言
 * - 动态更新页面文本
 * - 持久化语言设置
 */

class I18nManager {
    constructor() {
        this.currentLocale = 'en';
        this.supportedLocales = ['en', 'zh_CN', 'de', 'ja', 'ru'];
        this.localeNames = {
            'en': 'English',
            'zh_CN': '简体中文',
            'de': 'Deutsch',
            'ja': '日本語',
            'ru': 'Русский'
        };
        this.messages = {};
        this.initialized = false;
    }

    /**
     * 初始化多语言系统
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // 从存储中加载用户选择的语言
            const savedLocale = await this.loadSavedLocale();
            
            // 如果有保存的语言设置，使用它；否则使用浏览器语言
            if (savedLocale && this.supportedLocales.includes(savedLocale)) {
                this.currentLocale = savedLocale;
            } else {
                this.currentLocale = this.detectBrowserLanguage();
            }
            
            // 加载当前语言的消息
            await this.loadMessages(this.currentLocale);
            
            this.initialized = true;
            console.log('✅ I18n Manager initialized with locale:', this.currentLocale);
        } catch (error) {
            console.error('❌ Failed to initialize I18n Manager:', error);
            // 如果初始化失败，使用英语作为默认语言
            this.currentLocale = 'en';
            await this.loadMessages('en');
            this.initialized = true;
        }
    }

    /**
     * 检测浏览器语言
     * @returns {string} 语言代码
     */
    detectBrowserLanguage() {
        // 获取浏览器UI语言
        const browserLang = chrome.i18n.getUILanguage();
        console.log('Browser language detected:', browserLang);
        
        // 映射浏览器语言到支持的语言
        if (browserLang.startsWith('zh')) {
            return 'zh_CN';
        } else if (browserLang.startsWith('de')) {
            return 'de';
        } else if (browserLang.startsWith('ja')) {
            return 'ja';
        } else if (browserLang.startsWith('ru')) {
            return 'ru';
        } else {
            return 'en';
        }
    }

    /**
     * 从存储中加载保存的语言设置
     * @returns {Promise<string|null>}
     */
    async loadSavedLocale() {
        try {
            const result = await chrome.storage.local.get('selectedLocale');
            return result.selectedLocale || null;
        } catch (error) {
            console.error('Failed to load saved locale:', error);
            return null;
        }
    }

    /**
     * 保存语言设置到存储
     * @param {string} locale - 语言代码
     * @returns {Promise<void>}
     */
    async saveLocale(locale) {
        try {
            await chrome.storage.local.set({ selectedLocale: locale });
            console.log('✅ Locale saved:', locale);
        } catch (error) {
            console.error('Failed to save locale:', error);
        }
    }

    /**
     * 加载指定语言的消息文件
     * @param {string} locale - 语言代码
     * @returns {Promise<void>}
     */
    async loadMessages(locale) {
        try {
            // 构建消息文件的URL
            const messagesUrl = chrome.runtime.getURL(`src/assets/locales/${locale}/messages.json`);
            
            // 获取消息文件
            const response = await fetch(messagesUrl);
            if (!response.ok) {
                throw new Error(`Failed to load messages for locale: ${locale}`);
            }
            
            const data = await response.json();
            this.messages = data;
            console.log(`✅ Messages loaded for locale: ${locale}, count:`, Object.keys(data).length);
        } catch (error) {
            console.error(`Failed to load messages for ${locale}:`, error);
            // 如果加载失败，尝试加载英语作为后备
            if (locale !== 'en') {
                console.log('Falling back to English...');
                await this.loadMessages('en');
            }
        }
    }

    /**
     * 获取翻译后的文本
     * @param {string} key - 消息键
     * @param {string[]} substitutions - 替换参数
     * @returns {string} 翻译后的文本
     */
    getMessage(key, substitutions = []) {
        if (!this.messages[key]) {
            console.warn(`Message key not found: ${key}`);
            return key; // 返回键名作为后备
        }
        
        let message = this.messages[key].message;
        
        // 处理替换参数
        if (substitutions && substitutions.length > 0) {
            substitutions.forEach((sub, index) => {
                message = message.replace(`$${index + 1}`, sub);
            });
        }
        
        return message;
    }

    /**
     * 切换语言
     * @param {string} locale - 新的语言代码
     * @returns {Promise<boolean>} 切换是否成功
     */
    async changeLocale(locale) {
        if (!this.supportedLocales.includes(locale)) {
            console.error('Unsupported locale:', locale);
            return false;
        }
        
        if (locale === this.currentLocale) {
            console.log('Locale already set to:', locale);
            return true;
        }
        
        try {
            // 加载新语言的消息
            await this.loadMessages(locale);
            
            // 更新当前语言
            this.currentLocale = locale;
            
            // 保存到存储
            await this.saveLocale(locale);
            
            // 更新页面所有文本
            this.updatePageTexts();
            
            // 更新HTML的lang属性
            document.documentElement.lang = this.getHtmlLangCode(locale);
            
            console.log('✅ Locale changed to:', locale);
            return true;
        } catch (error) {
            console.error('Failed to change locale:', error);
            return false;
        }
    }

    /**
     * 获取HTML标准的语言代码
     * @param {string} locale - 内部语言代码
     * @returns {string} HTML标准语言代码
     */
    getHtmlLangCode(locale) {
        const mapping = {
            'en': 'en',
            'zh_CN': 'zh-CN',
            'de': 'de',
            'ja': 'ja',
            'ru': 'ru'
        };
        return mapping[locale] || 'en';
    }

    /**
     * 更新页面上所有带 data-i18n 属性的元素
     */
    updatePageTexts() {
        // 更新普通文本元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const message = this.getMessage(key);
            
            // 根据元素类型更新内容
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                // 输入框更新 placeholder
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = message;
                } else {
                    element.value = message;
                }
            } else if (element.tagName === 'OPTION') {
                // 选项元素
                element.textContent = message;
            } else {
                // 普通元素更新文本内容
                element.textContent = message;
            }
        });
        
        // 更新带 data-i18n-html 属性的元素（允许HTML内容）
        const htmlElements = document.querySelectorAll('[data-i18n-html]');
        htmlElements.forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const message = this.getMessage(key);
            element.innerHTML = message;
        });
        
        // 更新带 data-i18n-placeholder 属性的元素
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const message = this.getMessage(key);
            element.placeholder = message;
        });
        
        // 更新带 data-i18n-title 属性的元素
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const message = this.getMessage(key);
            element.title = message;
        });
        
        // 触发自定义事件，通知其他脚本语言已更改
        window.dispatchEvent(new CustomEvent('localeChanged', {
            detail: { locale: this.currentLocale }
        }));
        
        console.log('✅ Page texts updated');
    }

    /**
     * 初始化页面文本
     * 在DOM加载完成后调用
     */
    initializePageTexts() {
        if (!this.initialized) {
            console.warn('I18n Manager not initialized yet');
            return;
        }
        
        this.updatePageTexts();
    }

    /**
     * 获取当前语言
     * @returns {string} 当前语言代码
     */
    getCurrentLocale() {
        return this.currentLocale;
    }

    /**
     * 获取所有支持的语言
     * @returns {Array} 支持的语言列表
     */
    getSupportedLocales() {
        return this.supportedLocales.map(locale => ({
            code: locale,
            name: this.localeNames[locale]
        }));
    }

    /**
     * 获取语言名称
     * @param {string} locale - 语言代码
     * @returns {string} 语言名称
     */
    getLocaleName(locale) {
        return this.localeNames[locale] || locale;
    }

    /**
     * 创建语言选择器UI
     * @param {HTMLElement} container - 容器元素
     * @param {Function} onChange - 语言改变回调函数
     */
    createLanguageSelector(container, onChange) {
        const selectorHtml = `
            <div class="language-selector nes-container is-rounded is-dark">
                <label for="languageSelect" class="nes-text" data-i18n="language">${this.getMessage('language')}</label>
                <div class="nes-select">
                    <select id="languageSelect">
                        ${this.supportedLocales.map(locale => `
                            <option value="${locale}" ${locale === this.currentLocale ? 'selected' : ''}>
                                ${this.localeNames[locale]}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;
        
        container.innerHTML = selectorHtml;
        
        // 绑定事件
        const select = container.querySelector('#languageSelect');
        select.addEventListener('change', async (e) => {
            const newLocale = e.target.value;
            const success = await this.changeLocale(newLocale);
            
            if (success && onChange) {
                onChange(newLocale);
            }
        });
    }

    /**
     * 格式化消息（支持动态参数）
     * @param {string} key - 消息键
     * @param {Object} params - 参数对象
     * @returns {string} 格式化后的消息
     */
    formatMessage(key, params = {}) {
        let message = this.getMessage(key);
        
        // 替换 {key} 格式的占位符
        Object.keys(params).forEach(paramKey => {
            message = message.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
        });
        
        return message;
    }
}

// 创建全局单例
const i18nManager = new I18nManager();

// 导出到全局作用域（用于其他脚本）
if (typeof window !== 'undefined') {
    window.i18nManager = i18nManager;
}

// 如果支持模块导出，也导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18nManager;
}
