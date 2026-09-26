/**
 * Toast Notification Utility
 */
const Toast = {
    show(message, type = 'info', duration = 4000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconMap = {
            success: Icons.check,
            error: Icons.x,
            warning: Icons.alert,
            info: Icons.alert
        };

        toast.innerHTML = `
            <div style="color: var(--${type === 'info' ? 'primary' : type}); display:flex; align-items:center;">
                ${iconMap[type] || Icons.alert}
            </div>
            <div style="flex:1; line-height: 1.4;">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error', 5000); },
    warning(msg) { this.show(msg, 'warning', 4500); },
    info(msg) { this.show(msg, 'info'); }
};

window.Toast = Toast;
