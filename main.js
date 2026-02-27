// 主程序模块
// ===================================================
// 这是整个题库系统的核心逻辑模块。
// 负责：
// 1. 页面初始化（绑定事件、加载本地数据）
// 2. 题库导入/导出逻辑
// 3. 答题与选项处理逻辑
// 4. 错题复习模式
// 5. 同步 localStorage 与整体进度数据
// ===================================================

const main = (function() {
    // -------------------- 全局状态变量 --------------------
    let questionBank = [];           // 当前题库题目数组
    let currentQuestionIndex = 0;    // 当前题目索引
    let userAnswers = [];            // 用户答题记录（存储选择的选项索引）
    let reviewMode = false;          // 是否处于"错题复习模式"
    let wrongQuestions = [];         // 错题索引数组
    let filePath = "";               // 当前题库文件路径

    // -------------------- DOM 元素缓存 --------------------
    const questionNav = document.getElementById('questionNav');
    const questionText = document.getElementById('questionText');
    const questionImage = document.getElementById('questionImage');
    const optionsContainer = document.getElementById('optionsContainer');
    const explanation = document.getElementById('explanation');
    const explanationText = document.getElementById('explanationText');
    const explanationImage = document.getElementById('explanationImage');
    const currentQuestionNumber = document.getElementById('currentQuestionNumber');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetBtn = document.getElementById('resetBtn');
    const importBtn = document.getElementById('importBtn');
    const completionMessage = document.getElementById('completionMessage');
    const finalRate = document.getElementById('finalRate');
    const reviewBtn = document.getElementById('reviewBtn');
    const toggleSwitch = document.getElementById('toggleSwitch');
    const overallProgressBtn = document.getElementById('overallProgressBtn');

    // ===================================================
    // 初始化函数（在 DOMContentLoaded 后执行）
    // ===================================================
    function init() {
        console.log('开始初始化...');
        
        // 1️⃣ 尝试加载本地答题进度
        const savedProgress = localStorage.getItem('quizProgress');
        if (savedProgress) {
            console.log('找到本地答题进度');
            const progress = JSON.parse(savedProgress);
            userAnswers = progress.userAnswers || [];
            currentQuestionIndex = progress.currentQuestionIndex || 0;
        } else {
            console.log('未找到本地答题进度');
        }

        // 2️⃣ 尝试加载本地缓存题库
        const savedQuestionBank = localStorage.getItem('questionBank');
        if (savedQuestionBank) {
            console.log('找到本地题库缓存');
            questionBank = JSON.parse(savedQuestionBank);
            // 确保 userAnswers 长度与题库匹配
            if (userAnswers.length !== questionBank.length) {
                userAnswers = adjustArrayLength(userAnswers, questionBank.length, "E");
            }
            // 尝试恢复当前题库所属信息（用于显示面板标题）
            const savedCategoryInfo = localStorage.getItem('currentCategoryInfo');
            if (savedCategoryInfo) {
                try {
                    const info = JSON.parse(savedCategoryInfo);
                    if (info && info.category) {
                        dataManager.setCurrentCategoryInfo(info);
                    }
                } catch (e) {
                    console.warn('恢复 currentCategoryInfo 失败', e);
                }
            }
        } else {
            console.log('未找到本地题库缓存');
        }

        // 3️⃣ 加载整体进度
        console.log('加载整体进度...');
        dataManager.loadOverallProgress();

        // 4️⃣ 绑定事件和初始化界面
        console.log('绑定事件和初始化界面...');
        bindEvents();
        uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
        uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
        uiManager.updateStats(userAnswers, questionBank);

        // 5️⃣ 初始化题库选择下拉菜单
        console.log('初始化下拉菜单...');
        initDropdowns();
        
        console.log('初始化完成');
    }

    // ===================================================
    // 调整数组长度辅助函数
    // ===================================================
    function adjustArrayLength(arr, targetLength, fillValue = "E") {
        if (arr.length > targetLength) {
            return arr.slice(0, targetLength);
        } else {
            return [...arr, ...new Array(targetLength - arr.length).fill(fillValue)];
        }
    }

    // ===================================================
    // 绑定事件
    // ===================================================
    function bindEvents() {
        const updateLogBtn = document.getElementById('updateLogBtn');
        updateLogBtn.addEventListener('click', utils.showUpdateLogs);
        
        overallProgressBtn.addEventListener('click', uiManager.showOverallProgress);
        prevBtn.addEventListener('click', goToPreviousQuestion);
        nextBtn.addEventListener('click', goToNextQuestion);
        resetBtn.addEventListener('click', resetProgress);
        importBtn.addEventListener('click', importQuestionBank);
        reviewBtn.addEventListener('click', toggleReviewMode);
    }

    // ===================================================
    // 初始化两个下拉菜单（题库选择 + 章节选择）
    // ===================================================
    function initDropdowns() {
        const firstSelect = document.getElementById('one');
        const secondSelect = document.getElementById('two');

        // 预定义每种题库对应章节
        const options = {
            ppl: [
                { value: '法规', text: '法规' },
                { value: '飞行前准备', text: '飞行前准备' },
                { value: '飞行性能', text: '飞行性能' },
                { value: '航空器运行', text: '航空器运行' },
                { value: '空气动力学', text: '空气动力学' },
                { value: '领航', text: '领航' },
                { value: '气象学', text: '气象学' },
                { value: '人的因素', text: '人的因素' },
                { value: '无线电通话程序', text: '无线电通话程序' },
                { value: '重量与平衡', text: '重量与平衡' },
            ],
            cpl: [
                { value: '操作程序', text: '操作程序' },
                { value: '飞机动力装置', text: '飞机动力装置' },
                { value: '飞机系统', text: '飞机系统' },
                { value: '飞行仪表和设备要求', text: '飞行仪表和设备要求' },
                { value: '飞行原理', text: '飞行原理' },
                { value: '航空规章', text: '航空规章' },
                { value: '领航导航', text: '领航导航' },
                { value: '气象', text: '气象' },
                { value: '人的行为能力', text: '人的行为能力' },
                { value: '通信', text: '通信' },
                { value: '性能计划载重', text: '性能计划载重' },
            ],
            ins: [
                { value: '操作程序', text: '操作程序' },
                { value: '飞行仪表和设备要求', text: '飞行仪表和设备要求' },
                { value: '航空规章', text: '航空规章' },
                { value: '领航导航', text: '领航导航' },
                { value: '气象', text: '气象' },
                { value: '人的行为能力', text: '人的行为能力' },
                { value: '通信', text: '通信' },
                { value: '计划', text: '计划' },
            ]
        };

        // 清空二级菜单
        secondSelect.innerHTML = '<option value="">选择章节</option>';

        // 一级菜单变动后，刷新二级菜单内容
        firstSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            secondSelect.innerHTML = '<option value="">选择章节</option>';
            if (selectedValue && options[selectedValue]) {
                options[selectedValue].forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option.value;
                    opt.textContent = option.text;
                    secondSelect.appendChild(opt);
                });
            }
        });
    }

    // ===================================================
    // 用户选择选项
    // ===================================================
    function selectOption(optionIndex) {
        const currentIndex = currentQuestionIndex;
        // 将选项索引转换为字母
        const userAnswer = String.fromCharCode(65 + optionIndex); // 0->A, 1->B, 2->C, 3->D
        userAnswers[currentIndex] = userAnswer;

        // 更新整体进度
        const currentCategoryInfo = dataManager.getCurrentCategoryInfo();
        if (currentCategoryInfo) {
            const { category, chapter } = currentCategoryInfo;
            dataManager.updateChapterProgress(category, chapter, currentIndex, userAnswer);
        }

        // 更新界面
        uiManager.renderQuestion(questionBank, userAnswers, currentIndex);
        uiManager.renderQuestionNavigation(questionBank, userAnswers, currentIndex);
        uiManager.updateStats(userAnswers, questionBank);

        saveProgress();

        // 自动跳转逻辑 - 只有在答对的情况下才跳转
        const isChecked = toggleSwitch.checked;
        const isCorrect = userAnswer === questionBank[currentIndex].correctAnswer;
        
        if (isChecked && isCorrect && currentIndex < questionBank.length - 1) {
            setTimeout(() => {
                currentQuestionIndex = currentIndex + 1;
                uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
                uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
            }, 500);
        }
    }

    // ===================================================
    // 上一题按钮
    // ===================================================
    function goToPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
            uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
        }
    }

    // ===================================================
    // 下一题按钮逻辑
    // 若所有题完成且未进入复习模式，则进入"错题复习"
    // ===================================================
    function goToNextQuestion() {
        const allAnswered = userAnswers.every(answer => answer !== "E");

        if (allAnswered && !reviewMode) {
            toggleReviewMode();
            return;
        }

        if (currentQuestionIndex < questionBank.length - 1) {
            currentQuestionIndex++;
            uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
            uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
        }
    }

    // ===================================================
    // 切换错题复习模式
    // ===================================================
    function toggleReviewMode() {
        reviewMode = !reviewMode;

        if (reviewMode) {
            // 筛选错题索引
            wrongQuestions = userAnswers
                .map((answer, index) => ({ answer, index }))
                .filter(item => item.answer !== "E" && 
                               item.answer !== questionBank[item.index].correctAnswer)
                .map(item => item.index);

            if (wrongQuestions.length > 0) {
                currentQuestionIndex = wrongQuestions[0];
                uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex, reviewMode);
                uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
                completionMessage.style.display = 'none';
            } else {
                utils.showMessage('没有错题需要复习！', 'warning');
                reviewMode = false;
            }
        } else {
            currentQuestionIndex = 0;
            uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
            uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
        }
    }

    // ===================================================
    // 重置进度
    // ===================================================
    function resetProgress() {
        if (confirm('确定要重置所有答题进度吗？')) {
            userAnswers = new Array(questionBank.length).fill("E");
            currentQuestionIndex = 0;
            reviewMode = false;

            uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
            uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
            uiManager.updateStats(userAnswers, questionBank);
            saveProgress();

            // 同步清空整体进度中的章节状态
            const currentCategoryInfo = dataManager.getCurrentCategoryInfo();
            if (currentCategoryInfo) {
                const { category, chapter } = currentCategoryInfo;
                const chapterProgress = dataManager.getChapterProgress(category, chapter);
                if (chapterProgress) {
                    chapterProgress.fill("E");
                    dataManager.saveOverallProgress();
                }
            }

            utils.showMessage('进度已重置，可以重新开始做题', 'success');
        }
    }

    // ===================================================
    // 导出错题
    // ===================================================
    function exportWrongQuestions() {
        const wrongQuestions = questionBank.filter((question, index) =>
            userAnswers[index] !== "E" && 
            userAnswers[index] !== question.correctAnswer
        );

        if (wrongQuestions.length === 0) {
            utils.showMessage('没有错题可以导出！', 'warning');
            return;
        }

        const exportData = wrongQuestions.map(question => ({
            id: question.id,
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            questionImage: question.questionImage || "",
            explanationImage: question.explanationImage || ""
        }));

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '错题集.json';
        link.click();
    }

    // ===================================================
    // 导入题库
    // ===================================================
    function importQuestionBank() {
        const firstSelect = document.getElementById('one');
        const secondSelect = document.getElementById('two');
        
        const firstValue = dataManager.trans[firstSelect.value]; // 转中文目录名
        const secondValue = secondSelect.value;

        if (!firstValue || !secondValue) {
            utils.showMessage('请确保已选择两个下拉菜单的选项！', 'warning');
            return;
        }

        // 拼接题库文件路径，例如 ./题库/私照/法规/法规.json
        filePath = `./题库/${firstValue}/${secondValue}/${secondValue}.json`;

        fetch(filePath)
            .then(response => {
                if (!response.ok) throw new Error(`文件加载失败: ${response.status}`);
                return response.json();
            })
            .then(importedData => {
                if (!Array.isArray(importedData)) throw new Error('题库数据格式不正确，应为数组');

                // 验证字段完整性并转换 correctAnswer 格式
                importedData.forEach((q, i) => {
                    if (!q.id || !q.question || !q.options || q.correctAnswer === undefined || !q.explanation)
                        throw new Error(`第 ${i + 1} 题缺少字段`);
                    
                    // 确保 correctAnswer 是字符串格式
                    if (typeof q.correctAnswer !== 'string') {
                        console.warn(`第 ${i + 1} 题 correctAnswer 不是字符串，正在转换:`, q.correctAnswer);
                        if (typeof q.correctAnswer === 'number') {
                            // 数字转换为字母
                            q.correctAnswer = String.fromCharCode(65 + q.correctAnswer);
                        } else {
                            q.correctAnswer = String(q.correctAnswer).toUpperCase();
                        }
                    } else {
                        // 确保是大写字母
                        q.correctAnswer = q.correctAnswer.toUpperCase();
                    }
                });

                // 初始化数据
                questionBank = importedData;
                userAnswers = new Array(questionBank.length).fill("E");
                currentQuestionIndex = 0;
                reviewMode = false;

                // 记录当前分类信息
                const currentCategoryInfo = {
                    category: firstValue,
                    chapter: secondValue
                };
                dataManager.setCurrentCategoryInfo(currentCategoryInfo);

                // 从整体进度恢复当前章节状态
                restoreProgressFromOverall();

                // 保存到 localStorage
                localStorage.setItem('questionBank', JSON.stringify(questionBank));
                localStorage.setItem('currentCategoryInfo', JSON.stringify(currentCategoryInfo));

                // 渲染界面
                uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
                uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
                uiManager.updateStats(userAnswers, questionBank);

                utils.showMessage(`成功导入 ${questionBank.length} 道题目！`, 'success');
            })
            .catch(error => {
                utils.showMessage('导入失败：' + error.message, 'error');
                console.error(error);
            });
    }

    // ===================================================
    // 从整体进度恢复当前章节状态
    // ===================================================
    function restoreProgressFromOverall() {
        const currentCategoryInfo = dataManager.getCurrentCategoryInfo();
        if (!currentCategoryInfo) return;

        const { category, chapter } = currentCategoryInfo;
        const chapterProgress = dataManager.getChapterProgress(category, chapter);
        if (!chapterProgress) return;

        if (chapterProgress.length !== questionBank.length) {
            console.warn('状态长度与题库不匹配，使用默认状态');
            return;
        }

        // 使用整体进度中的状态
        userAnswers = [...chapterProgress];
        saveProgress();
    }

    // ===================================================
    // 保存进度
    // ===================================================
    function saveProgress() {
        const progress = {
            userAnswers,
            currentQuestionIndex
        };
        localStorage.setItem('quizProgress', JSON.stringify(progress));
    }

    // ===================================================
    // 处理导航题目点击
    // ===================================================
    function handleQuestionNavClick(index) {
        currentQuestionIndex = index;
        uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex, reviewMode);
        uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
    }

    // ===================================================
    // 模块导出接口
    // ===================================================
    return {
        init,
        selectOption,
        handleQuestionNavClick
    };
})();

// 页面加载完毕后执行初始化
document.addEventListener('DOMContentLoaded', main.init);
window.main = main;