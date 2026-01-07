import { formatWan } from './format';
import type { GameState, InventoryItem } from './state';


const TICK_MS = 5000;

export function computeDerived(state: GameState): GameState {
  const rootBonus = state.roots[state.rootIndex]?.efficiencyBonus ?? 1;
  const manualBonus = state.manuals
    .filter((m) => m.learned)
    .reduce((acc, m) => acc * m.efficiencyBonus, 1);
  const caveBonus = state.cave.efficiencyBonus;
  
  // 装备加成
  const equipmentBonus = state.equipment
    .filter(e => e.equipped)
    .reduce((acc, e) => {
      let bonus = 1;
      if (e.stats.efficiencyBonus) bonus += e.stats.efficiencyBonus;
      return acc * bonus;
    }, 1);
  
  // 宠物加成
  const petBonus = state.pets
    .filter(p => p.active)
    .reduce((acc, p) => acc * (1 + p.bonus.efficiencyBonus), 1);

  const efficiency = clamp(rootBonus * manualBonus * caveBonus * equipmentBonus * petBonus, 0.2, 99);

  // 基础结算：受境界影响。
  const realmFactor = 1 + state.realmIndex * 0.15; // 调整境界成长
  const basePerTick = Math.floor(25 * realmFactor); // 略微提升基础数值
  const gainPerTick = Math.floor(basePerTick * efficiency);

  return {
    ...state,
    derived: {
      efficiency,
      basePerTick,
      gainPerTick
    }
  };
}

export function tick(state: GameState, nowMs: number): GameState {
  if (nowMs <= state.lastTickAtMs) return state;

  const elapsed = nowMs - state.lastTickAtMs;
  if (elapsed < TICK_MS) return state;

  // 页面切后台/挂起后，浏览器可能一次性“追赶”很长时间：做上限，避免结算爆炸。
  const max = 8 * 60 * 60 * 1000;
  const capped = Math.min(elapsed, max);

  const ticks = Math.floor(capped / TICK_MS);
  if (ticks <= 0) return state;

  const gain = state.derived.gainPerTick * ticks;

  const years = state.yearsCultivated + ticks * 5; // 5年/次，便于感知。
  const next = {
    ...state,
    xiuwei: state.xiuwei + gain,
    yearsCultivated: years,
    lastTickAtMs: state.lastTickAtMs + ticks * TICK_MS
  };

  // 少量日志，避免刷屏：追赶多次时合并展示。
  const gainText = formatWan(gain);
  const text = ticks <= 1 ? `你静心吐纳，修为+${gainText}。` : `你静心吐纳（×${ticks}），修为+${gainText}。`;
  return pushLog(next, text);
}


export function doBreakthrough(state: GameState): GameState {
  const nextRealm = state.realms[state.realmIndex + 1];
  if (!nextRealm) return state;
  if (state.xiuwei < nextRealm.needXiuwei) return pushLog(state, '修为未足，尚不可突破。');

  const cost = Math.floor(nextRealm.needXiuwei * 0.12);
  const pay = Math.min(state.lingshi, cost);

  const next: GameState = {
    ...state,
    realmIndex: state.realmIndex + 1,
    lingshi: state.lingshi - pay,
    shengwang: state.shengwang + 5 + state.realmIndex,
    // 突破消耗部分修为，作为节奏控制。
    xiuwei: Math.max(0, state.xiuwei - Math.floor(nextRealm.needXiuwei * 0.18))
  };

  return pushLog(next, `你一鼓作气，突破至「${nextRealm.name}」。声望+${5 + state.realmIndex}。`);
}

