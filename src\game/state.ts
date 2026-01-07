export type Realm = {
  id: string;
  name: string;
  needXiuwei: number;
};

export type Root = {
  id: string;
  name: string;
  efficiencyBonus: number; // 1.00 = 无加成
};

export type Manual = {
  id: string;
  name: string;
  desc: string;
  learned: boolean;
  efficiencyBonus: number;
  costLingshi: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  desc: string;
  count: number;
};

export type LogLine = {
  id: string;
  atMs: number;
  text: string;
};

export type Derived = {
  efficiency: number;
  basePerTick: number;
  gainPerTick: number;
};

export type Cave = {
  level: number;
  efficiencyBonus: number;
  features: {
    spiritField: number; // 灵田等级 0-5
    alchemyRoom: number; // 炼丹房等级 0-5
    refiningForge: number; // 炼器炉等级 0-5
    gatheringArray: number; // 聚灵阵等级 0-5
    beastPen: number; // 灵兽圈等级 0-5
  };
  lastHarvest: number; // 上次收获时间
};

// 丹药系统
export type Pill = {
  id: string;
  name: string;
  desc: string;
  effect: string; // 效果描述
  effectType: 'xiuwei' | 'efficiency' | 'root' | 'breakthrough';
  effectValue: number;
  duration?: number; // 持续时间（毫秒）
  count: number;
};

// 装备系统
export type Equipment = {
  id: string;
  name: string;
  desc: string;
  type: 'weapon' | 'armor' | 'accessory' | 'ring' | 'necklace';
  quality: 'common' | 'rare' | 'epic' | 'legendary';
  level: number;
  stats: {
    xiuweiBonus?: number;
    efficiencyBonus?: number;
    breakthroughBonus?: number;
  };
  equipped: boolean;
  count: number;
};

// 宠物系统
export type Pet = {
  id: string;
  name: string;
  desc: string;
  species: string; // 物种
  level: number;
  exp: number;
  evolution: number; // 进化阶段
  skills: string[]; // 技能列表
  bonus: {
    efficiencyBonus: number;
    adventureBonus: number;
  };
  active: boolean; // 是否激活
};

// 秘籍系统
export type SecretManual = {
  id: string;
  name: string;
  desc: string;
  category: 'combat' | 'alchemy' | 'refining' | 'formation' | 'cultivation';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  learned: boolean;
  effect: string;
  requirements?: string[];
  count: number;
};

// 活动系统
export type Activity = {
  id: string;
  name: string;
  desc: string;
  type: 'limited' | 'daily' | 'weekly' | 'special';
  startTime: number;
  endTime: number;
  rewards: {
    lingshi?: number;
    shengwang?: number;
    items?: string[];
  };
  completed: boolean;
  claimed: boolean;
};

// 历练副本
export type Dungeon = {
  id: string;
  name: string;
  desc: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
  cost: {
    yearsCultivated: number;
    lingshi?: number;
  };
  rewards: {
    lingshi: number;
    shengwang: number;
    expRate: number;
    items?: string[];
  };
  unlocked: boolean;
  clearCount: number;
};

export type GameState = {
  saveVersion: number;

  // 资源
  lingshi: number;
  shengwang: number;
  yearsCultivated: number;

  // 玩家信息
  playerName: string;
  avatarStyle: string;

  // 修炼
  xiuwei: number;
  lastTickAtMs: number;

  // 境界
  realms: Realm[];
  realmIndex: number;

  // 灵根
  roots: Root[];
  rootIndex: number;
  rootRerollCost: number;

  // 功法
  manuals: Manual[];

  // 洞府
  cave: Cave;

  // 背包
  inventory: InventoryItem[];

  // 丹药
  pills: Pill[];

  // 装备
  equipment: Equipment[];

  // 宠物
  pets: Pet[];

  // 秘籍
  secretManuals: SecretManual[];

  // 活动
  activities: Activity[];

  // 历练副本
  dungeons: Dungeon[];

  // 当前活动宠物
  activePet?: string;

  // 当前装备
  equippedItems: {
    weapon?: string;
    armor?: string;
    accessory?: string;
    ring?: string;
    necklace?: string;
  };

  // 日志
  logs: LogLine[];

  derived: Derived;
};

