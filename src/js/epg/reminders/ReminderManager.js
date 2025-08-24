/**
 * Reminder Manager - Gestor de recordatorios EPG
 * Gestiona recordatorios de programas y notificaciones
 */

class ReminderManager {
    /**
     * @param {M3UPlayer} player - Instancia del reproductor principal
     */
    constructor(player) {
        this.player = player;
        this.reminders = new Map();
        this.checkInterval = null;
        this.storageKey = 'epg_reminders';
        
        // Configuración
        this.config = {
            defaultAdvanceMinutes: 5,
            checkIntervalMs: 30000, // 30 segundos
            maxReminders: 50,
            notificationDuration: 10000, // 10 segundos
            // Preferencias de ejecución
            executeOnNotify: false, // Ejecutar inmediatamente al notificar
            autoExecuteAtStart: true // Ejecutar automáticamente al llegar la hora de inicio
        };
        
        this.loadReminders();
        this.startReminderCheck();
        
        console.log('⏰ ReminderManager inicializado');
    }

    /**
     * Añade un nuevo recordatorio
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @param {Date} startTime - Hora de inicio del programa
     * @param {number} [advanceMinutes] - Minutos de antelación
     * @returns {Promise<string>} ID del recordatorio creado
     */
    async addReminder(programId, channelId, startTime, advanceMinutes = null) {
        if (!programId || !channelId || !startTime) {
            throw new Error('Parámetros requeridos faltantes para crear recordatorio');
        }

        const advance = advanceMinutes || this.config.defaultAdvanceMinutes;
        const notificationTime = new Date(startTime.getTime() - advance * 60 * 1000);
        
        const now = new Date();
        // Verificar que el programa no haya comenzado
        if (startTime <= now) {
            throw new Error('No se puede crear recordatorio para un programa que ya comenzó');
        }
        // Si el tiempo de notificación quedó en el pasado, ajustarlo a ahora para notificar inmediato
        if (notificationTime < now) {
            notificationTime.setTime(now.getTime());
        }

        // Verificar límite de recordatorios
        if (this.reminders.size >= this.config.maxReminders) {
            throw new Error(`Máximo ${this.config.maxReminders} recordatorios permitidos`);
        }

        // Evitar duplicados por programId+channelId
        const duplicate = Array.from(this.reminders.values()).find(r =>
            r.programId === programId && r.channelId === channelId && ['pending', 'notified'].includes(r.status)
        );
        if (duplicate) {
            throw new Error('Ya existe un recordatorio para este programa en este canal');
        }

        const reminderId = this.generateReminderId(programId, channelId);

        const reminder = {
            id: reminderId,
            programId: programId,
            channelId: channelId,
            title: await this.getProgramTitle(programId, channelId),
            startTime: startTime,
            notificationTime: notificationTime,
            advanceMinutes: advance,
            status: 'pending',
            createdAt: new Date()
        };

        this.reminders.set(reminderId, reminder);
    await this.saveReminders();
    this.dispatchUpdate();
    // Forzar una verificación inmediata para respetar tiempos cortos
    this.checkReminders();
        
        console.log(`⏰ Recordatorio creado: ${reminder.title} (${this.formatTime(notificationTime)})`);
        
        return reminderId;
    }

    /**
     * Elimina un recordatorio
     * @param {string} reminderId - ID del recordatorio
     * @returns {Promise<boolean>} True si se eliminó correctamente
     */
    async removeReminder(reminderId) {
        if (!reminderId || !this.reminders.has(reminderId)) {
            return false;
        }

        const reminder = this.reminders.get(reminderId);
        this.reminders.delete(reminderId);
        await this.saveReminders();
    this.dispatchUpdate();
        
        console.log(`🗑️ Recordatorio eliminado: ${reminder.title}`);
        
        return true;
    }

    /**
     * Obtiene todos los recordatorios activos
     * @returns {Reminder[]}
     */
    getActiveReminders() {
        return Array.from(this.reminders.values())
            .filter(reminder => reminder.status === 'pending')
            .sort((a, b) => a.notificationTime - b.notificationTime);
    }

    /**
     * Obtiene recordatorios por canal
     * @param {string} channelId - ID del canal
     * @returns {Reminder[]}
     */
    getRemindersByChannel(channelId) {
        return Array.from(this.reminders.values())
            .filter(reminder => reminder.channelId === channelId)
            .sort((a, b) => a.startTime - b.startTime);
    }

    /**
     * Verifica recordatorios pendientes
     * @private
     */
    checkReminders() {
        const now = new Date();
        const remindersArr = Array.from(this.reminders.values());

        // Notificar cuando llegue el tiempo de notificación
        const toNotify = remindersArr.filter(reminder => 
            reminder.status === 'pending' && reminder.notificationTime <= now
        );
        for (const reminder of toNotify) {
            this.triggerReminder(reminder);
        }

        // Ejecutar automáticamente al llegar la hora de inicio
        if (this.config.autoExecuteAtStart) {
            const toExecute = remindersArr.filter(reminder =>
                (reminder.status === 'notified' || reminder.status === 'pending') && reminder.startTime <= now
            );
            for (const reminder of toExecute) {
                this.executeReminder(reminder);
            }
        }

        // Limpiar recordatorios antiguos
        this.cleanupOldReminders();
    }

