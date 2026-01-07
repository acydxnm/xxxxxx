import { computeDerived, doAdventure, doBreakthrough, learnManual, rerollRoot, tick } from './logic';
import { importSaveString } from './persist';
import { defaultState, type GameState } from './state';


export type GameAction =
  | { type: 'TICK'; nowMs: number }
  | { type: 'BREAKTHROUGH' }
  | { type: 'RESET' }
  | { type: 'IMPORT_SAVE'; saveText: string }
  | { type: 'CLAIM_STARTER' }
  | { type: 'REROLL_ROOT' }
  | { type: 'LEARN_MANUAL'; manualId: string }
  | { type: 'ADVENTURE' }
  | { type: 'USE_PILL'; pillId: string }
  | { type: 'EQUIP_ITEM'; equipmentId: string }
  | { type: 'TOGGLE_PET'; petId: string }
  | { type: 'LEARN_SECRET_MANUAL'; manualId: string }
  | { type: 'EXPLORE_DUNGEON'; dungeonId: string }
  | { type: 'CLAIM_ACTIVITY'; activityId: string }
  | { type: 'UPDATE_PLAYER_NAME'; name: string }
  | { type: 'UPDATE_AVATAR_STYLE'; style: string }
  | { type: 'GM_ADD_RESOURCE'; resource: 'lingshi' | 'shengwang' | 'xiuwei' | 'yearsCultivated'; amount: number }
  | { type: 'GM_ADD_ITEM'; itemType: 'pill' | 'equipment' | 'pet' | 'secretManual' | 'manual'; itemId: string }
  | { type: 'GM_UNLOCK_ALL_DUNGEONS' }
  | { type: 'GM_COMPLETE_ACTIVITY'; activityId: string }
  | { type: 'UPGRADE_CAVE'; cost: number }
  | { type: 'BUILD_CAVE_FEATURE'; feature: 'spiritField' | 'alchemyRoom' | 'refiningForge' | 'gatheringArray' | 'beastPen' }
  | { type: 'CULTIVATE_SPIRIT_FIELD'; reward: { lingshi: number; herbs: string[] } }
  | { type: 'ALCHEMY_PILL'; recipeId: string }
  | { type: 'REFINING_EQUIPMENT'; recipeId: string }
  | { type: 'FEED_PET'; petId: string; foodType: string }
  | { type: 'EVOLVE_PET'; petId: string };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'TICK':
      return computeDerived(tick(state, action.nowMs));
    case 'BREAKTHROUGH':
      return computeDerived(doBreakthrough(state));
    case 'RESET':
      return computeDerived(defaultState());
    case 'IMPORT_SAVE': {
      const imported = importSaveString(action.saveText);
      if (!imported) return computeDerived({ ...state, logs: pushLog(state, '存档格式不正确，导入失败。') });

      // 导入后立即重新计算派生属性，并留一条提示。
      const withLog: GameState = {
        ...imported,
        logs: pushLog(imported, '你已导入存档。')
      };
      return computeDerived(withLog);
    }
    case 'CLAIM_STARTER': {
      const next = { ...state };
      // 避免重复领取：给一个简单的“领过”标记（用日志检查）。
      if (next.logs.some((l) => l.text.includes('新手补给'))) return state;
      next.lingshi += 5000;
      next.shengwang += 20;
      next.inventory = mergeItem(next.inventory, {
        id: 'spirit-stone',
        name: '灵石碎晶',
        desc: '可以当作灵石使用的碎晶。',
        count: 12
      });
      next.inventory = mergeItem(next.inventory, {
        id: 'herb-1',
        name: '凝气草',
        desc: '常见灵草，炼丹常用材料。',
        count: 6
      });
      next.logs = pushLog(next, '你领取了新手补给，行囊稍显充实。');
      return computeDerived(next);
    }
    case 'REROLL_ROOT':
      return computeDerived(rerollRoot(state));
    case 'LEARN_MANUAL':
      return computeDerived(learnManual(state, action.manualId));
    case 'ADVENTURE':
      return computeDerived(doAdventure(state));
    case 'USE_PILL': {
      const pill = state.pills.find(p => p.id === action.pillId);
      if (!pill || pill.count <= 0) return state;
      
      const next = { ...state };
      const pillIndex = next.pills.findIndex(p => p.id === action.pillId);
      next.pills[pillIndex] = { ...pill, count: pill.count - 1 };
      
      // 应用丹药效果
      switch (pill.effectType) {
        case 'xiuwei':
          next.xiuwei += pill.effectValue;
          next.logs = pushLog(next, `使用了${pill.name}，修为+${pill.effectValue}`);
          break;
        case 'efficiency':
          // 临时效果，这里简化处理
          next.logs = pushLog(next, `使用了${pill.name}，修炼效率临时提升`);
          break;
        case 'root':
          next.logs = pushLog(next, `使用了${pill.name}，灵根品质提升`);
          // 这里可以添加灵根提升逻辑
          break;
        case 'breakthrough':
          next.logs = pushLog(next, `使用了${pill.name}，突破成功率提升`);
          // 这里可以添加突破加成逻辑
          break;
      }
      
      return computeDerived(next);
    }
    case 'EQUIP_ITEM': {
      const equipment = state.equipment.find(e => e.id === action.equipmentId);
      if (!equipment || equipment.equipped) return state;
      
      const next = { ...state };
      
      // 先卸下同类型的装备
      next.equipment = next.equipment.map(item => {
        if (item.type === equipment.type && item.equipped) {
          return { ...item, equipped: false };
        }
        if (item.id === action.equipmentId) {
          return { ...item, equipped: true };
        }
        return item;
      });
      
      // 更新当前装备
      next.equippedItems = { ...next.equippedItems };
      if (equipment.type === 'weapon') next.equippedItems.weapon = equipment.id;
      if (equipment.type === 'armor') next.equippedItems.armor = equipment.id;
      if (equipment.type === 'accessory') next.equippedItems.accessory = equipment.id;
      if (equipment.type === 'ring') next.equippedItems.ring = equipment.id;
      if (equipment.type === 'necklace') next.equippedItems.necklace = equipment.id;
      
      next.logs = pushLog(next, `装备了${equipment.name}`);
      return computeDerived(next);
    }
    case 'TOGGLE_PET': {
      const pet = state.pets.find(p => p.id === action.petId);
      if (!pet) return state;
      
      const next = { ...state };
      const petIndex = next.pets.findIndex(p => p.id === action.petId);
      next.pets[petIndex] = { ...pet, active: !pet.active };
      
      // 如果激活宠物，设置为当前活动宠物
      if (!pet.active) {
        next.activePet = pet.id;
      } else {
        next.activePet = undefined;
      }
      
      next.logs = pushLog(next, pet.active ? `${pet.name}开始休息` : `激活了${pet.name}`);
      return computeDerived(next);
    }
    case 'LEARN_SECRET_MANUAL': {
      const manual = state.secretManuals.find(m => m.id === action.manualId);
      if (!manual || manual.learned) return state;
      
      const next = { ...state };
      const manualIndex = next.secretManuals.findIndex(m => m.id === action.manualId);
      next.secretManuals[manualIndex] = { ...manual, learned: true, count: manual.count - 1 };
      
      next.logs = pushLog(next, `学会了${manual.name}：${manual.effect}`);
      return computeDerived(next);
    }
    case 'EXPLORE_DUNGEON': {
      const dungeon = state.dungeons.find(d => d.id === action.dungeonId);
      if (!dungeon || !dungeon.unlocked) return state;
      
      const next = { ...state };
      
      // 检查资源
      if (next.yearsCultivated < dungeon.cost.yearsCultivated || 
          (dungeon.cost.lingshi && next.lingshi < dungeon.cost.lingshi)) {
        next.logs = pushLog(next, '资源不足，无法探索该副本');
        return computeDerived(next);
      }
      
      // 扣除消耗
      next.yearsCultivated -= dungeon.cost.yearsCultivated;
      if (dungeon.cost.lingshi) {
        next.lingshi -= dungeon.cost.lingshi;
      }
      
      // 给予奖励
      next.lingshi += dungeon.rewards.lingshi;
      next.shengwang += dungeon.rewards.shengwang;
      next.yearsCultivated += 10 * dungeon.rewards.expRate; // 额外修炼年
      
      // 更新通关次数
      const dungeonIndex = next.dungeons.findIndex(d => d.id === action.dungeonId);
      next.dungeons[dungeonIndex] = { ...dungeon, clearCount: dungeon.clearCount + 1 };
      
      // 随机解锁新副本
      if (dungeon.clearCount + 1 >= 3 && dungeonIndex < next.dungeons.length - 1) {
        next.dungeons[dungeonIndex + 1] = { ...next.dungeons[dungeonIndex + 1], unlocked: true };
      }
      
      next.logs = pushLog(next, `探索${dungeon.name}成功！获得${dungeon.rewards.lingshi}灵石和${dungeon.rewards.shengwang}声望`);
      return computeDerived(next);
    }
    case 'CLAIM_ACTIVITY': {
      const activity = state.activities.find(a => a.id === action.activityId);
      if (!activity || !activity.completed || activity.claimed) return state;
      
      const now = Date.now();
      if (activity.type === 'limited' && activity.endTime <= now) return state;
      
      const next = { ...state };
      const activityIndex = next.activities.findIndex(a => a.id === action.activityId);
      next.activities[activityIndex] = { ...activity, claimed: true };
      
      // 给予奖励
      if (activity.rewards.lingshi) next.lingshi += activity.rewards.lingshi;
      if (activity.rewards.shengwang) next.shengwang += activity.rewards.shengwang;
      
      next.logs = pushLog(next, `领取了活动${activity.name}的奖励`);
      return computeDerived(next);
    }
    case 'UPDATE_PLAYER_NAME': {
      const next = { ...state, playerName: action.name };
      next.logs = pushLog(next, `你改名为「${action.name}」`);
      return computeDerived(next);
    }
    case 'UPDATE_AVATAR_STYLE': {
      const next = { ...state, avatarStyle: action.style };
      next.logs = pushLog(next, `更换了头像风格`);
      return computeDerived(next);
    }
    case 'GM_ADD_RESOURCE': {
      const next = { ...state };
      const resourceNames = {
        lingshi: '灵石',
        shengwang: '声望',
        xiuwei: '修为',
        yearsCultivated: '修炼年'
      };
      next[action.resource] = (next[action.resource] as number) + action.amount;
      next.logs = pushLog(next, `[GM] 获得了${action.amount} ${resourceNames[action.resource]}`);
      return computeDerived(next);
    }
    case 'GM_ADD_ITEM': {
      const next = { ...state };
      const itemNames = {
        pill: '丹药',
        equipment: '装备',
        pet: '宠物',
        secretManual: '秘籍',
        manual: '功法'
      };
      // 这里简化处理，实际应该根据itemType添加对应物品
      next.logs = pushLog(next, `[GM] 获得了${itemNames[action.itemType]}`);
      return computeDerived(next);
    }
    case 'GM_UNLOCK_ALL_DUNGEONS': {
      const next = { ...state };
      next.dungeons = next.dungeons.map(d => ({ ...d, unlocked: true }));
      next.logs = pushLog(next, '[GM] 解锁了所有副本');
      return computeDerived(next);
    }
    case 'UPGRADE_CAVE': {
      if (state.lingshi < action.cost) return pushLog(state, '灵石不足，无法升级洞府');
      
      const next = { ...state };
      next.lingshi -= action.cost;
      next.cave = {
        ...next.cave,
        level: next.cave.level + 1,
        efficiencyBonus: 1.03 + (next.cave.level + 1) * 0.02
      };
      next.logs = pushLog(next, `洞府升级至${next.cave.level}级！`);
      return computeDerived(next);
    }
    case 'BUILD_CAVE_FEATURE': {
      const featureCosts = {
        spiritField: [2000, 5000, 12000, 28000, 65000, 150000],
        alchemyRoom: [3000, 8000, 20000, 48000, 110000, 250000],
        refiningForge: [4000, 10000, 25000, 60000, 140000, 320000],
        gatheringArray: [5000, 12000, 30000, 72000, 170000, 400000],
        beastPen: [2500, 6000, 15000, 36000, 85000, 200000]
      };
      
      const currentLevel = state.cave.features[action.feature];
      const cost = featureCosts[action.feature][currentLevel];
      
      if (state.lingshi < cost) return pushLog(state, '灵石不足，无法建造/升级');
      
      const next = { ...state };
      next.lingshi -= cost;
      next.cave = {
        ...next.cave,
        features: {
          ...next.cave.features,
          [action.feature]: currentLevel + 1
        }
      };
      
      const featureNames = {
        spiritField: '灵田',
        alchemyRoom: '炼丹房',
        refiningForge: '炼器炉',
        gatheringArray: '聚灵阵',
        beastPen: '灵兽圈'
      };
      next.logs = pushLog(next, `${featureNames[action.feature]}升级至${currentLevel + 2}级！`);
      return computeDerived(next);
    }
    case 'CULTIVATE_SPIRIT_FIELD': {
      const next = { ...state };
      next.lingshi += action.reward.lingshi;
      next.cave.lastHarvest = Date.now();
      next.inventory = mergeItem(next.inventory, {
        id: 'spirit-herb',
        name: '灵田药材',
        desc: '从灵田收获的新鲜药材',
        count: 5
      });
      next.logs = pushLog(next, '从灵田收获了一批药材和灵石');
      return computeDerived(next);
    }
    case 'ALCHEMY_PILL': {
      const next = { ...state };
      // 简化处理，直接添加丹药
      next.pills = mergePill(next.pills, {
        id: 'advanced-qi-gathering',
        name: '高级聚气丹',
        desc: '经过精炼的优质聚气丹',
        effect: '立即获得3000修为',
        effectType: 'xiuwei',
        effectValue: 3000,
        count: 2
      });
      next.logs = pushLog(next, '炼制成功，获得了2枚高级聚气丹');
      return computeDerived(next);
    }
    case 'REFINING_EQUIPMENT': {
      const next = { ...state };
      // 简化处理，直接添加装备
      next.equipment.push({
        id: 'refined-legendary-sword',
        name: '传说仙剑',
        desc: '经过千锤百炼的传说级仙剑',
        type: 'weapon',
        quality: 'legendary',
        level: 10,
        stats: {
          efficiencyBonus: 0.3,
          xiuweiBonus: 0.15
        },
        equipped: false,
        count: 1
      });
      next.logs = pushLog(next, '锻造成功，获得了传说级仙剑');
      return computeDerived(next);
    }
    case 'FEED_PET': {
      const next = { ...state };
      const petIndex = next.pets.findIndex(p => p.id === action.petId);
      if (petIndex !== -1) {
        next.pets[petIndex] = {
          ...next.pets[petIndex],
          exp: next.pets[petIndex].exp + 100
        };
        next.logs = pushLog(next, `喂养宠物成功，经验+100`);
      }
      return computeDerived(next);
    }
    case 'EVOLVE_PET': {
      const next = { ...state };
      const petIndex = next.pets.findIndex(p => p.id === action.petId);
      if (petIndex !== -1) {
        next.pets[petIndex] = {
          ...next.pets[petIndex],
          evolution: next.pets[petIndex].evolution + 1,
          bonus: {
            efficiencyBonus: next.pets[petIndex].bonus.efficiencyBonus + 0.02,
            adventureBonus: next.pets[petIndex].bonus.adventureBonus + 0.03
          }
        };
        next.logs = pushLog(next, `${next.pets[petIndex].name}进化成功！`);
      }
      return computeDerived(next);
    }
    default:
      return state;
  }
}

function pushLog(state: GameState, text: string) {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const line = { id, atMs: Date.now(), text };
  const logs = [...state.logs, line];
  return logs.slice(-80);
}

function mergeItem(inv: GameState['inventory'], item: GameState['inventory'][number]) {
  const idx = inv.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...inv, item];
  const next = inv.slice();
  next[idx] = { ...next[idx], count: next[idx].count + item.count };
  return next;
}

function mergePill(pills: GameState['pills'], newPill: GameState['pills'][number]) {
  const idx = pills.findIndex((x) => x.id === newPill.id);
  if (idx === -1) return [...pills, newPill];
  const next = pills.slice();
  next[idx] = { ...next[idx], count: next[idx].count + newPill.count };
  return next;
}
