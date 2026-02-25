// 工具函数模块
// ===================================================
// 此模块封装了全局通用的工具函数，包括：
// 1. 消息提示框（右上角弹出提示）
// 2. 信息模态框（显示更新日志、整体进度）
// 3. 更新日志的查看逻辑
// ===================================================

const utils = (function() {
    // -------------------- 状态变量 --------------------
    let messageCount = 0;           // 当前显示的消息数量（用于计算堆叠偏移）
    let lastMessageTime = 0;        // 上一条消息的显示时间戳，用于节流显示

    // -------------------- 更新日志数据 --------------------
    // 每次版本更新时可在这里添加一条记录
    const updateLogs = [
        {
            title: "Ver1.6-Beta-增加AI题解、AI对话助手",
            context: [
                "1. 增加了一个AI助手，在侧边栏输入Deepseek API Key即可与AI助手对话",
                "2. 增加了AI题解功能，在题解下点击AI生成题解按钮即可获得AI题解",
                "3. 增加了在做题页面上显示当前正在做的题库",
                "当前为测试版本，有问题可以通过邮箱反馈"
            ],
            date: "2026-1-24"
        },
        {
            title: "Ver1.5-重构数据结构，增加进度显示",
            context: [
                "这是一次小更新~但是也是最花时间的一次更新~",
                "1. 重构了数据结构并将原js脚本分为了多个",
                "2. 增加了显示进度的功能",
                "3. 修复了没有做完题目就刷新会导致剩余题目显示出错的bug",
                "4. 修复了导出错题和导入错题",
                "5. 增加了一种新的提示框，现在你可以看到右上角的提示了",
            ],
            date: "2025-11-6"
        },
        {
            title: "Ver1.2-整体进度和题库管理",
            context: [
                "1. 添加了整体进度管理功能",
                "2. 进度统一保存到index.json中",
                "3. 可以初始化全部题库进度",
                "4. 优化了代码结构，分割为多个模块",
            ],
            date: "2025-10-2"
        },
        {
            title: "Ver1.1-页面布局和新功能更新",
            context: [
                "1. 更新了当前做题数据显示，正确率现在有了一个小动画",
                "2. 更新了一个消息框功能",
                "3. 在标题栏放了一个更新日志按钮，现在可以点击查看更新日志了",
            ],
            date: "2025-10-1"
        },
        {
            title: "Ver1.0-刷题系统初始版本发布",
            context: "刷题系统第一个正式版本，无需导入即可开始做题",
            date: "2025-09-30"
        },
    ];

    // ===================================================
    // 显示右上角的提示消息（如成功、错误、警告等）
    // 参数：
    //  message: 显示的文本内容
    //  type: 消息类型，可选值：'success' | 'warning' | 'error' | 'info'
    // ===================================================
    function showMessage(message, type = 'info') {
        const currentTime = Date.now();
        const timeSinceLastMessage = currentTime - lastMessageTime;

        // 若距离上一条消息显示不足500ms，则延迟显示，防止消息重叠太快
        if (timeSinceLastMessage < 500 && messageCount > 0) {
            const delay = 500 - timeSinceLastMessage;
            setTimeout(() => {
                displayMessage(message, type);
            }, delay);
        } else {
            displayMessage(message, type);
        }
    }

    // ===================================================
    // 实际渲染提示消息框的函数
    // 通过创建一个div并从右上角滑入、5秒后自动消失
    // ===================================================
    function displayMessage(message, type) {
    lastMessageTime = Date.now(); // 更新最后一次显示时间

    // 每条消息垂直偏移量（用于多条堆叠时避免遮挡）
    const verticalOffset = messageCount * 80;

    // 创建消息框DOM元素
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box';
    messageBox.textContent = message;

    // 根据类型设置左边框颜色
    const colors = {
        success: '#28a745', // 绿色
        warning: '#ffc107', // 黄色
        error: '#dc3545',   // 红色
        info: '#4a00e0'     // 蓝紫色
    };
    const borderColor = colors[type] || colors.info;
    messageBox.style.borderLeftColor = borderColor;

    // 设置基础样式（固定定位+过渡动画）
    messageBox.style.position = 'fixed';
    messageBox.style.top = `${20 + verticalOffset}px`;
    messageBox.style.right = '-400px'; // 初始位置在右侧屏幕外
    messageBox.style.zIndex = '1000';
    messageBox.style.transition = 'right 0.5s ease, opacity 0.5s ease';
    messageBox.style.opacity = '0';
    
    // 添加消息框内部样式
    messageBox.style.backgroundColor = '#f8f9fa';
    messageBox.style.padding = '15px 20px';
    messageBox.style.borderRadius = '4px';
    messageBox.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    messageBox.style.borderLeft = `4px solid ${borderColor}`;
    messageBox.style.maxWidth = '350px';
    messageBox.style.wordWrap = 'break-word';

    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style.position = 'absolute';
    progressContainer.style.bottom = '0';
    progressContainer.style.left = '0';
    progressContainer.style.width = '100%';
    progressContainer.style.height = '3px';
    progressContainer.style.backgroundColor = '#e9ecef';
    progressContainer.style.borderRadius = '0 0 4px 0'; // 调整圆角位置
    
    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.style.height = '100%';
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = borderColor;
    progressBar.style.borderRadius = '0 0 4px 0'; // 调整圆角位置
    progressBar.style.transition = 'width 2.5s linear';
    progressBar.style.marginLeft = 'auto'; // 关键：使进度条右对齐
    
    // 将进度条添加到容器
    progressContainer.appendChild(progressBar);
    
    // 将进度条添加到消息框
    messageBox.appendChild(progressContainer);
    
    document.body.appendChild(messageBox);
    messageCount++; // 增加当前显示数量

    // 启动滑入动画和进度条动画
    setTimeout(() => {
        messageBox.style.right = '20px';
        messageBox.style.opacity = '1';
        
        // 开始进度条动画
        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 10);
    }, 10);

    // 5秒后淡出并移除
    setTimeout(() => {
        messageBox.style.opacity = '0';
        messageBox.style.right = '-400px';
        setTimeout(() => {
            if (document.body.contains(messageBox)) {
                document.body.removeChild(messageBox);
            }
            messageCount--; // 消息数量递减
        }, 500);
    }, 2500); // 注意这里改成了5000ms以匹配进度条动画
}

    // ===================================================
    // 信息模态框（用于显示整体进度、更新日志等）
    // 参数 infoObj 包含：
    //  - title: 标题文字
    //  - context: 内容，可以是字符串/数组/HTML
    //  - date: 日期显示
    // ===================================================
    function showInfoModal(infoObj) {
        // 如果已有模态框，先移除
        const existingModal = document.querySelector('.info-modal');
        const existingOverlay = document.querySelector('.info-modal-overlay');
        if (existingModal) existingModal.remove();
        if (existingOverlay) existingOverlay.remove();

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'info-modal-overlay';

        // 创建主体框
        const modal = document.createElement('div');
        modal.className = 'info-modal';

        // 将context转换为HTML字符串
        let contentHTML = '';
        if (typeof infoObj.context === 'string') {
            contentHTML = `<p>${infoObj.context}</p>`;
        } else if (Array.isArray(infoObj.context)) {
            contentHTML = infoObj.context.map(item => `<p>${item}</p>`).join('');
        } else {
            contentHTML = infoObj.context;
        }

        // 插入HTML模板
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

        // 使用过渡动画显示
        setTimeout(() => {
            overlay.classList.add('show');
            modal.classList.add('show');
        }, 10);

        // 绑定关闭事件（按钮/点击遮罩/ESC）
        const closeBtn = modal.querySelector('.info-modal-close');
        closeBtn.addEventListener('click', closeInfoModal);
        overlay.addEventListener('click', closeInfoModal);

        function handleEscKey(event) {
            if (event.keyCode === 27) closeInfoModal();
        }
        document.addEventListener('keydown', handleEscKey);

        // 关闭模态框逻辑
        function closeInfoModal() {
            modal.classList.remove('show');
            overlay.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(modal)) document.body.removeChild(modal);
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
            }, 300);
            document.removeEventListener('keydown', handleEscKey);
        }
    }

    // ===================================================
    // 显示更新日志模态框
    // 从 updateLogs 数组中生成所有版本更新信息
    // ===================================================
    function showUpdateLogs() {
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

    // ===================================================
    // 模块导出接口
    // ===================================================
    return {
        showMessage,
        showInfoModal,
        showUpdateLogs
    };
})();
