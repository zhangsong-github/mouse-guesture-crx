import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import PlatformConfigManager from './scripts/platform-config.js';

// 自定义插件：将每个输出文件包裹在 IIFE 中
function wrapInIIFE() {
  return {
    name: 'wrap-in-iife',
    generateBundle(options, bundle) {
      for (const fileName in bundle) {
        const file = bundle[fileName];
        // 只处理 JS 文件，排除 chunks 和 HTML
        if (file.type === 'chunk' && fileName.endsWith('.js') && !fileName.includes('chunks/')) {
          // 包裹在 IIFE 中，避免全局作用域污染
          file.code = `(function(){"use strict";${file.code}})();`;
        }
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  
  // 获取构建平台
  const platformManager = new PlatformConfigManager();
  const platform = platformManager.getCurrentPlatform();
  
  console.log(`🔧 构建模式: ${mode}, 目标平台: ${platform.toUpperCase()}`);
  
  return {
    // 禁用 HMR，因为这是扩展项目
    server: {
      hmr: false
    },
    
    // 构建配置
    build: {
      // 输出目录
      outDir: 'dist',
      // 清空输出目录
      emptyOutDir: true,
      // 生成源码映射（开发模式下）
      sourcemap: isDev,
      // 代码压缩配置
      minify: isDev ? false : 'terser',
      terserOptions: {
        compress: {
          drop_console: !isDev, // 生产环境移除console
          drop_debugger: !isDev // 生产环境移除debugger
        },
        mangle: {
          // 保留一些重要的函数名，避免扩展API调用出错
          reserved: ['chrome', 'browser', 'webkitURL', 'mozURL'],
          // 不混淆顶层作用域的变量名，避免冲突 - 关键修复
          toplevel: false,
          // 为每个文件生成唯一的变量名
          properties: false
        },
        format: {
          // 保留一些注释
          comments: false
        },
        // 关键：为每个chunk生成独立的作用域
        keep_classnames: false,
        keep_fnames: false
      },
      
      // 多入口配置
      rollupOptions: {
        input: {
          // 背景脚本
          'src/background/background-main': resolve(__dirname, 'src/background/background-main.js'),
          // 内容脚本组件
          'src/utils/coordinate-utils': resolve(__dirname, 'src/utils/coordinate-utils.js'),
          'src/utils/dom-utils': resolve(__dirname, 'src/utils/dom-utils.js'),
          'src/utils/message-utils': resolve(__dirname, 'src/utils/message-utils.js'),
          'src/utils/pattern-analyzer': resolve(__dirname, 'src/utils/pattern-analyzer.js'),
          // 注意：i18n-manager.js 作为静态文件复制，不通过 Vite 构建
          'src/core/path-renderer': resolve(__dirname, 'src/core/path-renderer.js'),
          'src/core/unified-input-manager': resolve(__dirname, 'src/core/unified-input-manager.js'),
          'src/core/motion-tracker': resolve(__dirname, 'src/core/motion-tracker.js'),
          'src/ui/components/direction-visualizer': resolve(__dirname, 'src/ui/components/direction-visualizer.js'),
          'src/content/content-main': resolve(__dirname, 'src/content/content-main.js'),
          // Side Panel页面
          'src/ui/sidepanel/sidepanel': resolve(__dirname, 'src/ui/sidepanel/sidepanel.js'),
          'src/ui/sidepanel/sidepanel-html': resolve(__dirname, 'src/ui/sidepanel/sidepanel.html'),
          // Options页面
          'src/ui/options/options': resolve(__dirname, 'src/ui/options/options.js'),
          'src/ui/options/options-html': resolve(__dirname, 'src/ui/options/options.html')
        },
        output: {
          // 保持原有的文件结构
          entryFileNames: (chunkInfo) => {
            const name = chunkInfo.name;
            if (name === 'src/background/background-main') return 'src/background/background-main.js';
            if (name === 'src/utils/coordinate-utils') return 'src/utils/coordinate-utils.js';
            if (name === 'src/utils/dom-utils') return 'src/utils/dom-utils.js';
            if (name === 'src/utils/message-utils') return 'src/utils/message-utils.js';
            if (name === 'src/utils/pattern-analyzer') return 'src/utils/pattern-analyzer.js';
            // i18n-manager.js 作为静态文件复制，不在这里处理
            if (name === 'src/core/path-renderer') return 'src/core/path-renderer.js';
            if (name === 'src/core/unified-input-manager') return 'src/core/unified-input-manager.js';
            if (name === 'src/core/motion-tracker') return 'src/core/motion-tracker.js';
            if (name === 'src/ui/components/direction-visualizer') return 'src/ui/components/direction-visualizer.js';
            if (name === 'src/content/content-main') return 'src/content/content-main.js';
            if (name === 'src/ui/sidepanel/sidepanel') return 'src/ui/sidepanel/sidepanel.js';
            if (name === 'src/ui/options/options') return 'src/ui/options/options.js';
            return '[name].js';
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name;
            if (name.endsWith('.html')) {
              if (name === 'popup.html') return 'popup/popup.html';
              if (name === 'sidepanel.html') return 'src/ui/sidepanel/sidepanel.html';
              if (name === 'options.html') return 'src/ui/options/options.html';
            }
            if (name.endsWith('.css')) {
              if (name.includes('popup')) return 'popup/popup.css';
              if (name.includes('sidepanel')) return 'src/ui/sidepanel/sidepanel.css';
              if (name.includes('options')) return 'src/assets/styles/options.css';
              if (name.includes('content')) return 'src/assets/styles/content.css';
            }
            return 'assets/[name][extname]';
          },
          // 关键修复：禁用代码分割，每个入口文件独立打包
          manualChunks: undefined,
          // 使用 ES module 格式（Chrome content scripts 支持）
          format: 'es',
          // 生成严格模式代码
          strict: true
        }
      }
    },
    
    // 插件配置
    plugins: [
      // 自定义插件：在构建完成后生成 manifest.json
      {
        name: 'generate-manifest',
        closeBundle() {
          // 在所有文件写入完成后生成 manifest
          const platformManager = new PlatformConfigManager();
          try {
            platformManager.prepareManifest();
          } catch (error) {
            console.error('❌ 生成manifest失败:', error);
          }
        }
      },
      // 自定义插件：将代码包裹在 IIFE 中
      wrapInIIFE(),
      // 静态文件复制插件
      viteStaticCopy({
        targets: [
          // manifest.json 由 platform-config.js 在构建前生成，无需复制
          // 复制图标文件夹
          {
            src: 'src/assets/icons/**/*',
            dest: 'src/assets/icons'
          },
          // 复制CSS文件
          {
            src: 'src/assets/styles/**/*',
            dest: 'src/assets/styles'
          },
          {
            src: 'popup/popup.css',
            dest: 'popup'
          },
          {
            src: 'src/assets/styles/content.css',
            dest: 'src/assets/styles'
          },
          // 复制sidepanel CSS文件
          {
            src: 'src/ui/sidepanel/sidepanel.css',
            dest: 'src/ui/sidepanel'
          },
          // 复制 js 工具文件夹 (gesture-arrows.js 等)
          {
            src: 'src/js/**/*',
            dest: 'src/js'
          },
          // 复制 browser-polyfill.js（不通过 Vite 构建，避免 ES module 包裹问题）
          {
            src: 'src/utils/browser-polyfill.js',
            dest: 'src/utils'
          },
          // 复制 i18n-manager.js（不通过 Vite 构建，避免 ES module 包裹问题）
          {
            src: 'src/utils/i18n-manager.js',
            dest: 'src/utils'
          },
          // 复制外部库文件 (NES.css 等)
          {
            src: 'src/assets/libs/**/*',
            dest: 'src/assets/libs'
          },
          // 复制其他静态资源
          {
            src: 'fonts/**/*',
            dest: 'fonts'
          },
          {
            src: 'image/**/*',
            dest: 'image'
          },
          // 复制多语言资源文件（保留原始路径结构）
          {
            src: 'src/assets/locales/**/*',
            dest: 'src/assets/locales'
          },
          // 同时复制到 _locales 以支持 Chrome i18n API
          {
            src: 'src/assets/locales/**/*',
            dest: '_locales'
          },
          // 复制其他可能的静态文件
          {
            src: 'lib/**/*',
            dest: 'lib'
          }
        ]
      })
    ],
    
    // 解析配置
    resolve: {
      alias: {
        '@': resolve(__dirname, './'),
        '@popup': resolve(__dirname, './popup'),
        '@content': resolve(__dirname, './content'),
        '@js': resolve(__dirname, './js')
      }
    }
  };
});
