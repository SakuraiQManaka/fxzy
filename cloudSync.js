// cloudSync.js – 使用 GitHub API 同步整体进度
// 功能：在 header 中添加“云端进度”按钮，点击后显示同步面板，支持导入/导出进度到 GitHub 仓库
// 依赖：utils.js, dataManager.js, uiManager.js（需在之前引入）

(function() {
    'use strict';

    // 依赖检查
    if (typeof utils === 'undefined' || typeof dataManager === 'undefined' || typeof uiManager === 'undefined') {
        console.error('cloudSync: 依赖模块未找到，请确保 utils.js、dataManager.js、uiManager.js 已加载');
        return;
    }

    // 配置存储键名
    const STORAGE_KEY = 'github_sync_config';

    // 添加按钮到 header
    function addCloudButton() {
        const header = document.querySelector('header');
        if (!header) return;
        // 避免重复添加
        if (document.getElementById('cloudProgressBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'cloudProgressBtn';
        btn.className = 'overall-progress-btn'; // 复用整体进度按钮样式
        btn.textContent = '云端进度';
        header.appendChild(btn);
        btn.addEventListener('click', showCloudPanel);

        // 添加样式调整按钮位置（避免与更新日志、整体进度重叠）
        const style = document.createElement('style');
        style.textContent = `
            #cloudProgressBtn {
                right: 280px; /* 可根据实际情况调整 */
            }
            @media (max-width: 768px) {
                #cloudProgressBtn {
                    right: 200px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 获取保存的配置
    function getConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    // 保存配置
    function saveConfig(config) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    // 验证配置是否完整
    function validateConfig(config) {
        if (!config.token || !config.owner || !config.repo) {
            utils.showMessage('请填写完整的 GitHub 配置（Token、Owner、Repo）', 'warning');
            return false;
        }
        return true;
    }

    // 显示云端同步面板（模态框）
    function showCloudPanel() {
        const config = getConfig();
        const modalContent = `
            <div style="padding: 10px;">
                <h3 style="margin-top:0;">GitHub 云端同步</h3>
                <p style="font-size:0.9rem; color:#666;">使用 GitHub API 同步进度，需要 Personal Access Token（需 repo 权限）。</p>
                <div style="margin-bottom: 15px;">
                    <label style="display:block; margin:8px 0;">
                        Token：<input type="password" id="githubToken" value="${config.token || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    </label>
                    <label style="display:block; margin:8px 0;">
                        Owner（用户名）：<input type="text" id="githubOwner" value="${config.owner || ''}" placeholder="例如 your-username" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    </label>
                    <label style="display:block; margin:8px 0;">
                        Repo（仓库名）：<input type="text" id="githubRepo" value="${config.repo || ''}" placeholder="例如 fxzy" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    </label>
                    <label style="display:block; margin:8px 0;">
                        Branch（分支）：<input type="text" id="githubBranch" value="${config.branch || 'main'}" placeholder="main" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    </label>
                    <label style="display:block; margin:8px 0;">
                        文件路径：<input type="text" id="githubPath" value="${config.path || 'progress.json'}" placeholder="例如 progress.json" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    </label>
                </div>
                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                    <button id="saveGithubConfig" class="btn-primary" style="padding:8px 16px;">保存设置</button>
                    <button id="exportToGithub" class="btn-success" style="padding:8px 16px;">导出到 GitHub</button>
                    <button id="importFromGithub" class="btn-success" style="padding:8px 16px;">从 GitHub 导入</button>
                </div>
                <p style="margin-top:15px; font-size:12px; color:#999;">Token 仅保存在浏览器本地，请妥善保管。</p>
            </div>
        `;

        utils.showInfoModal({
            title: '云端进度同步',
            context: modalContent,
            date: new Date().toLocaleDateString()
        });

        // 等待模态框渲染完成后绑定事件
        setTimeout(() => {
            const saveBtn = document.getElementById('saveGithubConfig');
            const exportBtn = document.getElementById('exportToGithub');
            const importBtn = document.getElementById('importFromGithub');
            const tokenInput = document.getElementById('githubToken');
            const ownerInput = document.getElementById('githubOwner');
            const repoInput = document.getElementById('githubRepo');
            const branchInput = document.getElementById('githubBranch');
            const pathInput = document.getElementById('githubPath');

            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const newConfig = {
                        token: tokenInput.value.trim(),
                        owner: ownerInput.value.trim(),
                        repo: repoInput.value.trim(),
                        branch: branchInput.value.trim() || 'main',
                        path: pathInput.value.trim() || 'progress.json'
                    };
                    saveConfig(newConfig);
                    utils.showMessage('配置已保存', 'success');
                });
            }

            if (exportBtn) {
                exportBtn.addEventListener('click', exportToGithub);
            }

            if (importBtn) {
                importBtn.addEventListener('click', importFromGithub);
            }
        }, 100);
    }

    // 导出整体进度到 GitHub
    async function exportToGithub() {
        const config = getConfig();
        if (!validateConfig(config)) return;

        const progress = dataManager.getOverallProgress();
        if (!progress) {
            utils.showMessage('没有进度数据可导出', 'warning');
            return;
        }

        // 转换为 JSON 字符串并编码为 Base64（处理中文）
        const content = JSON.stringify(progress, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(content)));

        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
        const headers = {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        try {
            // 先尝试获取文件信息，得到 sha（如果文件已存在）
            let sha = null;
            try {
                const getResp = await fetch(url + `?ref=${config.branch}`, { headers });
                if (getResp.ok) {
                    const data = await getResp.json();
                    sha = data.sha;
                } else if (getResp.status !== 404) {
                    throw new Error(`检查文件失败: ${getResp.status}`);
                }
            } catch (e) {
                // 忽略 404，其他错误抛出
                if (e.message && !e.message.includes('404')) throw e;
            }

            const body = {
                message: 'Update progress via cloud sync',
                content: contentBase64,
                branch: config.branch
            };
            if (sha) body.sha = sha;

            const putResp = await fetch(url, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
            });

            if (!putResp.ok) {
                const errData = await putResp.json();
                throw new Error(errData.message || '上传失败');
            }

            utils.showMessage('进度导出成功', 'success');
        } catch (err) {
            utils.showMessage('导出失败: ' + err.message, 'error');
            console.error(err);
        }
    }

    // 从 GitHub 导入进度
    async function importFromGithub() {
        const config = getConfig();
        if (!validateConfig(config)) return;

        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
        const headers = {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        try {
            const resp = await fetch(url, { headers });
            if (!resp.ok) {
                if (resp.status === 404) throw new Error('云端文件不存在');
                throw new Error(`下载失败: ${resp.status}`);
            }

            const data = await resp.json();
            const content = decodeURIComponent(escape(atob(data.content)));
            const imported = JSON.parse(content);

            // 获取当前本地进度（作为目标结构）
            const currentProgress = dataManager.getOverallProgress();
            if (!currentProgress) {
                throw new Error('本地进度数据尚未初始化，请稍后重试或刷新页面');
            }

            // --- 判断导入格式 ---
            // 如果导入数据包含 "category" 和 "chapters" 字段，说明是单类别进度
            if (imported.category && Array.isArray(imported.chapters)) {
                const categoryName = imported.category;
                if (!currentProgress[categoryName]) {
                    utils.showMessage(`当前本地没有分类 "${categoryName}"，无法导入`, 'warning');
                    return;
                }
                const importedChapters = imported.chapters;
                const targetCategory = currentProgress[categoryName];
                if (!targetCategory || !Array.isArray(targetCategory.state)) {
                    throw new Error(`本地分类 "${categoryName}" 数据格式异常`);
                }

                importedChapters.forEach(importedChapter => {
                    const targetChapter = targetCategory.state.find(ch => ch.name === importedChapter.name);
                    if (targetChapter && Array.isArray(importedChapter.state) && importedChapter.state.length === targetChapter.number) {
                        targetChapter.state = importedChapter.state.slice();
                    } else {
                        console.warn(`章节 "${importedChapter.name}" 不匹配或状态长度错误，跳过`);
                    }
                });
                utils.showMessage(`单类别进度导入成功`, 'success');
            } 
            // 否则，假设是整体进度格式（键名为分类名）
            else {
                let updatedAny = false;
                for (const [categoryName, categoryData] of Object.entries(imported)) {
                    if (!currentProgress[categoryName]) {
                        console.warn(`分类 "${categoryName}" 在当前进度中不存在，跳过`);
                        continue;
                    }
                    const importedChapters = categoryData.state;
                    if (!Array.isArray(importedChapters)) {
                        console.warn(`分类 "${categoryName}" 缺少有效的 state 数组，跳过`);
                        continue;
                    }
                    const targetChapters = currentProgress[categoryName].state;
                    if (!Array.isArray(targetChapters)) continue;

                    importedChapters.forEach(importedChapter => {
                        const targetChapter = targetChapters.find(ch => ch.name === importedChapter.name);
                        if (targetChapter && Array.isArray(importedChapter.state) && importedChapter.state.length === targetChapter.number) {
                            targetChapter.state = importedChapter.state.slice();
                            updatedAny = true;
                        } else {
                            console.warn(`章节 "${importedChapter.name}" 不匹配或状态长度错误，跳过`);
                        }
                    });
                }
                if (!updatedAny) {
                    utils.showMessage('没有可更新的进度数据（分类/章节不匹配）', 'warning');
                    return;
                }
                utils.showMessage('整体进度导入成功', 'success');
            }

            // 保存合并后的进度
            dataManager.saveOverallProgress();

            // 更新当前章节的本地答题进度（如果当前有题库）
            const currentInfo = dataManager.getCurrentCategoryInfo();
            if (currentInfo) {
                const { category, chapter } = currentInfo;
                const chapterProgress = dataManager.getChapterProgress(category, chapter);
                if (chapterProgress) {
                    const quizProgress = {
                        userAnswers: chapterProgress,
                        currentQuestionIndex: 0
                    };
                    localStorage.setItem('quizProgress', JSON.stringify(quizProgress));
                    // 刷新界面
                    if (window.main && typeof window.main.init === 'function') {
                        window.main.init();
                    } else {
                        const questionBank = JSON.parse(localStorage.getItem('questionBank') || '[]');
                        if (questionBank.length > 0) {
                            uiManager.renderQuestion(questionBank, chapterProgress, 0);
                            uiManager.renderQuestionNavigation(questionBank, chapterProgress, 0);
                            uiManager.updateStats(chapterProgress, questionBank);
                        }
                    }
                }
            } else {
                utils.showMessage('进度已导入，请导入题库后生效', 'info');
            }
        } catch (err) {
            utils.showMessage('导入失败: ' + err.message, 'error');
            console.error(err);
        }
    }

    // 页面加载完成后添加按钮
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addCloudButton);
    } else {
        addCloudButton();
    }
})();