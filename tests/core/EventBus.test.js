/**
 * EventBus Tests
 * Test suite for the centralized event system
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import EventBus, { createEventBus, getEventBus } from '../../src/js/core/EventBus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = createEventBus();
  });

  afterEach(() => {
    eventBus.destroy();
  });

  describe('Initialization', () => {
    test('should create new EventBus instance', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
      expect(eventBus.events).toBeInstanceOf(Map);
      expect(eventBus.metrics).toBeDefined();
    });

    test('should initialize with empty state', () => {
      expect(eventBus.events.size).toBe(0);
      expect(eventBus.metrics.totalEvents).toBe(0);
      expect(eventBus.eventHistory).toEqual([]);
    });
  });

  describe('Event Registration', () => {
    test('should register event listener', () => {
      const callback = jest.fn();
      const listenerId = eventBus.on('test-event', callback);

      expect(typeof listenerId).toBe('string');
      expect(eventBus.getListenerCount('test-event')).toBe(1);
    });

    test('should register multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);

      expect(eventBus.getListenerCount('test-event')).toBe(2);
    });

    test('should register listener with priority', () => {
      const highPriorityCallback = jest.fn();
      const lowPriorityCallback = jest.fn();

      eventBus.on('test-event', lowPriorityCallback, { priority: 1 });
      eventBus.on('test-event', highPriorityCallback, { priority: 10 });

      const listeners = eventBus.events.get('test-event');
      expect(listeners[0].priority).toBe(10);
      expect(listeners[1].priority).toBe(1);
    });

    test('should register once listener', () => {
      const callback = jest.fn();
      eventBus.once('test-event', callback);

      expect(eventBus.getListenerCount('test-event')).toBe(1);
      const listener = eventBus.events.get('test-event')[0];
      expect(listener.once).toBe(true);
    });

    test('should throw error for invalid callback', () => {
      expect(() => {
        eventBus.on('test-event', 'not-a-function');
      }).toThrow('Callback must be a function');
    });
  });

  describe('Event Emission', () => {
    test('should emit event to listeners', async () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);

      await eventBus.emit('test-event', { test: 'data' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-event',
          data: { test: 'data' }
        })
      );
    });

    test('should emit to multiple listeners in priority order', async () => {
      const callOrder = [];
      const callback1 = jest.fn(() => callOrder.push(1));
      const callback2 = jest.fn(() => callOrder.push(2));

      eventBus.on('test-event', callback1, { priority: 1 });
      eventBus.on('test-event', callback2, { priority: 10 });

      await eventBus.emit('test-event');

      expect(callOrder).toEqual([2, 1]);
    });

    test('should remove once listeners after execution', async () => {
      const callback = jest.fn();
      eventBus.once('test-event', callback);

      await eventBus.emit('test-event');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(eventBus.getListenerCount('test-event')).toBe(0);
    });

    test('should handle async listeners', async () => {
      const callback = jest.fn(() => Promise.resolve('async-result'));
      eventBus.on('test-event', callback);

      const results = await eventBus.emit('test-event', null, { async: true });

      expect(results).toEqual(['async-result']);
    });

    test('should handle listener errors gracefully', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();

      eventBus.on('test-event', errorCallback);
      eventBus.on('test-event', normalCallback);

      const results = await eventBus.emit('test-event');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ error: 'Test error' });
      expect(normalCallback).toHaveBeenCalled();
    });

    test('should stop propagation when requested', async () => {
      const callback1 = jest.fn((event) => {
        event.stopPropagation = true;
      });
      const callback2 = jest.fn();

      eventBus.on('test-event', callback1, { priority: 10 });
      eventBus.on('test-event', callback2, { priority: 1 });

      await eventBus.emit('test-event');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test('should return empty array for non-existent event', async () => {
      const results = await eventBus.emit('non-existent-event');
      expect(results).toEqual([]);
    });
  });

  describe('Event Deregistration', () => {
    test('should remove listener by ID', () => {
      const callback = jest.fn();
      const listenerId = eventBus.on('test-event', callback);

      const removed = eventBus.off('test-event', listenerId);

      expect(removed).toBe(true);
      expect(eventBus.getListenerCount('test-event')).toBe(0);
    });

    test('should remove listener by callback', () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);

      const removed = eventBus.off('test-event', callback);

      expect(removed).toBe(true);
      expect(eventBus.getListenerCount('test-event')).toBe(0);
    });

    test('should return false for non-existent listener', () => {
      const removed = eventBus.off('test-event', 'non-existent-id');
      expect(removed).toBe(false);
    });

    test('should remove all listeners for event', () => {
      eventBus.on('test-event', jest.fn());
      eventBus.on('test-event', jest.fn());

      const removedCount = eventBus.removeAllListeners('test-event');

      expect(removedCount).toBe(2);
      expect(eventBus.getListenerCount('test-event')).toBe(0);
    });
  });

  describe('Metrics and Monitoring', () => {
    test('should track metrics', async () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);

      await eventBus.emit('test-event');

      const metrics = eventBus.getMetrics();
      expect(metrics.totalEvents).toBe(1);
      expect(metrics.eventTypes.get('test-event')).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    test('should maintain event history in debug mode', async () => {
      eventBus.debugMode = true;
      eventBus.on('test-event', jest.fn());

      await eventBus.emit('test-event', { test: 'data' });

      const history = eventBus.getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        name: 'test-event',
        data: { test: 'data' }
      });
    });

    test('should limit history size', async () => {
      eventBus.debugMode = true;
      eventBus.maxHistorySize = 2;

      for (let i = 0; i < 5; i++) {
        await eventBus.emit(`test-event-${i}`);
      }

      const history = eventBus.getEventHistory();
      expect(history.length).toBeLessThanOrEqual(2);
    });

    test('should clear history', async () => {
      eventBus.debugMode = true;
      await eventBus.emit('test-event');

      eventBus.clearHistory();

      expect(eventBus.getEventHistory()).toHaveLength(0);
    });
  });

  describe('Utility Methods', () => {
    test('should get event names', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());

      const eventNames = eventBus.getEventNames();
      expect(eventNames).toContain('event1');
      expect(eventNames).toContain('event2');
    });

    test('should get listener count', () => {
      eventBus.on('test-event', jest.fn());
      eventBus.on('test-event', jest.fn());

      expect(eventBus.getListenerCount('test-event')).toBe(2);
      expect(eventBus.getListenerCount('non-existent')).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance from getEventBus', () => {
      const instance1 = getEventBus();
      const instance2 = getEventBus();

      expect(instance1).toBe(instance2);
    });

    test('should create different instances from createEventBus', () => {
      const instance1 = createEventBus();
      const instance2 = createEventBus();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Cleanup', () => {
    test('should destroy EventBus and clear all data', () => {
      eventBus.on('test-event', jest.fn());
      eventBus.emit('test-event');

      eventBus.destroy();

      expect(eventBus.events.size).toBe(0);
      expect(eventBus.eventHistory).toHaveLength(0);
      expect(eventBus.metrics.totalEvents).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle timeout in async mode', async () => {
      const slowCallback = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      eventBus.on('test-event', slowCallback);

      const results = await eventBus.emit('test-event', null, { 
        async: true, 
        timeout: 50 
      });

      expect(results[0]).toEqual({ error: 'Callback timeout after 50ms' });
    });

    test('should handle callback context binding', async () => {
      const context = { value: 'test' };
      const callback = jest.fn(function() {
        return this.value;
      });

      eventBus.on('test-event', callback, { context });

      const results = await eventBus.emit('test-event');

      expect(results[0]).toBe('test');
    });
  });
});