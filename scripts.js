let questionBank = [
    {
        id: 1,
        question: "HTML是什么的缩写？",
        options: ["HyperText Markup Language", "HighTech Modern Language", "HyperTransfer Markup Language"],
        correctAnswer: 0,
        explanation: "HTML是HyperText Markup Language的缩写，用于创建网页。",
        questionImage: "",
        explanationImage: ""
    },
    {
        id: 2,
        question: "CSS的主要作用是什么？",
        options: ["网页结构", "网页样式", "网页交互"],
        correctAnswer: 1,
        explanation: "CSS用于控制网页的样式和布局。",
        questionImage: "",
        explanationImage: ""
    },
    {
        id: 3,
        question: "JavaScript是一种什么类型的语言？",
        options: ["编译型语言", "解释型语言", "标记语言"],
        correctAnswer: 1,
        explanation: "JavaScript是一种解释型脚本语言，主要在浏览器中运行。",
        questionImage: "",
        explanationImage: ""
    },
    {
        id: 4,
        question: "以下哪个不是JavaScript的数据类型？",
        options: ["string", "boolean", "integer"],
        correctAnswer: 2,
        explanation: "JavaScript有number类型，但没有独立的integer类型。",
        questionImage: "",
        explanationImage: ""
    },
    {
        id: 5,
        question: "CSS中用于设置元素外边距的属性是？",
        options: ["padding", "border", "margin"],
        correctAnswer: 2,
        explanation: "margin属性用于设置元素的外边距。",
        questionImage: "",
        explanationImage: ""
    }
];

// 当前状态
let currentQuestionIndex = 0;
let userAnswers = [];
let reviewMode = false;
let wrongQuestions = [];
let overallProgress = null;
let currentCategoryInfo = null;

// DOM元素
const questionNav = document.getElementById('questionNav');
const questionText = document.getElementById('questionText');
const questionImage = document.getElementById('questionImage');
const optionsContainer = document.getElementById('optionsContainer');
const explanation = document.getElementById('explanation');
const explanationText = document.getElementById('explanationText');
const explanationImage = document.getElementById('explanationImage');
const currentQuestionNumber = document.getElementById('currentQuestionNumber');
const correctCount = document.getElementById('correctCount');
const incorrectCount = document.getElementById('incorrectCount');
const completionRate = document.getElementById('completionRate');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importWrongBtn = document.getElementById('importWrongBtn');
const wrongFileInput = document.getElementById('wrongFileInput');
const fileInput = document.getElementById('fileInput');
const completionMessage = document.getElementById('completionMessage');
const finalRate = document.getElementById('finalRate');
const reviewBtn = document.getElementById('reviewBtn');
const toggleSwitch = document.getElementById('toggleSwitch');
const statusDiv = document.getElementById('status');
const overallProgressBtn = document.getElementById('overallProgressBtn');
var filePath = "";

// 定义题库类型映射（移到全局作用域）
const trans = {
    ppl: "私照",
    cpl: "商照",
    ins: "仪表",
};

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
    }
    
    // 尝试从本地存储加载分类信息
    const savedCategoryInfo = localStorage.getItem('currentCategoryInfo');
    if (savedCategoryInfo) {
        currentCategoryInfo = JSON.parse(savedCategoryInfo);
    }

    // 加载整体进度
    loadOverallProgress();

    const updateLogBtn = document.getElementById('updateLogBtn');
    updateLogBtn.addEventListener('click', showUpdateLogs);
    
    overallProgressBtn.addEventListener('click', showOverallProgress);
    importWrongBtn.addEventListener('click', triggerWrongFileInput);

    renderQuestionNavigation();
    renderQuestion();
    updateStats();
    
    // 添加事件监听器
    prevBtn.addEventListener('click', goToPreviousQuestion);
    nextBtn.addEventListener('click', goToNextQuestion);
    resetBtn.addEventListener('click', resetProgress);
    exportBtn.addEventListener('click', exportWrongQuestions);
    importBtn.addEventListener('click', importQuestionBank);
    reviewBtn.addEventListener('click', toggleReviewMode);
    wrongFileInput.addEventListener('change', importWrongQuestionsFromFile);
}

