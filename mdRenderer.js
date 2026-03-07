// mdRenderer.js - 使用 markdown-it 的统一渲染模块
(function() {
    // 确保 markdownit 已加载
    if (typeof markdownit === 'undefined') {
        console.error('markdown-it 库未加载，请先引入 markdown-it.min.js');
        return;
    }

    // 初始化 markdown-it，配置常用选项
    const md = markdownit({
        html: false,        // 禁用 HTML 标签（安全）
        breaks: false,       // 将换行符转换为 <br>
        linkify: true,      // 自动识别 URL
        typographer: true,  // 启用智能排版
        highlight: function(str, lang) {
            // 如果开启了 highlight.js，则进行语法高亮
            if (lang && window.hljs && hljs.getLanguage(lang)) {
                try {
                    return '<pre class="hljs"><code>' +
                        hljs.highlight(str, { language: lang }).value +
                        '</code></pre>';
                } catch (__) {}
            }
            // 默认转义输出
            return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
        }
    });

    // 导出渲染函数
    window.mdRenderer = {
        render: function(content) {
            if (typeof content !== 'string') return '';
            try {
                return md.render(content);
            } catch (e) {
                console.error('Markdown 解析失败:', e);
                // 降级：转义为纯文本
                return '<pre>' + escapeHtml(content) + '</pre>';
            }
        }
    };

    // 辅助转义函数（防止 XSS）
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();