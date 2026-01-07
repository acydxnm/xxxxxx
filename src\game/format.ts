export function formatInt(n: number) {
  // 避免出现小数或科学计数法，统一向下取整展示。
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(Math.floor(n));
}


export function formatWan(n: number) {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs < 10000) return formatInt(n);
  if (abs < 100000000) return `${(n / 10000).toFixed(2)}万`;
  return `${(n / 100000000).toFixed(2)}亿`;
}
