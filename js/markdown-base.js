// markdown-base.js - 基础 Markdown 渲染

const MarkdownBase = {
    init() {
        marked.setOptions({
            gfm: true,
            breaks: true,
            highlight: (code, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            }
        });
    },

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 基础渲染
    render(text) {
        if (!text) return '';

        // 先处理自定义标签
        let processed = MarkdownCustom.process(text);

        // 渲染 Markdown
        let html = marked.parse(processed);

        // 还原自定义标签占位符
        html = MarkdownCustom.restore(html);

        return html;
    }
};
