/**
 * Dynamic Modal Dialog Manager
 */
const Modal = {
    open({ title, content, footer = '', size = 'md', onOpen = null }) {
        this.close(); // Close any open modal first

        const overlay = document.createElement('div');
        overlay.id = 'active-modal-overlay';
        overlay.className = 'modal-overlay active';

        overlay.innerHTML = `
            <div class="modal-dialog ${size === 'lg' ? 'modal-dialog-lg' : ''}">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="btn btn-ghost btn-icon" id="modal-close-btn" style="color: var(--text-muted);">${Icons.x}</button>
                </div>
                <div class="modal-body">${content}</div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        const closeBtn = document.getElementById('modal-close-btn');
        if (closeBtn) closeBtn.onclick = () => this.close();

        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };

        if (onOpen) onOpen(overlay);
    },

    close() {
        const existing = document.getElementById('active-modal-overlay');
        if (existing) {
            existing.remove();
        }
    }
};

window.Modal = Modal;
