// timer-plugin.js – 可拖动计时器插件
(function() {
    // 生成唯一容器ID，避免与页面样式冲突
    const containerId = 'timer-plugin-' + Math.random().toString(36).substring(2, 10);
    
    // ----- 样式定义 (作用域限定在 #容器ID 内) -----
    const style = document.createElement('style');
    style.textContent = `
        #${containerId} {
            all: initial; /* 重置继承样式 */
            position: fixed;
            left: 80px;
            top: 80px;
            width: 300px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 36px;
            box-shadow: 0 25px 50px -8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
            color: #0a1a2f;
            font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
            z-index: 10000;
            border: 1px solid rgba(255,255,255,0.5);
            user-select: none;
        }
        #${containerId}.hidden {
            display: none;
        }
        #${containerId} .drag-bar {
            background: rgba(255, 255, 255, 0.3);
            padding: 14px 16px 10px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            cursor: grab;
            transition: background 0.1s;
            border-radius: 36px 36px 0 0; /* 修复直角 */
        }
        #${containerId} .drag-bar:active {
            cursor: grabbing;
            background: rgba(255, 255, 255, 0.5);
        }
        #${containerId} .drag-bar-left {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 0.95rem;
            letter-spacing: 0.3px;
            color: #0b2b40;
        }
        #${containerId} .drag-bar-left span {
            background: rgba(0,30,60,0.15);
            padding: 4px 10px;
            border-radius: 40px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        #${containerId} .hide-btn {
            background: rgba(0, 0, 0, 0.12);
            border: none;
            border-radius: 30px;
            width: 58px;
            padding: 5px 0;
            font-size: 0.8rem;
            font-weight: 600;
            color: #1e2f47;
            cursor: pointer;
            transition: all 0.15s;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255,255,255,0.3);
        }
        #${containerId} .hide-btn:hover {
            background: rgba(0, 0, 0, 0.25);
            color: white;
        }
        #${containerId} .timer-display {
            background: rgba(255,255,255,0.4);
            margin: 16px 16px 8px 16px;
            padding: 24px 10px;
            border-radius: 50px;
            text-align: center;
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.06), 0 4px 12px rgba(0,20,40,0.2);
            border: 1px solid rgba(255,255,255,0.6);
        }
        #${containerId} .time {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 3.2rem;
            font-weight: 700;
            letter-spacing: 6px;
            color: #031020;
            text-shadow: 0 2px 5px rgba(255,255,255,0.5);
            line-height: 1.2;
        }
        #${containerId} .button-group {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            padding: 10px 16px 20px 16px;
            min-height: 72px;
        }
        #${containerId} .shape-btn {
            flex: 1;
            background: rgba(240, 248, 255, 0.6);
            border: none;
            border-radius: 40px;
            padding: 12px 0;
            font-weight: 700;
            font-size: 2rem;
            line-height: 1;
            color: #122b44;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 8px rgba(0, 10, 20, 0.2), 0 1px 2px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: 0.08s linear;
            border: 1px solid rgba(255,255,255,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #${containerId} .shape-btn:active {
            transform: translateY(3px);
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            background: rgba(220, 240, 255, 0.9);
        }
        #${containerId} .shape-btn.end-btn {
            background: rgba(255, 210, 210, 0.7);
            color: #5d1e1e;
        }
        /* 分裂动画 */
        #${containerId} .split-left {
            animation: splitPopLeft-${containerId} 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards;
        }
        #${containerId} .split-right {
            animation: splitPopRight-${containerId} 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards;
        }
        @keyframes splitPopLeft-${containerId} {
            0% { transform: scale(0.4) translateX(0); opacity: 0; }
            30% { transform: scale(1.1) translateX(-14px); opacity: 1; }
            80% { transform: scale(1) translateX(2px); }
            100% { transform: scale(1) translateX(0); opacity: 1; }
        }
        @keyframes splitPopRight-${containerId} {
            0% { transform: scale(0.4) translateX(0); opacity: 0; }
            30% { transform: scale(1.1) translateX(14px); opacity: 1; }
            80% { transform: scale(1) translateX(-2px); }
            100% { transform: scale(1) translateX(0); opacity: 1; }
        }
        /* 全局显示按钮 (在容器外，使用独立ID避免冲突) */
        #showBtn-${containerId} {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #ffffffcc;
            backdrop-filter: blur(10px);
            border-radius: 60px;
            padding: 14px 32px;
            font-weight: 700;
            font-size: 1.2rem;
            color: #091c30;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            transition: 0.2s;
            border: 1px solid white;
            letter-spacing: 0.5px;
            font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
            z-index: 10001;
        }
        #showBtn-${containerId}:hover {
            background: white;
            transform: scale(1.03);
        }
    `;
    document.head.appendChild(style);

    // ----- 创建HTML结构 -----
    const container = document.createElement('div');
    container.id = containerId;
    container.innerHTML = `
        <div class="drag-bar" id="drag-${containerId}">
            <div class="drag-bar-left">
                ⠇⠇ <span>拖拽</span>
            </div>
            <button class="hide-btn" id="hide-${containerId}">隐藏</button>
        </div>
        <div class="timer-display">
            <div class="time" id="time-${containerId}">00:00:00</div>
        </div>
        <div class="button-group" id="btns-${containerId}"></div>
    `;

    // 显示按钮（独立）
    const showBtn = document.createElement('button');
    showBtn.id = `showBtn-${containerId}`;
    showBtn.textContent = '📺 显示计时器';
    document.body.appendChild(showBtn);
    document.body.appendChild(container);

    // ----- 获取内部元素 -----
    const dragHandle = document.getElementById(`drag-${containerId}`);
    const hideBtn = document.getElementById(`hide-${containerId}`);
    const timerDisplay = document.getElementById(`time-${containerId}`);
    const buttonGroup = document.getElementById(`btns-${containerId}`);

    // ----- 计时逻辑 -----
    let isRunning = false;
    let accumulatedMs = 0;
    let timerStart = null;
    let intervalId = null;

    function formatTimeFromMs(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    function getCurrentMs() {
        if (isRunning && timerStart !== null) {
            return (performance.now() - timerStart) + accumulatedMs;
        } else {
            return accumulatedMs;
        }
    }

    function updateDisplay() {
        timerDisplay.textContent = formatTimeFromMs(getCurrentMs());
    }

    function startTimerInterval() {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(updateDisplay, 100);
    }

    function stopTimerInterval() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function onStart() {
        if (isRunning) return;
        timerStart = performance.now();
        isRunning = true;
        startTimerInterval();
        updateDisplay();
    }

    function onPause() {
        if (!isRunning) return;
        if (timerStart !== null) {
            accumulatedMs = (performance.now() - timerStart) + accumulatedMs;
        }
        isRunning = false;
        timerStart = null;
        stopTimerInterval();
        updateDisplay();
    }

    function onEnd() {
        if (isRunning) {
            stopTimerInterval();
            isRunning = false;
            timerStart = null;
        }
        accumulatedMs = 0;
        updateDisplay();
    }

    // ----- 状态渲染 -----
    let currentState = 'idle'; // idle, running, paused

    function renderState(newState) {
        currentState = newState;
        let html = '';
        if (newState === 'idle') {
            html = `<button class="shape-btn" data-action="start">▶</button>`;
        } else if (newState === 'running') {
            html = `<button class="shape-btn" data-action="pause">⏸️</button>`;
        } else if (newState === 'paused') {
            html = `
                <button class="shape-btn" data-action="resume">▶</button>
                <button class="shape-btn end-btn" data-action="end">⏹</button>
            `;
        }
        buttonGroup.innerHTML = html;

        // 如果是paused，添加分裂动画
        if (newState === 'paused') {
            const btns = buttonGroup.querySelectorAll('.shape-btn');
            if (btns.length === 2) {
                btns[0].classList.add('split-left');
                btns[1].classList.add('split-right');
                const onAnimationEnd = (e) => {
                    e.target.classList.remove('split-left', 'split-right');
                    e.target.removeEventListener('animationend', onAnimationEnd);
                };
                btns[0].addEventListener('animationend', onAnimationEnd);
                btns[1].addEventListener('animationend', onAnimationEnd);
            }
        }
    }

    // 按钮事件代理
    buttonGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.shape-btn');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (!action) return;

        switch (action) {
            case 'start':
                if (currentState === 'idle') {
                    onStart();
                    renderState('running');
                }
                break;
            case 'pause':
                if (currentState === 'running') {
                    onPause();
                    renderState('paused');
                }
                break;
            case 'resume':
                if (currentState === 'paused') {
                    onStart();
                    renderState('running');
                }
                break;
            case 'end':
                if (currentState === 'running' || currentState === 'paused') {
                    onEnd();
                    renderState('idle');
                }
                break;
        }
    });

    // ----- 隐藏/显示 -----
    hideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.add('hidden');
    });

    showBtn.addEventListener('click', () => {
        container.classList.remove('hidden');
        updateDisplay();
    });

    // ----- 拖动实现 -----
    let isDragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    function getCardPosition() {
        const style = window.getComputedStyle(container);
        const left = parseFloat(style.left) || 0;
        const top = parseFloat(style.top) || 0;
        return { left, top };
    }

    function setCardPosition(left, top) {
        container.style.left = left + 'px';
        container.style.top = top + 'px';
    }

    function onDragStart(e) {
        e.preventDefault();
        if (e.type === 'mousedown' && e.button !== 0) return;

        const clientX = e.clientX ?? e.touches[0].clientX;
        const clientY = e.clientY ?? e.touches[0].clientY;
        const pos = getCardPosition();
        startLeft = pos.left;
        startTop = pos.top;
        startX = clientX;
        startY = clientY;
        isDragging = true;

        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchmove', onDragMove, { passive: false });
        window.addEventListener('touchend', onDragEnd);
        window.addEventListener('touchcancel', onDragEnd);
        document.body.style.cursor = 'grabbing';
    }

    function onDragMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        let clientX, clientY;
        if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        const dx = clientX - startX;
        const dy = clientY - startY;
        setCardPosition(startLeft + dx, startTop + dy);
    }

    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('touchmove', onDragMove);
        window.removeEventListener('touchend', onDragEnd);
        window.removeEventListener('touchcancel', onDragEnd);
        document.body.style.cursor = '';
    }

    dragHandle.addEventListener('mousedown', onDragStart);
    dragHandle.addEventListener('touchstart', onDragStart, { passive: false });
    hideBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    hideBtn.addEventListener('touchstart', (e) => e.stopPropagation());

    // 设置初始位置
    container.style.left = '80px';
    container.style.top = '80px';

    // 初始状态
    renderState('idle');
    updateDisplay();

    // 清理定时器
    window.addEventListener('beforeunload', () => {
        if (intervalId) clearInterval(intervalId);
    });
})();