export function defaultState(nowMs = Date.now()): GameState {
  return {
    saveVersion: 2,

    lingshi: 1200,
    shengwang: 0,
    yearsCultivated: 0,

    playerName: '某位道友',
    avatarStyle: 'default',

    xiuwei: 0,
    lastTickAtMs: nowMs,

    realms: [
      // 炼气期 - 9层小境界
      { id: 'qi1', name: '炼气·一层', needXiuwei: 0 },
      { id: 'qi2', name: '炼气·二层', needXiuwei: 800 },
      { id: 'qi3', name: '炼气·三层', needXiuwei: 2000 },
      { id: 'qi4', name: '炼气·四层', needXiuwei: 3500 },
      { id: 'qi5', name: '炼气·五层', needXiuwei: 5500 },
      { id: 'qi6', name: '炼气·六层', needXiuwei: 8000 },
      { id: 'qi7', name: '炼气·七层', needXiuwei: 11000 },
      { id: 'qi8', name: '炼气·八层', needXiuwei: 15000 },
      { id: 'qi9', name: '炼气·九层', needXiuwei: 20000 },
      
      // 筑基期 - 9层小境界
      { id: 'zhuji1', name: '筑基·初期', needXiuwei: 28000 },
      { id: 'zhuji2', name: '筑基·二层', needXiuwei: 38000 },
      { id: 'zhuji3', name: '筑基·三层', needXiuwei: 50000 },
      { id: 'zhuji4', name: '筑基·中期', needXiuwei: 65000 },
      { id: 'zhuji5', name: '筑基·五层', needXiuwei: 82000 },
      { id: 'zhuji6', name: '筑基·六层', needXiuwei: 102000 },
      { id: 'zhuji7', name: '筑基·七层', needXiuwei: 125000 },
      { id: 'zhuji8', name: '筑基·八层', needXiuwei: 151000 },
      { id: 'zhuji9', name: '筑基·后期', needXiuwei: 180000 },
      
      // 金丹期 - 9层小境界
      { id: 'jindan1', name: '金丹·初期', needXiuwei: 220000 },
      { id: 'jindan2', name: '金丹·二层', needXiuwei: 270000 },
      { id: 'jindan3', name: '金丹·三层', needXiuwei: 330000 },
      { id: 'jindan4', name: '金丹·中期', needXiuwei: 400000 },
      { id: 'jindan5', name: '金丹·五层', needXiuwei: 480000 },
      { id: 'jindan6', name: '金丹·六层', needXiuwei: 570000 },
      { id: 'jindan7', name: '金丹·七层', needXiuwei: 670000 },
      { id: 'jindan8', name: '金丹·八层', needXiuwei: 780000 },
      { id: 'jindan9', name: '金丹·大圆满', needXiuwei: 900000 },
      
      // 元婴期 - 9层小境界
      { id: 'yuanying1', name: '元婴·初期', needXiuwei: 1100000 },
      { id: 'yuanying2', name: '元婴·二层', needXiuwei: 1350000 },
      { id: 'yuanying3', name: '元婴·三层', needXiuwei: 1650000 },
      { id: 'yuanying4', name: '元婴·中期', needXiuwei: 2000000 },
      { id: 'yuanying5', name: '元婴·五层', needXiuwei: 2400000 },
      { id: 'yuanying6', name: '元婴·六层', needXiuwei: 2850000 },
      { id: 'yuanying7', name: '元婴·七层', needXiuwei: 3350000 },
      { id: 'yuanying8', name: '元婴·八层', needXiuwei: 3900000 },
      { id: 'yuanying9', name: '元婴·大圆满', needXiuwei: 4500000 },
      
      // 化神期 - 9层小境界
      { id: 'huashen1', name: '化神·初期', needXiuwei: 5500000 },
      { id: 'huashen2', name: '化神·二层', needXiuwei: 6600000 },
      { id: 'huashen3', name: '化神·三层', needXiuwei: 7800000 },
      { id: 'huashen4', name: '化神·中期', needXiuwei: 9100000 },
      { id: 'huashen5', name: '化神·五层', needXiuwei: 10500000 },
      { id: 'huashen6', name: '化神·六层', needXiuwei: 12000000 },
      { id: 'huashen7', name: '化神·七层', needXiuwei: 13600000 },
      { id: 'huashen8', name: '化神·八层', needXiuwei: 15300000 },
      { id: 'huashen9', name: '化神·大圆满', needXiuwei: 17100000 },
      
      // 更高境界
      { id: 'lianxu', name: '炼虚期', needXiuwei: 20000000 },
      { id: 'heti', name: '合体期', needXiuwei: 28000000 },
      { id: 'dacheng', name: '大乘期', needXiuwei: 40000000 },
      { id: 'dujie', name: '渡劫期', needXiuwei: 60000000 },
      { id: 'tianxian', name: '天仙', needXiuwei: 100000000 },
      { id: 'xianzun', name: '仙尊', needXiuwei: 200000000 },
      { id: 'xianhuang', name: '仙皇', needXiuwei: 500000000 }
    ],
    realmIndex: 0,

    roots: [
      { id: 'common', name: '凡品灵根', efficiencyBonus: 1.0 },
      { id: 'good', name: '上品灵根', efficiencyBonus: 1.15 },
      { id: 'rare', name: '异灵根', efficiencyBonus: 1.35 },
      { id: 'heaven', name: '天灵根', efficiencyBonus: 1.65 }
    ],
    rootIndex: 0,
    rootRerollCost: 800,

    manuals: [
      {
        id: 'breath-1',
        name: '《清心吐纳诀》',
        desc: '入门吐纳，心如止水。',
        learned: true,
        efficiencyBonus: 1.05,
        costLingshi: 0
      },
      {
        id: 'breath-2',
        name: '《玄元引气篇》',
        desc: '引灵入体，周天自转。',
        learned: false,
        efficiencyBonus: 1.12,
        costLingshi: 2400
      },
      {
        id: 'breath-3',
        name: '《星河归一法》',
        desc: '以星为引，气机如潮。',
        learned: false,
        efficiencyBonus: 1.22,
        costLingshi: 8000
      },
      {
        id: 'qi-circulation',
        name: '《周天搬运功》',
        desc: '强化经脉运转，加速灵气循环',
        learned: false,
        efficiencyBonus: 1.28,
        costLingshi: 15000
      },
      {
        id: 'five-elements',
        name: '《五行调和法》',
        desc: '调和五行灵气，修炼事半功倍',
        learned: false,
        efficiencyBonus: 1.35,
        costLingshi: 25000
      },
      {
        id: 'golden-core',
        name: '《金丹大道》',
        desc: '结丹期的核心修炼法门',
        learned: false,
        efficiencyBonus: 1.45,
        costLingshi: 50000
      },
      {
        id: 'yuan-ying',
        name: '《元婴真诀》',
        desc: '孕育元婴的无上心法',
        learned: false,
        efficiencyBonus: 1.55,
        costLingshi: 100000
      },
      {
        id: 'spirit-transformation',
        name: '《化神玄法》',
        desc: '化神期的顶级修炼功法',
        learned: false,
        efficiencyBonus: 1.68,
        costLingshi: 200000
      },
      {
        id: 'void-void',
        name: '《太虚诀》',
        desc: '传说中的至高功法，触及大道本源',
        learned: false,
        efficiencyBonus: 1.85,
        costLingshi: 500000
      },
      {
        id: 'immortal-path',
        name: '《仙道真经》',
        desc: '通往仙门的终极法诀',
        learned: false,
        efficiencyBonus: 2.0,
        costLingshi: 1000000
      }
    ],

    cave: {
      level: 1,
      efficiencyBonus: 1.03,
      features: {
        spiritField: 0,
        alchemyRoom: 0,
        refiningForge: 0,
        gatheringArray: 0,
        beastPen: 0
      },
      lastHarvest: nowMs
    },

    inventory: [],

    // 初始丹药
    pills: [
      {
        id: 'qi-gathering',
        name: '聚气丹',
        desc: '提升修为的基础丹药',
        effect: '立即获得1000修为',
        effectType: 'xiuwei',
        effectValue: 1000,
        count: 5
      },
      {
        id: 'cultivation-boost',
        name: '修炼散',
        desc: '临时提升修炼效率',
        effect: '修炼效率+20%，持续10分钟',
        effectType: 'efficiency',
        effectValue: 0.2,
        duration: 600000,
        count: 3
      },
      {
        id: 'breakthrough-pill',
        name: '突破丹',
        desc: '大幅提升突破成功率',
        effect: '突破成功率+30%',
        effectType: 'breakthrough',
        effectValue: 0.3,
        count: 2
      },
      {
        id: 'spirit-essence',
        name: '灵髓丸',
        desc: '顶级修炼丹药，蕴含精纯灵气',
        effect: '立即获得5000修为',
        effectType: 'xiuwei',
        effectValue: 5000,
        count: 1
      },
      {
        id: 'root-nourishing',
        name: '养根丹',
        desc: '滋养灵根，小幅提升灵根品质',
        effect: '灵根品质提升',
        effectType: 'root',
        effectValue: 1,
        count: 2
      }
    ],

    // 初始装备
    equipment: [
      {
        id: 'beginner-sword',
        name: '新手长剑',
        desc: '初学者使用的普通长剑',
        type: 'weapon',
        quality: 'common',
        level: 1,
        stats: {
          efficiencyBonus: 0.05
        },
        equipped: true,
        count: 1
      },
      {
        id: 'beginner-robe',
        name: '布衣长袍',
        desc: '简单的修行长袍',
        type: 'armor',
        quality: 'common',
        level: 1,
        stats: {
          xiuweiBonus: 0.02
        },
        equipped: true,
        count: 1
      },
      {
        id: 'spirit-ring',
        name: '灵玉指环',
        desc: '蕴含灵气的精美指环',
        type: 'ring',
        quality: 'rare',
        level: 5,
        stats: {
          efficiencyBonus: 0.12,
          xiuweiBonus: 0.05
        },
        equipped: false,
        count: 1
      },
      {
        id: 'protective-necklace',
        name: '护身符项链',
        desc: '刻有防护符文的护身符',
        type: 'necklace',
        quality: 'rare',
        level: 3,
        stats: {
          breakthroughBonus: 0.15
        },
        equipped: false,
        count: 1
      }
    ],

    // 初始宠物
    pets: [
      {
        id: 'spirit-cat',
        name: '灵猫',
        desc: '通人性的灵兽，能帮助主人修炼',
        species: '灵兽',
        level: 1,
        exp: 0,
        evolution: 0,
        skills: ['灵气感知'],
        bonus: {
          efficiencyBonus: 0.08,
          adventureBonus: 0.1
        },
        active: true
      },
      {
        id: 'fire-sparrow',
        name: '火雀',
        desc: '能操控火焰的小型灵鸟',
        species: '灵禽',
        level: 1,
        exp: 0,
        evolution: 0,
        skills: ['火焰喷发'],
        bonus: {
          efficiencyBonus: 0.06,
          adventureBonus: 0.15
        },
        active: false
      },
      {
        id: 'water-turtle',
        name: '玄水龟',
        desc: '防御力强大的灵兽',
        species: '灵兽',
        level: 1,
        exp: 0,
        evolution: 0,
        skills: ['水盾', '防御强化'],
        bonus: {
          efficiencyBonus: 0.05,
          adventureBonus: 0.08
        },
        active: false
      }
    ],

    // 初始秘籍
    secretManuals: [
      {
        id: 'basic-alchemy',
        name: '《基础炼丹术》',
        desc: '炼制基础丹药的入门秘籍',
        category: 'alchemy',
        rarity: 'common',
        learned: false,
        effect: '解锁基础丹药炼制',
        requirements: ['炼气·三层'],
        count: 1
      },
      {
        id: 'sword-arts',
        name: '《基础剑诀》',
        desc: '修真界最基础的剑法修炼',
        category: 'combat',
        rarity: 'common',
        learned: false,
        effect: '战斗力+10%',
        requirements: ['炼气·二层'],
        count: 1
      },
      {
        id: 'advanced-sword-arts',
        name: '《流云剑法》',
        desc: '进阶剑法，剑如流云，变幻莫测',
        category: 'combat',
        rarity: 'rare',
        learned: false,
        effect: '战斗力+25%，历练加成+15%',
        requirements: ['筑基·初期'],
        count: 1
      },
      {
        id: 'formation-basics',
        name: '《阵法入门》',
        desc: '基础阵法布置与破解',
        category: 'formation',
        rarity: 'rare',
        learned: false,
        effect: '副本成功率+20%',
        requirements: ['炼气·五层'],
        count: 1
      },
      {
        id: 'refining-secrets',
        name: '《炼器秘要》',
        desc: '炼器师的秘密心得',
        category: 'refining',
        rarity: 'epic',
        learned: false,
        effect: '解锁高级装备炼制',
        requirements: ['金丹·初期'],
        count: 1
      },
      {
        id: 'cultivation-insights',
        name: '《修炼心得》',
        desc: '前辈高手的修炼经验总结',
        category: 'cultivation',
        rarity: 'legendary',
        learned: false,
        effect: '修炼效率+30%，突破成功率+20%',
        requirements: ['元婴·初期'],
        count: 1
      }
    ],

    // 初始活动
    activities: [
      {
        id: 'double-xiuwei',
        name: '双倍修炼',
        desc: '限时活动：修炼效率翻倍',
        type: 'limited',
        startTime: nowMs,
        endTime: nowMs + 24 * 60 * 60 * 1000, // 24小时
        rewards: {
          lingshi: 500
        },
        completed: false,
        claimed: false
      }
    ],

    // 初始历练副本
    dungeons: [
      {
        id: 'spirit-beast-forest',
        name: '灵兽森林',
        desc: '栖息着各种灵兽的神秘森林',
        difficulty: 'easy',
        cost: {
          yearsCultivated: 10,
          lingshi: 100
        },
        rewards: {
          lingshi: 200,
          shengwang: 50,
          expRate: 1.2,
          items: ['spirit-beast-core', 'herb-common']
        },
        unlocked: true,
        clearCount: 0
      },
      {
        id: 'ancient-ruins',
        name: '上古遗迹',
        desc: '埋藏着上古修士传承的遗迹',
        difficulty: 'normal',
        cost: {
          yearsCultivated: 30,
          lingshi: 500
        },
        rewards: {
          lingshi: 800,
          shengwang: 200,
          expRate: 1.5,
          items: ['ancient-scroll', 'spirit-ore']
        },
        unlocked: false,
        clearCount: 0
      },
      {
        id: 'demon-lair',
        name: '妖魔洞府',
        desc: '强大的妖魔盘踞的险地',
        difficulty: 'hard',
        cost: {
          yearsCultivated: 60,
          lingshi: 1500
        },
        rewards: {
          lingshi: 2000,
          shengwang: 600,
          expRate: 2.0,
          items: ['demon-core', 'rare-herb']
        },
        unlocked: false,
        clearCount: 0
      },
      {
        id: 'celestial-pavilion',
        name: '天机阁',
        desc: '藏有天机秘宝的神秘楼阁',
        difficulty: 'nightmare',
        cost: {
          yearsCultivated: 120,
          lingshi: 5000
        },
        rewards: {
          lingshi: 8000,
          shengwang: 2500,
          expRate: 3.0,
          items: ['celestial-fragment', 'legendary-equip']
        },
        unlocked: false,
        clearCount: 0
      },
      {
        id: 'underworld-palace',
        name: '九幽魔殿',
        desc: '魔道至强者的大本营',
        difficulty: 'nightmare',
        cost: {
          yearsCultivated: 200,
          lingshi: 10000
        },
        rewards: {
          lingshi: 15000,
          shengwang: 5000,
          expRate: 4.0,
          items: ['infernal-core', 'divine-recipe']
        },
        unlocked: false,
        clearCount: 0
      }
    ],

    // 当前装备
    equippedItems: {
      weapon: 'beginner-sword',
      armor: 'beginner-robe'
    },

    activePet: 'spirit-cat',

    logs: [
      {
        id: 'start',
        atMs: nowMs,
        text: '你盘膝入定，开始了新的修行旅途。'
      },
      {
        id: 'pet',
        atMs: nowMs,
        text: '一只灵猫主动靠近，似乎想与你同行。'
      },
      {
        id: 'equipment',
        atMs: nowMs,
        text: '你获得了新手装备，虽然朴素但实用。'
      }
    ],

    derived: {
      efficiency: 1,
      basePerTick: 20,
      gainPerTick: 20
    }
  };
}
