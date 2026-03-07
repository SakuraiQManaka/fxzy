// timer-plugin.js – 可拖动计时器 (使用外部CSS)
(function() {
    'use strict';

    function initPlugin() {
        // 不再生成随机ID，使用固定类名
        const container = document.createElement('div');
        container.className = 'timer-plugin';  // 固定类名
        container.innerHTML = `
            <div class="drag-bar" id="drag-timer">
                <div class="drag-bar-left">
                    ⠇⠇ <span>拖拽</span>
                </div>
                <button class="hide-btn" id="hide-timer">隐藏</button>
            </div>
            <div class="timer-display">
                <div class="time" id="time-timer">00:00:00</div>
            </div>
            <div class="button-group" id="btns-timer"></div>
        `;

        document.body.appendChild(container);

        // 获取内部元素（使用固定ID）
        const dragHandle = document.getElementById('drag-timer');
        const hideBtn = document.getElementById('hide-timer');
        const timerDisplay = document.getElementById('time-timer');
        const buttonGroup = document.getElementById('btns-timer');

        // 计时逻辑（与原相同）
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

        // 状态渲染
        let currentState = 'idle';

        function renderState(newState) {
            currentState = newState;
            let html = '';
            if (newState === 'idle') {
                html = `<button class="shape-btn" data-action="start">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>`;
            } else if (newState === 'running') {
                html = `<button class="shape-btn" data-action="pause">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                </button>`;
            } else if (newState === 'paused') {
                html = `
                    <button class="shape-btn" data-action="resume">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <button class="shape-btn end-btn" data-action="end">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12"/>
                        </svg>
                    </button>
                `;
            }
            buttonGroup.innerHTML = html;

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

        // 隐藏/展开
        container.classList.remove('collapsed');
        hideBtn.textContent = '隐藏';

        hideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('collapsed');
            hideBtn.textContent = container.classList.contains('collapsed') ? '展开' : '隐藏';
        });

        // 拖动实现
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

            const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
            const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
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

        // 初始位置
        container.style.left = '80px';
        container.style.top = '80px';

        // 初始状态
        renderState('idle');
        updateDisplay();

        window.addEventListener('beforeunload', () => {
            if (intervalId) clearInterval(intervalId);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlugin);
    } else {
        initPlugin();
    }
})();