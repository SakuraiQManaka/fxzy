// 主程序模块
const main = (function() {
    // 当前状态
    let questionBank = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let reviewMode = false;
    let wrongQuestions = [];
    let filePath = "";

    // DOM元素
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
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importWrongBtn = document.getElementById('importWrongBtn');
    const wrongFileInput = document.getElementById('wrongFileInput');
    const completionMessage = document.getElementById('completionMessage');
    const finalRate = document.getElementById('finalRate');
    const reviewBtn = document.getElementById('reviewBtn');
    const toggleSwitch = document.getElementById('toggleSwitch');
    const overallProgressBtn = document.getElementById('overallProgressBtn');

    // 初始化
    function init() {
        // 尝试从本地存储加载数据
        const savedProgress = localStorage.getItem('quizProgress');
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            userAnswers = progress.userAnswers || [];
            currentQuestionIndex = progress.currentQuestionIndex || 0;
        }
        
        // 尝试从本地存储加载题库
        const savedQuestionBank = localStorage.getItem('questionBank');
        if (savedQuestionBank) {
            questionBank = JSON.parse(savedQuestionBank);
            
            // 确保userAnswers数组长度与题库一致
            if (userAnswers.length !== questionBank.length) {
                if (userAnswers.length > questionBank.length) {
                    userAnswers = userAnswers.slice(0, questionBank.length);
                } else {
                    userAnswers = userAnswers.concat(new Array(questionBank.length - userAnswers.length).fill(undefined));
                }
                saveProgress();
            }
        }
        
        // 加载整体进度
        dataManager.loadOverallProgress();

        const updateLogBtn = document.getElementById('updateLogBtn');
        updateLogBtn.addEventListener('click', utils.showUpdateLogs);
        
        overallProgressBtn.addEventListener('click', uiManager.showOverallProgress);
        importWrongBtn.addEventListener('click', triggerWrongFileInput);

        uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
        uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
        uiManager.updateStats(userAnswers, questionBank);
        
        // 添加事件监听器
        prevBtn.addEventListener('click', goToPreviousQuestion);
        nextBtn.addEventListener('click', goToNextQuestion);
        resetBtn.addEventListener('click', resetProgress);
        exportBtn.addEventListener('click', exportWrongQuestions);
        importBtn.addEventListener('click', importQuestionBank);
        reviewBtn.addEventListener('click', toggleReviewMode);
        wrongFileInput.addEventListener('change', importWrongQuestionsFromFile);

        // 初始化下拉菜单
        initDropdowns();
    }
    
    // 初始化下拉菜单
    function initDropdowns() {
        const firstSelect = document.getElementById('one');
        const secondSelect = document.getElementById('two');
        
        // 定义第二个下拉菜单的选项
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
        
        // 第一个下拉菜单变化事件
        firstSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            
            // 清空第二个下拉菜单
            secondSelect.innerHTML = '<option value="">选择章节</option>';
            
            // 如果选择了有效选项，则填充第二个下拉菜单
            if (selectedValue && options[selectedValue]) {
                options[selectedValue].forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.text;
                    secondSelect.appendChild(optionElement);
                });
            }
        });
        
        // 导入题库按钮点击事件
        importBtn.addEventListener('click', function() {
            const firstSelect = document.getElementById('one');
            const secondSelect = document.getElementById('two');
            
            const firstValue = dataManager.trans[firstSelect.value];
            const secondValue = secondSelect.value;
            
            // 验证是否已选择两个下拉菜单
            if (!firstValue || !secondValue) {
                utils.showMessage('请确保已选择两个下拉菜单的选项！', 'warning');
                return;
            }
            
            // 生成文件路径
            filePath = `./题库/${firstValue}/${secondValue}/${secondValue}.json`;
            
            // 立即导入题库
            importQuestionBank();
        });
    }

    // 选择选项
    function selectOption(optionIndex) {
        userAnswers[currentQuestionIndex] = optionIndex;
        
        // 更新整体进度
        const currentCategoryInfo = dataManager.getCurrentCategoryInfo();
        if (currentCategoryInfo) {
            const { category, chapter } = currentCategoryInfo;
            const isCorrect = optionIndex === questionBank[currentQuestionIndex].correctAnswer;
            dataManager.updateChapterProgress(category, chapter, currentQuestionIndex, isCorrect);
        }
        
        uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
        uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
        uiManager.updateStats(userAnswers, questionBank);
        
        // 保存进度到本地存储
        saveProgress();
        
        // 自动跳转到下一题（如果不是最后一题）
        const isChecked = toggleSwitch.checked;
        if (isChecked) {
            if (currentQuestionIndex < questionBank.length - 1) {
                setTimeout(() => {
                    currentQuestionIndex++;
                    uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
                    uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
                }, 500);
            }
        }
    }

    // 上一题
    function goToPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
            uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
        }
    }

    // 下一题
    function goToNextQuestion() {
        // 如果所有题目已完成且不在复习模式，显示结果
        const allAnswered = userAnswers.length === questionBank.length && 
                            userAnswers.every(answer => answer !== undefined && answer !== null);
        
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

    // 切换复习模式
    function toggleReviewMode() {
        reviewMode = !reviewMode;
        
        if (reviewMode) {
            // 进入复习模式，只显示错题
            wrongQuestions = userAnswers
                .map((answer, index) => ({ answer, index }))
                .filter(item => item.answer !== undefined && 
                               item.answer !== null && 
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
            // 退出复习模式
            currentQuestionIndex = 0;
            uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
            uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
        }
    }

    // 重置进度
    function resetProgress() {
        if (confirm('确定要重置所有答题进度吗？')) {
            userAnswers = new Array(questionBank.length).fill(undefined);
            currentQuestionIndex = 0;
            reviewMode = false;
            uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
            uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
            uiManager.updateStats(userAnswers, questionBank);
            saveProgress();
            
            // 同时重置整体进度中当前章节的状态
            const currentCategoryInfo = dataManager.getCurrentCategoryInfo();
            if (currentCategoryInfo) {
                const { category, chapter } = currentCategoryInfo;
                const chapterProgress = dataManager.getChapterProgress(category, chapter);
                if (chapterProgress) {
                    // 重置该章节的所有题目状态为未做
                    chapterProgress.fill(null);
                    dataManager.saveOverallProgress();
                }
            }
            
            utils.showMessage('进度已重置，可以重新开始做题', 'success');
        }
    }

    // 导出错题
    function exportWrongQuestions() {
        const wrongQuestions = questionBank.filter((question, index) => 
            userAnswers[index] !== undefined && 
            userAnswers[index] !== null && 
            userAnswers[index] !== question.correctAnswer
        );
        
        if (wrongQuestions.length === 0) {
            utils.showMessage('没有错题可以导出！', 'warning');
            return;
        }
        
        // 确保导出的错题包含所有必要字段
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
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = '错题集.json';
        link.click();
    }

    // 导入题库
    function importQuestionBank() {
        // 验证是否已选择两个下拉菜单
        if (!filePath) {
            utils.showMessage('请先通过下拉菜单选择题库！', 'warning');
            return;
        }
        
        console.log('尝试导入题库，文件路径:', filePath);
        
        // 使用fetch API从服务器获取JSON文件
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`文件加载失败: ${response.status}`);
                }
                return response.json();
            })
            .then(importedData => {
                // 验证导入的数据格式
                if (!Array.isArray(importedData)) {
                    throw new Error('题库数据格式不正确，应该是一个数组');
                }
                
                // 检查每个题目的必需字段
                for (let i = 0; i < importedData.length; i++) {
                    const question = importedData[i];
                    if (!question.id || !question.question || !question.options || 
                        question.correctAnswer === undefined || !question.explanation) {
                        throw new Error(`第 ${i+1} 个题目缺少必需字段`);
                    }
                    
                    if (!Array.isArray(question.options)) {
                        throw new Error(`第 ${i+1} 个题目的选项格式不正确，应该是一个数组`);
                    }
                }
                
                questionBank = importedData;
                userAnswers = new Array(questionBank.length).fill(undefined);
                currentQuestionIndex = 0;
                reviewMode = false;
                
                // 记录当前题库的分类信息
                const firstSelect = document.getElementById('one');
                const secondSelect = document.getElementById('two');
                const currentCategoryInfo = {
                    category: dataManager.trans[firstSelect.value],
                    chapter: secondSelect.value
                };
                dataManager.setCurrentCategoryInfo(currentCategoryInfo);
                
                // 保存到本地存储
                localStorage.setItem('questionBank', JSON.stringify(questionBank));
                localStorage.setItem('currentCategoryInfo', JSON.stringify(currentCategoryInfo));
                
                // 从整体进度恢复状态
                restoreProgressFromOverall();
                
                uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
                uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
                uiManager.updateStats(userAnswers, questionBank);
                
                utils.showMessage(`成功导入 ${questionBank.length} 道题目！`, 'success');
                utils.showMessage('可以点击重置进度按钮重新做题', 'info');
            })
            .catch(error => {
                utils.showMessage('导入失败：' + error.message, 'error');
                console.error('导入错误详情:', error);
            });
    }

    // 从整体进度恢复当前题库的状态
    function restoreProgressFromOverall() {
        const currentCategoryInfo = dataManager.getCurrentCategoryInfo();
        if (!currentCategoryInfo) return;
        
        const { category, chapter } = currentCategoryInfo;
        const chapterProgress = dataManager.getChapterProgress(category, chapter);
        if (!chapterProgress) {
            return;
        }
        
        // 确保状态数组长度与题库一致
        if (chapterProgress.length !== questionBank.length) {
            console.warn('状态数组长度与题库不一致，无法恢复进度');
            return;
        }
        
        // 恢复用户答案
        userAnswers = [];
        chapterProgress.forEach((state, index) => {
            if (state !== null && state !== undefined) {
                // 如果是正确状态，设置为正确答案
                // 如果是错误状态，设置为一个特殊值表示错误但不知道具体选项
                if (state === true) {
                    userAnswers[index] = questionBank[index].correctAnswer;
                } else {
                    // 对于错误状态，我们无法知道用户具体选了哪个选项
                    // 所以设置为undefined，表示已答题但错误，但不知道具体选项
                    userAnswers[index] = undefined;
                }
            } else {
                userAnswers[index] = undefined;
            }
        });
        
        // 保存恢复的进度
        saveProgress();
    }

    // 触发错题文件选择
    function triggerWrongFileInput() {
        wrongFileInput.click();
    }

    // 从文件导入错题
    function importWrongQuestionsFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const wrongQuestionsData = JSON.parse(e.target.result);
                
                if (!Array.isArray(wrongQuestionsData)) {
                    throw new Error('错题文件格式不正确，应该是一个数组');
                }
                
                // 验证错题数据格式
                for (let i = 0; i < wrongQuestionsData.length; i++) {
                    const question = wrongQuestionsData[i];
                    if (!question.id || !question.question || !question.options || 
                        question.correctAnswer === undefined || !question.explanation) {
                        throw new Error(`第 ${i+1} 个错题缺少必需字段`);
                    }
                }
                
                // 将错题添加到当前题库
                const originalLength = questionBank.length;
                questionBank = [...questionBank, ...wrongQuestionsData];
                
                // 扩展用户答案数组
                userAnswers = [...userAnswers, ...new Array(wrongQuestionsData.length).fill(undefined)];
                
                // 保存到本地存储
                localStorage.setItem('questionBank', JSON.stringify(questionBank));
                saveProgress();
                
                uiManager.renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
                uiManager.renderQuestion(questionBank, userAnswers, currentQuestionIndex);
                uiManager.updateStats(userAnswers, questionBank);
                
                utils.showMessage(`成功导入 ${wrongQuestionsData.length} 道错题！当前题库共有 ${questionBank.length} 道题目`, 'success');
                
                // 重置文件输入
                wrongFileInput.value = '';
                
            } catch (error) {
                utils.showMessage('导入错题失败：' + error.message, 'error');
                console.error(error);
            }
        };
        
        reader.readAsText(file);
    }

    // 保存进度到本地存储
    function saveProgress() {
        const progress = {
            userAnswers: userAnswers,
            currentQuestionIndex: currentQuestionIndex
        };
        localStorage.setItem('quizProgress', JSON.stringify(progress));
    }

    return {
        init,
        selectOption,
        goToPreviousQuestion,
        goToNextQuestion,
        toggleReviewMode,
        resetProgress,
        exportWrongQuestions,
        importQuestionBank,
        triggerWrongFileInput,
        importWrongQuestionsFromFile
    };
})();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', main.init);