// 加载整体进度
function loadOverallProgress() {
    const savedOverallProgress = localStorage.getItem('overallProgress');
    if (savedOverallProgress) {
        overallProgress = JSON.parse(savedOverallProgress);
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
                
                // 初始化答题状态数组
                initializeProgressStates();
                
                localStorage.setItem('overallProgress', JSON.stringify(overallProgress));
            })
            .catch(error => {
                console.error('加载整体进度失败:', error);
                showMessage('加载整体进度失败，请刷新页面重试', 'error');
            });
    }
}

// 初始化答题状态数组
function initializeProgressStates() {
    for (const category in overallProgress) {
        if (overallProgress.hasOwnProperty(category)) {
            const categoryData = overallProgress[category];
            categoryData.state.forEach(chapter => {
                // 如果state数组为空，初始化为null数组
                if (chapter.state.length === 0) {
                    chapter.state = new Array(chapter.number).fill(null);
                }
            });
        }
    }
}

// 显示整体进度
function showOverallProgress() {
    if (!overallProgress) {
        showMessage('整体进度数据尚未加载完成', 'warning');
        return;
    }

    // 重新计算当前进度
    updateOverallProgressFromCurrent();

    let progressContent = '<div class="overall-progress-content">';
    
    // 计算总体进度
    let totalQuestions = 0;
    let totalAnswered = 0;
    let totalCorrect = 0;
    
    for (const category in overallProgress) {
        if (overallProgress.hasOwnProperty(category)) {
            const categoryData = overallProgress[category];
            progressContent += `<div class="progress-category">
                <h3>${category} (${categoryData.number_all}题)</h3>
                <div class="chapter-progress">`;
            
            categoryData.state.forEach(chapter => {
                // 确保state数组存在且长度正确
                if (!chapter.state || chapter.state.length !== chapter.number) {
                    chapter.state = new Array(chapter.number).fill(null);
                }
                
                const answered = chapter.state.filter(s => s !== null && s !== undefined).length;
                const correct = chapter.state.filter(s => s === true).length;
                
                totalQuestions += chapter.number;
                totalAnswered += answered;
                totalCorrect += correct;
                
                const progressPercent = chapter.number > 0 ? Math.round((answered / chapter.number) * 100) : 0;

                progressContent += `
                    <div class="chapter-item">
                        <div class="chapter-name">${chapter.name}</div>
                        <div class="chapter-stats">
                            <span class="correct-rate">已做: ${answered}题</span>
                            <span class="answered-count">(${answered}/${chapter.number})</span>
                        </div>
                        <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                `;
            });
            
            progressContent += '</div></div>';
        }
    }
    
    // 总体统计
    const overallPercent = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
    
    progressContent += `
        <div class="overall-summary">
            <h3>总体统计</h3>
            <div class="summary-stats">
                <div class="summary-item">
                    <div class="summary-value">${overallPercent}%</div>
                    <div class="summary-label">完成进度</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${totalAnswered}</div>
                    <div class="summary-label">已做题目</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${totalQuestions}</div>
                    <div class="summary-label">总题目数</div>
                </div>
            </div>
        </div>
    </div>`;
    
    showInfoModal({
        title: "整体刷题进度",
        context: progressContent,
        date: new Date().toLocaleDateString()
    });
}

