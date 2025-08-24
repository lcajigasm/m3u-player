/**
 * EPGRemindersUI - Interfaz de usuario para gestión de recordatorios EPG
 */

class EPGRemindersUI {
    /**
     * @param {HTMLElement} container - Contenedor donde renderizar la UI
     * @param {ReminderManager} reminderManager - Instancia ReminderManager
     */
    constructor(container, reminderManager) {
        this.container = container;
        this.reminderManager = reminderManager;
        this.elements = {};
        this.render();
        this.setupEventListeners();
    // Suscribirse a cambios del ReminderManager
    window.addEventListener('epg:reminders:updated', () => this.updateList());
    }

    /**
     * Renderiza la interfaz de recordatorios
     */
    render() {
        this.container.innerHTML = `
            <div class="epg-reminders-header">
                <h3>⏰ Recordatorios Activos</h3>
                <button id="clearAllRemindersBtn" class="reminder-action-btn">Limpiar todos</button>
            </div>
            <div id="remindersList" class="epg-reminders-list">
                <!-- Lista de recordatorios -->
            </div>
        `;
        this.elements.list = this.container.querySelector('#remindersList');
        this.elements.clearAllBtn = this.container.querySelector('#clearAllRemindersBtn');
        this.updateList();
    }

    /**
     * Actualiza la lista de recordatorios
     */
    updateList() {
        const reminders = this.reminderManager.getActiveReminders();
        if (reminders.length === 0) {
            this.elements.list.innerHTML = '<div class="no-reminders">No hay recordatorios activos</div>';
            return;
        }
        this.elements.list.innerHTML = reminders.map(reminder => this.renderReminder(reminder)).join('');
        // Asignar eventos a los botones de eliminar
        this.elements.list.querySelectorAll('.delete-reminder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.reminderId;
                this.deleteReminder(id);
            });
        });
    }

    /**
     * Renderiza un recordatorio individual
     */
    renderReminder(reminder) {
        return `
            <div class="reminder-item">
                <div class="reminder-info">
                    <div class="reminder-title">${this.escapeHtml(reminder.title)}</div>
                    <div class="reminder-meta">
                        Canal: <b>${this.escapeHtml(reminder.channelId)}</b> | 
                        Inicio: ${this.formatTime(reminder.startTime)} | 
                        Notificación: ${this.formatTime(reminder.notificationTime)}
                    </div>
                </div>
                <button class="delete-reminder-btn" data-reminder-id="${reminder.id}" title="Eliminar">🗑️</button>
            </div>
        `;
    }

    /**
     * Elimina un recordatorio
     */
    async deleteReminder(reminderId) {
        await this.reminderManager.removeReminder(reminderId);
        this.updateList();
    }

    /**
     * Limpia todos los recordatorios
     */
    async clearAllReminders() {
    const reminders = this.reminderManager.getActiveReminders();
    await Promise.all(reminders.map(r => this.reminderManager.removeReminder(r.id)));
        this.updateList();
    }

    /**
     * Configura eventos de la UI
     */
    setupEventListeners() {
        this.elements.clearAllBtn.addEventListener('click', () => this.clearAllReminders());
    }

    /**
     * Formatea una hora
     */
    formatTime(date) {
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Escapa HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export { EPGRemindersUI };
