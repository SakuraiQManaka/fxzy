// ============================================
// AI侧边栏助手 - 增强版
// 功能：航空知识AI助手侧边栏（支持流式输出+Markdown渲染）
// 要求：用户自备DeepSeek API Key
// 使用：只需在HTML最后引入此文件
// ============================================

(function() {
    'use strict';
    
    // 配置参数
    const CONFIG = {
        // API配置
        API_BASE: 'https://api.deepseek.com',
        BALANCE_ENDPOINT: '/user/balance',
        CHAT_ENDPOINT: '/chat/completions',
        
        // 侧边栏配置
        SIDEBAR_WIDTH: 400,
        COLLAPSED_WIDTH: 48,
        POSITION: 'right', // 'left' 或 'right'
        ANIMATION_DURATION: 300,
        
        // 对话配置
        MAX_HISTORY: 10, // 最大对话历史记录数
        SYSTEM_PROMPT: "你是一位专业的航空知识助手，专门回答关于航空、飞行、飞机、航空史、航空技术、飞行员训练、航空安全、航空公司等方面的问题。请以专业、准确、易懂的方式回答用户的航空相关问题。如果用户询问非航空相关的问题，请礼貌地引导回航空主题。",
        MODEL: 'deepseek-chat',
        
        // 流式输出配置
        STREAMING: true,
        TYPING_SPEED: 20, // 打字速度（毫秒/字符）
        
        // 本地存储键名
        STORAGE_KEY: 'deepseek_sidebar_api_key',
        
        // 样式类名
        CLASSES: {
            sidebar: 'ai-sidebar',
            collapsed: 'ai-sidebar-collapsed',
            expanded: 'ai-sidebar-expanded',
            header: 'ai-sidebar-header',
            content: 'ai-sidebar-content',
            footer: 'ai-sidebar-footer',
            toggleBtn: 'ai-sidebar-toggle',
            toggleBtnInner: 'ai-sidebar-toggle-inner',
            apiKeyInput: 'ai-api-key-input',
            balanceInfo: 'ai-balance-info',
            chatContainer: 'ai-chat-container',
            messageList: 'ai-message-list',
            messageItem: 'ai-message-item',
            userMessage: 'ai-message-user',
            assistantMessage: 'ai-message-assistant',
            assistantMessageStreaming: 'ai-message-assistant-streaming',
            inputArea: 'ai-input-area',
            sendBtn: 'ai-send-btn',
            newChatBtn: 'ai-new-chat-btn',
            statusIndicator: 'ai-status-indicator',
            thinking: 'ai-thinking'
        }
    };

    // 状态管理
    let state = {
        apiKey: null,
        isAuthenticated: false,
        balance: 0,
        isCollapsed: true,
        isThinking: false,
        isStreaming: false,
        currentStreamController: null,
        conversationHistory: [],
        currentConversationId: generateId(),
        isInitialized: false
    };
    
    // DOM元素引用
    let elements = {};
    
    // 工具函数
    function generateId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    function formatTime(date = new Date()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 验证API Key并查询余额
    async function validateApiKey(apiKey) {
        if (!apiKey || apiKey.trim().length < 10) {
            throw new Error('API Key格式不正确');
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}${CONFIG.BALANCE_ENDPOINT}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('API Key无效或已过期');
                } else if (response.status === 403) {
                    throw new Error('没有权限访问此API');
                } else {
                    throw new Error(`验证失败: ${response.status} ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            
            state.apiKey = apiKey;
            state.isAuthenticated = true;
            return true;
            
        } catch (error) {
            console.error('API验证错误:', error);
            throw error;
        }
    }
    
    // 停止当前流式输出
    function stopCurrentStream() {
        if (state.currentStreamController) {
            state.currentStreamController.abort();
            state.currentStreamController = null;
        }
        state.isStreaming = false;
        state.isThinking = false;
        updateStatusIndicator();
    }
    
    // 流式输出消息到DeepSeek API
    async function sendMessageStreamToAI(message) {
        if (!state.apiKey || !state.isAuthenticated) {
            throw new Error('请先验证API Key');
        }
        
        if (state.isThinking || state.isStreaming) {
            // 如果正在处理请求，先停止当前流
            stopCurrentStream();
        }
        
        state.isThinking = true;
        state.isStreaming = true;
        updateStatusIndicator();
        
        // 创建AbortController以便可以中断请求
        const controller = new AbortController();
        state.currentStreamController = controller;
        
        try {
            // 构建消息历史
            const messages = [
                { role: 'system', content: CONFIG.SYSTEM_PROMPT }
            ];
            
            // 添加最近的对话历史
            const recentHistory = state.conversationHistory.slice(-CONFIG.MAX_HISTORY);
            recentHistory.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });
            
            // 添加当前消息
            messages.push({ role: 'user', content: message });
            
            const response = await fetch(`${CONFIG.API_BASE}${CONFIG.CHAT_ENDPOINT}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: CONFIG.MODEL,
                    messages: messages,
                    stream: true, // 启用流式输出
                    max_tokens: 2000
                }),
                signal: controller.signal
            });
            
            if (!response.ok) {
                let errorMsg = `请求失败: ${response.status}`;
                if (response.status === 429) {
                    errorMsg = '请求过于频繁，请稍后再试';
                } else if (response.status === 402) {
                    errorMsg = '余额不足，请充值或检查API Key';
                    state.isAuthenticated = false;
                } else if (response.status === 401) {
                    errorMsg = 'API Key无效或已过期';
                    state.isAuthenticated = false;
                }
                throw new Error(errorMsg);
            }
            
            // 创建AI消息元素
            const aiMessageElement = createStreamingMessageElement();
            
            // 读取流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                // 解码块
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices && data.choices[0] && data.choices[0].delta) {
                                const delta = data.choices[0].delta;
                                
                                if (delta.content) {
                                    accumulatedContent += delta.content;
                                    // 更新消息内容（使用打字机效果）
                                    updateStreamingMessage(aiMessageElement, accumulatedContent);
                                }
                            }
                        } catch (e) {
                            // 忽略JSON解析错误
                        }
                    }
                }
            }
            
            // 流式传输完成
            state.conversationHistory.push({ role: 'user', content: message });
            state.conversationHistory.push({ role: 'assistant', content: accumulatedContent });
            
            // 将流式消息标记为完成
            completeStreamingMessage(aiMessageElement, accumulatedContent);
            
            return accumulatedContent;
            
        } catch (error) {
            console.error('AI流式请求错误:', error);
            
            // 如果是用户中断，不显示错误
            if (error.name === 'AbortError') {
                return '';
            }
            
            throw error;
        } finally {
            state.isThinking = false;
            state.isStreaming = false;
            state.currentStreamController = null;
            updateStatusIndicator();
        }
    }
    
    // 创建流式消息元素
    function createStreamingMessageElement() {
        const messageList = elements.messageList;
        if (!messageList) return null;
        
        const messageItem = document.createElement('div');
        messageItem.className = `${CONFIG.CLASSES.messageItem} ${CONFIG.CLASSES.assistantMessage} ${CONFIG.CLASSES.assistantMessageStreaming}`;
        
        const time = formatTime();
        
        messageItem.innerHTML = `
            <div class="ai-message-header">
                <span class="ai-message-role">航空助手</span>
                <span class="ai-message-time">${time}</span>
                <span class="ai-streaming-indicator">思考中...</span>
            </div>
            <div class="ai-message-content"></div>
        `;
        
        messageList.appendChild(messageItem);
        messageList.scrollTop = messageList.scrollHeight;
        
        return {
            container: messageItem,
            contentElement: messageItem.querySelector('.ai-message-content'),
            headerElement: messageItem.querySelector('.ai-message-header')
        };
    }
    
    // 更新流式消息内容（打字机效果）
    function updateStreamingMessage(messageElement, content) {
        if (!messageElement || !messageElement.contentElement) return;
        
        // 解析Markdown
        const formattedContent = window.mdRenderer.render(content);
        
        // 更新内容
        messageElement.contentElement.innerHTML = formattedContent;
        
        // 滚动到底部
        const messageList = elements.messageList;
        if (messageList) {
            messageList.scrollTop = messageList.scrollHeight;
        }
        
        // 更新流式指示器
        const indicator = messageElement.headerElement.querySelector('.ai-streaming-indicator');
        if (indicator) {
            indicator.textContent = '正在输入...';
        }
    }
    
    // 完成流式消息
    function completeStreamingMessage(messageElement, content) {
        if (!messageElement || !messageElement.container) return;
        
        // 移除流式样式
        messageElement.container.classList.remove(CONFIG.CLASSES.assistantMessageStreaming);
        
        // 更新流式指示器
        const indicator = messageElement.headerElement.querySelector('.ai-streaming-indicator');
        if (indicator) {
            indicator.textContent = '完成';
            setTimeout(() => indicator.remove(), 1000);
        }
        
        // 最终解析Markdown
        const formattedContent = window.mdRenderer.render(content);
        if (messageElement.contentElement) {
            messageElement.contentElement.innerHTML = formattedContent;
        }
    }
    
    // 更新状态指示器
    function updateStatusIndicator() {
        const indicator = elements.statusIndicator;
        if (!indicator) return;
        
        if (state.isThinking || state.isStreaming) {
            indicator.textContent = '思考中...';
            indicator.className = `${CONFIG.CLASSES.statusIndicator} ${CONFIG.CLASSES.thinking}`;
            // thinking 优先显示动画样式
        } else if (state.isAuthenticated) {
            indicator.textContent = `已连接`;
            // 设置 connected 类以显示绿色小点
            indicator.className = `${CONFIG.CLASSES.statusIndicator} connected`;
        } else {
            indicator.textContent = '未连接';
            // 未连接保持默认样式（红点），可加上 disconnected 类以便扩展
            indicator.className = `${CONFIG.CLASSES.statusIndicator} disconnected`;
        }
    }
    
    // 切换侧边栏展开/缩回状态
    function toggleSidebar() {
        state.isCollapsed = !state.isCollapsed;
        
        const sidebar = elements.sidebar;
        const toggleBtn = elements.toggleBtn;
        const toggleBtnInner = elements.toggleBtnInner;
        
        if (state.isCollapsed) {
            // 收起侧边栏
            sidebar.classList.add(CONFIG.CLASSES.collapsed);
            sidebar.classList.remove(CONFIG.CLASSES.expanded);
            
            // 更新按钮位置和图标
            if (CONFIG.POSITION === 'right') {
                toggleBtn.style.right = '0';
                toggleBtn.style.left = 'auto';
                toggleBtnInner.innerHTML = '&#9664;'; // 左箭头（指向左侧展开）
            } else {
                toggleBtn.style.left = '0';
                toggleBtn.style.right = 'auto';
                toggleBtnInner.innerHTML = '&#9654;'; // 右箭头（指向右侧展开）
            }
            
            toggleBtn.title = '展开侧边栏';
        } else {
            // 展开侧边栏
            sidebar.classList.remove(CONFIG.CLASSES.collapsed);
            sidebar.classList.add(CONFIG.CLASSES.expanded);
            
            // 更新按钮位置和图标
            if (CONFIG.POSITION === 'right') {
                toggleBtn.style.right = `${CONFIG.SIDEBAR_WIDTH}px`;
                toggleBtn.style.left = 'auto';
                toggleBtnInner.innerHTML = '&#9654;'; // 上箭头
            } else {
                toggleBtn.style.left = `${CONFIG.SIDEBAR_WIDTH}px`;
                toggleBtn.style.right = 'auto';
                toggleBtnInner.innerHTML = '&#9654;'; // 下箭头
            }
            
            toggleBtn.title = '收起侧边栏';
        }
    }
    
    // 创建新对话
    function createNewConversation() {
        if (state.isStreaming) {
            if (!confirm('正在生成回复，确定要中断并开始新对话吗？')) {
                return;
            }
            stopCurrentStream();
        }
        
        if (state.conversationHistory.length > 0) {
            if (!confirm('确定要开始新对话吗？当前对话历史将被清空。')) {
                return;
            }
        }
        
        state.conversationHistory = [];
        state.currentConversationId = generateId();
        
        // 清空消息列表
        const messageList = elements.messageList;
        if (messageList) {
            messageList.innerHTML = '';
            
            // 添加欢迎消息
            addMessageToUI('assistant', '你好！我是航空知识助手，请问有什么关于航空的问题可以帮您解答？');
        }
        
        // 更新标题显示当前为新对话
        const headerTitle = elements.header.querySelector('h2');
        if (headerTitle) {
            headerTitle.textContent = '航空助手 (新对话)';
        }
    }
    
    // 添加消息到UI（非流式）
    function addMessageToUI(role, content) {
        const messageList = elements.messageList;
        if (!messageList) return;
        
        const messageItem = document.createElement('div');
        messageItem.className = `${CONFIG.CLASSES.messageItem} ${role === 'user' ? CONFIG.CLASSES.userMessage : CONFIG.CLASSES.assistantMessage}`;
        
        const time = formatTime();
        const formattedContent = window.mdRenderer.render(content);
        
        messageItem.innerHTML = `
            <div class="ai-message-header">
                <span class="ai-message-role">${role === 'user' ? '我' : '航空助手'}</span>
                <span class="ai-message-time">${time}</span>
            </div>
            <div class="ai-message-content">${formattedContent}</div>
        `;
        
        messageList.appendChild(messageItem);
        
        // 滚动到底部
        messageList.scrollTop = messageList.scrollHeight;
    }
    
    // 处理发送消息
    async function handleSendMessage() {
        const input = elements.messageInput;
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        // 清空输入框
        input.value = '';
        input.style.height = 'auto';
        
        // 添加用户消息到UI
        addMessageToUI('user', message);
        
        try {
            // 发送到AI并获取流式回复
            await sendMessageStreamToAI(message);
            
        } catch (error) {
            // 显示错误消息
            addMessageToUI('assistant', `抱歉，出现错误: ${error.message}`);
            
            // 如果是因为认证失效，切换回验证界面
            if (error.message.includes('API Key无效') || error.message.includes('余额不足')) {
                switchToAuthView();
            }
        }
    }
    
    // 切换到验证界面
    function switchToAuthView() {
        // 停止任何正在进行的流
        stopCurrentStream();
        
        state.isAuthenticated = false;
        state.apiKey = null;
        state.conversationHistory = [];
        
        // 显示验证界面，隐藏对话界面
        const authView = elements.authView;
        const chatView = elements.chatView;
        
        if (authView) authView.style.display = 'block';
        if (chatView) chatView.style.display = 'none';
        
        // 清除API Key输入框
        const apiKeyInput = elements.apiKeyInput;
        if (apiKeyInput) apiKeyInput.value = '';
        
        // 清空消息列表
        const messageList = elements.messageList;
        if (messageList) messageList.innerHTML = '';
        
        updateStatusIndicator();
    }
    
    // 切换到对话界面
    function switchToChatView() {
        // 显示对话界面，隐藏验证界面
        const authView = elements.authView;
        const chatView = elements.chatView;
        
        if (authView) authView.style.display = 'none';
        if (chatView) chatView.style.display = 'flex';
        
        // 添加欢迎消息
        const messageList = elements.messageList;
        if (messageList && messageList.children.length === 0) {
            addMessageToUI('assistant', '你好！我是航空知识助手，专门解答关于航空、飞行、飞机等方面的问题。请问有什么可以帮您？');
        }
        
        // 聚焦到输入框
        const messageInput = elements.messageInput;
        if (messageInput) {
            setTimeout(() => messageInput.focus(), 100);
        }
    }
    
    // 处理API Key验证
    async function handleApiKeySubmit() {
        const apiKeyInput = elements.apiKeyInput;
        const submitBtn = elements.apiKeySubmitBtn;
        const errorMsg = elements.apiKeyError;
        
        if (!apiKeyInput || !submitBtn || !errorMsg) return;
        
        const apiKey = apiKeyInput.value.trim();
        
        // 禁用按钮，显示加载状态
        submitBtn.disabled = true;
        submitBtn.textContent = '验证中...';
        errorMsg.textContent = '';
        
        try {
            // 验证API Key
            await validateApiKey(apiKey);
            
            // 验证成功，切换到对话界面
            switchToChatView();
            
            // 保存到本地存储（可选）
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, apiKey);
            } catch (e) {
                console.warn('无法保存API Key到本地存储:', e);
            }
            // 更新状态指示器以显示已连接状态
            try {
                updateStatusIndicator();
            } catch (e) {
                console.warn('更新状态指示器失败', e);
            }
            
        } catch (error) {
            // 显示错误信息
            errorMsg.textContent = error.message;
            console.error('API Key验证失败:', error);
        } finally {
            // 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.textContent = '验证并开始对话';
        }
    }
    
    // 创建侧边栏DOM结构
    function createSidebar() {
        // 创建主容器
        const sidebar = document.createElement('div');
        sidebar.id = 'ai-sidebar';
        sidebar.className = `ai-sidebar ai-sidebar-collapsed`;
        
        // 侧边栏头部
        const header = document.createElement('div');
        header.className = CONFIG.CLASSES.header;
        header.innerHTML = `
            <h2>航空知识助手</h2>
            <div class="${CONFIG.CLASSES.statusIndicator}"></div>
        `;
        
        // 侧边栏内容区域
        const content = document.createElement('div');
        content.className = CONFIG.CLASSES.content;
        
        // 验证界面
        const authView = document.createElement('div');
        authView.className = 'ai-auth-view';
        authView.innerHTML = `
            <div class="ai-auth-header">
                <h3>连接DeepSeek API</h3>
                <p>请输入您的DeepSeek API Key以使用航空知识助手</p>
            </div>
            <div class="ai-auth-form">
                <div class="ai-form-group">
                    <label for="ai-api-key">API Key</label>
                    <input type="password" 
                           id="ai-api-key" 
                           class="${CONFIG.CLASSES.apiKeyInput}" 
                           placeholder="输入您的DeepSeek API Key"
                           autocomplete="off">
                    <p class="ai-form-hint">您的API Key仅用于本次会话，不会发送到其他服务器</p>
                </div>
                <div class="ai-form-group">
                    <button id="ai-api-key-submit" class="ai-primary-btn">验证并开始对话</button>
                    <p id="ai-api-key-error" class="ai-error-msg"></p>
                </div>
                <div class="ai-auth-info">
                    <h4>如何获取API Key？</h4>
                    <ol>
                        <li>访问 <a href="https://platform.deepseek.com/" target="_blank">DeepSeek平台</a></li>
                        <li>注册或登录您的账户</li>
                        <li>在API控制台中创建新的API Key</li>
                        <li>确保账户有足够余额</li>
                        <li>复制Key并粘贴到上方输入框</li>
                    </ol>
                    <p class="ai-security-note">
                        <strong>安全提示:</strong> 请勿分享您的API Key。建议使用设置了用量限制的Key，并在使用后及时删除。
                    </p>
                </div>
            </div>
        `;
        
        // 对话界面
        const chatView = document.createElement('div');
        chatView.className = 'ai-chat-view';
        chatView.style.display = 'none'; // 默认隐藏
        chatView.innerHTML = `
            <div class="${CONFIG.CLASSES.chatContainer}">
                <div class="${CONFIG.CLASSES.messageList}"></div>
            </div>
        `;
        
        // 侧边栏底部
        const footer = document.createElement('div');
        footer.className = CONFIG.CLASSES.footer;
        footer.innerHTML = `
            <div class="ai-input-container">
                <div class="${CONFIG.CLASSES.inputArea}">
                    <textarea id="ai-message-input" 
                              placeholder="请输入问题... (Shift+Enter换行, Enter发送)" 
                              rows="1"></textarea>
                    <button id="ai-send-btn" class="${CONFIG.CLASSES.sendBtn}" title="发送消息">
                    发送
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="display:block;">
                            <path d="M22 2L11 13" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke:#ffffff!important;fill:none!important;"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke:#ffffff!important;fill:none!important;"/>
                        </svg>
                    </button>
                </div>
                <div class="ai-chat-controls">
                    <button id="ai-new-chat-btn" class="${CONFIG.CLASSES.newChatBtn}">新建对话</button>
                    <span class="ai-context-info">上下文: ${state.conversationHistory.length / 2} 轮对话</span>
                </div>
            </div>
        `;

        // 切换按钮（独立于侧边栏，始终可见）
        const toggleBtn = document.createElement('button');
        toggleBtn.className = CONFIG.CLASSES.toggleBtn;
        toggleBtn.title = '收起侧边栏';
        
        const toggleBtnInner = document.createElement('div');
        toggleBtnInner.className = CONFIG.CLASSES.toggleBtnInner;
        toggleBtnInner.innerHTML = '&#9654;'; // 初始为上箭头
        
        toggleBtn.appendChild(toggleBtnInner);
        
        // 组装侧边栏
        content.appendChild(authView);
        content.appendChild(chatView);
        
        sidebar.appendChild(header);
        sidebar.appendChild(content);
        sidebar.appendChild(footer);
        
        // 添加到页面
        document.body.appendChild(sidebar);
        document.body.appendChild(toggleBtn); // 切换按钮单独添加
        
        // 保存元素引用
        elements.sidebar = sidebar;
        elements.header = header;
        elements.content = content;
        elements.footer = footer;
        elements.toggleBtn = toggleBtn;
        elements.toggleBtnInner = toggleBtnInner;
        elements.authView = authView;
        elements.chatView = chatView;
        elements.messageList = chatView.querySelector(`.${CONFIG.CLASSES.messageList}`);
        
        // 获取其他动态元素
        elements.apiKeyInput = document.getElementById('ai-api-key');
        elements.apiKeySubmitBtn = document.getElementById('ai-api-key-submit');
        elements.apiKeyError = document.getElementById('ai-api-key-error');
        elements.messageInput = document.getElementById('ai-message-input');
        elements.sendBtn = document.getElementById('ai-send-btn');
        elements.newChatBtn = document.getElementById('ai-new-chat-btn');
        elements.statusIndicator = header.querySelector(`.${CONFIG.CLASSES.statusIndicator}`);
        
        // 创建拖动条
        const resizer = document.createElement('div');
        resizer.className = 'ai-sidebar-resizer';
        sidebar.appendChild(resizer);  // 将拖动条作为侧边栏的子元素，绝对定位

        // 将 sidebar 和 toggleBtn 添加到页面
        document.body.appendChild(sidebar);
        document.body.appendChild(toggleBtn);

        // ... 原有代码保存 elements ...

        // 绑定拖动事件
        let startX, startWidth;

        function onMouseMove(e) {
            e.preventDefault();
            const newWidth = startWidth + (e.clientX - startX) * (CONFIG.POSITION === 'right' ? -1 : 1);
            // 限制最小/最大宽度
            const minWidth = 200, maxWidth = 800;
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                sidebar.style.width = newWidth + 'px';
                // 更新切换按钮位置
                if (!state.isCollapsed) {
                    if (CONFIG.POSITION === 'right') {
                        toggleBtn.style.right = newWidth + 'px';
                    } else {
                        toggleBtn.style.left = newWidth + 'px';
                    }
                }
                // 更新 CONFIG.SIDEBAR_WIDTH 供其他逻辑使用（如移动端适配）
                CONFIG.SIDEBAR_WIDTH = newWidth;
            }
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // 初始状态指示器
        updateStatusIndicator();
        
        // 初始按钮位置（收起状态）
        if (CONFIG.POSITION === 'right') {
            toggleBtn.style.right = '0';
            toggleBtn.style.left = 'auto';
            toggleBtnInner.innerHTML = '&#9664;'; // 左箭头
        } else {
            toggleBtn.style.left = '0';
            toggleBtn.style.right = 'auto';
            toggleBtnInner.innerHTML = '&#9654;'; // 右箭头
        }
        toggleBtn.title = '展开侧边栏';
        
        // 检查本地存储中是否有保存的API Key
        try {
            const savedApiKey = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (savedApiKey && savedApiKey.length > 10) {
                // 自动填充但不自动验证
                elements.apiKeyInput.value = savedApiKey;
            }
        } catch (e) {
            console.warn('无法读取本地存储:', e);
        }
    }
    
    // 初始化事件监听
    function initEventListeners() {
        // API Key验证提交
        if (elements.apiKeySubmitBtn) {
            elements.apiKeySubmitBtn.addEventListener('click', handleApiKeySubmit);
        }
        
        // API Key输入框回车提交
        if (elements.apiKeyInput) {
            elements.apiKeyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleApiKeySubmit();
                }
            });
        }
        
        // 发送消息按钮
        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', handleSendMessage);
        }
        
        // 消息输入框回车发送（Shift+Enter换行）
        if (elements.messageInput) {
            elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            });
            
            // 自动调整高度
            elements.messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
                if (this.scrollHeight > 120) {
                    this.style.overflowY = 'auto';
                } else {
                    this.style.overflowY = 'hidden';
                }
            });
        }
        
        // 新建对话按钮
        if (elements.newChatBtn) {
            elements.newChatBtn.addEventListener('click', createNewConversation);
        }
        
        // 侧边栏切换按钮
        if (elements.toggleBtn) {
            elements.toggleBtn.addEventListener('click', toggleSidebar);
        }
        
        // 窗口大小调整时保持侧边栏位置
        window.addEventListener('resize', debounce(() => {
            if (window.innerWidth <= 768) {
                // 在移动设备上，侧边栏默认为全屏模式
                elements.sidebar.style.width = '100%';
            } else {
                elements.sidebar.style.width = `${CONFIG.SIDEBAR_WIDTH}px`;
            }
            
            // 更新切换按钮位置
            if (!state.isCollapsed) {
                if (CONFIG.POSITION === 'right') {
                    elements.toggleBtn.style.right = `${window.innerWidth <= 768 ? 0 : CONFIG.SIDEBAR_WIDTH}px`;
                } else {
                    elements.toggleBtn.style.left = `${window.innerWidth <= 768 ? 0 : CONFIG.SIDEBAR_WIDTH}px`;
                }
            }
        }, 250));
        
        // 点击页面其他区域不收起侧边栏（保持展开状态）
        document.addEventListener('click', (e) => {
            const isClickInsideSidebar = elements.sidebar.contains(e.target);
            const isClickOnToggleBtn = elements.toggleBtn.contains(e.target);
            
            // 如果点击了切换按钮或侧边栏内部，不执行额外操作
            if (isClickInsideSidebar || isClickOnToggleBtn) {
                return;
            }
            
            // 如果侧边栏已展开，点击外部不会收起
            // 这是为了满足"在原页面答题时，不要缩回"的需求
            // 用户需要主动点击切换按钮来收起
        });
    }
    
    // 主初始化函数
    function init() {
        if (state.isInitialized) {
            console.warn('AI侧边栏已初始化');
            return;
        }
        
        try {
            // 创建侧边栏DOM
            createSidebar();
            
            // 初始化事件监听
            initEventListeners();
            
            // 标记为已初始化
            state.isInitialized = true;
            
            console.log('AI侧边栏助手（增强版）已初始化完成');
            
            // 在移动设备上调整初始状态
            if (window.innerWidth <= 768) {
                state.isCollapsed = true;
                elements.sidebar.classList.remove('ai-sidebar-collapsed');
                elements.sidebar.classList.add('ai-sidebar-expanded');
            }
            
        } catch (error) {
            console.error('AI侧边栏初始化失败:', error);
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOMContentLoaded 已经触发
        init();
    }
    
    // 公开API（可选，用于外部控制）
    window.AISidebar = {
        toggle: toggleSidebar,
        newChat: createNewConversation,
        showAuth: switchToAuthView,
        showChat: switchToChatView,
        stopStreaming: stopCurrentStream,
        isAuthenticated: () => state.isAuthenticated,
        isStreaming: () => state.isStreaming,
        getState: () => ({ ...state })
    };
    
})();