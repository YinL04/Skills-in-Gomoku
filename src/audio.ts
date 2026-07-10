export interface SoundSettings { enabled: boolean; volume: number }
export function playTone(kind: "stone" | "skill" | "counter" | "win", settings: SoundSettings) {
  if (!settings.enabled || typeof window === "undefined") return;
  const Context = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!Context) return;
  const ctx = new Context(); const gain = ctx.createGain(); const osc = ctx.createOscillator(); gain.connect(ctx.destination); osc.connect(gain);
  const notes = { stone: 260, skill: 420, counter: 620, win: 520 }; osc.frequency.setValueAtTime(notes[kind], ctx.currentTime); osc.type = kind === "stone" ? "triangle" : "sine";
  gain.gain.setValueAtTime(settings.volume * .16, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + (kind === "win" ? .55 : .16)); osc.start(); osc.stop(ctx.currentTime + (kind === "win" ? .55 : .16)); osc.onended = () => void ctx.close();
}
