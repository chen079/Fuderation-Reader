// markdown-custom.js - 自定义标签处理

const MarkdownCustom = {
    placeholders: {},
    counter: 0,

    // 重置占位符
    reset() {
        this.placeholders = {};
        this.counter = 0;
    },

    // 生成占位符 - 使用 HTML 注释格式避免被 marked 处理
    placeholder(type, data) {
        const id = `FDPLACEHOLDER${type}${this.counter++}FDEND`;
        this.placeholders[id] = { type, data };
        return id;
    },

    // 根据用户名生成头像颜色
    getAvatarColor(name) {
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
        const index = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    },

    // 处理所有自定义标签
    process(text) {
        this.reset();
        let processed = text;

        // 1. <think> 深度思考
        processed = processed.replace(/<think>([\s\S]*?)<\/think>/gi, (match, content) => {
            return this.placeholder('think', { content, streaming: false });
        });
        if (/<think>/i.test(processed) && !/<\/think>/i.test(processed)) {
            processed = processed.replace(/<think>([\s\S]*)/i, (match, content) => {
                return this.placeholder('think', { content, streaming: true });
            });
        }

        // 2. <Memory> 记忆块
        processed = processed.replace(/<Memory(?:\s+d\s*=\s*-?\d+)?\s*>([\s\S]*?)<\/Memory>/gi, (match, content) => {
            return this.placeholder('memory', { content, streaming: false });
        });
        if (/<memory/i.test(processed) && !/<\/memory>/i.test(processed)) {
            processed = processed.replace(/<Memory(?:\s+d\s*=\s*-?\d+)?\s*>([\s\S]*)/i, (match, content) => {
                return this.placeholder('memory', { content, streaming: true });
            });
        }

        // 3. <Status> 状态块
        processed = processed.replace(/<Status(?:\s+d\s*=\s*-?\d+)?\s*>([\s\S]*?)<\/Status>/gi, (match, content) => {
            return this.placeholder('status', { content, streaming: false });
        });
        if (/<status/i.test(processed) && !/<\/status>/i.test(processed)) {
            processed = processed.replace(/<Status(?:\s+d\s*=\s*-?\d+)?\s*>([\s\S]*)/i, (match, content) => {
                return this.placeholder('status', { content, streaming: true });
            });
        }

        // 4. <EndChat> 结束块
        processed = processed.replace(/<EndChat>([\s\S]*?)<\/EndChat>/gi, (match, content) => {
            return this.placeholder('endchat', { content });
        });

        // 5. <Fold> 折叠块
        processed = processed.replace(/<Fold(?:\s+(?:title|icon|color)\s*=\s*["'][^"']*["'])*\s*>([\s\S]*?)<\/Fold>/gi, (match, content) => {
            const titleMatch = match.match(/title\s*=\s*["']([^"']*)["']/i);
            const iconMatch = match.match(/icon\s*=\s*["']([^"']*)["']/i);
            const colorMatch = match.match(/color\s*=\s*["']([^"']*)["']/i);
            return this.placeholder('fold', {
                content,
                title: titleMatch ? titleMatch[1] : '折叠内容',
                icon: iconMatch ? iconMatch[1] : 'chevron-right',
                color: colorMatch ? colorMatch[1] : null
            });
        });

        // 6. <Hide> 剧透遮罩
        processed = processed.replace(/<Hide>([\s\S]*?)<\/Hide>/gi, (match, content) => {
            return this.placeholder('hide', { content });
        });

        // 7. <qrcode> 二维码
        processed = processed.replace(/<qrcode(?:\s+([^>]*))?>([^<]*)<\/qrcode>/gi, (match, attrs, content) => {
            return this.placeholder('qrcode', { text: content.trim(), attrs });
        });

        // 8. <comment> 论坛评论
        processed = processed.replace(/<comment>([\s\S]*?)<\/comment>/gi, (match, innerContent) => {
            const comments = this.parseComments(innerContent);
            if (comments.length > 0) {
                return this.placeholder('comment', { comments });
            }
            return match;
        });

        // 9. <chatList> 消息列表 (需要在 chat 之前处理)
        processed = processed.replace(/<chatList(?:\s+title\s*=\s*"([^"]*)")?\s*>([\s\S]*?)<\/chatList>/gi, (match, listTitle, innerContent) => {
            const chats = this.parseChatList(innerContent);
            if (chats.length > 0) {
                return this.placeholder('chatlist', { title: listTitle || '消息', chats });
            }
            return match;
        });

        // 10. <chat> QQ风格聊天
        processed = processed.replace(/<chat(?:\s+title\s*=\s*"([^"]*)")?\s*>([\s\S]*?)<\/chat>/gi, (match, chatTitle, innerContent) => {
            const messages = this.parseChatMessages(innerContent);
            if (messages.length > 0) {
                return this.placeholder('chat', { title: chatTitle, messages });
            }
            return match;
        });

        return processed;
    },

    // 解析论坛评论
    parseComments(content) {
        const comments = [];
        const regex = /<@([^\s>]+)(?:\s+src\s*=\s*"([^"]*)")?(?:\s+re(?:\s+@([^\s>]*))?)?>([\s\S]*?)(?=<@[^>]+>|$)/gi;
        let match;
        let lastMainAuthor = null;

        while ((match = regex.exec(content)) !== null) {
            const author = match[1].trim();
            const avatarSrc = match[2] ? match[2].trim() : null;
            const hasReply = / re(?:\s|>|@)/i.test(match[0]);
            const replyToRaw = match[3];
            const text = match[4].trim();

            if (author && text) {
                let replyTo = null;
                let isReply = false;

                if (hasReply) {
                    isReply = true;
                    replyTo = (replyToRaw && replyToRaw.trim()) ? replyToRaw.trim() : lastMainAuthor;
                } else {
                    lastMainAuthor = author;
                }

                comments.push({ author, avatarSrc, replyTo, isReply, content: text });
            }
        }
        return comments;
    },

    // 解析聊天消息
    parseChatMessages(content) {
        const messages = [];
        const authorAvatars = {};

        const preScan = /<@([^\s>]+)(?:\s+(?:l|r))?(?:\s+src\s*=\s*"([^"]*)")?/gi;
        let pre;
        while ((pre = preScan.exec(content)) !== null) {
            if (pre[2]) authorAvatars[pre[1].trim()] = pre[2].trim();
        }

        const regex = /<(@([^\s>]+)((?:\s+(?:l|r))?(?:\s+src\s*=\s*"[^"]*")?(?:\s+(?:l|r))?(?:\s+re(?:\s+@[^\s>]*)?)?)|(system))>([\s\S]*?)(?=<@[^\s>]+|<system>|$)/gi;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const isSystem = !!match[4];
            const text = match[5].trim();
            if (!text) continue;

            if (isSystem) {
                messages.push({ isSystem: true, content: text });
            } else {
                const author = match[2].trim();
                const attrs = match[3] || '';
                const posMatch = attrs.match(/\b(l|r)\b/i);
                const isRight = posMatch ? posMatch[1].toLowerCase() === 'r' : false;
                const srcMatch = attrs.match(/src\s*=\s*"([^"]*)"/i);
                const avatarSrc = srcMatch ? srcMatch[1].trim() : authorAvatars[author] || null;

                messages.push({ author, avatarSrc, isRight, content: text });
            }
        }
        return messages;
    },

    // 解析 chatList
    parseChatList(content) {
        const chats = [];
        const globalAvatars = {};

        const preScan = /<@([^\s>]+)(?:\s+(?:l|r))?(?:\s+src\s*=\s*"([^"]*)")?/gi;
        let pre;
        while ((pre = preScan.exec(content)) !== null) {
            if (pre[2]) globalAvatars[pre[1].trim()] = pre[2].trim();
        }

        const chatRegex = /<chat(?:\s+(?:title\s*=\s*"([^"]*)"|src\s*=\s*"([^"]*)"|unread))*\s*>([\s\S]*?)<\/chat>/gi;
        let chatMatch;

        while ((chatMatch = chatRegex.exec(content)) !== null) {
            const fullTag = chatMatch[0];
            const chatContent = chatMatch[3];

            const titleMatch = fullTag.match(/title\s*=\s*"([^"]*)"/i);
            const srcMatch = fullTag.match(/<chat[^>]*\ssrc\s*=\s*"([^"]*)"/i);
            const hasUnread = /\bunread\b/i.test(fullTag);

            const messages = this.parseChatMessages(chatContent);
            if (messages.length > 0) {
                const lastMsg = [...messages].reverse().find(m => !m.isSystem) || messages[messages.length - 1];
                let listAvatar = srcMatch ? srcMatch[1] : null;
                if (!listAvatar) {
                    const firstLeft = messages.find(m => !m.isRight && !m.isSystem);
                    if (firstLeft) listAvatar = firstLeft.avatarSrc || globalAvatars[firstLeft.author] || null;
                }

                chats.push({
                    title: titleMatch ? titleMatch[1] : '',
                    src: listAvatar,
                    unread: hasUnread,
                    messages,
                    lastMessage: lastMsg.isSystem ? `[系统] ${lastMsg.content}` : lastMsg.content,
                    lastAuthor: lastMsg.isSystem ? '' : lastMsg.author
                });
            }
        }
        return chats;
    },

    // 还原占位符为 HTML
    restore(html) {
        for (const [id, { type, data }] of Object.entries(this.placeholders)) {
            // 匹配可能被 <p> 包裹的占位符
            const regex = new RegExp(`<p>\\s*${id}\\s*<\\/p>|${id}`, 'g');
            html = html.replace(regex, this.renderTag(type, data));
        }
        return html;
    },

    // 渲染各类标签
    renderTag(type, data) {
        switch (type) {
            case 'think': return this.renderThink(data);
            case 'memory': return this.renderMemory(data);
            case 'status': return this.renderStatus(data);
            case 'endchat': return this.renderEndChat(data);
            case 'fold': return this.renderFold(data);
            case 'hide': return this.renderHide(data);
            case 'qrcode': return this.renderQrcode(data);
            case 'comment': return this.renderComment(data);
            case 'chat': return this.renderChat(data);
            case 'chatlist': return this.renderChatList(data);
            default: return '';
        }
    },

    renderThink(data) {
        const escaped = this.escapeHtml(data.content);
        if (data.streaming) {
            return `<details class="fd-think" open><summary><span class="fd-icon">💭</span> 思考中...</summary><div class="fd-think-content">${escaped}</div></details>`;
        }
        return `<details class="fd-think"><summary><span class="fd-icon">💭</span> 深度思考</summary><div class="fd-think-content">${escaped}</div></details>`;
    },

    renderMemory(data) {
        const content = marked.parse(data.content);
        return `<details class="fd-memory" open><summary><span class="fd-icon">🧠</span> 记忆</summary><div class="fd-memory-content">${content}</div></details>`;
    },

    renderStatus(data) {
        const content = marked.parse(data.content);
        return `<details class="fd-status" open><summary><span class="fd-icon">📊</span> 状态</summary><div class="fd-status-content">${content}</div></details>`;
    },

    renderEndChat(data) {
        const content = marked.parse(data.content);
        return `<div class="fd-endchat"><div class="fd-endchat-header"><span class="fd-icon">🔚</span> 对话已结束</div><div class="fd-endchat-content">${content}</div></div>`;
    },

    renderFold(data) {
        const content = marked.parse(data.content);
        const style = data.color ? `style="--fold-color: ${data.color}"` : '';
        return `<details class="fd-fold" ${style}><summary><span class="fd-icon">📁</span> ${data.title}</summary><div class="fd-fold-content">${content}</div></details>`;
    },

    renderHide(data) {
        return `<span class="fd-hide" onclick="this.classList.toggle('revealed')">${this.escapeHtml(data.content)}</span>`;
    },

    renderQrcode(data) {
        return `<div class="fd-qrcode" data-text="${this.escapeHtml(data.text)}"><span class="fd-icon">📱</span> 二维码: ${this.escapeHtml(data.text)}</div>`;
    },

    renderComment(data) {
        let floor = 0;
        const items = data.comments.map(c => {
            const content = marked.parse(c.content);
            const color = this.getAvatarColor(c.author);
            const avatar = c.avatarSrc
                ? `<img class="fd-comment-avatar" src="${c.avatarSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : '';
            const fallback = `<div class="fd-comment-avatar fd-comment-avatar-fallback" style="background:${color}${c.avatarSrc ? ';display:none' : ''}">${c.author.charAt(0).toUpperCase()}</div>`;

            let meta = '';
            if (c.isReply) {
                meta = c.replyTo ? `<span class="fd-comment-reply">↩ 回复 @${c.replyTo}</span>` : '';
            } else {
                floor++;
                meta = `<span class="fd-comment-floor">#${floor}楼</span>`;
            }

            return `<div class="fd-comment ${c.isReply ? 'fd-comment-reply' : ''}">
                <div class="fd-comment-avatar-wrap">${avatar}${fallback}</div>
                <div class="fd-comment-body">
                    <div class="fd-comment-header"><span class="fd-comment-author">@${c.author}</span>${meta}</div>
                    <div class="fd-comment-content">${content}</div>
                </div>
            </div>`;
        }).join('');

        return `<div class="fd-comment-container">${items}</div>`;
    },

    renderChat(data) {
        const title = data.title ? `<div class="fd-chat-title">${data.title}</div>` : '';
        const items = data.messages.map(m => {
            if (m.isSystem) {
                return `<div class="fd-chat-system">${m.content}</div>`;
            }
            const content = marked.parse(m.content);
            const color = this.getAvatarColor(m.author);
            const avatar = m.avatarSrc
                ? `<img class="fd-chat-avatar" src="${m.avatarSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : '';
            const fallback = `<div class="fd-chat-avatar fd-chat-avatar-fallback" style="background:${color}${m.avatarSrc ? ';display:none' : ''}">${m.author.charAt(0).toUpperCase()}</div>`;

            return `<div class="fd-chat-msg ${m.isRight ? 'fd-chat-right' : 'fd-chat-left'}">
                <div class="fd-chat-avatar-wrap">${avatar}${fallback}</div>
                <div class="fd-chat-bubble">
                    <div class="fd-chat-author">${m.author}</div>
                    <div class="fd-chat-text">${content}</div>
                </div>
            </div>`;
        }).join('');

        return `<div class="fd-chat">${title}${items}</div>`;
    },

    renderChatList(data) {
        const listId = 'chatlist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const items = data.chats.map((chat, idx) => {
            const color = this.getAvatarColor(chat.title || 'C');
            const avatar = chat.src
                ? `<img class="fd-chatlist-avatar" src="${chat.src}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : '';
            const fallback = `<div class="fd-chatlist-avatar fd-chatlist-avatar-fallback" style="background:${color}${chat.src ? ';display:none' : ''}">${(chat.title || 'C').charAt(0).toUpperCase()}</div>`;
            const unread = chat.unread ? '<div class="fd-chatlist-unread"></div>' : '';
            const preview = (chat.lastMessage || '').replace(/<[^>]*>/g, '').substring(0, 30);

            return `<div class="fd-chatlist-item" data-list="${listId}" data-idx="${idx}" onclick="MarkdownCustom.openChat(this)">
                <div class="fd-chatlist-avatar-wrap">${avatar}${fallback}${unread}</div>
                <div class="fd-chatlist-info">
                    <div class="fd-chatlist-title">${chat.title || '聊天'}</div>
                    <div class="fd-chatlist-preview">${preview}</div>
                </div>
            </div>`;
        }).join('');

        window._chatListData = window._chatListData || {};
        window._chatListData[listId] = data.chats;

        const detail = `<div class="fd-chatlist-detail" id="${listId}-detail" style="display:none"></div>`;

        return `<div class="fd-chatlist">
            <div class="fd-chatlist-header">${data.title}</div>
            <div class="fd-chatlist-items">${items}</div>
            ${detail}
        </div>`;
    },

    openChat(el) {
        const listId = el.dataset.list;
        const idx = parseInt(el.dataset.idx);
        const chat = window._chatListData[listId][idx];
        const detail = document.getElementById(listId + '-detail');

        if (detail.style.display !== 'none' && detail.dataset.idx === String(idx)) {
            detail.style.display = 'none';
            el.classList.remove('active');
            return;
        }

        el.parentElement.querySelectorAll('.fd-chatlist-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');

        const messages = chat.messages.map(m => {
            if (m.isSystem) {
                return `<div class="fd-chat-system">${m.content}</div>`;
            }
            const content = marked.parse(m.content);
            const color = this.getAvatarColor(m.author);
            const avatar = m.avatarSrc
                ? `<img class="fd-chat-avatar" src="${m.avatarSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : '';
            const fallback = `<div class="fd-chat-avatar fd-chat-avatar-fallback" style="background:${color}${m.avatarSrc ? ';display:none' : ''}">${m.author.charAt(0).toUpperCase()}</div>`;

            return `<div class="fd-chat-msg ${m.isRight ? 'fd-chat-right' : 'fd-chat-left'}">
                <div class="fd-chat-avatar-wrap">${avatar}${fallback}</div>
                <div class="fd-chat-bubble">
                    <div class="fd-chat-author">${m.author}</div>
                    <div class="fd-chat-text">${content}</div>
                </div>
            </div>`;
        }).join('');

        detail.innerHTML = `
            <div class="fd-chatlist-detail-header">
                <button onclick="this.parentElement.parentElement.style.display='none';document.querySelector('.fd-chatlist-item.active')?.classList.remove('active')">← 返回</button>
                <span>${chat.title || '聊天'}</span>
            </div>
            <div class="fd-chatlist-detail-body">${messages}</div>
        `;
        detail.dataset.idx = String(idx);
        detail.style.display = 'block';
    },

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
