// 选项页面的JavaScript逻辑 - 重构后版本

// 调试：检查 GestureArrowDisplay 是否已加载
console.log('Options.js loading, GestureArrowDisplay available:', typeof window.GestureArrowDisplay !== 'undefined');
if (typeof window.GestureArrowDisplay !== 'undefined') {
    console.log('GestureArrowDisplay methods:', Object.keys(window.GestureArrowDisplay));
}

class MotionOptions {
    constructor() {
        this.settings = {
            enabled: true,
            sensitivity: 30,
            trailDuration: 1200,
            motions: []
        };
        
        this.isRecording = false;
        this.isDrawing = false;
        this.recordingPath = [];
        this.currentMotionPattern = null;
        this.canvas = null;
        this.ctx = null;
        this.startPoint = null;
        this.lastPoint = null;
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.initializeCanvas();
        this.bindEvents();
        this.render();
        this.setupMessageListener();
    }
    
    async loadSettings() {
        try {
            // 从background.js获取设置，保持与side panel一致
            const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
            
            if (response) {
                // 从 actionMappings 生成手势列表
                const motions = [];
                if (response.actionMappings) {
                    // 动作描述映射
                    const actionNames = {
                        'goBack': '后退',
                        'goForward': '前进',
                        'previousTab': '前一标签',
                        'nextTab': '下一标签',
                        'scrollToTop': '滚动到顶部',
                        'scrollToBottom': '滚动到底部',
                        'newTab': '新建标签页',
                        'closeTab': '关闭标签页',
                        'refreshTab': '刷新页面',
                        'reopenTab': '重新打开标签页',
                        'duplicateTab': '复制标签页',
                        'minimizeWindow': '最小化窗口',
                        'toggleFullscreen': '全屏切换',
                        'togglePinTab': '固定标签'
                    };
                    
                    for (const [pattern, action] of Object.entries(response.actionMappings)) {
                        motions.push({
                            pattern: pattern,
                            action: action,
                            name: actionNames[action] || action,
                            enabled: true,
                            custom: false
                        });
                    }
                }
                
                this.settings = {
                    enabled: response.enableExecution || true,
                    sensitivity: response.patternSensitivity || 30,
                    trailDuration: response.trailDuration || 1200,
                    motions: motions.length > 0 ? motions : this.getDefaultMotions()
                };
            } else {
                // 初始化默认设置
                this.settings = {
                    enabled: true,
                    sensitivity: 30,
                    trailDuration: 1200,
                    motions: this.getDefaultMotions()
                };
            }
        } catch (error) {
            console.error('加载设置失败:', error);
            this.settings.motions = this.getDefaultMotions();
        }
    }
    
    getDefaultMotions() {
        return [
            { pattern: 'L', action: 'goBack', name: '后退', enabled: true, custom: false },
            { pattern: 'R', action: 'goForward', name: '前进', enabled: true, custom: false },
            { pattern: 'U', action: 'scrollToTop', name: '滚动到顶部', enabled: true, custom: false },
            { pattern: 'D', action: 'scrollToBottom', name: '滚动到底部', enabled: true, custom: false },
            { pattern: 'LR', action: 'refreshTab', name: '刷新页面', enabled: true, custom: false },
            { pattern: 'RL', action: 'reopenTab', name: '重新打开标签页', enabled: true, custom: false },
            { pattern: 'DL', action: 'newTab', name: '新建标签页', enabled: true, custom: false },
            { pattern: 'DR', action: 'closeTab', name: '关闭标签页', enabled: true, custom: false }
        ];
    }
    
    async saveSettings() {
        try {
            // 将设置转换为background.js期望的格式
            const backgroundSettings = {
                enableExecution: this.settings.enabled,
                patternSensitivity: this.settings.sensitivity,
                trailDuration: this.settings.trailDuration,
                enableTrail: true,
                enableHints: true,
                enableSounds: false
            };
            
            const response = await chrome.runtime.sendMessage({
                type: 'SAVE_SETTINGS',
                settings: backgroundSettings
            });
            
            if (response && response.success) {
                console.log('设置已保存');
                this.showMessage('设置已保存', 'success');
            } else {
                console.error('保存设置失败:', response);
                this.showMessage('保存失败', 'error');
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showMessage('保存失败', 'error');
        }
    }
    
    initializeCanvas() {
        this.canvas = document.getElementById('gestureCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // 初始设置画布样式（不设置尺寸，等显示时再设置）
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#007bff';
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (this.isRecording) {
                this.resizeCanvas();
            }
        });
    }
    