// 从当前答题状态更新整体进度
function updateOverallProgressFromCurrent() {
    if (!questionBank.length || !overallProgress) return;
    
    // 如果有当前分类信息，使用它
    if (currentCategoryInfo) {
        const { category, chapter } = currentCategoryInfo;
        
        // 确保分类存在
        if (!overallProgress[category]) {
            overallProgress[category] = {
                names: [chapter],
                number_all: questionBank.length,
                path: "",
                state: []
            };
        }
        
        // 确保章节存在
        let chapterData = overallProgress[category].state.find(c => c.name === chapter);
        if (!chapterData) {
            chapterData = {
                name: chapter,
                number: questionBank.length,
                state: new Array(questionBank.length).fill(null)
            };
            overallProgress[category].state.push(chapterData);
        }
        
        // 更新答题状态
        userAnswers.forEach((answer, index) => {
            if (answer !== undefined && index < chapterData.state.length) {
                const isCorrect = answer === questionBank[index].correctAnswer;
                chapterData.state[index] = isCorrect;
            }
        });
    } else {
        // 临时方案：只在有当前题库时更新一个默认分类
        const currentCategory = "当前练习";
        const currentChapter = "导入的题目";
        
        if (!overallProgress[currentCategory]) {
            overallProgress[currentCategory] = {
                names: [currentChapter],
                number_all: questionBank.length,
                path: "",
                state: [
                    {
                        name: currentChapter,
                        number: questionBank.length,
                        state: new Array(questionBank.length).fill(null)
                    }
                ]
            };
        }
        
        // 更新答题状态
        const chapter = overallProgress[currentCategory].state[0];
        userAnswers.forEach((answer, index) => {
            if (answer !== undefined && index < chapter.state.length) {
                const isCorrect = answer === questionBank[index].correctAnswer;
                chapter.state[index] = isCorrect;
            }
        });
    }
    
    // 保存更新后的进度
    localStorage.setItem('overallProgress', JSON.stringify(overallProgress));
}

