/**
 * Haptic feedback como progressive enhancement.
 *
 * `navigator.vibrate` não existe no iOS Safari (qualquer versão) — lá a
 * função vira um no-op silencioso. Nunca condicione UX à existência do
 * haptic: ele é só um reforço tátil em Android/Chrome.
 */
export type HapticPattern = "tick" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tick: 10,
  success: [10, 40, 10],
  warning: [20, 60, 20],
  error: [40, 60, 40, 60, 40],
};

export function haptic(pattern: HapticPattern = "tick"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Alguns navegadores lançam sem permissão/gesto — ignorar sempre.
  }
}
