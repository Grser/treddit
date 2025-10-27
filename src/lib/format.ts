export function formatCount(n: number) {
    if (n < 1000) return String(n);
    if (n < 1_000_000) {
      const k = Math.round(n/100) / 10; // 1 decimal
      return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + " mil";
    }
    const m = Math.round(n/100_000) / 10;
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + " M";
  }
  