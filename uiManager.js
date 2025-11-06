// uiManager.js
const uiManager = (function() {

    // ===================================================
    // 渲染题目导航
    // ===================================================
    function renderQuestionNavigation(questionBank, userAnswers, currentQuestionIndex) {
        const questionNav = document.getElementById('questionNav');
        questionNav.innerHTML = '';

        questionBank.forEach((question, index) => {
            const questionNumber = document.createElement('li');
            questionNumber.className = 'question-number';
            questionNumber.textContent = index + 1;
            questionNumber.dataset.index = index;

            // 当前题标识
            if (index === currentQuestionIndex) {
                questionNumber.classList.add('current');
            }

            // 根据答题状态设置样式
            const userAnswer = userAnswers[index];
            
            if (userAnswer !== "E") {
                if (userAnswer === question.correctAnswer) {
                    questionNumber.classList.add('correct');
                } else {
                    questionNumber.classList.add('incorrect');
                }
            }

            questionNumber.addEventListener('click', () => {
                if (window.main && window.main.handleQuestionNavClick) {
                    window.main.handleQuestionNavClick(index);
                }
            });

            questionNav.appendChild(questionNumber);
        });
    }

    // ===================================================
    // 渲染题目与选项
    // ===================================================
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

        // 显示题目图片
        if (question.questionImage) {
            questionImage.src = question.questionImage;
            questionImage.style.display = 'block';
        } else {
            questionImage.style.display = 'none';
        }

        // 生成选项
        optionsContainer.innerHTML = '';
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';

            const userAnswer = userAnswers[currentQuestionIndex];
            const optionLetter = String.fromCharCode(65 + index);
            const isAnswered = userAnswer !== "E";
            const isCorrectAnswer = optionLetter === question.correctAnswer;
            const isUserSelected = userAnswer === optionLetter;

            // 设置选项样式
            if (isAnswered) {
                if (isCorrectAnswer) {
                    optionElement.classList.add('correct');
                } else if (isUserSelected) {
                    optionElement.classList.add('incorrect');
                }
            }

            if (isUserSelected) {
                optionElement.classList.add('selected');
            }

            const optionLabel = document.createElement('div');
            optionLabel.className = 'option-label';
            optionLabel.textContent = optionLetter;

            const optionText = document.createElement('div');
            optionText.textContent = option;

            optionElement.appendChild(optionLabel);
            optionElement.appendChild(optionText);

            // 绑定点击事件
            const shouldEnableClick = userAnswer === "E" && !reviewMode;
            if (shouldEnableClick) {
                optionElement.addEventListener('click', () => main.selectOption(index));
            } else {
                optionElement.style.cursor = 'default';
            }

            optionsContainer.appendChild(optionElement);
        });

        // 显示解析
        if (userAnswers[currentQuestionIndex] !== "E" || reviewMode) {
            explanationText.textContent = question.explanation;

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

        // 按钮状态
        prevBtn.disabled = currentQuestionIndex === 0;

        const allAnswered = userAnswers.every(answer => answer !== "E");
        if (allAnswered && !reviewMode) {
            nextBtn.textContent = '查看结果';
        } else {
            nextBtn.textContent = '下一题';
        }

        // 完成消息
        const shouldShowCompletion = allAnswered && !reviewMode && questionBank.length > 0;
        if (shouldShowCompletion) {
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

    // ===================================================
    // 更新统计信息
    // ===================================================
    function updateStats(userAnswers, questionBank) {
        const totalAnswered = userAnswers.filter(answer => answer !== "E").length;
        const correctAnswers = userAnswers.filter((answer, index) =>
            answer === questionBank[index]?.correctAnswer
        ).length;

        const correctProgress = document.getElementById('correctProgress');
        correctProgress.textContent = `${correctAnswers}/${totalAnswered}`;

        const rate = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
        updateCircularProgress(rate);
    }

    // ===================================================
    // 更新环形进度
    // ===================================================
    function updateCircularProgress(percentage) {
        const circle = document.querySelector('.progress-ring-circle');
        const progressText = document.getElementById('completionRate');

        const circumference = 2 * Math.PI * 26;
        const offset = circumference - (percentage / 100) * circumference;

        circle.style.strokeDashoffset = offset;
        progressText.textContent = `${percentage}%`;

        if (percentage >= 80) {
            circle.style.stroke = '#4CAF50';
        } else if (percentage >= 60) {
            circle.style.stroke = '#FF9800';
        } else {
            circle.style.stroke = '#F44336';
        }
    }

    // ===================================================
    // 显示整体进度
    // ===================================================
    function showOverallProgress() {
        const overallProgress = dataManager.getOverallProgress();
        if (!overallProgress) {
            utils.showMessage('整体进度数据尚未加载完成', 'warning');
            return;
        }

        let progressContent = '<div class="overall-progress-content">';
        let totalQuestions = 0, totalAnswered = 0, totalCorrect = 0;

        const sortedCategories = dataManager.getSortedCategories();

        sortedCategories.forEach(({ name: category, number_all, state }) => {
            progressContent += `<div class="progress-category">
                <h3>${category} (${number_all}题)</h3>
                <div class="chapter-progress">`;

            state.forEach(chapter => {
                const answered = chapter.state.filter(s => s !== "E").length;
                const correct = chapter.state.filter((s, index) => 
                    s !== "E" && s === getCorrectAnswer(category, chapter.name, index)
                ).length;

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

        // 汇总统计
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

        setTimeout(() => {
            const resetAllBtn = document.getElementById('resetAllProgressBtn');
            if (resetAllBtn) {
                resetAllBtn.addEventListener('click', resetAllProgressHandler);
            }
        }, 100);
    }

    // ===================================================
    // 获取正确答案（需要根据实际题目数据）
    // ===================================================
    function getCorrectAnswer(category, chapter, index) {
        // 这里需要根据实际情况实现，可能需要加载题目数据
        // 暂时返回空字符串，实际使用时需要完善
        return "";
    }

    // ===================================================
    // 重置所有进度处理函数
    // ===================================================
    function resetAllProgressHandler() {
        if (confirm('确定要初始化全部题库进度吗？这将重置所有答题记录！')) {
            if (dataManager.resetAllProgress()) {
                utils.showMessage('全部题库进度已初始化', 'success');
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