/**
 * 跨浏览器API兼容层 (Browser Polyfill)
 * 为Chrome和Edge提供统一的browser API
 * 
 * Edge和Chrome都支持chrome.* API，但为了最佳兼容性和未来扩展性，
 * 我们提供一个browser命名空间，使代码更具可移植性
 */

(function() {
  'use strict';

  // 如果已经存在browser对象（如Firefox），直接使用
  if (typeof browser !== 'undefined' && browser.runtime) {
    return;
  }

  // 如果没有chrome对象，无法创建polyfill
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('Browser extension APIs not available');
    return;
  }

  /**
   * 将Chrome的回调API转换为Promise API
   */
  const wrapAPI = (target, prop) => {
    if (typeof target[prop] !== 'function') {
      return target[prop];
    }

    return function(...args) {
      // 检查最后一个参数是否是回调函数
      const lastArg = args[args.length - 1];
      const hasCallback = typeof lastArg === 'function';

      // 如果已经传入了回调，直接使用原始API
      if (hasCallback) {
        return target[prop](...args);
      }

      // 否则包装为Promise
      return new Promise((resolve, reject) => {
        target[prop](...args, (...results) => {
          // 检查是否有错误
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            // 根据结果数量返回
            if (results.length === 0) {
              resolve();
            } else if (results.length === 1) {
              resolve(results[0]);
            } else {
              resolve(results);
            }
          }
        });
      });
    };
  };

  /**
   * 创建代理对象，自动包装chrome API
   */
  const createBrowserAPI = () => {
    const browserAPI = {};

    // 需要包装的API命名空间
    const namespaces = [
      'runtime',
      'tabs',
      'windows',
      'storage',
      'i18n',
      'sessions',
      'sidePanel',
      'action',
      'contextMenus',
      'notifications',
      'cookies',
      'bookmarks',
      'history',
      'downloads',
      'extension',
      'management',
      'permissions',
      'webNavigation',
      'webRequest'
    ];

    namespaces.forEach(namespace => {
      if (chrome[namespace]) {
        // 创建该命名空间的代理
        browserAPI[namespace] = new Proxy(chrome[namespace], {
          get(target, prop) {
            // 事件监听器和某些属性不需要包装
            if (prop === 'onMessage' || prop === 'onInstalled' || 
                prop === 'onStartup' || prop === 'onClicked' ||
                prop === 'onUpdated' || prop === 'onRemoved' ||
                prop === 'onCreated' || prop === 'onActivated' ||
                prop.startsWith('on') || prop === 'lastError' ||
                prop === 'id' || prop === 'getManifest' ||
                prop === 'getURL') {
              return target[prop];
            }

            // 包装方法为Promise
            return wrapAPI(target, prop);
          }
        });
      }
    });

    return browserAPI;
  };

  // 创建browser全局对象
  try {
    if (typeof globalThis !== 'undefined') {
      globalThis.browser = createBrowserAPI();
    } else if (typeof window !== 'undefined') {
      window.browser = createBrowserAPI();
    } else if (typeof self !== 'undefined') {
      self.browser = createBrowserAPI();
    }
    
    console.log('✅ Browser API polyfill initialized');
  } catch (error) {
    console.error('❌ Failed to initialize browser polyfill:', error);
  }
})();
