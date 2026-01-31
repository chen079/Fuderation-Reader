// db.js - IndexedDB 存储

const ReaderDB = {
    dbName: 'FuderationReader',
    dbVersion: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('sessions')) {
                    const store = db.createObjectStore('sessions', { keyPath: 'id' });
                    store.createIndex('title', 'title', { unique: false });
                    store.createIndex('created_at', 'created_at', { unique: false });
                }
            };
        });
    },

    async saveSession(session) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sessions', 'readwrite');
            const store = tx.objectStore('sessions');
            const request = store.put(session);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveSessions(sessions) {
        const tx = this.db.transaction('sessions', 'readwrite');
        const store = tx.objectStore('sessions');

        for (const session of sessions) {
            store.put(session);
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async getAllSessions() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sessions', 'readonly');
            const store = tx.objectStore('sessions');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteSession(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sessions', 'readwrite');
            const store = tx.objectStore('sessions');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearAll() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sessions', 'readwrite');
            const store = tx.objectStore('sessions');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
