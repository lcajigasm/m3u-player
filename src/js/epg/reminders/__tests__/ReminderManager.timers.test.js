import { ReminderManager } from '../ReminderManager.js';

/**
 * ReminderManager: timers falsos y ejecución
 */
describe('ReminderManager - timers y notificaciones', () => {
  let rm;

  beforeEach(() => {
    jest.useFakeTimers();
    // limpiar localStorage mock
    localStorage.getItem.mockReset();
    localStorage.setItem.mockReset();
    document.body.innerHTML = '';

    rm = new ReminderManager({
      playlistData: [
        { tvgId: 'ch1', title: 'Channel 1', tvgName: 'Channel 1' },
      ],
      playItem: jest.fn(() => Promise.resolve())
    });

    // acelerar intervalos de check
    rm.config.checkIntervalMs = 500;
    rm.stopReminderCheck();
    rm.startReminderCheck();
  });

  afterEach(() => {
    rm?.destroy();
    jest.useRealTimers();
  });

  test('dispara showNotification y luego executeReminder al llegar startTime', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60_000); // +1 min

    // Espía métodos para verificar llamadas
    const showNotificationSpy = jest.spyOn(rm, 'showNotification').mockResolvedValue(undefined);
    const executeSpy = jest.spyOn(rm, 'executeReminder').mockResolvedValue(undefined);

    await rm.addReminder('p1', 'ch1', start, 1);

    // Avanzar al tiempo de notificación (igual a ahora)
    jest.advanceTimersByTime(600); // dejar correr el interval handler

    // Esperar microtareas
    await Promise.resolve();

    expect(showNotificationSpy).toHaveBeenCalledTimes(1);

    // Avanzar hasta el inicio del programa (~1 min)
    jest.advanceTimersByTime(60_000);
    await Promise.resolve();

    // autoExecuteAtStart = true por defecto
    expect(executeSpy).toHaveBeenCalled();
  });
});
