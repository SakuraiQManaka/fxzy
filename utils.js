// 工具函数模块
const utils = (function() {
    // 消息队列和状态变量
    let messageQueue = [];
    let messageCount = 0; // 跟踪当前显示的消息数量
    let lastMessageTime = 0; // 记录上一条消息显示的时间

    // 更新日志数据
    const updateLogs = [
        {
            title: "Ver1.0-刷题系统初始版本发布",
            context: "刷题系统第一个正式版本，无需导入即可开始做题",
            date: "2025-09-30"
        },
        {
            title: "Ver1.1-页面布局和新功能更新",
            context: [
                "1. 更新了当前做题数据显示，正确率现在有了一个小动画",
                "2. 更新了一个消息框功能",
                "3. 在标题栏放了一个更新日志按钮，现在可以点击查看更新日志了",
            ],
            date: "2024-10-1"
        },
        {
            title: "Ver1.2-整体进度和题库管理",
            context: [
                "1. 添加了整体进度管理功能",
                "2. 进度统一保存到index.json中",
                "3. 可以初始化全部题库进度",
                "4. 优化了代码结构，分割为多个模块",
            ],
            date: "2024-10-2"
        }
    ];

    // 显示消息
    function showMessage(message, type = 'info') {
        const currentTime = Date.now();
        const timeSinceLastMessage = currentTime - lastMessageTime;
        
        // 如果距离上一条消息显示不足500ms，则延迟显示
        if (timeSinceLastMessage < 500 && messageCount > 0) {
            const delay = 500 - timeSinceLastMessage;
            setTimeout(() => {
                displayMessage(message, type);
            }, delay);
        } else {
            // 立即显示
            displayMessage(message, type);
        }
    }

    // 显示单个消息
    function displayMessage(message, type) {
        // 更新最后消息时间
        lastMessageTime = Date.now();
        
        // 计算垂直位置 - 根据当前显示的消息数量
        const verticalOffset = messageCount * 80; // 80px 为每条消息的高度+间距
        
        // 创建消息框元素
        const messageBox = document.createElement('div');
        messageBox.className = 'message-box';
        messageBox.textContent = message;
        
        // 根据类型设置不同的边框颜色
        const colors = {
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#4a00e0'
        };
        
        messageBox.style.borderLeftColor = colors[type] || colors.info;
        
        // 设置初始位置 - 从右上角外部开始
        messageBox.style.position = 'fixed';
        messageBox.style.top = `${20 + verticalOffset}px`;
        messageBox.style.right = '-400px'; // 从右侧外部开始
        messageBox.style.zIndex = '1000';
        messageBox.style.transition = 'right 0.5s ease, opacity 0.5s ease';
        messageBox.style.opacity = '0';
        
        // 添加到页面
        document.body.appendChild(messageBox);
        
        // 增加消息计数
        messageCount++;
        
        // 显示消息框 - 从右侧滑入
        setTimeout(() => {
            messageBox.style.right = '20px';
            messageBox.style.opacity = '1';
        }, 10);
        
        // 5秒后开始淡出
        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.style.right = '-400px'; // 滑出到右侧
            
            // 动画完成后移除元素
            setTimeout(() => {
                if (document.body.contains(messageBox)) {
                    document.body.removeChild(messageBox);
                }
                
                // 减少消息计数
                messageCount--;
            }, 500);
        }, 5000);
    }

    // 显示信息框函数
    function showInfoModal(infoObj) {
        // 移除已存在的信息框
        const existingModal = document.querySelector('.info-modal');
        const existingOverlay = document.querySelector('.info-modal-overlay');
        if (existingModal) existingModal.remove();
        if (existingOverlay) existingOverlay.remove();
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'info-modal-overlay';
        
        // 创建信息框
        const modal = document.createElement('div');
        modal.className = 'info-modal';
        
        // 信息框内容 - 如果是字符串直接显示，如果是数组则处理为HTML
        let contentHTML = '';
        if (typeof infoObj.context === 'string') {
            contentHTML = `<p>${infoObj.context}</p>`;
        } else if (Array.isArray(infoObj.context)) {
            contentHTML = infoObj.context.map(item => `<p>${item}</p>`).join('');
        } else {
            contentHTML = infoObj.context;
        }
        
        modal.innerHTML = `
            <div class="info-modal-header">
                <div class="info-modal-title">${infoObj.title}</div>
                <div class="info-modal-date">${infoObj.date}</div>
                <div class="info-modal-close"></div>
            </div>
            <div class="info-modal-content">
                ${contentHTML}
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        
        // 显示信息框
        setTimeout(() => {
            overlay.classList.add('show');
            modal.classList.add('show');
        }, 10);
        
        // 关闭按钮事件
        const closeBtn = modal.querySelector('.info-modal-close');
        closeBtn.addEventListener('click', closeInfoModal);
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', closeInfoModal);
        
        // ESC键关闭
        function handleEscKey(event) {
            if (event.keyCode === 27) {
                closeInfoModal();
            }
        }
        document.addEventListener('keydown', handleEscKey);
        
        function closeInfoModal() {
            modal.classList.remove('show');
            overlay.classList.remove('show');
            
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 300);
            
            document.removeEventListener('keydown', handleEscKey);
        }
    }

    // 显示更新日志
    function showUpdateLogs() {
        // 显示所有更新日志的列表
        let logsContent = '<div class="update-logs-list">';
        
        updateLogs.forEach((log, index) => {
            let logContent = '';
            if (Array.isArray(log.context)) {
                logContent = log.context.map(item => `<p>${item}</p>`).join('');
            } else {
                logContent = `<p>${log.context}</p>`;
            }
            
            logsContent += `
                <div class="log-item ${index === 0 ? 'latest' : ''}">
                    <h4>${log.title}</h4>
                    <div class="log-date">${log.date}</div>
                    <div class="log-content">${logContent}</div>
                </div>
            `;
        });
        
        logsContent += '</div>';
        
        showInfoModal({
            title: "更新日志",
            context: logsContent,
            date: "最新更新: " + updateLogs[0].date
        });
    }

    return {
        showMessage,
        showInfoModal,
        showUpdateLogs
    };
})();