// 从整体进度恢复当前题库的状态
function restoreProgressFromOverall() {
    if (!currentCategoryInfo || !overallProgress) return;
    
    const { category, chapter } = currentCategoryInfo;
    
    // 检查是否存在对应的分类和章节
    if (!overallProgress[category]) {
        return;
    }
    
    const chapterData = overallProgress[category].state.find(c => c.name === chapter);
    if (!chapterData || !chapterData.state) {
        return;
    }
    
    // 确保状态数组长度与题库一致
    if (chapterData.state.length !== questionBank.length) {
        console.warn('状态数组长度与题库不一致，无法恢复进度');
        return;
    }
    
    // 恢复用户答案
    userAnswers = [];
    chapterData.state.forEach((state, index) => {
        if (state !== null && state !== undefined) {
            // 如果是正确状态，设置为正确答案
            // 如果是错误状态，设置为一个特殊值表示错误但不知道具体选项
            if (state === true) {
                userAnswers[index] = questionBank[index].correctAnswer;
            } else {
                // 对于错误状态，我们无法知道用户具体选了哪个选项
                // 所以设置为一个特殊值，表示已答题但错误
                userAnswers[index] = -1;
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
            
            renderQuestionNavigation();
            renderQuestion();
            updateStats();
            
            showMessage(`成功导入 ${wrongQuestionsData.length} 道错题！当前题库共有 ${questionBank.length} 道题目`, 'success');
            
            // 重置文件输入
            wrongFileInput.value = '';
            
        } catch (error) {
            showMessage('导入错题失败：' + error.message, 'error');
            console.error(error);
        }
    };
    
    reader.readAsText(file);
}

// 渲染题目导航
function renderQuestionNavigation() {
    questionNav.innerHTML = '';
    questionBank.forEach((question, index) => {
        const questionNumber = document.createElement('li');
        questionNumber.className = 'question-number';
        questionNumber.textContent = index + 1;
        questionNumber.dataset.index = index;
        
        // 设置当前题目样式
        if (index === currentQuestionIndex) {
            questionNumber.classList.add('current');
        }
        
        // 设置答题状态样式
        if (userAnswers[index] !== undefined) {
            if (userAnswers[index] === questionBank[index].correctAnswer) {
                questionNumber.classList.add('correct');
            } else {
                questionNumber.classList.add('incorrect');
            }
        }
        
        questionNumber.addEventListener('click', () => {
            currentQuestionIndex = index;
            renderQuestion();
            renderQuestionNavigation();
        });
        
        questionNav.appendChild(questionNumber);
    });
}

// 渲染当前题目
function renderQuestion() {
    if (questionBank.length === 0) {
        questionText.textContent = "请先导入题库开始练习";
        optionsContainer.innerHTML = '';
        explanation.style.display = 'none';
        return;
    }
    
    const question = questionBank[currentQuestionIndex];
    currentQuestionNumber.textContent = currentQuestionIndex + 1;
    questionText.textContent = question.question;
    
    // 显示题目图片（如果有）
    if (question.questionImage) {
        questionImage.src = question.questionImage;
        questionImage.style.display = 'block';
    } else {
        questionImage.style.display = 'none';
    }
    
    // 渲染选项
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        if (index === question.correctAnswer) {
            optionElement.id = 'correct';  
        } else {
            optionElement.id = 'incorrect';
        }
        
        // 如果已经答题，显示正确/错误状态
        if (userAnswers[currentQuestionIndex] !== undefined) {
            if (index === question.correctAnswer) {
                optionElement.classList.add('correct');
            } else if (index === userAnswers[currentQuestionIndex] && index !== question.correctAnswer) {
                optionElement.classList.add('incorrect');
            }
        }
        
        // 如果当前选项被选中
        if (userAnswers[currentQuestionIndex] === index) {
            optionElement.classList.add('selected');
        }
        
        const optionLabel = document.createElement('div');
        optionLabel.className = 'option-label';
        optionLabel.textContent = String.fromCharCode(65 + index); // A, B, C
        
        const optionText = document.createElement('div');
        optionText.textContent = option;
        
        optionElement.appendChild(optionLabel);
        optionElement.appendChild(optionText);
        
        // 如果还未答题，添加点击事件
        if (userAnswers[currentQuestionIndex] === undefined && !reviewMode) {
            optionElement.addEventListener('click', () => selectOption(index));
        }
        
        optionsContainer.appendChild(optionElement);
    });
    
    // 显示解析（如果已答题）
    if (userAnswers[currentQuestionIndex] !== undefined || reviewMode) {
        explanationText.textContent = question.explanation;
        
        // 显示解析图片（如果有）
        if (question.explanationImage) {
            explanationImage.src = question.explanationImage;
            explanationImage.style.display = 'block';
        } else {
            explanationImage.style.display = 'none';
        }
        
        explanation.style.display = 'block';
    } else {
        explanation.style.display = 'none';
    }
    
    // 更新按钮状态
    prevBtn.disabled = currentQuestionIndex === 0;
    
    // 检查是否所有题目都已作答
    const allAnswered = userAnswers.length === questionBank.length && 
                        userAnswers.every(answer => answer !== undefined);
    
    if (allAnswered && !reviewMode) {
        nextBtn.textContent = '查看结果';
    } else if (reviewMode) {
        nextBtn.textContent = '下一题';
    } else {
        nextBtn.textContent = '下一题';
    }
    
    // 显示完成消息（如果所有题目已完成）
    if (allAnswered && !reviewMode) {
        completionMessage.style.display = 'block';
        const correctAnswers = userAnswers.filter((answer, index) => 
            answer === questionBank[index].correctAnswer
        ).length;
        const rate = Math.round((correctAnswers / questionBank.length) * 100);
        finalRate.textContent = `${rate}%`;
    } else {
        completionMessage.style.display = 'none';
    }
    
    // 保存进度到本地存储
    saveProgress();
}

