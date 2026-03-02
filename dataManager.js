const dataManager = (function() {
    const trans = {
        ppl: "私照",
        cpl: "商照", 
        ins: "仪表",
    };

    let overallProgress = null;
    let currentCategoryInfo = null;

    // ===================================================
    // 加载整体进度
    // ===================================================
    function loadOverallProgress() {
        const savedOverallProgress = localStorage.getItem('overallProgress');
        if (savedOverallProgress) {
            try {
                overallProgress = JSON.parse(savedOverallProgress);
                if (typeof overallProgress !== 'object' || overallProgress === null) {
                    throw new Error('overallProgress 不是对象');
                }
                initializeProgressStates();
            } catch (e) {
                console.warn('解析本地进度失败，将重新初始化', e);
                overallProgress = null;
                fetchOverallProgressFromIndex();
            }
        } else {
            fetchOverallProgressFromIndex();
        }
    }

    function fetchOverallProgressFromIndex() {
        fetch("./index.json")
            .then(response => {
                if (!response.ok) throw new Error(`文件加载失败: ${response.status}`);
                return response.json();
            })
            .then(data => {
                overallProgress = data;
                initializeProgressStates();
                saveOverallProgress();
            })
            .catch(error => {
                console.error('加载整体进度失败:', error);
                if (window.utils) utils.showMessage('加载整体进度失败，请刷新页面重试', 'error');
            });
    }

    // ===================================================
    // 初始化进度状态为 "E" (未作答)，并修复缺失的 state
    // ===================================================
    function initializeProgressStates() {
        if (!overallProgress || typeof overallProgress !== 'object') {
            overallProgress = {};
            return;
        }

        for (const category in overallProgress) {
            if (!overallProgress.hasOwnProperty(category)) continue;

            const categoryData = overallProgress[category];
            // 确保 categoryData.state 是数组
            if (!Array.isArray(categoryData.state)) {
                console.warn(`分类 ${category} 缺少 state 数组，尝试重建`);
                // 尝试从 names 和 number_all 重建 state（如果没有，则设为空数组）
                if (Array.isArray(categoryData.names)) {
                    categoryData.state = categoryData.names.map(name => ({
                        name: name,
                        number: 0,  // 暂缺题数，稍后从章节数据补全？这里先建空对象
                        state: []
                    }));
                } else {
                    categoryData.state = [];
                }
            }

            // 遍历每个章节，确保每个章节有正确的 state 数组
            categoryData.state.forEach((chapter, idx) => {
                // 如果章节对象缺少 name，尝试从 names 数组获取
                if (!chapter.name && Array.isArray(categoryData.names) && categoryData.names[idx]) {
                    chapter.name = categoryData.names[idx];
                }
                // 如果章节对象缺少 number，尝试从原始数据推断（默认 0）
                if (typeof chapter.number !== 'number') {
                    chapter.number = 0;
                }
                // 确保 chapter.state 是数组且长度正确
                if (!Array.isArray(chapter.state) || chapter.state.length !== chapter.number) {
                    chapter.state = new Array(chapter.number).fill("E");
                }
            });
        }
        saveOverallProgress();
    }

    // ===================================================
    // 更新章节进度
    // ===================================================
    function updateChapterProgress(category, chapter, questionIndex, userAnswer) {
        if (!overallProgress || !overallProgress[category]) return false;

        const chapterData = overallProgress[category].state.find(c => c.name === chapter);
        if (!chapterData || questionIndex >= chapterData.state.length) return false;

        chapterData.state[questionIndex] = userAnswer;
        saveOverallProgress();
        return true;
    }

    // ===================================================
    // 获取章节进度
    // ===================================================
    function getChapterProgress(category, chapter) {
        if (!overallProgress || !overallProgress[category]) return null;
        const chapterData = overallProgress[category].state.find(c => c.name === chapter);
        return chapterData ? chapterData.state : null;
    }

    // ===================================================
    // 重置所有进度
    // ===================================================
    function resetAllProgress() {
        if (!overallProgress) return false;

        for (const category in overallProgress) {
            if (overallProgress.hasOwnProperty(category)) {
                const categoryData = overallProgress[category];
                categoryData.state.forEach(chapter => {
                    chapter.state = new Array(chapter.number).fill("E");
                });
            }
        }

        saveOverallProgress();
        return true;
    }

    // ===================================================
    // 保存整体进度
    // ===================================================
    function saveOverallProgress() {
        if (overallProgress) {
            localStorage.setItem('overallProgress', JSON.stringify(overallProgress));
        }
    }

    // ===================================================
    // 获取排序后的分类
    // ===================================================
    function getSortedCategories() {
        if (!overallProgress) return [];
        return Object.entries(overallProgress)
            .sort(([, a], [, b]) => (a.order || 999) - (b.order || 999))
            .map(([name, data]) => ({ name, ...data }));
    }

    return {
        trans,
        getOverallProgress: () => overallProgress,
        setOverallProgress: (progress) => { overallProgress = progress; },
        getCurrentCategoryInfo: () => currentCategoryInfo,
        setCurrentCategoryInfo: (info) => { currentCategoryInfo = info; },
        loadOverallProgress,
        initializeProgressStates,
        saveOverallProgress,
        resetAllProgress,
        getSortedCategories,
        updateChapterProgress,
        getChapterProgress
    };
})();