    /**
     * Dispara un recordatorio
     * @param {Reminder} reminder - Recordatorio a disparar
     * @private
     */
    async triggerReminder(reminder) {
        try {
            console.log(`🔔 Disparando recordatorio: ${reminder.title}`);
            
            // Actualizar estado
            reminder.status = 'notified';
            reminder.notifiedAt = new Date();
            
            // Mostrar notificación
            await this.showNotification(reminder);
            
            // Guardar cambios
            await this.saveReminders();
            this.dispatchUpdate();

            // Ejecutar inmediatamente si está configurado
            if (this.config.executeOnNotify) {
                await this.executeReminder(reminder);
            }
            
        } catch (error) {
            console.error('❌ Error disparando recordatorio:', error);
        }
    }

    /**
     * Muestra una notificación de recordatorio
     * @param {Reminder} reminder - Recordatorio
     * @private
     */
    async showNotification(reminder) {
        // Intentar notificación nativa primero
        if (await this.showNativeNotification(reminder)) {
            return;
        }
        
        // Fallback a notificación en la aplicación
        this.showInAppNotification(reminder);
    }

    /**
     * Muestra notificación nativa del sistema
     * @param {Reminder} reminder - Recordatorio
     * @returns {Promise<boolean>} True si se mostró correctamente
     * @private
     */
    async showNativeNotification(reminder) {
        try {
            // Verificar soporte y permisos
            if (!('Notification' in window)) {
                return false;
            }

            let permission = Notification.permission;
            
            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }
            
            if (permission !== 'granted') {
                return false;
            }

            // Crear notificación
            const notification = new Notification(`📺 ${reminder.title}`, {
                body: `El programa comenzará en ${reminder.advanceMinutes} minutos`,
                icon: '/assets/icon.png',
                tag: reminder.id,
                requireInteraction: true,
                actions: [
                    { action: 'watch', title: 'Ver ahora' },
                    { action: 'dismiss', title: 'Descartar' }
                ]
            });

            // Configurar eventos
            notification.onclick = () => {
                this.executeReminder(reminder);
                notification.close();
            };

            notification.onclose = () => {
                console.log(`🔕 Notificación cerrada: ${reminder.title}`);
            };

            // Auto-cerrar después de un tiempo
            setTimeout(() => {
                notification.close();
            }, this.config.notificationDuration);

            return true;
            
        } catch (error) {
            console.error('❌ Error mostrando notificación nativa:', error);
            return false;
        }
    }

    /**
     * Muestra notificación dentro de la aplicación
     * @param {Reminder} reminder - Recordatorio
     * @private
     */
    showInAppNotification(reminder) {
        const notification = this.createInAppNotification(reminder);
        document.body.appendChild(notification);
        
        // Mostrar con animación
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto-ocultar
        setTimeout(() => {
            this.hideInAppNotification(notification);
        }, this.config.notificationDuration);
    }

    /**
     * Crea una notificación dentro de la aplicación
     * @param {Reminder} reminder - Recordatorio
     * @returns {HTMLElement}
     * @private
     */
    createInAppNotification(reminder) {
        const notification = document.createElement('div');
        notification.className = 'reminder-notification';
        notification.dataset.reminderId = reminder.id;
        
        const timeUntilStart = Math.max(0, Math.round((reminder.startTime - new Date()) / (1000 * 60)));
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">📺</div>
                <div class="notification-body">
                    <div class="notification-title">${this.escapeHtml(reminder.title)}</div>
                    <div class="notification-message">
                        ${timeUntilStart > 0 ? 
                            `Comienza en ${timeUntilStart} minutos` : 
                            'El programa está comenzando'
                        }
                    </div>
                    <div class="notification-time">${this.formatTime(reminder.startTime)}</div>
                </div>
                <div class="notification-actions">
                    <button class="notification-btn watch-btn" data-action="watch">Ver ahora</button>
                    <button class="notification-btn dismiss-btn" data-action="dismiss">Descartar</button>
                </div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Event listeners
        notification.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            switch (action) {
                case 'watch':
                    this.executeReminder(reminder);
                    this.hideInAppNotification(notification);
                    break;
                case 'dismiss':
                    this.hideInAppNotification(notification);
                    break;
            }
        });
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hideInAppNotification(notification);
        });
        
        return notification;
    }

    /**
     * Oculta una notificación dentro de la aplicación
     * @param {HTMLElement} notification - Elemento de notificación
     * @private
     */
    hideInAppNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Ejecuta un recordatorio (cambia al canal)
     * @param {Reminder} reminder - Recordatorio a ejecutar
     * @private
     */
    async executeReminder(reminder) {
        try {
            console.log(`▶️ Ejecutando recordatorio: ${reminder.title}`);
            
            // Actualizar estado
            reminder.status = 'executed';
            reminder.executedAt = new Date();
            
            // Cambiar al canal correspondiente
            if (this.player && this.player.playlistData) {
                const channelIndex = this.player.playlistData.findIndex(channel => 
                    channel.tvgId === reminder.channelId ||
                    channel.tvgName === reminder.channelId ||
                    channel.title === reminder.channelId
                );
                
                if (channelIndex >= 0) {
                    await this.player.playItem(channelIndex);
                    console.log(`📺 Canal cambiado para recordatorio: ${reminder.title}`);
                } else {
                    console.warn(`⚠️ Canal no encontrado para recordatorio: ${reminder.channelId}`);
                }
            }
            
            // Guardar cambios
            await this.saveReminders();
            this.dispatchUpdate();
            
        } catch (error) {
            console.error('❌ Error ejecutando recordatorio:', error);
        }
    }

    /**
     * Inicia la verificación periódica de recordatorios
     * @private
     */
    startReminderCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, this.config.checkIntervalMs);
        
        console.log(`⏰ Verificación de recordatorios iniciada (cada ${this.config.checkIntervalMs / 1000}s)`);
    }

    /**
     * Detiene la verificación de recordatorios
     * @private
     */
    stopReminderCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('⏰ Verificación de recordatorios detenida');
        }
    }

    /**
     * Limpia recordatorios antiguos
     * @private
     */
    cleanupOldReminders() {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 horas atrás
        
        let cleanedCount = 0;
        
        for (const [id, reminder] of this.reminders) {
            // Eliminar recordatorios ejecutados o cancelados antiguos
            if ((reminder.status === 'executed' || reminder.status === 'cancelled') && 
                reminder.startTime < cutoffTime) {
                this.reminders.delete(id);
                cleanedCount++;
            }
            
            // Eliminar recordatorios pendientes de programas que ya pasaron
            if (reminder.status === 'pending' && reminder.startTime < now) {
                reminder.status = 'expired';
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.saveReminders();
            console.log(`🧹 ${cleanedCount} recordatorios antiguos limpiados`);
            this.dispatchUpdate();
        }
    }

    /**
     * Carga recordatorios desde el almacenamiento local
     * @private
     */
    loadReminders() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                
                for (const reminderData of data) {
                    const reminder = {
                        ...reminderData,
                        startTime: new Date(reminderData.startTime),
                        notificationTime: new Date(reminderData.notificationTime),
                        createdAt: new Date(reminderData.createdAt)
                    };
                    
                    if (reminderData.notifiedAt) {
                        reminder.notifiedAt = new Date(reminderData.notifiedAt);
                    }
                    
                    if (reminderData.executedAt) {
                        reminder.executedAt = new Date(reminderData.executedAt);
                    }
                    
                    this.reminders.set(reminder.id, reminder);
                }
                
                console.log(`📥 ${this.reminders.size} recordatorios cargados`);
            }
            
        } catch (error) {
            console.error('❌ Error cargando recordatorios:', error);
        }
    }

    /**
     * Guarda recordatorios en el almacenamiento local
     * @private
     */
    async saveReminders() {
        try {
            const data = Array.from(this.reminders.values());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
        } catch (error) {
            console.error('❌ Error guardando recordatorios:', error);
        }
    }

    /**
     * Genera un ID único para un recordatorio
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @returns {string}
     * @private
     */
    generateReminderId(programId, channelId) {
        // ID estable por combinación para poder detectar duplicados
        return `reminder_${channelId}_${programId}`;
    }

    /**
     * Obtiene el título de un programa
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @returns {Promise<string>}
     * @private
     */
    async getProgramTitle(programId, channelId) {
        // Esta función debería obtener el título del programa desde el EPGManager
        // Por ahora retornamos un título genérico
        return `Programa en ${channelId}`;
    }

    /**
     * Formatea una hora
     * @param {Date} date - Fecha a formatear
     * @returns {string}
     * @private
     */
    formatTime(date) {
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string}
     * @private
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Obtiene estadísticas de recordatorios
     * @returns {Object}
     */
    getStats() {
        const reminders = Array.from(this.reminders.values());
        
        return {
            total: reminders.length,
            pending: reminders.filter(r => r.status === 'pending').length,
            notified: reminders.filter(r => r.status === 'notified').length,
            executed: reminders.filter(r => r.status === 'executed').length,
            expired: reminders.filter(r => r.status === 'expired').length,
            cancelled: reminders.filter(r => r.status === 'cancelled').length
        };
    }

    /**
     * Destruye el gestor de recordatorios
     */
    destroy() {
        this.stopReminderCheck();
        this.reminders.clear();
        
        // Limpiar notificaciones activas
        const notifications = document.querySelectorAll('.reminder-notification');
        notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        console.log('🧹 ReminderManager destruido');
    }

    /**
     * Emite evento global para que la UI actualice
     * @private
     */
    dispatchUpdate() {
        try {
            const event = new CustomEvent('epg:reminders:updated');
            window.dispatchEvent(event);
        } catch (_) {
            // noop
        }
    }
}

export { ReminderManager };