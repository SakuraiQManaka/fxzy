// exam.js – 考试模式独立页面逻辑

(function() {
    // 全局状态
    let examTemplates = [];
    let currentExam = {
        template: null,
        questions: [],
        answers: [],      // 'E' 或 'A','B','C','D'
        startTime: null,
        duration: 0,      // 秒
        timerInterval: null
    };
    let currentQuestionIndex = 0;
    let examResult = null;

    // DOM 元素
    const templateSelector = document.getElementById('templateSelector');
    const examMain = document.getElementById('examMain');
    const resultPanel = document.getElementById('resultPanel');
    const wrongListPanel = document.getElementById('wrongListPanel');
    const templateList = document.getElementById('templateList');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const backToHomeFromResultBtn = document.getElementById('backToHomeFromResultBtn');
    const backToTemplateBtn = document.getElementById('backToTemplateBtn');
    const backToResultBtn = document.getElementById('backToResultBtn');
    const submitExamBtn = document.getElementById('submitExamBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const reviewWrongBtn = document.getElementById('reviewWrongBtn');
    const answerGrid = document.getElementById('answerGrid');
    const timerDisplay = document.getElementById('timerDisplay');
    const examTitle = document.getElementById('examTitle');
    const currentQNum = document.getElementById('currentQNum');
    const totalQNum = document.getElementById('totalQNum');
    const questionText = document.getElementById('questionText');
    const questionImage = document.getElementById('questionImage');
    const optionsContainer = document.getElementById('optionsContainer');

    // 初始化：加载模板
    async function init() {
        try {
            const res = await fetch('exam-config.json');
            if (!res.ok) throw new Error('加载配置文件失败');
            const data = await res.json();
            examTemplates = data.examTemplates || [];
            renderTemplateList();
        } catch (err) {
            console.error(err);
            alert('无法加载考试模板，请检查 exam-config.json 是否存在');
        }

        // 绑定事件
        backToHomeBtn.addEventListener('click', () => window.location.href = '../index.html');
        backToHomeFromResultBtn.addEventListener('click', () => window.location.href = '../index.html');
        backToTemplateBtn.addEventListener('click', showTemplateSelector);
        backToResultBtn.addEventListener('click', showResultPanel);
        submitExamBtn.addEventListener('click', submitExam);
        prevBtn.addEventListener('click', () => navigateQuestion(-1));
        nextBtn.addEventListener('click', () => navigateQuestion(1));
        reviewWrongBtn.addEventListener('click', showWrongList);
    }

    // 渲染模板列表
    function renderTemplateList() {
        templateList.innerHTML = '';
        examTemplates.forEach((tmpl, idx) => {
            const div = document.createElement('div');
            div.className = 'template-item';
            div.dataset.index = idx;
            div.innerHTML = `
                <h3>${tmpl.name}</h3>
                <p>题库：${tmpl.category}</p>
                <p>题量：${tmpl.totalQuestions} 题</p>
                <p>时长：${tmpl.duration} 分钟</p>
                <p>及格线：${tmpl.passScore}%</p>
            `;
            div.addEventListener('click', () => startExam(tmpl));
            templateList.appendChild(div);
        });
    }

    // 开始考试
    async function startExam(template) {
        showLoading('正在抽取题目...');
        try {
            // 根据模板抽取题目
            const questions = await fetchQuestionsByTemplate(template);
            if (questions.length === 0) {
                alert('无法抽取题目，请检查题库文件');
                hideLoading();
                return;
            }

            // 打乱顺序
            shuffleArray(questions);

            // 初始化考试状态
            currentExam = {
                template,
                questions,
                answers: new Array(questions.length).fill('E'),
                startTime: Date.now(),
                duration: template.duration * 60,
                timerInterval: null
            };
            currentQuestionIndex = 0;

            // 渲染考试界面
            templateSelector.style.display = 'none';
            examMain.style.display = 'block';
            resultPanel.style.display = 'none';
            wrongListPanel.style.display = 'none';

            examTitle.textContent = template.name;
            totalQNum.textContent = questions.length;
            renderQuestion(currentQuestionIndex);
            renderAnswerGrid();

            // 启动计时器
            startTimer();

            hideLoading();
        } catch (err) {
            console.error(err);
            alert('启动考试失败：' + err.message);
            hideLoading();
        }
    }

    // 根据模板从各章节抽取题目
    async function fetchQuestionsByTemplate(template) {
        const category = template.category;
        const percentages = template.chapterPercentages;
        const total = template.totalQuestions;

        // 计算每个章节应抽取的题数
        const counts = {};
        let sum = 0;
        for (const [ch, p] of Object.entries(percentages)) {
            let count = Math.round(total * p / 100);
            if (count < 0) count = 0;
            counts[ch] = count;
            sum += count;
        }
        // 调整总和等于 total
        if (sum !== total) {
            const diff = total - sum;
            const firstCh = Object.keys(counts)[0];
            if (firstCh) counts[firstCh] += diff;
        }

        // 并行加载各章节题库
        const promises = [];
        for (const [chapter, count] of Object.entries(counts)) {
            if (count <= 0) continue;
            const path = `../题库/${category}/${chapter}/${chapter}.json`;
            promises.push(
                fetch(path)
                    .then(res => {
                        if (!res.ok) throw new Error(`加载章节 ${chapter} 失败`);
                        return res.json();
                    })
                    .then(arr => {
                        if (!Array.isArray(arr)) return [];
                        // 随机抽取 count 道题
                        return shuffleAndTake(arr, count);
                    })
                    .catch(err => {
                        console.warn(err);
                        return [];
                    })
            );
        }

        const results = await Promise.all(promises);
        // 合并所有题目
        return results.flat();
    }

    // 辅助：随机抽取 count 个元素
    function shuffleAndTake(arr, count) {
        if (count >= arr.length) return arr.slice();
        const shuffled = shuffleArray(arr);
        return shuffled.slice(0, count);
    }

    function shuffleArray(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // 计时器
    function startTimer() {
        if (currentExam.timerInterval) clearInterval(currentExam.timerInterval);
        currentExam.timerInterval = setInterval(() => {
            if (!currentExam.startTime) return;
            const elapsed = Math.floor((Date.now() - currentExam.startTime) / 1000);
            const remaining = Math.max(0, currentExam.duration - elapsed);
            updateTimerDisplay(remaining);
            if (remaining <= 0) {
                // 时间到，自动提交
                clearInterval(currentExam.timerInterval);
                submitExam();
            }
        }, 1000);
    }

    function updateTimerDisplay(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        timerDisplay.textContent = `剩余时间：${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // 渲染当前题目
    function renderQuestion(index) {
        const q = currentExam.questions[index];
        if (!q) return;

        console.log('questionImage value:', q.questionImage);
        
        currentQNum.textContent = index + 1;
        questionText.textContent = q.question;

        // 图片处理：先彻底清除 src，并隐藏
        questionImage.removeAttribute('src');
        questionImage.style.display = 'none';

        // 只有当存在有效的图片路径时才设置并显示
        if (q.questionImage && typeof q.questionImage === 'string') {
            const trimmed = q.questionImage.trim();
            if (trimmed !== '') {
                let imgSrc = trimmed;
                // 如果不是绝对路径，添加 ../ 前缀
                if (!imgSrc.match(/^(https?:)?\/\//)) {
                    if (!imgSrc.startsWith('../')) {
                        imgSrc = '../' + imgSrc;
                    }
                }
                questionImage.src = imgSrc;
                questionImage.style.display = 'block';
            }
        }

        // 渲染选项
        let optionsHtml = '';
        q.options.forEach((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const selected = (currentExam.answers[index] === letter);
            optionsHtml += `
                <div class="option ${selected ? 'selected' : ''}" data-option="${letter}">
                    <span class="option-label">${letter}.</span> ${opt}
                </div>
            `;
        });
        optionsContainer.innerHTML = optionsHtml;

        // 绑定选项点击
        document.querySelectorAll('#optionsContainer .option').forEach(optDiv => {
            optDiv.addEventListener('click', () => {
                const letter = optDiv.dataset.option;
                currentExam.answers[index] = letter;
                // 更新选项样式
                document.querySelectorAll('#optionsContainer .option').forEach(o => o.classList.remove('selected'));
                optDiv.classList.add('selected');
                // 更新答题卡
                renderAnswerGrid();
            });
        });

        // 更新上一题/下一题按钮状态
        prevBtn.disabled = (index === 0);
        nextBtn.disabled = (index === currentExam.questions.length - 1);
    }

    // 渲染答题卡
    function renderAnswerGrid() {
        if (!answerGrid) return;
        const total = currentExam.questions.length;
        let gridHtml = '';
        for (let i = 0; i < total; i++) {
            let cls = 'answer-cell';
            if (i === currentQuestionIndex) cls += ' current';
            if (currentExam.answers[i] !== 'E') cls += ' answered';
            gridHtml += `<div class="${cls}" data-index="${i}">${i+1}</div>`;
        }
        answerGrid.innerHTML = gridHtml;

        // 绑定点击跳转
        document.querySelectorAll('.answer-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const idx = parseInt(cell.dataset.index);
                if (!isNaN(idx)) {
                    currentQuestionIndex = idx;
                    renderQuestion(idx);
                    renderAnswerGrid(); // 重新渲染以更新 current 高亮
                }
            });
        });
    }

    function navigateQuestion(delta) {
        const newIdx = currentQuestionIndex + delta;
        if (newIdx >= 0 && newIdx < currentExam.questions.length) {
            currentQuestionIndex = newIdx;
            renderQuestion(newIdx);
            renderAnswerGrid();
        }
    }

    // 提交考试
    function submitExam() {
        clearInterval(currentExam.timerInterval);
        const questions = currentExam.questions;
        const answers = currentExam.answers;
        let correctCount = 0;
        for (let i = 0; i < questions.length; i++) {
            if (answers[i] === questions[i].correctAnswer) correctCount++;
        }
        const total = questions.length;
        const score = Math.round((correctCount / total) * 100);
        const passed = score >= currentExam.template.passScore;

        examResult = {
            templateName: currentExam.template.name,
            total,
            correct: correctCount,
            score,
            passed,
            answers: answers.slice(),
            questions: questions.slice()
        };

        showResultPanel();
    }

    // 显示成绩面板
    function showResultPanel() {
        templateSelector.style.display = 'none';
        examMain.style.display = 'none';
        resultPanel.style.display = 'block';
        wrongListPanel.style.display = 'none';

        const circle = document.getElementById('scoreCircle');
        circle.style.setProperty('--score-deg', (examResult.score * 3.6) + 'deg');
        circle.textContent = examResult.score + '%';

        document.getElementById('resultText').innerHTML = examResult.passed ?
            `<span style="color:#4CAF50;">恭喜，及格！</span>` :
            `<span style="color:#F44336;">很遗憾，未及格</span>`;
        document.getElementById('correctCount').textContent = examResult.correct;
        document.getElementById('totalCount').textContent = examResult.total;
    }

    // 显示错题列表
    function showWrongList() {
        resultPanel.style.display = 'none';
        wrongListPanel.style.display = 'block';

        const wrongQuestions = examResult.questions.filter((q, idx) => examResult.answers[idx] !== q.correctAnswer);
        const container = document.getElementById('wrongQuestions');
        let html = '';
        wrongQuestions.forEach((q, i) => {
            html += `
                <div class="wrong-item">
                    <div class="wrong-question">${q.question}</div>
                    <div class="wrong-options">
                        ${q.options.map((opt, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isCorrect = (letter === q.correctAnswer);
                            return `<div style="color:${isCorrect ? '#4CAF50' : '#333'};">${letter}. ${opt} ${isCorrect ? '✓' : ''}</div>`;
                        }).join('')}
                    </div>
                    <div class="wrong-explanation">解析：${q.explanation || '无解析'}</div>
                </div>
            `;
        });
        container.innerHTML = html || '<p>没有错题，恭喜！</p>';
    }

    function showTemplateSelector() {
        templateSelector.style.display = 'block';
        examMain.style.display = 'none';
        resultPanel.style.display = 'none';
        wrongListPanel.style.display = 'none';
        if (currentExam.timerInterval) {
            clearInterval(currentExam.timerInterval);
            currentExam.timerInterval = null;
        }
    }

    // 简易 loading 提示（可扩展）
    function showLoading(msg) {
        // 简单用 alert 代替，实际可美化
        console.log(msg);
    }
    function hideLoading() {}

    // 启动
    document.addEventListener('DOMContentLoaded', init);
})();