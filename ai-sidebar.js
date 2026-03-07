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
    
    // 配置 marked.js - 最终修正版（严格匹配 v14+ API）
    const renderer = new marked.Renderer();

    // 1. 自定义列表项渲染 (list_item token)
    renderer.listitem = function(token) {
    // 防御性检查
    if (!token) {
        return `<li class="md-list-item"></li>\n`;
    }

    let content = '';
    // 新版marked：列表项内容在 token.tokens 中
    if (token.tokens && Array.isArray(token.tokens) && token.tokens.length > 0) {
        try {
        // 解析列表项内部的段落、强调、文本等内联元素
        content = this.parser.parseInline(token.tokens);
        } catch (e) {
        console.warn('解析listitem内联tokens失败:', e);
        content = token.text || token.raw || '';
        }
    } else {
        // 降级处理：显示原始文本
        content = token.text || token.raw || '';
    }
    
    // 清理内容中的多余换行，避免破坏布局
    content = content.trim();
    return `<li class="md-list-item">${content}</li>\n`;
    };

    // 2. 自定义列表渲染 (list token) - 【核心修正】
    renderer.list = function(token) {
    if (!token) {
        console.warn('list函数收到空token');
        return `<ul class="md-list">\n</ul>\n`;
    }

    const ordered = token.ordered;
    const start = token.start;
    const type = ordered ? 'ol' : 'ul';
    const startAttr = (ordered && start !== 1) ? ` start="${start}"` : '';

    let body = '';
    
    // 【关键改变】新版marked使用 token.items 存放列表项
    if (token.items && Array.isArray(token.items)) {
        // 遍历每个列表项token，调用listitem渲染器
        const itemsHtml = token.items.map(itemToken => {
        // 确保每个itemToken能被正确处理
        return this.listitem(itemToken);
        }).join('');
        
        body = itemsHtml;
    } else {
        // 如果没有items，尝试用原始方式回退（为了兼容性）
        console.warn('list token缺少items属性，尝试使用tokens:', token);
        if (token.tokens && Array.isArray(token.tokens)) {
        body = this.parser.parse(token.tokens);
        } else {
        body = '<li>(列表内容无法解析)</li>';
        }
    }

    return `<${type} class="md-list"${startAttr}>\n${body}</${type}>\n`;
    };

    renderer.hr = function(token) {
        // 参数 token 在新版 marked (v14+) 中是一个对象，旧版可能是空或字符串
        // 无论参数是什么，我们只需要返回一个固定的 <hr> 标签
        // 可以给它添加一个类名以便自定义样式
        return `<hr class="md-hr">\n`;
    };

    // 3. 设置marked选项
    marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true,
    });

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
        const formattedContent = marked.parse(content);
        
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
        const formattedContent = marked.parse(content);
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
        const formattedContent = marked.parse(content);
        
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
        sidebar.className = `${CONFIG.CLASSES.sidebar} ${CONFIG.CLASSES.collapsed}`;
        
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
    
    // 创建并注入CSS样式
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* AI侧边栏主样式 */
            .${CONFIG.CLASSES.sidebar} {
                position: fixed;
                top: 0;
                ${CONFIG.POSITION}: 0;
                width: ${CONFIG.SIDEBAR_WIDTH}px;
                height: 100vh;
                background-color: #ffffff;
                box-shadow: -2px 0 20px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                z-index: 5000;
                transition: transform ${CONFIG.ANIMATION_DURATION}ms ease;
                border-left: 1px solid #e0e0e0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }
            
            .${CONFIG.CLASSES.sidebar}.${CONFIG.CLASSES.expanded} {
                transform: translateX(0);
            }
            
            .${CONFIG.CLASSES.sidebar}.${CONFIG.CLASSES.collapsed} {
                transform: translateX(${CONFIG.POSITION === 'right' ? CONFIG.SIDEBAR_WIDTH : -CONFIG.SIDEBAR_WIDTH}px);
            }
            
            /* 切换按钮样式 - 独立于侧边栏，始终可见 */
            .${CONFIG.CLASSES.toggleBtn} {
                position: fixed;
                top: 50%;
                ${CONFIG.POSITION}: 0;
                transform: translateY(-50%);
                width: ${CONFIG.COLLAPSED_WIDTH}px;
                height: ${CONFIG.COLLAPSED_WIDTH}px;
                background-color: #1a73e8;
                color: white;
                border: none;
                border-radius: ${CONFIG.POSITION === 'right' ? '8px 0 0 8px' : '0 8px 8px 0'};
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
                transition: all ${CONFIG.ANIMATION_DURATION}ms ease;
                z-index: 8000;
                padding: 0;
                margin: 0;
            }
            
            .${CONFIG.CLASSES.toggleBtn}:hover {
                background-color: #0d62d9;
                width: ${CONFIG.COLLAPSED_WIDTH + 4}px;
            }
            
            .${CONFIG.CLASSES.toggleBtnInner} {
                display: flex;
                    align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
            }
            
            /* 头部样式 */
            .${CONFIG.CLASSES.header} {
                padding: 16px 20px;
                background-color: #1a73e8;
                color: white;
                border-bottom: 1px solid #1565c0;
                flex-shrink: 0;
            }
            
            .${CONFIG.CLASSES.header} h2 {
                margin: 0 0 8px 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .${CONFIG.CLASSES.statusIndicator} {
                font-size: 12px;
                opacity: 0.9;
                display: flex;
                align-items: center;
            }

            /* 默认状态为未连接（红点） */
            .${CONFIG.CLASSES.statusIndicator}:before {
                content: '';
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #d93025; /* 未连接红色 */
                margin-right: 6px;
            }

            /* 已连接（绿色） */
            .${CONFIG.CLASSES.statusIndicator}.connected:before {
                background-color: #34a853;
            }

            /* 思考中（黄色且有呼吸动画） */
            .${CONFIG.CLASSES.statusIndicator}.${CONFIG.CLASSES.thinking}:before {
                background-color: #fbbc05;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            /* 内容区域样式 */
            .${CONFIG.CLASSES.content} {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            /* 验证界面样式 */
            .ai-auth-view {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            
            .ai-auth-header {
                margin-bottom: 24px;
            }
            
            .ai-auth-header h3 {
                margin: 0 0 8px 0;
                color: #202124;
                font-size: 20px;
            }
            
            .ai-auth-header p {
                margin: 0;
                color: #5f6368;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .ai-auth-form {
                margin-bottom: 24px;
            }
            
            .ai-form-group {
                margin-bottom: 20px;
            }
            
            .ai-form-group label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: #3c4043;
                font-size: 14px;
            }
            
            .${CONFIG.CLASSES.apiKeyInput} {
                width: 100%;
                padding: 12px;
                border: 1px solid #dadce0;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
                transition: border-color 0.2s;
            }
            
            .${CONFIG.CLASSES.apiKeyInput}:focus {
                outline: none;
                border-color: #1a73e8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
            }
            
            .ai-form-hint {
                font-size: 12px;
                color: #5f6368;
                margin: 6px 0 0 0;
            }
            
            .ai-primary-btn {
                background-color: #1a73e8;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                width: 100%;
                transition: background-color 0.2s;
            }
            
            .ai-primary-btn:hover {
                background-color: #0d62d9;
            }
            
            .ai-primary-btn:disabled {
                background-color: #b3d4fc;
                cursor: not-allowed;
            }
            
            .ai-error-msg {
                color: #d93025;
                font-size: 13px;
                margin: 8px 0 0 0;
                min-height: 20px;
            }
            
            .ai-auth-info {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 16px;
                margin-top: 24px;
                border-left: 4px solid #1a73e8;
            }
            
            .ai-auth-info h4 {
                margin: 0 0 12px 0;
                color: #202124;
                font-size: 16px;
            }
            
            .ai-auth-info ol {
                margin: 0 0 12px 0;
                padding-left: 20px;
                color: #5f6368;
                font-size: 14px;
                line-height: 1.6;
            }
            
            .ai-auth-info li {
                margin-bottom: 6px;
            }
            
            .ai-auth-info a {
                color: #1a73e8;
                text-decoration: none;
            }
            
            .ai-auth-info a:hover {
                text-decoration: underline;
            }
            
            .ai-security-note {
                font-size: 13px;
                color: #d93025;
                margin: 12px 0 0 0;
                padding: 8px 12px;
                background-color: #fce8e6;
                border-radius: 4px;
                border-left: 3px solid #d93025;
            }
            
            /* 对话界面样式 */
            .ai-chat-view {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            
            .${CONFIG.CLASSES.chatContainer} {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
            }
            
            .${CONFIG.CLASSES.messageList} {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .${CONFIG.CLASSES.messageItem} {
                max-width: 90%;
                padding: 12px 16px;
                border-radius: 18px;
                word-wrap: break-word;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .${CONFIG.CLASSES.messageItem}.${CONFIG.CLASSES.userMessage} {
                align-self: flex-end;
                background-color: #1a73e8;
                color: white;
                border-bottom-right-radius: 4px;
            }
            
            .${CONFIG.CLASSES.messageItem}.${CONFIG.CLASSES.assistantMessage} {
                align-self: flex-start;
                background-color: #f8f9fa;
                color: #202124;
                border-bottom-left-radius: 4px;
                border: 1px solid #e0e0e0;
            }
            
            .${CONFIG.CLASSES.messageItem}.${CONFIG.CLASSES.assistantMessageStreaming} {
                border-color: #1a73e8;
                box-shadow: 0 0 0 1px rgba(26, 115, 232, 0.1);
            }
            
            .ai-message-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                font-size: 12px;
            }
            
            .${CONFIG.CLASSES.messageItem}.${CONFIG.CLASSES.userMessage} .ai-message-header {
                color: rgba(255, 255, 255, 0.9);
            }
            
            .${CONFIG.CLASSES.messageItem}.${CONFIG.CLASSES.assistantMessage} .ai-message-header {
                color: #5f6368;
            }
            
            .ai-message-role {
                font-weight: 600;
            }
            
            .ai-streaming-indicator {
                font-size: 11px;
                color: #1a73e8;
                font-style: italic;
                animation: pulse 2s infinite;
            }
            
            /* ========== Markdown 内容样式 (为marked.js定制) ========== */
            .ai-message-content {
                line-height: 1.6;
                font-size: 14px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            /* 重置第一个和最后一个元素的边距 */
            .ai-message-content > *:first-child {
                margin-top: 0 !important;
            }
            
            .ai-message-content > *:last-child {
                margin-bottom: 0 !important;
            }
            
            /* 段落 */
            .ai-message-content p {
                margin: 0.75em 0;
                line-height: 1.6;
            }
            
            /* 标题 */
            .ai-message-content h1,
            .ai-message-content h2,
            .ai-message-content h3,
            .ai-message-content h4 {
                margin: 1.2em 0 0.6em 0;
                font-weight: 600;
                line-height: 1.3;
                color: #202124;
            }
            
            .ai-message-content h1 {
                font-size: 1.5em;
                padding-bottom: 0.3em;
                border-bottom: 1px solid #eaecef;
            }
            
            .ai-message-content h2 {
                font-size: 1.3em;
            }
            
            .ai-message-content h3 {
                font-size: 1.1em;
            }
            
            .ai-message-content h4 {
                font-size: 1em;
            }
            
            /* 内联样式 */
            .ai-message-content strong {
                font-weight: 700;
            }
            
            .ai-message-content em {
                font-style: italic;
            }
            
            /* 内联代码 */
            .ai-message-content code:not(pre code) {
                background-color: rgba(0, 0, 0, 0.05);
                padding: 0.2em 0.4em;
                border-radius: 3px;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 0.9em;
            }
            
            /* 代码块 */
            .ai-message-content pre {
                background-color: #f6f8fa;
                border-radius: 6px;
                padding: 12px;
                overflow-x: auto;
                margin: 1em 0;
                border: 1px solid #e1e4e8;
            }
            
            .ai-message-content pre code {
                background-color: transparent;
                padding: 0;
                border-radius: 0;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 0.9em;
                line-height: 1.5;
                display: block;
            }
            
            /* 列表 - 核心修正部分 */
            .ai-message-content ul,
            .ai-message-content ol,
            .ai-message-content .md-list {
                margin: 0.75em 0;
                padding-left: 2em;
                line-height: 1.6;
            }
            
            .ai-message-content ul,
            .ai-message-content .md-list:not(ol) {
                list-style-type: disc;
            }
            
            .ai-message-content ol,
            .ai-message-content .md-list[class*="ol"] {
                list-style-type: decimal;
            }
            
            .ai-message-content li,
            .ai-message-content .md-list-item {
                margin: 0.35em 0;
                display: list-item;
            }
            
            /* 嵌套列表 */
            .ai-message-content ul ul,
            .ai-message-content ul ol,
            .ai-message-content ol ul,
            .ai-message-content ol ol,
            .ai-message-content .md-list .md-list {
                margin: 0.25em 0;
            }
            
            .ai-message-content ul ul,
            .ai-message-content ol ul {
                list-style-type: circle;
            }
            
            .ai-message-content ul ul ul,
            .ai-message-content ol ul ul {
                list-style-type: square;
            }
            
            /* 引用 */
            .ai-message-content blockquote {
                border-left: 4px solid #1a73e8;
                padding: 0 1em;
                margin: 1em 0;
                color: #5f6368;
                font-style: italic;
            }
            
            .ai-message-content blockquote > :first-child {
                margin-top: 0;
            }
            
            .ai-message-content blockquote > :last-child {
                margin-bottom: 0;
            }
            
            /* 水平线 */
            .ai-message-content hr,
            .ai-message-content .md-hr {
                border: none;           /* 清除默认边框 */
                border-top: 1px solid #e0e0e0; /* 设置细线颜色 */
                margin: 1.5em auto;     
                width: 100%;            /* 确保宽度 */
                height: 1px;
                background-color: #e0e0e0; /* 备用背景色 */
            }
            
            /* 链接 */
            .ai-message-content a {
                color: #1a73e8;
                text-decoration: none;
            }
            
            .ai-message-content a:hover {
                text-decoration: underline;
            }
            
            /* 图片 */
            .ai-message-content img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
            }
            
            /* 底部输入区域样式 */
            .${CONFIG.CLASSES.footer} {
                border-top: 1px solid #e0e0e0;
                padding: 16px;
                background-color: #ffffff;
                flex-shrink: 0;
            }
            
            .ai-input-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .${CONFIG.CLASSES.inputArea} {
                display: flex;
                gap: 8px;
                align-items: flex-end;
            }
            
            #ai-message-input {
                flex: 1;
                padding: 12px;
                border: 1px solid #dadce0;
                border-radius: 20px;
                font-size: 14px;
                font-family: inherit;
                resize: none;
                max-height: 120px;
                min-height: 44px;
                box-sizing: border-box;
                transition: border-color 0.2s;
            }
            
            #ai-message-input:focus {
                outline: none;
                border-color: #1a73e8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
            }
            
            .${CONFIG.CLASSES.sendBtn} {
                background-color: #1a73e8;
                color: white;
                border: none;
                border-radius: 50%;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s;
                flex-shrink: 0;
                position: relative;
                z-index: 20002; /* 确保位于侧边栏之上 */
            }

            /* 保证 SVG 图标可见并继承按钮颜色 */
            .${CONFIG.CLASSES.sendBtn} svg {
                display: block;
                width: 20px;
                height: 20px;
                color: inherit;
            }
            /* 强制 SVG 路径使用按钮颜色，防止全局样式覆盖 */
            .${CONFIG.CLASSES.sendBtn} svg path,
            .${CONFIG.CLASSES.sendBtn} svg line,
            .${CONFIG.CLASSES.sendBtn} svg polygon,
            .${CONFIG.CLASSES.sendBtn} svg rect {
                stroke: currentColor !important;
                fill: none !important;
            }
            
            .${CONFIG.CLASSES.sendBtn}:hover {
                background-color: #0d62d9;
            }
            
            .${CONFIG.CLASSES.sendBtn}:disabled {
                background-color: #b3d4fc;
                cursor: not-allowed;
            }
            
            .ai-chat-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #5f6368;
            }
            
            .${CONFIG.CLASSES.newChatBtn} {
                background: none;
                border: 1px solid #dadce0;
                border-radius: 16px;
                padding: 6px 12px;
                font-size: 12px;
                color: #5f6368;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .${CONFIG.CLASSES.newChatBtn}:hover {
                background-color: #f8f9fa;
                border-color: #c6c9ce;
            }
            
            .ai-context-info {
                font-size: 11px;
                opacity: 0.7;
            }
            
            /* 响应式调整 */
            @media (max-width: 768px) {
                .${CONFIG.CLASSES.sidebar} {
                    width: 100%;
                    max-width: 100%;
                }
                
                .${CONFIG.CLASSES.sidebar}.${CONFIG.CLASSES.collapsed} {
                    transform: translateX(${CONFIG.POSITION === 'right' ? '100%' : '-100%'});
                }
                
                .${CONFIG.CLASSES.toggleBtn} {
                    width: 40px;
                    height: 40px;
                    font-size: 16px;
                }
                
                /* 在移动端缩小一些边距 */
                .ai-message-content h1,
                .ai-message-content h2,
                .ai-message-content h3 {
                    margin: 1em 0 0.5em 0;
                }
                
                .ai-message-content p,
                .ai-message-content ul,
                .ai-message-content ol {
                    margin: 0.5em 0;
                }
            }
            
            /* 滚动条样式 */
            ::-webkit-scrollbar {
                width: 6px;
            }
            
            ::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            
            ::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
        `;
        
        document.head.appendChild(style);
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
            // 注入CSS样式
            injectStyles();
            
            // 创建侧边栏DOM
            createSidebar();
            
            // 初始化事件监听
            initEventListeners();
            
            // 标记为已初始化
            state.isInitialized = true;
            
            console.log('AI侧边栏助手（增强版）已初始化完成');
            
            // 在移动设备上调整初始状态
            if (window.innerWidth <= 768) {
                // 在移动设备上默认展开
                state.isCollapsed = true;
                elements.sidebar.classList.remove(CONFIG.CLASSES.collapsed);
                elements.sidebar.classList.add(CONFIG.CLASSES.expanded);
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