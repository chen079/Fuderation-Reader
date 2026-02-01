// ui-kit.js - Custom Alert, Confirm, Toast

window.UIKit = {
    init() {
        if (document.getElementById('ui-kit-container')) return;

        const container = document.createElement('div');
        container.id = 'ui-kit-container';
        container.innerHTML = `
            <div id="ui-toast-container" class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"></div>
            <div id="ui-modal-overlay" class="fixed inset-0 bg-black/70 z-50 hidden flex items-center justify-center backdrop-blur-sm opacity-0 transition-opacity duration-200">
                <div id="ui-modal-content" class="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 transform scale-95 transition-all duration-200 translate-y-4">
                    <h3 id="ui-modal-title" class="text-lg font-bold text-white mb-2"></h3>
                    <p id="ui-modal-message" class="text-gray-300 mb-6 text-sm leading-relaxed"></p>
                    <div id="ui-modal-actions" class="flex justify-end gap-3">
                        <button id="ui-modal-cancel" class="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] text-sm font-medium transition-colors">取消</button>
                        <button id="ui-modal-confirm" class="px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">确定</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        
        // Bind events
        this.overlay = document.getElementById('ui-modal-overlay');
        this.modalContent = document.getElementById('ui-modal-content');
        this.titleEl = document.getElementById('ui-modal-title');
        this.messageEl = document.getElementById('ui-modal-message');
        this.cancelBtn = document.getElementById('ui-modal-cancel');
        this.confirmBtn = document.getElementById('ui-modal-confirm');
        this.toastContainer = document.getElementById('ui-toast-container');
    },

    alert(message, title = '提示') {
        return new Promise((resolve) => {
            this.showModal({
                title,
                message,
                showCancel: false,
                confirmText: '知道了',
                onConfirm: () => resolve(true)
            });
        });
    },

    confirm(message, title = '确认') {
        return new Promise((resolve) => {
            this.showModal({
                title,
                message,
                showCancel: true,
                confirmText: '确定',
                cancelText: '取消',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    },

    showModal({ title, message, showCancel, confirmText, cancelText, onConfirm, onCancel }) {
        this.init();
        
        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        
        this.confirmBtn.textContent = confirmText || '确定';
        this.cancelBtn.textContent = cancelText || '取消';
        this.cancelBtn.style.display = showCancel ? 'block' : 'none';

        // Cleanup old listeners
        const newConfirm = this.confirmBtn.cloneNode(true);
        const newCancel = this.cancelBtn.cloneNode(true);
        this.confirmBtn.parentNode.replaceChild(newConfirm, this.confirmBtn);
        this.cancelBtn.parentNode.replaceChild(newCancel, this.cancelBtn);
        this.confirmBtn = newConfirm;
        this.cancelBtn = newCancel;

        this.confirmBtn.onclick = () => {
            this.closeModal();
            if (onConfirm) onConfirm();
        };

        this.cancelBtn.onclick = () => {
            this.closeModal();
            if (onCancel) onCancel();
        };

        // Show
        this.overlay.classList.remove('hidden');
        // Trigger reflow
        void this.overlay.offsetWidth;
        
        this.overlay.classList.remove('opacity-0');
        this.modalContent.classList.remove('scale-95', 'translate-y-4');
        this.modalContent.classList.add('scale-100', 'translate-y-0');
    },

    closeModal() {
        this.overlay.classList.add('opacity-0');
        this.modalContent.classList.add('scale-95', 'translate-y-4');
        this.modalContent.classList.remove('scale-100', 'translate-y-0');
        
        setTimeout(() => {
            this.overlay.classList.add('hidden');
        }, 200);
    },

    toast(message, type = 'info') {
        this.init();
        
        const toast = document.createElement('div');
        const colors = {
            info: 'bg-[#252525] border-[#333] text-gray-200',
            success: 'bg-[#1a2e1a] border-[#2f4f2f] text-green-400',
            error: 'bg-[#2e1a1a] border-[#4f2f2f] text-red-400',
            warning: 'bg-[#2e261a] border-[#4f3f2f] text-yellow-400'
        };
        
        const icons = {
            info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
        };

        toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transform transition-all duration-300 translate-x-full opacity-0 ${colors[type] || colors.info}`;
        toast.innerHTML = `
            <div class="flex-shrink-0">${icons[type] || icons.info}</div>
            <div class="text-sm font-medium">${message}</div>
        `;

        this.toastContainer.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-4');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }
};

// Auto init on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UIKit.init());
} else {
    UIKit.init();
}
