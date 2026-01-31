// app.js - Vue 应用

const { createApp, ref, computed, nextTick, onMounted } = Vue;

// 初始化 Markdown
MarkdownBase.init();

createApp({
    setup() {
        const sessions = ref([]);
        const currentIndex = ref(-1);
        const searchQuery = ref('');
        const dragOver = ref(false);
        const messageContainer = ref(null);
        const dbReady = ref(false);

        const filteredSessions = computed(() => {
            if (!searchQuery.value.trim()) return sessions.value;
            const q = searchQuery.value.toLowerCase();
            return sessions.value.filter(s =>
                (s.title || '').toLowerCase().includes(q) ||
                (s.persona?.name || '').toLowerCase().includes(q)
            );
        });

        const currentSession = computed(() => {
            if (currentIndex.value < 0) return null;
            return filteredSessions.value[currentIndex.value];
        });

        const totalMessages = computed(() => {
            return sessions.value.reduce((sum, s) => sum + (s.messages?.length || 0), 0);
        });

        // 初始化 IndexedDB 并加载数据
        onMounted(async () => {
            try {
                await ReaderDB.init();
                dbReady.value = true;
                const saved = await ReaderDB.getAllSessions();
                if (saved.length > 0) {
                    sessions.value = saved.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
                }
            } catch (e) {
                console.error('IndexedDB init failed:', e);
            }
        });

        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) loadFile(file);
            e.target.value = '';
        }

        function handleDrop(e) {
            dragOver.value = false;
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.json')) {
                loadFile(file);
            }
        }

        async function loadFile(file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    let newSessions = [];

                    if (Array.isArray(data)) {
                        newSessions = data;
                    } else if (data.messages) {
                        newSessions = [data];
                    } else {
                        alert('无法识别的文件格式');
                        return;
                    }

                    // 确保每个会话有 id
                    newSessions = newSessions.map(s => ({
                        ...s,
                        id: s.id || Date.now() + '-' + Math.random().toString(36).substr(2, 9)
                    }));

                    // 合并到现有会话（去重）
                    const existingIds = new Set(sessions.value.map(s => s.id));
                    const toAdd = newSessions.filter(s => !existingIds.has(s.id));

                    if (toAdd.length > 0) {
                        sessions.value = [...toAdd, ...sessions.value];
                        // 保存到 IndexedDB
                        if (dbReady.value) {
                            await ReaderDB.saveSessions(toAdd);
                        }
                    }

                    currentIndex.value = 0;
                } catch (err) {
                    alert('JSON 解析失败: ' + err.message);
                }
            };
            reader.readAsText(file);
        }

        function selectSession(index) {
            currentIndex.value = index;
            nextTick(() => {
                if (messageContainer.value) {
                    messageContainer.value.scrollTop = 0;
                }
            });
        }

        async function deleteSession(index, e) {
            e.stopPropagation();
            const session = filteredSessions.value[index];
            if (!session) return;

            if (!confirm(`确定删除「${session.title || '未命名会话'}」？`)) return;

            // 从数组中移除
            const realIndex = sessions.value.findIndex(s => s.id === session.id);
            if (realIndex > -1) {
                sessions.value.splice(realIndex, 1);
            }

            // 从 IndexedDB 删除
            if (dbReady.value) {
                await ReaderDB.deleteSession(session.id);
            }

            // 调整当前选中
            if (currentIndex.value >= filteredSessions.value.length) {
                currentIndex.value = filteredSessions.value.length - 1;
            }
        }

        async function clearAllSessions() {
            if (!confirm('确定清空所有会话？此操作不可恢复。')) return;

            sessions.value = [];
            currentIndex.value = -1;

            if (dbReady.value) {
                await ReaderDB.clearAll();
            }
        }

        function renderContent(content) {
            if (!content) return '';
            if (Array.isArray(content)) {
                return content.map(item => {
                    if (item.type === 'text') {
                        return MarkdownBase.render(item.text || '');
                    } else if (item.type === 'image_url') {
                        const url = item.image_url?.url || '';
                        return `<img src="${url}" class="max-w-full rounded-lg my-2" />`;
                    }
                    return '';
                }).join('');
            }
            return MarkdownBase.render(content);
        }

        function formatDate(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        function formatTime(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            return d.toLocaleString('zh-CN', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }

        return {
            sessions,
            currentIndex,
            searchQuery,
            dragOver,
            messageContainer,
            filteredSessions,
            currentSession,
            totalMessages,
            handleFileSelect,
            handleDrop,
            selectSession,
            deleteSession,
            clearAllSessions,
            renderContent,
            formatDate,
            formatTime
        };
    }
}).mount('#app');
