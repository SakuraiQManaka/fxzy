// progressImportExport.js
// 独立模块：为选择题练习系统增加导入/导出进度功能（JSON格式）
// 使用方式：在 index.html 中引入此文件即可（放在其他脚本之后）
// 不修改任何现有文件

(function() {
    'use strict';

    // 确保依赖对象存在（检查全局变量，不是 window 属性）
    if (typeof dataManager === 'undefined' || typeof utils === 'undefined' || typeof uiManager === 'undefined' || typeof main === 'undefined') {
        console.error('progressImportExport: 依赖的全局对象未找到，请确保在 dataManager/utils/uiManager/main 之后引入');
        return;
    }

    // 状态变量
    let fileInput = null;

    // 工具函数：获取当前选中的类别中文名
    function getCurrentCategoryName() {
        const firstSelect = document.getElementById('one');
        if (firstSelect && firstSelect.value) {
            return dataManager.trans[firstSelect.value]; // 例如 "私照"
        }
        const currentInfo = dataManager.getCurrentCategoryInfo();
        if (currentInfo && currentInfo.category) {
            return currentInfo.category;
        }
        return null;
    }

    // 工具函数：获取当前章节名（可能为空）
    function getCurrentChapterName() {
        const secondSelect = document.getElementById('two');
        if (secondSelect && secondSelect.value) {
            return secondSelect.value;
        }
        const currentInfo = dataManager.getCurrentCategoryInfo();
        return currentInfo ? currentInfo.chapter : null;
    }

    // ==================== 导出进度 ====================
    function exportProgress() {
        const category = getCurrentCategoryName();
        if (!category) {
            utils.showMessage('请先选择题库类别', 'warning');
            return;
        }

        const overall = dataManager.getOverallProgress();
        if (!overall || !overall[category]) {
            utils.showMessage(`未找到类别 "${category}" 的进度数据`, 'error');
            return;
        }

        // 构造导出对象
        const exportData = {
            category: category,
            totalQuestions: overall[category].number_all,
            chapters: overall[category].state.map(ch => ({
                name: ch.name,
                number: ch.number,
                state: ch.state.slice() // 复制数组
            }))
        };

        try {
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${category}_进度.json`;
            link.click();
            utils.showMessage('进度导出成功', 'success');
        } catch (e) {
            utils.showMessage('导出失败：' + e.message, 'error');
        }
    }

    // ==================== 导入进度 ====================
    function importProgress(file) {
        if (!file) return;

        const category = getCurrentCategoryName();
        if (!category) {
            utils.showMessage('请先选择题库类别', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);

                // 基本格式校验
                if (!imported.category || !imported.chapters || !Array.isArray(imported.chapters)) {
                    throw new Error('JSON 格式错误：缺少 category 或 chapters 数组');
                }
                if (imported.category !== category) {
                    throw new Error(`导入的类别 "${imported.category}" 与当前选中的 "${category}" 不一致`);
                }

                const overall = dataManager.getOverallProgress();
                if (!overall || !overall[category]) {
                    throw new Error(`内部错误：未找到类别 "${category}" 的进度数据`);
                }

                const targetCategory = overall[category];
                if (imported.totalQuestions !== targetCategory.number_all) {
                    throw new Error(`总题数不匹配：导入 ${imported.totalQuestions}，期望 ${targetCategory.number_all}`);
                }

                // 按章节更新
                const importedChapters = imported.chapters;
                const targetChapters = targetCategory.state;

                if (importedChapters.length !== targetChapters.length) {
                    throw new Error(`章节数量不匹配：导入 ${importedChapters.length}，实际 ${targetChapters.length}`);
                }

                // 逐章节验证并更新
                for (let i = 0; i < targetChapters.length; i++) {
                    const targetCh = targetChapters[i];
                    const importCh = importedChapters.find(ch => ch.name === targetCh.name);
                    if (!importCh) {
                        throw new Error(`未找到章节 "${targetCh.name}" 的导入数据`);
                    }
                    if (importCh.number !== targetCh.number) {
                        throw new Error(`章节 "${targetCh.name}" 题数不匹配：导入 ${importCh.number}，期望 ${targetCh.number}`);
                    }
                    if (!Array.isArray(importCh.state) || importCh.state.length !== targetCh.number) {
                        throw new Error(`章节 "${targetCh.name}" 状态数组长度错误`);
                    }

                    // 检查每个状态的合法性
                    const validChars = new Set(['E', 'A', 'B', 'C', 'D']);
                    for (let j = 0; j < importCh.state.length; j++) {
                        const s = importCh.state[j];
                        if (!validChars.has(s)) {
                            throw new Error(`章节 "${targetCh.name}" 第 ${j+1} 题状态非法：${s}`);
                        }
                    }

                    // 更新目标章节状态
                    targetCh.state = importCh.state.slice();
                }

                // 保存整体进度
                dataManager.saveOverallProgress();

                // 如果当前题库正好是该类别，则刷新界面（通过重新初始化）
                const currentInfo = dataManager.getCurrentCategoryInfo();
                if (currentInfo && currentInfo.category === category) {
                    // 获取当前章节的进度状态，写入 localStorage 中的 quizProgress
                    const chapterName = getCurrentChapterName();
                    if (chapterName) {
                        const chapterData = targetChapters.find(ch => ch.name === chapterName);
                        if (chapterData) {
                            const progress = {
                                userAnswers: chapterData.state,
                                currentQuestionIndex: 0
                            };
                            localStorage.setItem('quizProgress', JSON.stringify(progress));
                        }
                    }
                    // 重新初始化主模块，刷新界面
                    main.init();
                }

                utils.showMessage('进度导入成功', 'success');

            } catch (err) {
                utils.showMessage('导入失败：' + err.message, 'error');
            } finally {
                // 清空 file input 以便再次选择同一文件
                if (fileInput) fileInput.value = '';
            }
        };
        reader.readAsText(file);
    }

    // ==================== 插入按钮 ====================
    function insertButtons() {
        // 查找左侧面板的 import-section 或 actions 区域
        const container = document.querySelector('.import-section') || document.querySelector('.actions');
        if (!container) {
            console.warn('progressImportExport: 未找到合适的容器插入按钮');
            return;
        }

        // 创建导出按钮
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-success'; // 复用现有样式
        exportBtn.id = 'exportProgressJsonBtn';
        exportBtn.textContent = '导出进度';
        exportBtn.style.marginRight = '5px';

        // 创建导入按钮
        const importBtn = document.createElement('button');
        importBtn.className = 'btn-success';
        importBtn.id = 'importProgressJsonBtn';
        importBtn.textContent = '导入进度';

        // 创建隐藏的文件输入
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'progressJsonFileInput';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';

        // 插入到容器末尾
        container.appendChild(exportBtn);
        container.appendChild(importBtn);
        container.appendChild(fileInput);

        // 绑定事件
        exportBtn.addEventListener('click', exportProgress);
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => importProgress(e.target.files[0]));
    }

    // 初始化：等待 DOM 加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertButtons);
    } else {
        insertButtons();
    }

})();