// 数据管理模块
const dataManager = (function() {
    // 题库类型映射
    const trans = {
        ppl: "私照",
        cpl: "商照",
        ins: "仪表",
    };

    let overallProgress = null;
    let currentCategoryInfo = null;

    // 加载整体进度
    function loadOverallProgress() {
        const savedOverallProgress = localStorage.getItem('overallProgress');
        if (savedOverallProgress) {
            overallProgress = JSON.parse(savedOverallProgress);
            initializeProgressStates();
        } else {
            // 从文件加载默认进度
            fetch("./index.json")
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`文件加载失败: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    overallProgress = data;
                    initializeProgressStates();
                    saveOverallProgress();
                })
                .catch(error => {
                    console.error('加载整体进度失败:', error);
                    utils.showMessage('加载整体进度失败，请刷新页面重试', 'error');  // 修改这里
                });
        }
    }

    // 初始化答题状态数组
    function initializeProgressStates() {
        for (const category in overallProgress) {
            if (overallProgress.hasOwnProperty(category)) {
                const categoryData = overallProgress[category];
                categoryData.state.forEach(chapter => {
                    // 如果state数组为空或长度不正确，初始化为null数组
                    if (chapter.state.length === 0 || chapter.state.length !== chapter.number) {
                        chapter.state = new Array(chapter.number).fill(null);
                    }
                });
            }
        }
        saveOverallProgress();
    }

    // 保存整体进度到本地存储
    function saveOverallProgress() {
        if (overallProgress) {
            localStorage.setItem('overallProgress', JSON.stringify(overallProgress));
        }
    }

    // 重置所有题库进度
    function resetAllProgress() {
        if (!overallProgress) return false;
        
        for (const category in overallProgress) {
            if (overallProgress.hasOwnProperty(category)) {
                const categoryData = overallProgress[category];
                categoryData.state.forEach(chapter => {
                    chapter.state = new Array(chapter.number).fill(null);
                });
            }
        }
        
        saveOverallProgress();
        return true;
    }

    // 获取排序后的分类列表
    function getSortedCategories() {
        if (!overallProgress) return [];
        
        return Object.entries(overallProgress)
            .sort(([,a], [,b]) => (a.order || 999) - (b.order || 999))
            .map(([name, data]) => ({ name, ...data }));
    }

    // 更新当前章节的进度
    function updateChapterProgress(category, chapter, questionIndex, isCorrect) {
        if (!overallProgress || !overallProgress[category]) return false;
        
        const chapterData = overallProgress[category].state.find(c => c.name === chapter);
        if (!chapterData || questionIndex >= chapterData.state.length) return false;
        
        chapterData.state[questionIndex] = isCorrect;
        saveOverallProgress();
        return true;
    }

    // 获取当前章节的进度
    function getChapterProgress(category, chapter) {
        if (!overallProgress || !overallProgress[category]) return null;
        
        const chapterData = overallProgress[category].state.find(c => c.name === chapter);
        return chapterData ? chapterData.state : null;
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