// 界面管理模块
const uiManager = (function() {
    // 渲染题目导航
    function renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex) {
        const questionNav = document.getElementById('questionNav');
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
                renderQuestion(questionBank, userAnswers, currentQuestionIndex);
                renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex);
            });
            
            questionNav.appendChild(questionNumber);
        });
    }

    // 渲染当前题目
    function renderQuestion(questionBank, userAnswers, currentQuestionIndex, reviewMode = false) {
        const questionText = document.getElementById('questionText');
        const questionImage = document.getElementById('questionImage');
        const optionsContainer = document.getElementById('optionsContainer');
        const explanation = document.getElementById('explanation');
        const explanationText = document.getElementById('explanationText');
        const explanationImage = document.getElementById('explanationImage');
        const currentQuestionNumber = document.getElementById('currentQuestionNumber');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const completionMessage = document.getElementById('completionMessage');
        const finalRate = document.getElementById('finalRate');

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
                optionElement.addEventListener('click', () => main.selectOption(index));
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
    }

    // 更新统计信息
    function updateStats(userAnswers, questionBank) {
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

    // 显示整体进度
    function showOverallProgress() {
        const overallProgress = dataManager.getOverallProgress();
        if (!overallProgress) {
            utils.showMessage('整体进度数据尚未加载完成', 'warning');
            return;
        }

        let progressContent = '<div class="overall-progress-content">';
        
        // 计算总体进度
        let totalQuestions = 0;
        let totalAnswered = 0;
        let totalCorrect = 0;
        
        // 按照order排序显示分类
        const sortedCategories = dataManager.getSortedCategories();
        
        sortedCategories.forEach(({ name: category, number_all, state }) => {
            progressContent += `<div class="progress-category">
                <h3>${category} (${number_all}题)</h3>
                <div class="chapter-progress">`;
            
            state.forEach(chapter => {
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
        });
        
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
                <button class="btn-warning" id="resetAllProgressBtn" style="margin-top: 15px; width: 100%;">初始化全部题库进度</button>
            </div>
        </div>`;
        
        utils.showInfoModal({
            title: "整体刷题进度",
            context: progressContent,
            date: new Date().toLocaleDateString()
        });

        // 添加初始化全部题库进度按钮的事件监听
        setTimeout(() => {
            const resetAllBtn = document.getElementById('resetAllProgressBtn');
            if (resetAllBtn) {
                resetAllBtn.addEventListener('click', resetAllProgressHandler);
            }
        }, 100);
    }

    // 初始化全部题库进度处理函数
    function resetAllProgressHandler() {
        if (confirm('确定要初始化全部题库进度吗？这将重置所有答题记录！')) {
            if (dataManager.resetAllProgress()) {
                utils.showMessage('全部题库进度已初始化', 'success');
                // 重新显示整体进度
                showOverallProgress();
            } else {
                utils.showMessage('初始化失败', 'error');
            }
        }
    }

    return {
        renderQuestionNavigation,
        renderQuestion,
        updateStats,
        showOverallProgress
    };
})();