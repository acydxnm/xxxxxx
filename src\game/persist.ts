import type { GameState } from './state';

const KEY = 'xiuzhen_idle_save_v1';
const EXPORT_PREFIX = 'XZ1:';

let saveTimer: number | undefined;

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // 轻量校验
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.saveVersion !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveToLocalStorage(state: GameState) {
  // 节流：避免每 200ms 写一次。
  if (saveTimer) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, 800);
}

export function exportSaveString(state: GameState) {
  const json = JSON.stringify(state);
  const b64 = toBase64Utf8(json);
  return `${EXPORT_PREFIX}${b64}`;
}

export function importSaveString(text: string): GameState | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const payload = trimmed.startsWith(EXPORT_PREFIX) ? trimmed.slice(EXPORT_PREFIX.length) : trimmed;

  try {
    const json = fromBase64Utf8(payload);
    const parsed = JSON.parse(json) as GameState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.saveVersion !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function toBase64Utf8(str: string) {
  // btoa 只支持 Latin1，这里做 UTF-8 兼容编码。
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64Utf8(b64: string) {
  return decodeURIComponent(escape(atob(b64)));
}