// 选择选项
function selectOption(optionIndex) {
    userAnswers[currentQuestionIndex] = optionIndex;
    renderQuestion();
    renderQuestionNavigation();
    updateStats();
    
    // 自动跳转到下一题（如果不是最后一题）
    const isChecked = toggleSwitch.checked;
    const element = document.querySelector('.option.correct.selected');
    if (isChecked &&  element) {
        if (currentQuestionIndex < questionBank.length - 1) {
            setTimeout(() => {
                currentQuestionIndex++;
                renderQuestion();
                renderQuestionNavigation();
            }, 500);
        }
    }
}

// 更新统计信息
function updateStats() {
    const totalAnswered = userAnswers.filter(answer => answer !== undefined).length;
    const correctAnswers = userAnswers.filter((answer, index) => 
        answer === questionBank[index]?.correctAnswer
    ).length;
    const correctProgress = document.getElementById('correctProgress');
    correctProgress.textContent = `${correctAnswers}/${totalAnswered}`;
    const rate = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    updateCircularProgress(rate);
}

function updateCircularProgress(percentage) {
    const circle = document.querySelector('.progress-ring-circle');
    const progressText = document.getElementById('completionRate');
    
    // 计算进度条的 stroke-dashoffset
    const circumference = 2 * Math.PI * 26; // 2 * π * r
    const offset = circumference - (percentage / 100) * circumference;
    
    // 更新进度条
    circle.style.strokeDashoffset = offset;
    
    // 更新百分比文字
    progressText.textContent = `${percentage}%`;
    
    // 根据百分比改变颜色
    if (percentage >= 80) {
        circle.style.stroke = '#4CAF50'; // 绿色
    } else if (percentage >= 60) {
        circle.style.stroke = '#FF9800'; // 橙色
    } else {
        circle.style.stroke = '#F44336'; // 红色
    }
}

// 上一题
function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
        renderQuestionNavigation();
    }
}

// 下一题
function goToNextQuestion() {
    // 如果所有题目已完成且不在复习模式，显示结果
    if (userAnswers.length === questionBank.length && 
        userAnswers.every(answer => answer !== undefined) && 
        !reviewMode) {
        toggleReviewMode();
        return;
    }
    
    if (currentQuestionIndex < questionBank.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
        renderQuestionNavigation();
    }
}

// 切换复习模式
function toggleReviewMode() {
    reviewMode = !reviewMode;
    
    if (reviewMode) {
        // 进入复习模式，只显示错题
        wrongQuestions = userAnswers
            .map((answer, index) => ({ answer, index }))
            .filter(item => item.answer !== questionBank[item.index].correctAnswer)
            .map(item => item.index);
        
        if (wrongQuestions.length > 0) {
            currentQuestionIndex = wrongQuestions[0];
            renderQuestion();
            renderQuestionNavigation();
            completionMessage.style.display = 'none';
        } else {
            showMessage('没有错题需要复习！', 'warning');
            reviewMode = false;
        }
    } else {
        // 退出复习模式
        currentQuestionIndex = 0;
        renderQuestion();
        renderQuestionNavigation();
    }
}

// 重置进度
function resetProgress() {
    if (confirm('确定要重置所有答题进度吗？')) {
        userAnswers = [];
        currentQuestionIndex = 0;
        reviewMode = false;
        renderQuestion();
        renderQuestionNavigation();
        updateStats();
        saveProgress();
        
        // 同时重置整体进度中当前章节的状态
        if (currentCategoryInfo && overallProgress) {
            const { category, chapter } = currentCategoryInfo;
            
            // 检查是否存在对应的分类和章节
            if (overallProgress[category]) {
                const chapterData = overallProgress[category].state.find(c => c.name === chapter);
                if (chapterData) {
                    // 重置该章节的所有题目状态为未做
                    chapterData.state = new Array(chapterData.number).fill(null);
                    
                    // 保存更新后的整体进度
                    localStorage.setItem('overallProgress', JSON.stringify(overallProgress));
                }
            }
        }
        
        showMessage('进度已重置，可以重新开始做题', 'success');
    }
}

