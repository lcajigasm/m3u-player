/**
 * ReminderStorage - Persistencia local de recordatorios EPG
 * Usa localStorage para guardar y recuperar recordatorios
 */

class ReminderStorage {
    static STORAGE_KEY = 'epg_reminders';

    /**
     * Guarda la lista de recordatorios
     * @param {Reminder[]} reminders
     */
    static save(reminders) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reminders));
        } catch (e) {
            console.error('Error guardando recordatorios:', e);
        }
    }

    /**
     * Recupera la lista de recordatorios
     * @returns {Reminder[]}
     */
    static load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error cargando recordatorios:', e);
            return [];
        }
    }

    /**
     * Limpia todos los recordatorios
     */
    static clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

export { ReminderStorage };
