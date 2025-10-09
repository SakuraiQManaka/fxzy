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
const fileInput = document.getElementById('fileInput');
const completionMessage = document.getElementById('completionMessage');
const finalRate = document.getElementById('finalRate');
const reviewBtn = document.getElementById('reviewBtn');
const toggleSwitch = document.getElementById('toggleSwitch');
const statusDiv = document.getElementById('status');
var filePath = "";
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

    const updateLogBtn = document.getElementById('updateLogBtn');
    updateLogBtn.addEventListener('click', showUpdateLogs);

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
    
    const dataStr = JSON.stringify(wrongQuestions, null, 2);
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
    
    const trans = {
        ppl: "私照",
        cpl: "商照",
        ins: "仪表",
    }
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
        filePath = `\\fxzy\\题库\\${firstValue}\\${secondValue}\\${secondValue}.json`;
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
            
            // 保存到本地存储
            localStorage.setItem('questionBank', JSON.stringify(questionBank));
            saveProgress();
            
            renderQuestionNavigation();
            renderQuestion();
            updateStats();
            
            showMessage(`成功导入 ${questionBank.length} 道题目！`, 'success');
        })
        .catch(error => {
            showMessage('导入失败：' + error.message, 'error');
            console.error(error);
        });
}

function showMessage(message, type = 'info') {
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
    
    // 添加到页面
    document.body.appendChild(messageBox);
    
    // 显示消息框
    setTimeout(() => {
        messageBox.classList.add('show');
    }, 10);
    
    // 3秒后开始淡出
    setTimeout(() => {
        messageBox.classList.add('fade-out');
        
        // 淡出动画完成后移除元素
        setTimeout(() => {
            document.body.removeChild(messageBox);
        }, 500);
    }, 3000);
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
    
    // 信息框内容
    modal.innerHTML = `
        <div class="info-modal-header">
            <div class="info-modal-title">${infoObj.title}</div>
            <div class="info-modal-date">${infoObj.date}</div>
            <div class="info-modal-close"></div>
        </div>
        <div class="info-modal-content">
            ${typeof infoObj.context === 'string' ? 
                `<p>${infoObj.context}</p>` : 
                infoObj.context.map(item => `<p>${item}</p>`).join('')
            }
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

// 保存进度到本地存储(!!!待修改)
function saveProgress() {
    if (progress) {
        return true;
    };
    const progress = {
        userAnswers: userAnswers,
        currentQuestionIndex: currentQuestionIndex
    };
    localStorage.setItem('Progress', JSON.stringify(progress));
}

//读取本地存储的题目目录
function GetProgress() {
    const savedProgress = localStorage.getItem("index");
    if (!saveProgress) {
        var progress = JSON.parse(saveProgress);
    } else {
        fetch("\\fxzy\\index.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`文件加载失败: ${response.status}`);
                }
                return response.json();
            })
            .then(importedData => {
                var progress = JSON.parse(importedData);
            })
            .catch(error => {
                showMessage('导入失败：' + error.message, 'error');
                console.error(error);
            }); 
    };
    return progress;
}



// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);