// 导出错题
function exportWrongQuestions() {
    const wrongQuestions = questionBank.filter((question, index) => 
        userAnswers[index] !== undefined && userAnswers[index] !== question.correctAnswer
    );
    
    if (wrongQuestions.length === 0) {
        showMessage('没有错题可以导出！', 'warning');
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
document.addEventListener('DOMContentLoaded', function() {
    const firstSelect = document.getElementById('one');
    const secondSelect = document.getElementById('two');
    const generateBtn = document.getElementById('importBtn');
    const resultDiv = document.getElementById('result');
    const filePathDiv = document.getElementById('file-path');
    
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
        secondSelect.innerHTML = '<option value="">-- 请选择 --</option>';
        
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
    
    // 生成按钮点击事件
    generateBtn.addEventListener('click', function() {
        const firstValue = trans[firstSelect.value];
        const secondValue = secondSelect.value;
        
        // 验证是否已选择两个下拉菜单
        if (!firstValue || !secondValue) {
            showMessage('请确保已选择两个下拉菜单的选项！', 'warning');
            return;
        }
        
        // 生成文件路径
        filePath = `./题库/${firstValue}/${secondValue}/${secondValue}.json`;
    });

});

function importQuestionBank() {
    // 验证是否已选择两个下拉菜单
    if (!filePath) {
        showMessage('请先通过下拉菜单选择题库！', 'warning');
        return;
    }
    
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
                
                if (!Array.isArray(question.options) || question.options.length !== 3) {
                    throw new Error(`第 ${i+1} 个题目的选项格式不正确，应该是包含三个元素的数组`);
                }
            }
            
            questionBank = importedData;
            userAnswers = [];
            currentQuestionIndex = 0;
            reviewMode = false;
            
            // 记录当前题库的分类信息
            const firstSelect = document.getElementById('one');
            const secondSelect = document.getElementById('two');
            currentCategoryInfo = {
                category: trans[firstSelect.value],
                chapter: secondSelect.value
            };
            
            // 保存到本地存储
            localStorage.setItem('questionBank', JSON.stringify(questionBank));
            localStorage.setItem('currentCategoryInfo', JSON.stringify(currentCategoryInfo));
            
            // 从整体进度恢复状态
            restoreProgressFromOverall();
            
            renderQuestionNavigation();
            renderQuestion();
            updateStats();
            
            showMessage(`成功导入 ${questionBank.length} 道题目！`, 'success');
            showMessage('可以点击重置进度按钮重新做题', 'info');
        })
        .catch(error => {
            showMessage('导入失败：' + error.message, 'error');
            console.error(error);
        });
}

// 消息队列和状态变量
let messageQueue = [];
let messageCount = 0; // 跟踪当前显示的消息数量
let lastMessageTime = 0; // 记录上一条消息显示的时间

function showMessage(message, type = 'info') {
    const currentTime = Date.now();
    const timeSinceLastMessage = currentTime - lastMessageTime;
    
    // 如果距离上一条消息显示不足500ms，则延迟显示
    if (timeSinceLastMessage < 500 && messageCount > 0) {
        const delay = 500 - timeSinceLastMessage;
        setTimeout(() => {
            displayMessage(message, type);
        }, delay);
    } else {
        // 立即显示
        displayMessage(message, type);
    }
}

