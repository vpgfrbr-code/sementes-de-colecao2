export function stripCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpf(value: string): string {
  const d = stripCpf(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function isValidCpf(value: string): boolean {
  const d = stripCpf(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  // charCodeAt avoids string-indexing undefined under noUncheckedIndexedAccess
  const n = (i: number) => d.charCodeAt(i) - 48;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += n(i) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== n(9)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += n(i) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === n(10);
}
