/**
 * 商店链接工具函数
 * 用于根据当前浏览器类型动态生成对应商店的链接
 */

/**
 * 获取扩展商店评分页面URL
 * @returns {string} 商店评分页面的完整URL
 */
function getStoreReviewUrl() {
    const extensionId = chrome.runtime.id;
    
    // 检测是否在Edge浏览器中运行
    const isEdge = navigator.userAgent.includes('Edg/');
    
    if (isEdge) {
        // Edge Add-ons 商店评分页面
        return `https://microsoftedge.microsoft.com/addons/detail/${extensionId}`;
    } else {
        // Chrome Web Store 评分页面
        return `https://chrome.google.com/webstore/detail/${extensionId}/reviews`;
    }
}

/**
 * 获取扩展商店主页URL
 * @returns {string} 商店主页的完整URL
 */
function getStoreHomeUrl() {
    const extensionId = chrome.runtime.id;
    
    // 检测是否在Edge浏览器中运行
    const isEdge = navigator.userAgent.includes('Edg/');
    
    if (isEdge) {
        // Edge Add-ons 商店
        return `https://microsoftedge.microsoft.com/addons/detail/${extensionId}`;
    } else {
        // Chrome Web Store
        return `https://chrome.google.com/webstore/detail/${extensionId}`;
    }
}

/**
 * 获取当前浏览器类型
 * @returns {string} 浏览器类型：'edge' 或 'chrome'
 */
function getBrowserType() {
    const isEdge = navigator.userAgent.includes('Edg/');
    return isEdge ? 'edge' : 'chrome';
}

/**
 * 打开扩展商店评分页面
 */
function openStoreReviewPage() {
    const reviewUrl = getStoreReviewUrl();
    chrome.tabs.create({ url: reviewUrl });
}

/**
 * 打开扩展商店主页
 */
function openStoreHomePage() {
    const homeUrl = getStoreHomeUrl();
    chrome.tabs.create({ url: homeUrl });
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getStoreReviewUrl,
        getStoreHomeUrl,
        getBrowserType,
        openStoreReviewPage,
        openStoreHomePage
    };
}

// 如果在浏览器环境中，添加到全局对象
if (typeof window !== 'undefined') {
    window.StoreUtils = {
        getStoreReviewUrl,
        getStoreHomeUrl,
        getBrowserType,
        openStoreReviewPage,
        openStoreHomePage
    };
}