// 显示单个消息
function displayMessage(message, type) {
    // 更新最后消息时间
    lastMessageTime = Date.now();
    
    // 计算垂直位置 - 根据当前显示的消息数量
    const verticalOffset = messageCount * 80; // 80px 为每条消息的高度+间距
    
    // 创建消息框元素
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box';
    messageBox.textContent = message;
    
    // 根据类型设置不同的边框颜色
    const colors = {
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#4a00e0'
    };
    
    messageBox.style.borderLeftColor = colors[type] || colors.info;
    
    // 设置初始位置 - 从右上角外部开始
    messageBox.style.position = 'fixed';
    messageBox.style.top = `${20 + verticalOffset}px`;
    messageBox.style.right = '-400px'; // 从右侧外部开始
    messageBox.style.zIndex = '1000';
    messageBox.style.transition = 'right 0.5s ease, opacity 0.5s ease';
    messageBox.style.opacity = '0';
    
    // 添加到页面
    document.body.appendChild(messageBox);
    
    // 增加消息计数
    messageCount++;
    
    // 显示消息框 - 从右侧滑入
    setTimeout(() => {
        messageBox.style.right = '20px';
        messageBox.style.opacity = '1';
    }, 10);
    
    // 5秒后开始淡出
    setTimeout(() => {
        messageBox.style.opacity = '0';
        messageBox.style.right = '-400px'; // 滑出到右侧
        
        // 动画完成后移除元素
        setTimeout(() => {
            if (document.body.contains(messageBox)) {
                document.body.removeChild(messageBox);
            }
            
            // 减少消息计数
            messageCount--;
        }, 500);
    }, 5000);
}

// 更新日志数据
const updateLogs = [
    {
        title: "Ver1.0-刷题系统初始版本发布",
        context: "刷题系统第一个正式版本，无需导入即可开始做题",
        date: "2025-09-30"
    },
    {
        title: "Ver1.1-页面布局和新功能更新",
        context: [
        "1. 更新了当前做题数据显示，正确率现在有了一个小动画",
        "2. 更新了一个消息框功能",
        "3. 在标题栏放了一个更新日志按钮，现在可以点击查看更新日志了",
        ],
        date: "2024-10-1"
    },
];

// 显示信息框函数
function showInfoModal(infoObj) {
    // 移除已存在的信息框
    const existingModal = document.querySelector('.info-modal');
    const existingOverlay = document.querySelector('.info-modal-overlay');
    if (existingModal) existingModal.remove();
    if (existingOverlay) existingOverlay.remove();
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'info-modal-overlay';
    
    // 创建信息框
    const modal = document.createElement('div');
    modal.className = 'info-modal';
    
    // 信息框内容 - 如果是字符串直接显示，如果是数组则处理为HTML
    let contentHTML = '';
    if (typeof infoObj.context === 'string') {
        contentHTML = `<p>${infoObj.context}</p>`;
    } else {
        contentHTML = infoObj.context;
    }
    
    modal.innerHTML = `
        <div class="info-modal-header">
            <div class="info-modal-title">${infoObj.title}</div>
            <div class="info-modal-date">${infoObj.date}</div>
            <div class="info-modal-close"></div>
        </div>
        <div class="info-modal-content">
            ${contentHTML}
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // 显示信息框
    setTimeout(() => {
        overlay.classList.add('show');
        modal.classList.add('show');
    }, 10);
    
    // 关闭按钮事件
    const closeBtn = modal.querySelector('.info-modal-close');
    closeBtn.addEventListener('click', closeInfoModal);
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', closeInfoModal);
    
    // ESC键关闭
    function handleEscKey(event) {
        if (event.keyCode === 27) {
            closeInfoModal();
        }
    }
    document.addEventListener('keydown', handleEscKey);
    
    function closeInfoModal() {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
        
        document.removeEventListener('keydown', handleEscKey);
    }
}

// 显示更新日志
function showUpdateLogs() {
    // 这里可以显示最新的更新日志，或者显示所有日志的列表
    // 暂时显示最新的更新日志
    const latestLog = updateLogs[updateLogs.length - 1];
    showInfoModal(latestLog);
}

// 保存进度到本地存储
function saveProgress() {
    const progress = {
        userAnswers: userAnswers,
        currentQuestionIndex: currentQuestionIndex
    };
    localStorage.setItem('quizProgress', JSON.stringify(progress));
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);