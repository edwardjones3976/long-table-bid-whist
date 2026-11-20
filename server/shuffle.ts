/** Server-only Fisher-Yates shuffle on cryptographic randomness, without modulo bias. */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  const buf = new Uint32Array(1);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const n = i + 1;
    const limit = Math.floor(0x100000000 / n) * n;
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    const j = buf[0] % n;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
