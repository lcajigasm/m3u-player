/**
 * NotificationSystem - Sistema de notificaciones para recordatorios EPG
 * Soporta notificaciones nativas (Electron) y fallback web
 */

class NotificationSystem {
    constructor() {
        this.isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
    }

    /**
     * Muestra una notificación
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.body
     * @param {string} [options.icon]
     * @param {Function} [options.onclick]
     */
    showNotification({ title, body, icon, onclick }) {
        if (this.isElectron && window.Notification) {
            // Notificación nativa Electron
            const notification = new window.Notification(title, { body, icon });
            if (onclick) notification.onclick = onclick;
            return notification;
        } else if (window.Notification && Notification.permission === 'granted') {
            // Notificación web
            const notification = new Notification(title, { body, icon });
            if (onclick) notification.onclick = onclick;
            return notification;
        } else if (window.Notification && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    const notification = new Notification(title, { body, icon });
                    if (onclick) notification.onclick = onclick;
                }
            });
        } else {
            // Fallback: alerta simple
            alert(`${title}\n${body}`);
        }
    }
}

export { NotificationSystem };