    resizeCanvas() {
        if (!this.canvas || !this.canvas.parentElement) return;
        
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // 确保容器有实际尺寸
        if (rect.width > 0 && rect.height > 0) {
            this.canvas.width = rect.width;
            this.canvas.height = Math.max(300, rect.height); // 最小高度300px
            
            // 重新设置画布样式（canvas重置尺寸会清除样式）
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = '#007bff';
        }
    }
    
    bindEvents() {
        // 开始录制按钮
        const addGestureBtn = document.getElementById('addGestureBtn');
        if (addGestureBtn) {
            addGestureBtn.addEventListener('click', () => {
                this.startRecording();
            });
        }
        
        // 取消录制按钮
        const cancelRecordingBtn = document.getElementById('cancelRecording');
        if (cancelRecordingBtn) {
            cancelRecordingBtn.addEventListener('click', () => {
                this.cancelRecording();
            });
        }
        
        // 清除画布按钮
        const clearRecordingBtn = document.getElementById('clearRecording');
        if (clearRecordingBtn) {
            clearRecordingBtn.addEventListener('click', () => {
                this.clearCanvas();
            });
        }

        // 保存手势按钮
        const saveGestureBtn = document.getElementById('saveGesture');
        if (saveGestureBtn) {
            saveGestureBtn.addEventListener('click', () => {
                this.saveCustomGesture();
            });
        }
        
        // 画布鼠标事件 - 使用右键录制
        if (this.canvas) {
            console.log('Canvas found, binding events');
            
            // 阻止右键菜单
            this.canvas.addEventListener('contextmenu', (e) => {
                if (this.isRecording) {
                    e.preventDefault();
                    console.log('Right-click menu prevented');
                }
            });
            
            this.canvas.addEventListener('mousedown', (e) => {
                console.log('Mouse down event:', e.button, 'Recording:', this.isRecording);
                this.onMouseDown(e);
            });
            this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
            this.canvas.addEventListener('mouseup', (e) => {
                console.log('Mouse up event:', e.button, 'Drawing:', this.isDrawing);
                this.onMouseUp(e);
            });
            // 移除 mouseout 以避免意外触发
            // this.canvas.addEventListener('mouseout', (e) => this.onMouseUp(e));
        } else {
            console.error('Canvas not found during event binding');
        }
        
        // 灵敏度滑块
        const sensitivitySlider = document.getElementById('sensitivity');
        const sensitivityValue = document.getElementById('sensitivityValue');
        
        if (sensitivitySlider && sensitivityValue) {
            // 初始化显示值
            const initialSensitivity = this.validateSensitivity(sensitivitySlider.value);
            sensitivitySlider.value = initialSensitivity;
            sensitivityValue.textContent = initialSensitivity + 'px';
            
            sensitivitySlider.addEventListener('input', (e) => {
                const value = this.validateSensitivity(e.target.value);
                sensitivityValue.textContent = value + 'px';
            });
            
            sensitivitySlider.addEventListener('change', async (e) => {
                const value = this.validateSensitivity(e.target.value);
                this.settings.sensitivity = value;
                e.target.value = value; // 确保slider显示正确值
                await this.saveSettings();
            });
        }
        
        // 轨迹持续时间滑块
        const trailDurationSlider = document.getElementById('trailDuration');
        const trailDurationValue = document.getElementById('trailDurationValue');
        
        if (trailDurationSlider && trailDurationValue) {
            // 初始化显示值
            const initialDuration = this.validateTrailDuration(trailDurationSlider.value);
            trailDurationSlider.value = initialDuration;
            trailDurationValue.textContent = (initialDuration / 1000).toFixed(1) + 's';
            
            trailDurationSlider.addEventListener('input', (e) => {
                const value = this.validateTrailDuration(e.target.value);
                trailDurationValue.textContent = (value / 1000).toFixed(1) + 's';
            });
            
            trailDurationSlider.addEventListener('change', async (e) => {
                const value = this.validateTrailDuration(e.target.value);
                this.settings.trailDuration = value;
                e.target.value = value; // 确保slider显示正确值
                await this.saveSettings();
            });
        }
        
        // 手势名称和动作选择器
        const gestureNameInput = document.getElementById('gestureName');
        if (gestureNameInput) {
            gestureNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveCustomGesture();
                }
            });
        }
        
        // 导入/导出按钮
        const exportBtn = document.getElementById('exportSettings');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSettings();
            });
        }
        
        const importBtn = document.getElementById('importSettings');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                // 创建临时文件输入框
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json';
                fileInput.style.display = 'none';
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.importSettings(e.target.files[0]);
                    }
                    document.body.removeChild(fileInput);
                });
                document.body.appendChild(fileInput);
                fileInput.click();
            });
        }
        
        // 重置按钮
        const resetBtn = document.getElementById('resetSettings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }
    }
    
    setupMessageListener() {
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'scrollToCustomGestures') {
                this.scrollToCustomGesturesSection();
                sendResponse({ success: true });
            }
        });
    }
    
    scrollToCustomGesturesSection() {
        // 首先尝试滚动到自定义手势section
        const customGesturesSection = document.querySelector('section:nth-child(2)');
        
        if (customGesturesSection) {
            customGesturesSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            console.log('Scrolled to custom gestures section');
            
            // 高亮显示该区域（可选）
            customGesturesSection.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.3)';
            setTimeout(() => {
                customGesturesSection.style.boxShadow = '';
            }, 2000);
        } else {
            // 如果找不到确切的元素，尝试滚动到页面中间位置
            window.scrollTo({
                top: document.body.scrollHeight * 0.3,
                behavior: 'smooth'
            });
            console.log('Scrolled to estimated custom gestures position');
        }
    }
    
    render() {
        this.renderSettings();
        this.renderGestures();
        this.renderStatistics();
    }
    
    renderSettings() {
        // 渲染敏感度设置（使用验证函数确保安全值）
        const sensitivitySlider = document.getElementById('sensitivity');
        const sensitivityValue = document.getElementById('sensitivityValue');
        
        if (sensitivitySlider && sensitivityValue) {
            const validSensitivity = this.validateSensitivity(this.settings.sensitivity);
            this.settings.sensitivity = validSensitivity; // 确保设置中的值也是有效的
            sensitivitySlider.value = validSensitivity;
            sensitivityValue.textContent = validSensitivity + 'px';
        }
        
        // 渲染轨迹持续时间设置（使用验证函数确保安全值）
        const trailDurationSlider = document.getElementById('trailDuration');
        const trailDurationValue = document.getElementById('trailDurationValue');
        
        if (trailDurationSlider && trailDurationValue) {
            const validDuration = this.validateTrailDuration(this.settings.trailDuration);
            this.settings.trailDuration = validDuration; // 确保设置中的值也是有效的
            trailDurationSlider.value = validDuration;
            trailDurationValue.textContent = (validDuration / 1000).toFixed(1) + 's';
        }
    }
    
    renderGestures() {
        this.renderPresetGestures();
        this.renderCustomGestures();
    }
    
    renderPresetGestures() {
        const container = document.getElementById('presetGestures');
        if (!container) return;
        
        container.innerHTML = '';
        
        const presetGestures = (this.settings.motions || []).filter(g => !g.custom);
        
        presetGestures.forEach((gesture, index) => {
            const gestureElement = this.createGestureElement(gesture, false, index);
            container.appendChild(gestureElement);
        });
    }
    
    renderCustomGestures() {
        const container = document.getElementById('customGestures');
        if (!container) return;
        
        container.innerHTML = '';
        
        const customGestures = (this.settings.motions || []).filter(g => g.custom);
        
        if (customGestures.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = '<p>还没有自定义手势。开始录制您的第一个手势吧！</p>';
            container.appendChild(emptyMessage);
        } else {
            customGestures.forEach((gesture, index) => {
                const gestureElement = this.createGestureElement(gesture, true, index);
                container.appendChild(gestureElement);
            });
        }
    }
    
    createGestureElement(gesture, isCustom, index) {
        const div = document.createElement('div');
        div.className = `gesture-item ${isCustom ? 'custom' : 'preset'}`;
        
        // 使用箭头显示系统
        const gestureVisual = window.GestureArrowDisplay ? 
            window.GestureArrowDisplay.createGestureVisual(gesture.pattern) :
            this.createFallbackVisual(gesture.pattern);
        
        div.innerHTML = `
            <div class="gesture-visual-container"></div>
            <div class="gesture-info">
                <div class="gesture-name">${gesture.name}</div>
                <div class="gesture-pattern">${gesture.pattern}</div>
                <div class="gesture-action">${this.getActionDisplayName(gesture.action)}</div>
            </div>
            <div class="gesture-controls">
                <label class="toggle">
                    <input type="checkbox" ${gesture.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                ${isCustom ? '<button class="btn-delete" title="删除手势">🗑️</button>' : ''}
            </div>
        `;
        
        // 插入手势视觉元素
        const visualContainer = div.querySelector('.gesture-visual-container');
        visualContainer.appendChild(gestureVisual);
        
        // 绑定事件
        const toggle = div.querySelector('input[type="checkbox"]');
        toggle.addEventListener('change', async (e) => {
            gesture.enabled = e.target.checked;
            await this.saveSettings();
        });
        
        if (isCustom) {
            const deleteBtn = div.querySelector('.btn-delete');
            deleteBtn.addEventListener('click', () => {
                this.deleteCustomGesture(gesture);
            });
        }
        
        return div;
    }
    
    createFallbackVisual(pattern) {
        // 备用的视觉显示方案
        const container = document.createElement('div');
        container.className = 'gesture-visual';
        
        const arrows = document.createElement('div');
        arrows.className = 'gesture-arrows';
        arrows.textContent = pattern.split('').map(dir => {
            const arrowMap = { 'U': '↑', 'D': '↓', 'L': '←', 'R': '→' };
            return arrowMap[dir] || dir;
        }).join(' ');
        
        container.appendChild(arrows);
        return container;
    }
    
    getActionDisplayName(action) {
        const actionNames = {
            'back': '后退',
            'forward': '前进',
            'refresh': '刷新页面',
            'scrollTop': '滚动到顶部',
            'scrollBottom': '滚动到底部',
            'newTab': '新建标签页',
            'closeTab': '关闭标签页',
            'restoreTab': '恢复标签页',
            'custom': '自定义动作'
        };
        return actionNames[action] || action;
    }
    
    // 录制相关方法
    startRecording() {
        this.isRecording = true;
        this.isDrawing = false;
        this.recordingPath = [];
        this.currentGesturePattern = null;
        
        // 显示录制区域
        const recordingSection = document.getElementById('recordingSection');
        recordingSection.style.display = 'block';
        
        // 等待DOM更新后再初始化画布
        setTimeout(() => {
            this.resizeCanvas();
            this.clearCanvas();
        }, 50);
        
        document.getElementById('addGestureBtn').disabled = true;
        document.getElementById('saveGesture').disabled = true;
        document.getElementById('gestureConfig').style.display = 'none';
        
        // 更新录制说明
        document.getElementById('recordingTitle').textContent = '准备录制手势';
        document.getElementById('recordingInstructions').textContent = '按住鼠标右键并移动鼠标绘制手势轨迹';
        document.getElementById('recordingPattern').innerHTML = '';
        
        if (this.canvas) {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    cancelRecording() {
        this.isRecording = false;
        this.isDrawing = false;
        this.recordingPath = [];
        this.currentGesturePattern = null;
        
        // 隐藏录制区域
        document.getElementById('recordingSection').style.display = 'none';
        document.getElementById('addGestureBtn').disabled = false;
        
        // 重置录制说明
        document.getElementById('recordingTitle').textContent = '准备录制手势';
        document.getElementById('recordingInstructions').textContent = '按住鼠标右键并移动鼠标绘制手势轨迹';
        document.getElementById('recordingPattern').innerHTML = '';
        document.getElementById('gestureConfig').style.display = 'none';
        
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
    }

    saveCurrentGesture() {
        if (this.recordingPath.length < 2) {
            this.showMessage('手势太短，请录制更长的手势', 'error');
            return;
        }

        // 分析手势并显示
        const pattern = this.analyzeGesture(this.recordingPath);
        if (!pattern) {
            this.showMessage('无法识别手势，请重新录制', 'error');
            return;
        }

        // 显示配置区域
        document.getElementById('gestureConfig').style.display = 'block';
        document.getElementById('saveGesture').disabled = true;
        
        // 显示手势预览
        const arrows = window.GestureArrowDisplay.getArrowsForPattern(pattern);
        document.getElementById('recordingPattern').innerHTML = `手势模式: ${arrows}`;
        
        // 保存到临时变量供最终保存使用
        this.currentPattern = pattern;
        
        // 添加最终保存事件监听
        const gestureNameInput = document.getElementById('gestureName');
        const gestureActionSelect = document.getElementById('gestureAction');
        
        const handleSave = () => {
            const name = gestureNameInput.value.trim();
            const action = gestureActionSelect.value;
            
            if (!name) {
                this.showMessage('请输入手势名称', 'error');
                return;
            }
            
            if (!action) {
                this.showMessage('请选择执行动作', 'error');
                return;
            }
            
            // 保存手势
            this.finalizeGestureSave(this.currentPattern, name, action);
        };
        
        // 绑定回车键保存
        gestureNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        });
        
        gestureActionSelect.addEventListener('change', handleSave);
    }
    
    async finalizeGestureSave(pattern, name, action) {
        const newGesture = {
            id: Date.now(),
            name,
            pattern,
            action,
            created: new Date().toISOString()
        };
        
        // 检查是否已存在相同手势
        const existing = (this.settings.motions || []).find(g => g.pattern === pattern);
        if (existing) {
            this.showMessage(`手势模式 ${pattern} 已存在，名称为 "${existing.name}"`, 'warning');
            return;
        }
        
        if (!this.settings.motions) {
            this.settings.motions = [];
        }
        this.settings.motions.push(newGesture);
        await this.saveSettings();
        
        this.showMessage(`手势 "${name}" 保存成功！`, 'success');
        
        // 重置界面
        this.cancelRecording();
        this.render();
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.recordingPath = [];
        
        // 重置 UI 状态
        document.getElementById('saveGesture').disabled = true;
        document.getElementById('recordingPattern').innerHTML = '';
        document.getElementById('gestureConfig').style.display = 'none';
        
        // 清空输入框
        document.getElementById('gestureName').value = '';
        document.getElementById('gestureAction').value = '';
    }
    
    onMouseDown(e) {
        console.log('onMouseDown called:', { button: e.button, isRecording: this.isRecording });
        
        // 只响应右键点击
        if (!this.isRecording || e.button !== 2) {
            console.log('Ignoring mouse down - not recording or not right button');
            return;
        }
        
        e.preventDefault();
        console.log('Starting gesture recording');
        
        // 清除旧的绘制轨迹
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.startPoint = { x, y };
        this.lastPoint = { x, y };
        this.recordingPath = [{ x, y, timestamp: Date.now() }];
        this.isDrawing = true;
        
        // 设置画布样式
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        
        // 更新录制指示
        document.getElementById('recordingTitle').textContent = '正在录制手势...';
        document.getElementById('recordingInstructions').textContent = '继续移动鼠标绘制手势，松开右键完成录制';
        document.getElementById('recordingPattern').innerHTML = '';
    }
    
    onMouseMove(e) {
        if (!this.isRecording || !this.isDrawing || !this.startPoint) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 绘制轨迹线
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        // 记录路径点
        this.recordingPath.push({ x, y, timestamp: Date.now() });
        this.lastPoint = { x, y };
        
        // 实时分析手势并显示箭头
        if (this.recordingPath.length > 5) {
            const currentPattern = this.analyzeGesture(this.recordingPath);
            if (currentPattern && typeof window.GestureArrowDisplay !== 'undefined') {
                const arrows = window.GestureArrowDisplay.getArrowsForPattern(currentPattern);
                document.getElementById('recordingPattern').innerHTML = `当前手势: <strong style="font-size: 24px;">${arrows}</strong>`;
            } else if (currentPattern) {
                document.getElementById('recordingPattern').innerHTML = `当前手势: ${currentPattern}`;
            }
        }
    }
    
    onMouseUp(e) {
        console.log('onMouseUp called:', { 
            isRecording: this.isRecording, 
            isDrawing: this.isDrawing,
            pathLength: this.recordingPath?.length 
        });
        
        if (!this.isRecording || !this.isDrawing) {
            console.log('Ignoring mouseup - not recording or not drawing');
            return;
        }
        
        this.isDrawing = false;
        this.startPoint = null;
        
        console.log('Analyzing gesture with', this.recordingPath.length, 'points');
        
        // 分析完整手势
        if (this.recordingPath.length >= 5) {
            const pattern = this.analyzeGesture(this.recordingPath);
            console.log('Analyzed pattern:', pattern);
            
            if (pattern && pattern.length > 0) {
                // 检查 GestureArrowDisplay 是否可用
                if (typeof window.GestureArrowDisplay === 'undefined') {
                    console.error('GestureArrowDisplay is not loaded!');
                    document.getElementById('recordingPattern').innerHTML = `录制完成: ${pattern}`;
                } else {
                    // 显示最终手势结果（只显示箭头）
                    const arrows = window.GestureArrowDisplay.getArrowsForPattern(pattern);
                    console.log('Pattern arrows:', arrows);
                    document.getElementById('recordingPattern').innerHTML = `录制完成: <strong style="font-size: 28px; color: #28a745;">${arrows}</strong>`;
                }
                
                document.getElementById('recordingTitle').textContent = '手势录制完成';
                document.getElementById('recordingInstructions').textContent = '请设置手势名称和执行动作，然后保存';
                
                // 启用保存按钮并显示配置区域
                const saveBtn = document.getElementById('saveGesture');
                const configArea = document.getElementById('gestureConfig');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    console.log('Save button enabled');
                }
                if (configArea) {
                    configArea.style.display = 'block';
                    console.log('Config area displayed');
                }
                
                // 保存手势模式供保存使用
                this.currentGesturePattern = pattern;
                console.log('Gesture pattern saved:', pattern);
            } else {
                console.log('Pattern is empty or invalid');
                document.getElementById('recordingPattern').innerHTML = '手势太简单，请重新录制';
            }
        } else {
            console.log('Path too short:', this.recordingPath.length);
            document.getElementById('recordingPattern').innerHTML = '手势太短，请重新录制';
        }
    }
    
    analyzeGesture(path = null) {
        const gestureData = path || this.recordingPath;
        if (gestureData.length < 5) return null;
        
        const directions = [];
        const minDistance = 40; // 提高阈值，减少噪声
        let lastDirection = null;
        
        // 取样分析，每隔几个点分析一次以减少噪声
        const sampleRate = Math.max(1, Math.floor(gestureData.length / 20));
        
        for (let i = 0; i < gestureData.length - sampleRate; i += sampleRate) {
            const current = gestureData[i];
            const next = gestureData[i + sampleRate];
            
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) continue;
            
            // 计算角度来确定方向
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            let direction;
            
            if (angle >= -45 && angle < 45) {
                direction = 'R'; // 右
            } else if (angle >= 45 && angle < 135) {
                direction = 'D'; // 下
            } else if (angle >= 135 || angle < -135) {
                direction = 'L'; // 左
            } else {
                direction = 'U'; // 上
            }
            
            // 只记录方向变化
            if (direction !== lastDirection) {
                directions.push(direction);
                lastDirection = direction;
            }
        }
        
        // 过滤掉太短的手势
        if (directions.length === 0) return null;
        
        // 合并相邻相同方向
        const pattern = [];
        let currentDir = directions[0];
        let count = 1;
        
        for (let i = 1; i < directions.length; i++) {
            if (directions[i] === currentDir) {
                count++;
            } else {
                // 只有移动距离足够才记录
                if (count >= 1) {
                    pattern.push(currentDir);
                }
                currentDir = directions[i];
                count = 1;
            }
        }
        
        // 添加最后一个方向
        if (count >= 1) {
            pattern.push(currentDir);
        }
        
        return pattern.join('');
    }
    
    showGesturePreview(pattern) {
        const previewContainer = document.getElementById('gesturePreview');
        previewContainer.innerHTML = '';
        
        if (window.GestureArrowDisplay) {
            const visual = window.GestureArrowDisplay.createGestureVisual(pattern);
            previewContainer.appendChild(visual);
        } else {
            const fallback = this.createFallbackVisual(pattern);
            previewContainer.appendChild(fallback);
        }
    }
    
    saveCustomGesture() {
        const pattern = this.currentGesturePattern;
        const name = document.getElementById('gestureName').value.trim();
        const action = document.getElementById('gestureAction').value;
        
        if (!pattern) {
            this.showMessage('请先录制一个手势', 'error');
            return;
        }
        
        if (!name) {
            this.showMessage('请输入手势名称', 'error');
            return;
        }
        
        if (!action) {
            this.showMessage('请选择手势动作', 'error');
            return;
        }
        
        // 检查是否已存在相同模式
        const exists = (this.settings.motions || []).find(g => g.pattern === pattern);
        if (exists) {
            if (!confirm('该手势模式已存在，是否覆盖？')) {
                return;
            }
            // 删除现有手势
            if (!this.settings.motions) {
                this.settings.motions = [];
            }
            const index = this.settings.motions.indexOf(exists);
            this.settings.motions.splice(index, 1);
        }
        
        // 添加新手势
        const newGesture = {
            pattern: pattern,
            name: name,
            action: action,
            enabled: true,
            custom: true
        };
        
        if (!this.settings.motions) {
            this.settings.motions = [];
        }
        this.settings.motions.push(newGesture);
        this.saveSettings();
        
        // 清空表单
        document.getElementById('gestureName').value = '';
        document.getElementById('gestureAction').value = '';
        this.currentGesturePattern = null;
        
        // 关闭录制区域
        this.cancelRecording();
        
        // 重新渲染
        this.renderCustomGestures();
        
        this.showMessage('自定义手势已保存', 'success');
    }
    
    async deleteCustomGesture(gesture) {
        if (!confirm(`确定要删除手势"${gesture.name}"吗？`)) {
            return;
        }
        
        const index = (this.settings.motions || []).indexOf(gesture);
        if (index !== -1) {
            this.settings.motions.splice(index, 1);
            await this.saveSettings();
            this.renderCustomGestures();
            this.showMessage('手势已删除', 'success');
        }
    }
    
    // 统计信息
    renderStatistics() {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;
        
        const motions = this.settings.motions || [];
        const stats = {
            totalGestures: motions.length,
            customGestures: motions.filter(g => g.custom).length,
            presetGestures: motions.filter(g => !g.custom).length
        };
        
        statsGrid.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">总手势数：</span>
                <span class="stat-value">${stats.totalGestures}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">自定义手势：</span>
                <span class="stat-value">${stats.customGestures}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">预设手势：</span>
                <span class="stat-value">${stats.presetGestures}</span>
            </div>
        `;
    }
    
    // 导入导出功能
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'gesture-settings.json';
        link.click();
        
        this.showMessage('设置已导出', 'success');
    }
    
    async importSettings(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const imported = JSON.parse(text);
            
            if (imported.gestures && Array.isArray(imported.gestures)) {
                if (confirm('导入设置将覆盖当前所有设置，确定继续吗？')) {
                    this.settings = imported;
                    await this.saveSettings();
                    this.render();
                    this.showMessage('设置已导入', 'success');
                }
            } else {
                throw new Error('无效的设置文件格式');
            }
        } catch (error) {
            console.error('导入失败:', error);
            this.showMessage('导入失败：' + error.message, 'error');
        }
    }
    
    async resetSettings() {
        if (!confirm('确定要重置所有设置吗？这将删除所有自定义手势。')) {
            return;
        }
        
        this.settings = {
            enabled: true,
            sensitivity: 50,
            gestures: this.getDefaultGestures()
        };
        
        await this.saveSettings();
        this.render();
        this.clearCanvas();
        
        this.showMessage('设置已重置', 'success');
    }
    
    // 验证敏感度值
    validateSensitivity(value) {
        // 处理undefined、null、空字符串等情况
        if (value === undefined || value === null || value === '') {
            console.warn('Sensitivity value is undefined/null/empty, using default: 30');
            return 30; // 默认值
        }
        
        const numValue = parseInt(value);
        if (isNaN(numValue)) {
            console.warn('Invalid sensitivity value, using default:', value);
            return 30; // 默认值
        }
        // 限制在10-50范围内
        return Math.max(10, Math.min(50, numValue));
    }
    
    // 验证轨迹持续时间值
    validateTrailDuration(value) {
        // 处理undefined、null、空字符串等情况
        if (value === undefined || value === null || value === '') {
            console.warn('Trail duration value is undefined/null/empty, using default: 1200');
            return 1200; // 默认值
        }
        
        const numValue = parseInt(value);
        if (isNaN(numValue)) {
            console.warn('Invalid trail duration value, using default:', value);
            return 1200; // 默认值
        }
        // 限制在500-3000范围内
        return Math.max(500, Math.min(3000, numValue));
    }

    showMessage(text, type = 'info') {
        // 移除现有消息
        const existingMessage = document.querySelector('.message-toast');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const message = document.createElement('div');
        message.className = `message-toast ${type}`;
        message.textContent = text;
        
        document.body.appendChild(message);
        
        // 自动消失
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
    }
}

// 初始化选项页面
document.addEventListener('DOMContentLoaded', () => {
    new MotionOptions();
});
