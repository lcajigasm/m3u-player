(function(global){
  const Metrics = {
    marks: new Map(),
    measures: new Map(),
    mark(name){
      this.marks.set(name, performance.now());
    },
    measure(name, startMark){
      const start = this.marks.get(startMark);
      const now = performance.now();
      const value = start != null ? now - start : 0;
      this.measures.set(name, value);
      return value;
    },
    get(name){
      return this.measures.get(name) || 0;
    },
    wrap(fn, label){
      const start = `${label}:start`;
      this.mark(start);
      const result = fn();
      const ms = this.measure(label, start);
      if (global.__DEV__){
        console.log(`⏱️ ${label}: ${Math.round(ms)} ms`);
      }
      return { result, ms };
    }
  };
  global.UI = global.UI || {};
  global.UI.Metrics = Metrics;
})(window);
