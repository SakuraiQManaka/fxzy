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
            overallProgress = JSON.parse(savedOverallProgress);
            initializeProgressStates();
        } else {
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
                    utils.showMessage('加载整体进度失败，请刷新页面重试', 'error');
                });
        }
    }

    // ===================================================
    // 初始化进度状态为 "E" (未作答)
    // ===================================================
    function initializeProgressStates() {
        for (const category in overallProgress) {
            if (overallProgress.hasOwnProperty(category)) {
                const categoryData = overallProgress[category];
                categoryData.state.forEach(chapter => {
                    if (chapter.state.length === 0 || chapter.state.length !== chapter.number) {
                        chapter.state = new Array(chapter.number).fill("E");
                    }
                });
            }
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