export function rerollRoot(state: GameState): GameState {
  if (state.lingshi < state.rootRerollCost) {
    return pushLog(state, '灵石不足，无法洗髓。');
  }

  const roll = Math.random();
  let idx = 0;
  if (roll < 0.60) idx = 0;
  else if (roll < 0.88) idx = 1;
  else if (roll < 0.98) idx = 2;
  else idx = 3;

  // 防止洗到相同等级
  if (idx === state.rootIndex) {
    // 如果相同，重新roll一次
    const reroll = Math.random();
    if (reroll < 0.60) idx = 0;
    else if (reroll < 0.88) idx = 1;
    else if (reroll < 0.98) idx = 2;
    else idx = 3;
  }

  const cost = state.rootRerollCost;
  const nextCost = Math.floor(cost * 1.45);

  const next: GameState = {
    ...state,
    lingshi: state.lingshi - cost,
    rootIndex: idx,
    rootRerollCost: nextCost
  };

  return pushLog(next, `你洗髓伐骨，灵根显现为「${next.roots[idx].name}」。`);
}

export function learnManual(state: GameState, manualId: string): GameState {
  const m = state.manuals.find((x) => x.id === manualId);
  if (!m) return state;
  if (m.learned) return state;
  if (state.lingshi < m.costLingshi) return pushLog(state, '灵石不足，无法研习该功法。');

  const manuals = state.manuals.map((x) => (x.id === manualId ? { ...x, learned: true } : x));
  const next: GameState = {
    ...state,
    lingshi: state.lingshi - m.costLingshi,
    manuals
  };
  return pushLog(next, `你研读功法「${m.name}」，气机更为顺畅。`);
}

export function doAdventure(state: GameState): GameState {
  if (state.yearsCultivated < 20) return pushLog(state, '修行年数不足，先稳固根基再出发。');

  const next = { ...state, yearsCultivated: state.yearsCultivated - 20 };

  const roll = Math.random();
  if (roll < 0.50) {
    const get = randInt(80, 220) + state.realmIndex * 35;
    next.lingshi += get;
    return pushLog(next, `你游历山川，偶得灵石${get}。`);
  }
  if (roll < 0.78) {
    const get = randInt(1, 4);
    next.inventory = mergeItem(next.inventory, {
      id: 'ore-1',
      name: '赤铁矿',
      desc: '常见矿石，可用于炼器。',
      count: get
    });
    return pushLog(next, `你在旧矿坑中拾得赤铁矿×${get}。`);
  }
  if (roll < 0.93) {
    const rep = randInt(2, 6);
    next.shengwang += rep;
    return pushLog(next, `你出手相助，声望+${rep}。`);
  }

  // 稀有事件
  const drop: InventoryItem = {
    id: 'pill-1',
    name: '凝神丹',
    desc: '服用后短时间内吐纳更顺畅（后续会接入临时BUFF系统）。',
    count: 1
  };
  next.inventory = mergeItem(next.inventory, drop);
  return pushLog(next, '你在古亭遇一老者，赠你一枚凝神丹。');
}

export function applyOfflineProgress(state: GameState): GameState {
  const now = Date.now();
  const elapsed = now - state.lastTickAtMs;
  if (elapsed < TICK_MS) return state;

  // 离线收益上限：最多结算 8 小时，防止爆炸。
  const max = 8 * 60 * 60 * 1000;
  const capped = Math.min(elapsed, max);
  const ticks = Math.floor(capped / TICK_MS);

  if (ticks <= 0) return state;

  const gain = state.derived.gainPerTick * ticks;
  const next: GameState = {
    ...state,
    xiuwei: state.xiuwei + gain,
    yearsCultivated: state.yearsCultivated + ticks * 5,
    lastTickAtMs: state.lastTickAtMs + ticks * TICK_MS
  };

  return pushLog(next, `你离线修行了${ticks * 5}年，修为+${formatWan(gain)}。`);
}


function pushLog(state: GameState, text: string): GameState {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const line = { id, atMs: Date.now(), text };
  const logs = [...state.logs, line].slice(-80);
  return { ...state, logs };
}

function mergeItem(inv: GameState['inventory'], item: InventoryItem) {
  const idx = inv.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...inv, item];
  const next = inv.slice();
  next[idx] = { ...next[idx], count: next[idx].count + item.count };
  return next;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
