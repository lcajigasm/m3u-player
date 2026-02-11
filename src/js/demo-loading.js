try {
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'loading') {
    import('./core/EventBus.js')
      .then(({ getEventBus }) => {
        const bus = getEventBus();
        bus.emit('ui:loading-show', {
          message: 'Preparando datos...',
          options: { showProgress: true, cancellable: true, timeoutMs: 0 }
        });

        let progress = 0;
        const id = setInterval(() => {
          progress += 7;
          bus.emit('ui:loading-progress', { progress });
          if (progress >= 100) {
            clearInterval(id);
            setTimeout(() => bus.emit('ui:loading-hide'), 400);
          }
        }, 200);
      })
      .catch(() => {});
  }
} catch {}
