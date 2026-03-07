// image-annotator.mobile.js – 移动端专用版图片标注（功能完整版）
(function() {
    'use strict';

    const IMAGE_SELECTORS = ['.question-image', '#explanationImage'];
    const ERASE_THRESHOLD = 10;
    const CONTAINER_MAX_WIDTH = 95;
    const CONTAINER_MAX_HEIGHT = 80;

    // 创建模态框
    const modal = document.createElement('div');
    modal.id = 'image-annotator-modal';
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0)',
        display: 'none',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000',
        userSelect: 'none',
        transition: 'background-color 0.2s ease',
        backgroundColor: 'rgba(0, 0, 0, 0)'
    });

    const content = document.createElement('div');
    Object.assign(content.style, {
        background: '#fff',
        borderRadius: '8px',
        padding: '15px',
        maxWidth: CONTAINER_MAX_WIDTH + 'vw',
        maxHeight: CONTAINER_MAX_HEIGHT + 'vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        transform: 'scale(0.9)',
        opacity: '0',
        transition: 'transform 0.2s ease, opacity 0.2s ease'
    });

    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
        width: '100%',
        marginBottom: '10px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '10001',
        pointerEvents: 'auto'
    });

    // SVG 图标（与桌面版一致）
    const icons = {
        brush: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41z"/></svg>',
        line: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="21" x2="21" y2="3"/></svg>',
        erase: `<svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#icon-ce20ec27c11bad3)">
                <path d="M44.7818 24.1702L31.918 7.09935L14.1348 20.5L27.5 37L30.8556 34.6643L44.7818 24.1702Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
                <path d="M27.4998 37L23.6613 40.0748L13.0978 40.074L10.4973 36.6231L4.06543 28.0876L14.4998 20.2248" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
                <path d="M13.2056 40.072L44.5653 40.072" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </g>
            <defs><clipPath id="icon-ce20ec27c11bad3"><rect width="48" height="48" fill="none"/></clipPath></defs>
        </svg>`,
        pan: `<svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.58303 27.1824C7.86719 28.3542 7.00928 30.2934 7.00928 33.0002C7.00928 37.0602 12.0001 44.0002 16.5006 44.0002C21.001 44.0002 23.6111 44.0002 28.016 44.0002C32.421 44.0002 35.0965 40.1495 35.0965 37.0602C35.0965 32.9069 35.0965 28.7536 35.0965 24.6002C35.0965 22.8072 33.6456 21.3522 31.8525 21.3472C30.0659 21.3422 28.6135 22.7865 28.6085 24.5731C28.6085 24.5761 28.6085 24.5791 28.6085 24.5821V24.6836" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            <path d="M10.9814 29.4453V7.66246C10.9814 5.88568 12.4218 4.44531 14.1986 4.44531C15.9754 4.44531 17.4157 5.88568 17.4157 7.66246V23.6479" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            <path d="M17.4155 24.0001V19.8076C17.4155 18.2589 18.671 17.0034 20.2197 17.0034C21.7684 17.0034 23.0239 18.2589 23.0239 19.8076V24.4272" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M23 24.6583V21.8076C23 20.2589 24.2555 19.0034 25.8042 19.0034C27.3529 19.0034 28.6084 20.2589 28.6084 21.8076V25.0034" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M11 8H41" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            <path d="M36 12.5L37.6667 11L41 8L37.6667 5L36 3.5" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        undo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>',
        redo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.06-5.5 7.6-5.5 1.96 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>',
        clear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
        close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
        zoomIn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
        zoomOut: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>',
        zoomReset: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>'
    };

    // 创建工具按钮（移动版增大内边距）
    function createToolButton(iconSvg, title, mode, active = false) {
        const btn = document.createElement('button');
        btn.innerHTML = iconSvg;
        btn.title = title;
        btn.dataset.mode = mode;
        Object.assign(btn.style, {
            padding: '10px 12px',
            border: 'none',
            borderRadius: '8px',
            background: active ? '#007bff' : 'transparent',
            color: active ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '0',
            lineHeight: '0',
            transition: '0.2s',
            touchAction: 'manipulation',
            pointerEvents: 'auto',
            zIndex: '10002',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        btn.addEventListener('click', (e) => { e.preventDefault(); setMode(mode); });
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); setMode(mode); }, { passive: false });
        return btn;
    }

    function createIconButton(iconSvg, title, bgColor = '#6c757d') {
        const btn = document.createElement('button');
        btn.innerHTML = iconSvg;
        btn.title = title;
        Object.assign(btn.style, {
            padding: '10px 12px',
            border: 'none',
            borderRadius: '8px',
            background: bgColor,
            color: 'white',
            cursor: 'pointer',
            fontSize: '0',
            lineHeight: '0',
            touchAction: 'manipulation',
            pointerEvents: 'auto',
            zIndex: '10002',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        btn.addEventListener('click', (e) => e.preventDefault());
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        return btn;
    }

    // 模式按钮组
    const modeGroup = document.createElement('div');
    modeGroup.style.cssText = 'display:flex; gap:4px; background:#f0f0f0; padding:4px; border-radius:8px;';
    const brushBtn = createToolButton(icons.brush, '画笔', 'brush', true);
    const lineBtn = createToolButton(icons.line, '直线', 'line');
    const eraseBtn = createToolButton(icons.erase, '对象橡皮擦', 'erase');
    const panBtn = createToolButton(icons.pan, '平移视图', 'pan');
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
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: c.value,
            border: `3px solid ${c.value === '#000000' ? '#888' : c.value}`,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            touchAction: 'manipulation',
            pointerEvents: 'auto',
            zIndex: '10002'
        });
        swatch.dataset.color = c.value;
        swatch.title = c.name;
        swatch.addEventListener('click', (e) => { e.preventDefault(); setColor(c.value); });
        swatch.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); setColor(c.value); }, { passive: false });
        colorGroup.appendChild(swatch);
        colorSwatches.push(swatch);
    });

    // 缩放控制
    const zoomGroup = document.createElement('div');
    zoomGroup.style.cssText = 'display:flex; align-items:center; gap:5px; margin-left:8px;';
    const zoomOutBtn = createIconButton(icons.zoomOut, '缩小');
    const zoomInBtn = createIconButton(icons.zoomIn, '放大');
    const zoomResetBtn = createIconButton(icons.zoomReset, '重置缩放');
    const zoomLevel = document.createElement('span');
    zoomLevel.textContent = '100%';
    zoomLevel.style.minWidth = '50px';
    zoomLevel.style.textAlign = 'center';
    zoomLevel.style.fontSize = '14px';
    zoomGroup.append(zoomOutBtn, zoomLevel, zoomInBtn, zoomResetBtn);

    // 操作按钮组
    const actionGroup = document.createElement('div');
    actionGroup.style.cssText = 'display:flex; gap:8px; margin-left:auto;';
    const undoBtn = createIconButton(icons.undo, '撤销', '#17a2b8');
    const redoBtn = createIconButton(icons.redo, '重做', '#17a2b8');
    const clearAllBtn = createIconButton(icons.clear, '清除全部标注', '#dc3545');
    const closeBtn = createIconButton(icons.close, '关闭', '#dc3545');
    actionGroup.append(undoBtn, redoBtn, clearAllBtn, closeBtn);

    toolbar.append(modeGroup, colorGroup, zoomGroup, actionGroup);

    // 画布容器
    const canvasContainer = document.createElement('div');
    Object.assign(canvasContainer.style, {
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: 'calc(75vh - 80px)',
        backgroundColor: '#eee',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        touchAction: 'none'
    });

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        cursor: 'crosshair',
        border: '1px solid #ccc',
        touchAction: 'none'
    });

    canvasContainer.appendChild(canvas);
    content.appendChild(toolbar);
    content.appendChild(canvasContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // ========== 全局状态 ==========
    let ctx = null;
    let currentImage = null;
    let annotations = [];
    let undoStack = [];
    let redoStack = [];

    let currentMode = 'brush';
    let currentColor = '#ff0000';
    let lineWidth = 3;

    let isDrawing = false;
    let tempLineStart = null;
    let currentPathPoints = [];

    let isPanning = false;
    let panStartX = 0, panStartY = 0;
    let offsetX = 0, offsetY = 0;
    let scaleFactor = 1;

    let activeTouchId = null;  // 当前激活的触摸点 ID

    function initCtx() {
        ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = currentColor;
    }

    function pushHistory() {
        undoStack.push(JSON.parse(JSON.stringify(annotations)));
        redoStack = [];
    }

    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(JSON.parse(JSON.stringify(annotations)));
        annotations = undoStack.pop();
        redraw();
    }

    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(JSON.parse(JSON.stringify(annotations)));
        annotations = redoStack.pop();
        redraw();
    }

    function redraw() {
        if (!ctx || !currentImage) return;
        canvas.width = currentImage.naturalWidth;
        canvas.height = currentImage.naturalHeight;
        ctx.drawImage(currentImage, 0, 0);
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
        applyTransform();
    }

    function applyTransform() {
        if (!currentImage) return;
        const w = currentImage.naturalWidth * scaleFactor;
        const h = currentImage.naturalHeight * scaleFactor;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        const containerW = canvasContainer.clientWidth;
        const containerH = canvasContainer.clientHeight;
        const maxOffsetX = Math.max(0, w - containerW);
        const maxOffsetY = Math.max(0, h - containerH);
        offsetX = Math.min(0, Math.max(offsetX, -maxOffsetX));
        offsetY = Math.min(0, Math.max(offsetY, -maxOffsetY));

        canvas.style.left = offsetX + 'px';
        canvas.style.top = offsetY + 'px';
    }

    function setScale(factor) {
        scaleFactor = Math.max(0.2, Math.min(3, factor));
        zoomLevel.textContent = Math.round(scaleFactor * 100) + '%';
        applyTransform();
    }

    function setMode(mode) {
        currentMode = mode;
        [brushBtn, lineBtn, eraseBtn, panBtn].forEach(btn => {
            const isActive = btn.dataset.mode === mode;
            btn.style.background = isActive ? '#007bff' : 'transparent';
            btn.style.color = isActive ? 'white' : '#333';
        });
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
            sw.style.border = `3px solid ${sw.dataset.color === color ? '#ffc107' : '#888'}`;
        });
        if (ctx) ctx.strokeStyle = color;
    }

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        return {
            x: Math.max(0, Math.min(canvas.width, x)),
            y: Math.max(0, Math.min(canvas.height, y))
        };
    }

    function eraseAnnotationsNear(x, y) {
        const threshold = ERASE_THRESHOLD;
        let removed = false;
        for (let i = annotations.length - 1; i >= 0; i--) {
            const item = annotations[i];
            if (item.type === 'line') {
                const [x1, y1, x2, y2] = item.points;
                const d = distanceToSegment(x, y, x1, y1, x2, y2);
                if (d <= threshold) {
                    annotations.splice(i, 1);
                    removed = true;
                }
            } else if (item.type === 'path') {
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
        if (removed) redraw();
    }

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

    // 触摸事件处理（严格跟踪单点）
    function handleStart(e) {
        e.preventDefault();
        if (e.touches) {
            const touch = e.touches[0];
            if (!touch) return;
            if (activeTouchId !== null && activeTouchId !== touch.identifier) return;
            activeTouchId = touch.identifier;
        }
        const { x, y } = getCanvasCoords(e);

        if (currentMode === 'pan') {
            isPanning = true;
            const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
            const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
            panStartX = clientX - offsetX;
            panStartY = clientY - offsetY;
            canvas.style.cursor = 'grabbing';
            return;
        }

        if (currentMode === 'line') {
            tempLineStart = { x, y };
            isDrawing = true;
        } else if (currentMode === 'brush') {
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = lineWidth;
            isDrawing = true;
            currentPathPoints = [{ x, y }];
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (currentMode === 'erase') {
            isDrawing = true;
            eraseAnnotationsNear(x, y);
        }
    }

    function handleMove(e) {
        e.preventDefault();
        if (e.touches) {
            const touch = e.touches[0];
            if (!touch || touch.identifier !== activeTouchId) return;
        }
        const { x, y } = getCanvasCoords(e);

        if (currentMode === 'pan' && isPanning) {
            const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
            const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
            offsetX = clientX - panStartX;
            offsetY = clientY - panStartY;
            applyTransform();
            return;
        }

        if (!isDrawing) return;

        if (currentMode === 'line' && tempLineStart) {
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
            eraseAnnotationsNear(x, y);
        }
    }

    function handleEnd(e) {
        e.preventDefault();
        if (e.touches) {
            if (e.touches.length === 0) activeTouchId = null;
            else activeTouchId = e.touches[0].identifier; // 如果仍有触摸点，更新为第一个
        }
        const { x, y } = getCanvasCoords(e);

        if (currentMode === 'pan') {
            isPanning = false;
            canvas.style.cursor = 'grab';
            return;
        }

        if (!isDrawing) return;

        if (currentMode === 'line' && tempLineStart) {
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
                pushHistory();
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
        }
        isDrawing = false;
        ctx.beginPath();
    }

    function handleCancel(e) {
        activeTouchId = null;
        if (isDrawing) {
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

    function clearAll() {
        if (annotations.length === 0) return;
        pushHistory();
        annotations = [];
        redraw();
    }

    function showModal() {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            content.style.transform = 'scale(1)';
            content.style.opacity = '1';
        }, 10);
    }

    function hideModal() {
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        content.style.transform = 'scale(0.9)';
        content.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

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
                pushHistory();
                redraw();
                showModal();
            };
            img.onerror = () => alert('图片加载失败');
        });
        imgElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imgElement.click();
        }, { passive: false });
    }

    function bindAllImages() {
        document.querySelectorAll(IMAGE_SELECTORS.join(',')).forEach(bindClickToImage);
    }

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

    // 事件绑定
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleCancel);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('touchcancel', handleCancel);
    canvas.addEventListener('gesturestart', (e) => e.preventDefault());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    // 按钮事件（统一阻止冒泡）
    const preventTouch = (e) => { e.preventDefault(); e.stopPropagation(); };
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); hideModal(); });
    closeBtn.addEventListener('touchstart', (e) => { preventTouch(e); hideModal(); }, { passive: false });

    clearAllBtn.addEventListener('click', (e) => { e.preventDefault(); clearAll(); });
    clearAllBtn.addEventListener('touchstart', (e) => { preventTouch(e); clearAll(); }, { passive: false });

    undoBtn.addEventListener('click', (e) => { e.preventDefault(); undo(); });
    undoBtn.addEventListener('touchstart', (e) => { preventTouch(e); undo(); }, { passive: false });

    redoBtn.addEventListener('click', (e) => { e.preventDefault(); redo(); });
    redoBtn.addEventListener('touchstart', (e) => { preventTouch(e); redo(); }, { passive: false });

    zoomInBtn.addEventListener('click', (e) => { e.preventDefault(); setScale(scaleFactor + 0.1); });
    zoomInBtn.addEventListener('touchstart', (e) => { preventTouch(e); setScale(scaleFactor + 0.1); }, { passive: false });

    zoomOutBtn.addEventListener('click', (e) => { e.preventDefault(); setScale(scaleFactor - 0.1); });
    zoomOutBtn.addEventListener('touchstart', (e) => { preventTouch(e); setScale(scaleFactor - 0.1); }, { passive: false });

    zoomResetBtn.addEventListener('click', (e) => { e.preventDefault(); setScale(1); });
    zoomResetBtn.addEventListener('touchstart', (e) => { preventTouch(e); setScale(1); }, { passive: false });

    // 启动
    window.addEventListener('load', () => {
        bindAllImages();
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();