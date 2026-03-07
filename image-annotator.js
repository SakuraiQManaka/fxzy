// image-annotator.js – 高级版图片标注（修复撤销与橡皮擦拖动）
(function() {
    'use strict';

    // 图片选择器
    const IMAGE_SELECTORS = ['.question-image', '#explanationImage'];

    // 常量
    const ERASE_THRESHOLD = 10;          // 橡皮擦删除距离阈值（像素）
    const CONTAINER_MAX_WIDTH = 90;       // vw
    const CONTAINER_MAX_HEIGHT = 70;      // vh

    // ========== 创建模态框 ==========
    const modal = document.createElement('div');
    modal.id = 'image-annotator-modal';
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'none',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000',
        userSelect: 'none'
    });

    const content = document.createElement('div');
    Object.assign(content.style, {
        background: '#fff',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: CONTAINER_MAX_WIDTH + 'vw',
        maxHeight: CONTAINER_MAX_HEIGHT + 'vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    });

    // 工具栏容器
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
        width: '100%',
        marginBottom: '15px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'center'
    });

    // ========== 工具按钮生成器 ==========
    function createToolButton(text, title, mode, active = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title;
        btn.dataset.mode = mode;
        Object.assign(btn.style, {
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            background: active ? '#007bff' : 'transparent',
            color: active ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '16px',
            transition: '0.2s'
        });
        btn.addEventListener('click', () => setMode(mode));
        return btn;
    }

    function createIconButton(text, title, bgColor = '#6c757d') {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title;
        Object.assign(btn.style, {
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            background: bgColor,
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
        });
        return btn;
    }

    // 模式按钮组
    const modeGroup = document.createElement('div');
    modeGroup.style.cssText = 'display:flex; gap:4px; background:#f0f0f0; padding:4px; border-radius:8px;';

    const brushBtn = createToolButton('✏️', '画笔', 'brush', true);
    const lineBtn = createToolButton('📏', '直线', 'line');
    const eraseBtn = createToolButton('🧽', '对象橡皮擦', 'erase');
    const panBtn = createToolButton('✋', '平移视图', 'pan');

    modeGroup.append(brushBtn, lineBtn, eraseBtn, panBtn);

    // 颜色选择
    const colorGroup = document.createElement('div');
    colorGroup.style.cssText = 'display:flex; gap:8px; margin-left:8px;';
    const colors = [
        { name: '黑', value: '#000000' },
        { name: '蓝', value: '#0000ff' },
        { name: '红', value: '#ff0000' }
    ];
    const colorSwatches = [];
    colors.forEach(c => {
        const swatch = document.createElement('div');
        Object.assign(swatch.style, {
            width: '30px',
            height: '30px',
            borderRadius: '4px',
            background: c.value,
            border: `2px solid ${c.value === '#000000' ? '#888' : c.value}`,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        });
        swatch.dataset.color = c.value;
        swatch.title = c.name;
        swatch.addEventListener('click', () => setColor(c.value));
        colorGroup.appendChild(swatch);
        colorSwatches.push(swatch);
    });

    // 缩放控制
    const zoomGroup = document.createElement('div');
    zoomGroup.style.cssText = 'display:flex; align-items:center; gap:5px; margin-left:8px;';
    const zoomOutBtn = createIconButton('−', '缩小');
    const zoomInBtn = createIconButton('+', '放大');
    const zoomResetBtn = createIconButton('↺', '重置缩放');
    const zoomLevel = document.createElement('span');
    zoomLevel.textContent = '100%';
    zoomLevel.style.minWidth = '50px';
    zoomLevel.style.textAlign = 'center';

    zoomGroup.append(zoomOutBtn, zoomLevel, zoomInBtn, zoomResetBtn);

    // 操作按钮组
    const actionGroup = document.createElement('div');
    actionGroup.style.cssText = 'display:flex; gap:8px; margin-left:auto;';
    const undoBtn = createIconButton('↩️', '撤销', '#17a2b8');
    const redoBtn = createIconButton('↪️', '重做', '#17a2b8');
    const clearAllBtn = createIconButton('🗑️', '清除全部标注', '#dc3545');
    const closeBtn = createIconButton('✖', '关闭', '#dc3545');

    actionGroup.append(undoBtn, redoBtn, clearAllBtn, closeBtn);

    // 组装工具栏
    toolbar.append(modeGroup, colorGroup, zoomGroup, actionGroup);

    // 画布容器（固定大小，overflow hidden，用于平移）
    const canvasContainer = document.createElement('div');
    Object.assign(canvasContainer.style, {
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: 'calc(70vh - 80px)', // 减去工具栏和间距
        backgroundColor: '#eee',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    });

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        cursor: 'crosshair',
        border: '1px solid #ccc'
    });

    canvasContainer.appendChild(canvas);
    content.appendChild(toolbar);
    content.appendChild(canvasContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // ========== 全局状态 ==========
    let ctx = null;
    let currentImage = null;
    let annotations = [];                // 所有标注 { type, points, color, lineWidth }
    let undoStack = [];                   // 历史记录
    let redoStack = [];

    let currentMode = 'brush';            // brush / line / erase / pan
    let currentColor = '#ff0000';
    let lineWidth = 3;

    // 绘画临时变量
    let isDrawing = false;
    let tempLineStart = null;              // 直线起点 {x, y}
    let currentPathPoints = [];            // 当前路径点

    // 平移变量
    let isPanning = false;
    let panStartX = 0, panStartY = 0;
    let offsetX = 0, offsetY = 0;           // 画布相对于容器的偏移

    // 缩放
    let scaleFactor = 1;

    // ========== 初始化上下文 ==========
    function initCtx() {
        ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = currentColor;
    }

    // ========== 保存历史（保存当前状态到undo栈）==========
    function pushHistory() {
        // 将当前标注深拷贝入栈
        undoStack.push(JSON.parse(JSON.stringify(annotations)));
        // 清空重做栈
        redoStack = [];
    }

    // ========== 撤销 ==========
    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(JSON.parse(JSON.stringify(annotations)));
        annotations = undoStack.pop();
        redraw();
    }

    // ========== 重做 ==========
    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(JSON.parse(JSON.stringify(annotations)));
        annotations = redoStack.pop();
        redraw();
    }

    // ========== 重绘（画图片 + 所有标注） ==========
    function redraw() {
        if (!ctx || !currentImage) return;
        // 重置画布尺寸（像素不变）
        canvas.width = currentImage.naturalWidth;
        canvas.height = currentImage.naturalHeight;
        // 绘制图片
        ctx.drawImage(currentImage, 0, 0);

        // 绘制标注
        annotations.forEach(item => {
            ctx.beginPath();
            ctx.strokeStyle = item.color;
            ctx.lineWidth = item.lineWidth;
            if (item.type === 'path' && item.points.length >= 4) {
                ctx.moveTo(item.points[0], item.points[1]);
                for (let i = 2; i < item.points.length; i += 2) {
                    ctx.lineTo(item.points[i], item.points[i+1]);
                }
                ctx.stroke();
            } else if (item.type === 'line' && item.points.length === 4) {
                ctx.moveTo(item.points[0], item.points[1]);
                ctx.lineTo(item.points[2], item.points[3]);
                ctx.stroke();
            }
        });

        // 更新画布显示大小和位置
        applyTransform();
    }

    // ========== 应用缩放和平移到 CSS ==========
    function applyTransform() {
        if (!currentImage) return;
        const w = currentImage.naturalWidth * scaleFactor;
        const h = currentImage.naturalHeight * scaleFactor;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        // 限制偏移范围，防止画布移出太远
        const containerW = canvasContainer.clientWidth;
        const containerH = canvasContainer.clientHeight;
        const maxOffsetX = Math.max(0, w - containerW);
        const maxOffsetY = Math.max(0, h - containerH);
        offsetX = Math.min(0, Math.max(offsetX, -maxOffsetX));
        offsetY = Math.min(0, Math.max(offsetY, -maxOffsetY));

        canvas.style.left = offsetX + 'px';
        canvas.style.top = offsetY + 'px';
    }

    // ========== 设置缩放 ==========
    function setScale(factor) {
        scaleFactor = Math.max(0.2, Math.min(3, factor));
        zoomLevel.textContent = Math.round(scaleFactor * 100) + '%';
        applyTransform();
    }

    // ========== 模式切换 ==========
    function setMode(mode) {
        currentMode = mode;
        [brushBtn, lineBtn, eraseBtn, panBtn].forEach(btn => {
            const isActive = btn.dataset.mode === mode;
            btn.style.background = isActive ? '#007bff' : 'transparent';
            btn.style.color = isActive ? 'white' : '#333';
        });
        // 更新光标
        if (mode === 'pan') {
            canvas.style.cursor = 'grab';
        } else if (mode === 'erase') {
            canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'10\' fill=\'white\' stroke=\'black\' stroke-width=\'1\'/%3E%3C/svg%3E") 12 12, auto';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }

    function setColor(color) {
        currentColor = color;
        colorSwatches.forEach(sw => {
            sw.style.border = `2px solid ${sw.dataset.color === color ? '#ffc107' : '#888'}`;
        });
        if (ctx) ctx.strokeStyle = color;
    }

    // ========== 获取画布原始坐标 ==========
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        // 计算相对于 canvas 显示区域的比例（考虑缩放）
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        // 边界限制
        return {
            x: Math.max(0, Math.min(canvas.width, x)),
            y: Math.max(0, Math.min(canvas.height, y))
        };
    }

    // ========== 对象橡皮擦：删除经过的标注 ==========
    function eraseAnnotationsNear(x, y) {
        const threshold = ERASE_THRESHOLD;
        let removed = false;
        // 从后往前遍历，避免索引问题
        for (let i = annotations.length - 1; i >= 0; i--) {
            const item = annotations[i];
            if (item.type === 'line') {
                // 计算点到线段距离
                const [x1, y1, x2, y2] = item.points;
                const d = distanceToSegment(x, y, x1, y1, x2, y2);
                if (d <= threshold) {
                    annotations.splice(i, 1);
                    removed = true;
                }
            } else if (item.type === 'path') {
                // 遍历每个路径点，只要有一个点距离小于阈值就删除整条路径
                for (let j = 0; j < item.points.length; j += 2) {
                    const px = item.points[j];
                    const py = item.points[j+1];
                    const d = Math.hypot(x - px, y - py);
                    if (d <= threshold) {
                        annotations.splice(i, 1);
                        removed = true;
                        break;
                    }
                }
            }
        }
        if (removed) {
            redraw();
        }
    }

    // 点到线段距离（参考：https://stackoverflow.com/questions/849211/）
    function distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = len_sq === 0 ? -1 : dot / len_sq;
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        const dx = px - xx;
        const dy = py - yy;
        return Math.hypot(dx, dy);
    }

    // ========== 鼠标事件 ==========
    function onMouseDown(e) {
        e.preventDefault();
        const { x, y } = getCanvasCoords(e);

        if (currentMode === 'pan') {
            isPanning = true;
            panStartX = e.clientX - offsetX;
            panStartY = e.clientY - offsetY;
            canvas.style.cursor = 'grabbing';
            return;
        }

        if (currentMode === 'line') {
            tempLineStart = { x, y };
            isDrawing = true;
        } else if (currentMode === 'brush') {
            isDrawing = true;
            currentPathPoints = [{ x, y }];
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (currentMode === 'erase') {
            // 橡皮擦模式：开始绘制标志，实现拖动擦除
            isDrawing = true;
            // 立即擦除一次
            eraseAnnotationsNear(x, y);
        }
    }

    function onMouseMove(e) {
        e.preventDefault();
        const { x, y } = getCanvasCoords(e);

        if (currentMode === 'pan' && isPanning) {
            // 平移
            const newLeft = e.clientX - panStartX;
            const newTop = e.clientY - panStartY;
            offsetX = newLeft;
            offsetY = newTop;
            applyTransform();
            return;
        }

        if (!isDrawing) return;

        if (currentMode === 'line' && tempLineStart) {
            // 预览直线
            redraw();
            ctx.beginPath();
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = lineWidth;
            ctx.moveTo(tempLineStart.x, tempLineStart.y);
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (currentMode === 'brush') {
            currentPathPoints.push({ x, y });
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (currentMode === 'erase') {
            // 拖动擦除
            eraseAnnotationsNear(x, y);
        }
    }

    function onMouseUp(e) {
        e.preventDefault();
        const { x, y } = getCanvasCoords(e);

        if (currentMode === 'pan') {
            isPanning = false;
            canvas.style.cursor = 'grab';
            return;
        }

        if (!isDrawing) return;

        if (currentMode === 'line' && tempLineStart) {
            // 保存直线前，先保存历史状态（当前标注状态）
            pushHistory();
            annotations.push({
                type: 'line',
                points: [tempLineStart.x, tempLineStart.y, x, y],
                color: currentColor,
                lineWidth: lineWidth
            });
            tempLineStart = null;
            redraw();
        } else if (currentMode === 'brush') {
            if (currentPathPoints.length >= 2) {
                pushHistory(); // 保存绘制前的状态
                const points = [];
                currentPathPoints.forEach(p => points.push(p.x, p.y));
                annotations.push({
                    type: 'path',
                    points: points,
                    color: currentColor,
                    lineWidth: lineWidth
                });
            }
            currentPathPoints = [];
            redraw();
        } else if (currentMode === 'erase') {
            // 擦除操作已在移动中完成，无需额外操作
            // 但擦除可能会多次触发，我们已经在擦除函数内调用了 redraw
        }
        isDrawing = false;
        ctx.beginPath();
    }

    function onMouseLeave(e) {
        if (isDrawing) {
            // 取消当前绘制
            isDrawing = false;
            tempLineStart = null;
            currentPathPoints = [];
            redraw();
        }
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = currentMode === 'pan' ? 'grab' : 'crosshair';
        }
    }

    // ========== 清除所有 ==========
    function clearAll() {
        if (annotations.length === 0) return;
        pushHistory(); // 保存清除前的状态
        annotations = [];
        redraw();
    }

    // ========== 绑定图片 ==========
    function bindClickToImage(imgElement) {
        if (imgElement.dataset.annotatorBound) return;
        imgElement.dataset.annotatorBound = 'true';
        imgElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const src = imgElement.src;
            if (!src) return;

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;
            img.onload = () => {
                currentImage = img;
                if (!ctx) initCtx();
                annotations = [];
                undoStack = [];
                redoStack = [];
                offsetX = 0;
                offsetY = 0;
                setScale(1);
                setMode('brush');
                setColor('#ff0000');
                // 将初始空白状态入栈，保证第一次撤销有效
                pushHistory();
                redraw();
                modal.style.display = 'flex';
            };
            img.onerror = () => alert('图片加载失败');
        });
    }

    function bindAllImages() {
        document.querySelectorAll(IMAGE_SELECTORS.join(',')).forEach(bindClickToImage);
    }

    // MutationObserver 监听动态图片
    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.matches && node.matches(IMAGE_SELECTORS.join(','))) {
                        bindClickToImage(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll(IMAGE_SELECTORS.join(',')).forEach(bindClickToImage);
                    }
                }
            });
        });
    });

    // ========== 绑定事件 ==========
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);

    // 按钮事件
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    clearAllBtn.addEventListener('click', clearAll);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    zoomInBtn.addEventListener('click', () => setScale(scaleFactor + 0.1));
    zoomOutBtn.addEventListener('click', () => setScale(scaleFactor - 0.1));
    zoomResetBtn.addEventListener('click', () => setScale(1));

    // 启动
    window.addEventListener('load', () => {
        bindAllImages();
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();