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

        // 更新题目面板标题为当前题库（保留自动跳转开关位置与结构）
        try {
            const qPanelTitle = document.querySelector('.question-panel .panel-title');
            if (qPanelTitle) {
                const currentCategoryInfo = dataManager.getCurrentCategoryInfo && dataManager.getCurrentCategoryInfo();
                let titleText = '题目';
                if (questionBank && questionBank.length > 0 && currentCategoryInfo && currentCategoryInfo.category) {
                    const chapter = currentCategoryInfo.chapter ? ` / ${currentCategoryInfo.chapter}` : '';
                    titleText = `${currentCategoryInfo.category}${chapter}`;
                }

                // 找到第一个文本节点并替换其内容，若不存在则插入一个文本节点
                let textNode = null;
                for (const node of qPanelTitle.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        textNode = node;
                        break;
                    }
                }
                if (textNode) {
                    textNode.textContent = titleText + ' ';
                } else {
                    qPanelTitle.insertBefore(document.createTextNode(titleText + ' '), qPanelTitle.firstChild);
                }
            }
        } catch (e) {
            console.warn('更新面板标题失败', e);
        }
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
            // AI 题解区域：插入分界线、AI 生成按钮与已生成的 AI 题解（若有）
            try {
                // 避免重复创建，先移除旧容器
                const oldAiContainer = document.getElementById('aiExplanationContainer');
                if (oldAiContainer) oldAiContainer.remove();

                const aiContainer = document.createElement('div');
                aiContainer.id = 'aiExplanationContainer';
                aiContainer.style.marginTop = '12px';

                // 分界线
                const divider = document.createElement('hr');
                divider.style.border = 'none';
                divider.style.borderTop = '1px solid #e0e0e0';
                divider.style.margin = '12px 0';
                aiContainer.appendChild(divider);

                // 按钮容器
                const btnWrap = document.createElement('div');
                btnWrap.style.display = 'flex';
                btnWrap.style.justifyContent = 'flex-end';
                btnWrap.style.marginBottom = '8px';

                const genBtn = document.createElement('button');
                genBtn.id = 'generateAiExplainBtn';
                genBtn.className = 'btn-secondary';
                genBtn.textContent = 'AI 生成题解';

                btnWrap.appendChild(genBtn);
                aiContainer.appendChild(btnWrap);

                // AI 内容展示区
                const aiContent = document.createElement('div');
                aiContent.id = 'aiExplanationContent';
                aiContent.style.background = '#fafafa';
                aiContent.style.padding = '12px';
                aiContent.style.borderRadius = '6px';
                aiContent.style.border = '1px solid #eee';
                aiContent.style.display = 'none';
                aiContainer.appendChild(aiContent);

                explanation.appendChild(aiContainer);

                // 如果已有已生成的 AI 题解，直接显示
                if (question.aiExplanation) {
                    try {
                        if (window.marked) {
                            aiContent.innerHTML = marked.parse(question.aiExplanation);
                        } else {
                            aiContent.textContent = question.aiExplanation;
                        }
                    } catch (e) {
                        aiContent.textContent = question.aiExplanation;
                    }
                    aiContent.style.display = 'block';
                    genBtn.textContent = '重新生成 AI 题解';
                }

                // 绑定按钮事件
                genBtn.addEventListener('click', async () => {
                    genBtn.disabled = true;
                    const originalText = genBtn.textContent;
                    genBtn.textContent = '生成中...';
                    const updateState = (s) => { genBtn.textContent = s === '请求中' ? '生成中...' : (s === '完成' ? '完成' : '失败'); };
                    // 要求已验证 API Key（通过侧边栏验证状态）
                    if (!(window.AISidebar && typeof window.AISidebar.isAuthenticated === 'function' && window.AISidebar.isAuthenticated())) {
                        if (window.utils && window.utils.showMessage) window.utils.showMessage('请先在 AI 侧边栏验证 API Key，然后再生成题解', 'warning');
                        // 如果侧边栏存在，切换到验证视图以便用户输入 Key
                        if (window.AISidebar && typeof window.AISidebar.showAuth === 'function') {
                            window.AISidebar.showAuth();
                        }
                        genBtn.textContent = originalText;
                        genBtn.disabled = false;
                        return;
                    }

                    const aiResult = await generateAIExplanation(questionBank, currentQuestionIndex, updateState);
                    if (aiResult) {
                        try {
                            if (window.marked) {
                                aiContent.innerHTML = marked.parse(aiResult);
                            } else {
                                aiContent.textContent = aiResult;
                            }
                        } catch (e) {
                            aiContent.textContent = aiResult;
                        }
                        aiContent.style.display = 'block';
                        genBtn.textContent = '重新生成 AI 题解';
                    } else {
                        genBtn.textContent = originalText;
                    }
                    genBtn.disabled = false;
                });
            } catch (e) {
                console.warn('AI题解区域渲染失败', e);
            }
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
    // 使用 AI 生成题解并保存
    // ===================================================
    async function generateAIExplanation(questionBank, questionIndex, onUpdate) {
        const STORAGE_KEY = 'deepseek_sidebar_api_key';
        const API_BASE = 'https://api.deepseek.com';
        const CHAT_ENDPOINT = '/chat/completions';
        const MODEL = 'deepseek-chat';

        const SYSTEM_PROMPT = "你是一位专业的航空知识助手，专门回答关于航空、飞行、飞机、航空史、航空技术、飞行员训练、航空安全、航空公司等方面的问题。请以专业、准确、易懂的方式回答用户的航空相关问题。如果用户询问非航空相关的问题，请礼貌地引导回航空主题。";

        const apiKey = (() => {
            try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
        })();

        if (!apiKey) {
            if (window.utils && window.utils.showMessage) window.utils.showMessage('未配置AI API Key，无法生成题解', 'warning');
            return null;
        }

        const question = questionBank[questionIndex];
        if (!question) return null;

        // 构造用户消息：题目、选项、正确答案
        let optionsText = '';
        if (Array.isArray(question.options)) {
            question.options.forEach((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                optionsText += `${letter}. ${opt}\n`;
            });
        }

        const userContent = `请为下面题目生成简洁、专业且清晰的题解（中文），说明正确答案以及解题思路，不添加无关内容。\n题目：${question.question}\n选项：\n${optionsText}\n正确答案：${question.correctAnswer}`;

        try {
            if (onUpdate) onUpdate('请求中');

            const resp = await fetch(API_BASE + CHAT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userContent }
                    ],
                    stream: false,
                    max_tokens: 2000
                })
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`请求失败 ${resp.status}: ${text}`);
            }

            const data = await resp.json();

            // 尝试解析常见返回格式
            let aiText = '';
            if (data.choices && data.choices[0]) {
                if (data.choices[0].message && data.choices[0].message.content) {
                    aiText = data.choices[0].message.content;
                } else if (data.choices[0].text) {
                    aiText = data.choices[0].text;
                }
            } else if (data.data && data.data[0] && data.data[0].text) {
                aiText = data.data[0].text;
            }

            aiText = (aiText || '').trim();

            if (!aiText) throw new Error('AI 未返回内容');

            // 保存到题库对象并持久化
            question.aiExplanation = aiText;
            try { localStorage.setItem('questionBank', JSON.stringify(questionBank)); } catch (e) { console.warn('保存AI题解失败', e); }

            if (onUpdate) onUpdate('完成');
            return aiText;
        } catch (err) {
            console.error('生成AI题解失败', err);
            if (window.utils && window.utils.showMessage) window.utils.showMessage('AI题解生成失败：' + err.message, 'error');
            if (onUpdate) onUpdate('失败');
            return null;
        }
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
        let totalQuestions = 0, totalAnswered = 0;

        const sortedCategories = dataManager.getSortedCategories();

        // 先计算总体统计数据
        sortedCategories.forEach(({ number_all, state }) => {
            totalQuestions += number_all;
            state.forEach(chapter => {
                totalAnswered += chapter.state.filter(s => s !== "E").length;
            });
        });
        const overallPercent = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

        // 总体统计（放在最前面）
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
                <!-- 新增导入进度按钮 -->
                <button class="btn-success" id="modalImportProgressBtn" style="margin-top: 10px; width: 100%;">导入当前类别进度</button>
            </div>
        `;

        // 再添加各分类详情
        sortedCategories.forEach(({ name: category, number_all, state }) => {
            progressContent += `<div class="progress-category">
                <h3>${category} (${number_all}题)</h3>
                <div class="chapter-progress">`;
            state.forEach(chapter => {
                const answered = chapter.state.filter(s => s !== "E").length;
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

        progressContent += '</div>'; // 关闭 overall-progress-content

        utils.showInfoModal({
            title: "整体刷题进度",
            context: progressContent,
            date: new Date().toLocaleDateString()
        });

        // 绑定事件（模态框渲染后）
        setTimeout(() => {
            const resetAllBtn = document.getElementById('resetAllProgressBtn');
            if (resetAllBtn) resetAllBtn.addEventListener('click', resetAllProgressHandler);

            const importBtn = document.getElementById('modalImportProgressBtn');
            if (importBtn) {
                importBtn.addEventListener('click', function() {
                    const fileInput = document.getElementById('progressFileInput');
                    if (fileInput) {
                        fileInput.click();
                    } else {
                        utils.showMessage('文件输入未找到', 'error');
                    }
                });
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