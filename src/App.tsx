import React, { useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { formatInt, formatWan } from './game/format';
import { defaultState, type GameState } from './game/state';
import { gameReducer, type GameAction } from './game/reducer';
import { applyOfflineProgress, computeDerived } from './game/logic';
import { exportSaveString, loadSave, saveToLocalStorage } from './game/persist';

type TabKey = '修炼' | '储物' | '灵根' | '功法' | '洞府' | '仙缘' | '丹药' | '装备' | '宠物' | '秘籍' | '历练' | '活动' | '设置';

export function App() {
  const [tab, setTab] = useState<TabKey>('修炼');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [gmCode, setGmCode] = useState('');
  const [gmActivated, setGmActivated] = useState(false);

  const initial = useMemo(() => {
    const loaded = loadSave();
    const base = loaded ?? defaultState();
    const derived = computeDerived(base);
    const withOffline = applyOfflineProgress(derived);
    return computeDerived(withOffline);
  }, []);

  const [state, dispatch] = useReducer<React.Reducer<GameState, GameAction>>(gameReducer, initial);

  // 优化的倒计时更新
  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now());
    const interval = setInterval(updateTime, 100); // 每100ms更新一次，更流畅
    return () => clearInterval(interval);
  }, []);

  const countdown = useMemo(() => {
    const remaining = Math.max(0, 5000 - (currentTime - state.lastTickAtMs));
    return remaining / 1000;
  }, [currentTime, state.lastTickAtMs]);

  // 游戏主循环：优化时钟更新，减少跳动
  useEffect(() => {
    let lastUpdate = Date.now();
    let renderFrameId: number;
    
    const gameLoop = () => {
      const now = Date.now();
      // 每5秒检查一次是否需要更新游戏状态
      if (now - state.lastTickAtMs >= 5000) {
        dispatch({ type: 'TICK', nowMs: now });
        lastUpdate = now;
      }
      renderFrameId = requestAnimationFrame(gameLoop);
    };
    
    renderFrameId = requestAnimationFrame(gameLoop);
    
    return () => {
      if (renderFrameId) {
        cancelAnimationFrame(renderFrameId);
      }
    };
  }, [state.lastTickAtMs]);

  // 自动存档：节流写入。
  useEffect(() => {
    saveToLocalStorage(state);
  }, [state]);

  const realm = state.realms[state.realmIndex];
  const nextRealm = state.realms[state.realmIndex + 1];
  const pct = nextRealm
    ? Math.max(0, Math.min(1, state.xiuwei / nextRealm.needXiuwei))
    : 1;

  return (
    <div className="container">
      <div className="topbar">
        <div 
          className="avatar" 
          aria-hidden 
          style={{ background: getAvatarStyle(state.avatarStyle) }}
        />
        <div className="identity">
          <div className="titleRow">
            <div className="name" style={{ cursor: 'pointer' }} onClick={() => setShowNameEdit(true)}>
              {state.playerName} ✏️
            </div>
            <div className="realm">{realm.name}</div>
          </div>
          <div className="chips">
            <div className="chip">
              <div className="chipLabel">灵石</div>
              <div className="chipValue">{formatWan(state.lingshi)}</div>
            </div>
            <div className="chip">
              <div className="chipLabel">声望</div>
              <div className="chipValue">{formatWan(state.shengwang)}</div>
            </div>
            <div className="chip">
              <div className="chipLabel">修炼年</div>
              <div className="chipValue">{formatInt(Math.floor(state.yearsCultivated))}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="main">
        {tab === '修炼' && (
          <>
            <div className="panel progressPanel">
              <div className="row">
                <div>
                  <div style={{ fontWeight: 800 }}>修为</div>
                  <div className="muted">
                    当前：<span className="kbd">{formatWan(state.xiuwei)}</span>
                    {nextRealm ? (
                      <>
                        {' '}
                        / 突破需：<span className="kbd">{formatWan(nextRealm.needXiuwei)}</span>
                      </>
                    ) : (
                      <>（已达当前版本上限）</>
                    )}
                  </div>
                </div>
                <div className="actions">
                  <button
                    className={"btn " + (nextRealm && state.xiuwei >= nextRealm.needXiuwei ? 'btnPrimary' : '')}
                    onClick={() => {
                      if (!nextRealm) {
                        alert('暂无更高境界可突破');
                        return;
                      }
                      if (state.xiuwei < nextRealm.needXiuwei) {
                        alert(`修为不足，还需要 ${formatWan(nextRealm.needXiuwei - state.xiuwei)} 修为`);
                        return;
                      }
                      dispatch({ type: 'BREAKTHROUGH' });
                    }}
                    disabled={!nextRealm}
                    title={!nextRealm ? '暂无更高境界' : state.xiuwei >= nextRealm.needXiuwei ? '突破' : `修为不足（还需 ${formatWan(nextRealm.needXiuwei - state.xiuwei)}）`}
                  >
                    突破
                  </button>

                  <button
                    className="btn btnDanger"
                    onClick={() => {
                      if (!confirm('确定要重置存档吗？（会清空当前进度）')) return;
                      dispatch({ type: 'RESET' });
                    }}
                    title="清空本地存档"
                  >
                    重置
                  </button>
                </div>
              </div>
              <div className="progressBar" aria-hidden>
                <div className="progressFill" style={{ width: `${pct * 100}%` }} />
              </div>
              <div className="muted">
                每 5 秒结算一次修炼：基础 <span className="kbd">{formatInt(state.derived.basePerTick)}</span> × 效率{' '}
                <span className="kbd">{state.derived.efficiency.toFixed(2)}</span>
              </div>
            </div>

            <div className="centerArt">
              <div className="rune" aria-hidden>
                <div className="silhouette" />
                <div className="rune-symbols">
                  <div className="rune-symbol">灵</div>
                  <div className="rune-symbol">气</div>
                  <div className="rune-symbol">丹</div>
                  <div className="rune-symbol">法</div>
                  <div className="rune-symbol">器</div>
                  <div className="rune-symbol">符</div>
                </div>
              </div>
              <div className="centerStats">
                <div className="bigGain">修为 +{formatInt(state.derived.gainPerTick)}</div>
                <div className="muted">
                  结算倒计时：<span className={countdown <= 1 ? "kbd countdown-urgent" : "kbd"}>
                    {countdown.toFixed(1)}
                  </span>{' '}
                  秒
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }} className="panel card">
              <h3>近期见闻</h3>
              <div className="log">
                {state.logs.length === 0 ? (
                  <div className="muted">暂无记录</div>
                ) : (
                  state.logs.slice().reverse().map((l) => (
                    <div key={l.id} className="logLine">
                      [{new Date(l.atMs).toLocaleTimeString()}] {l.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {tab === '储物' && <Storage state={state} dispatch={dispatch} />}
        {tab === '灵根' && <Roots state={state} dispatch={dispatch} />}
        {tab === '功法' && <Manuals state={state} dispatch={dispatch} />}
        {tab === '洞府' && <Cave state={state} />}
        {tab === '仙缘' && <Fate state={state} dispatch={dispatch} />}
        {tab === '丹药' && <Pills state={state} dispatch={dispatch} />}
        {tab === '装备' && <Equipment state={state} dispatch={dispatch} />}
        {tab === '宠物' && <Pets state={state} dispatch={dispatch} />}
        {tab === '秘籍' && <SecretManuals state={state} dispatch={dispatch} />}
        {tab === '历练' && <Dungeons state={state} dispatch={dispatch} />}
        {tab === '活动' && <Activities state={state} dispatch={dispatch} />}
        {tab === '设置' && <Settings state={state} dispatch={dispatch} />}
      </div>

      <div className="tabs">
        {(['修炼', '储物', '灵根', '功法', '洞府', '仙缘', '丹药', '装备', '宠物', '秘籍', '历练', '活动', '设置'] as TabKey[]).map((t) => (
          <button
            key={t}
            className={"tab " + (tab === t ? 'tabActive' : '')}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 昵称编辑弹窗 */}
      {showNameEdit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="panel card" style={{ maxWidth: 400, width: '90%' }}>
            <h3>修改昵称</h3>
            <input
              type="text"
              defaultValue={state.playerName}
              maxLength={10}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--text)',
                borderRadius: 8,
                margin: '10px 0'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const newName = (e.target as HTMLInputElement).value.trim();
                  if (newName) {
                    dispatch({ type: 'UPDATE_PLAYER_NAME', name: newName });
                    setShowNameEdit(false);
                  }
                }
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="btn btnPrimary" onClick={() => {
                const input = document.querySelector('input') as HTMLInputElement;
                const newName = input.value.trim();
                if (newName) {
                  dispatch({ type: 'UPDATE_PLAYER_NAME', name: newName });
                  setShowNameEdit(false);
                }
              }}>
                确认
              </button>
              <button className="btn" onClick={() => setShowNameEdit(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 头像编辑弹窗 */}
      {showAvatarEdit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="panel card" style={{ maxWidth: 400, width: '90%' }}>
            <h3>选择头像</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '10px 0' }}>
              {['default', 'immortal', 'demon', 'beast', 'celestial', 'void'].map(style => (
                <div
                  key={style}
                  className={`avatar-option ${state.avatarStyle === style ? 'selected' : ''}`}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    border: state.avatarStyle === style ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    background: getAvatarStyle(style)
                  }}
                  onClick={() => {
                    dispatch({ type: 'UPDATE_AVATAR_STYLE', style });
                    setShowAvatarEdit(false);
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="btn" onClick={() => setShowAvatarEdit(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getAvatarStyle(style: string) {
  const styles = {
    'default': 'linear-gradient(135deg, rgba(125,211,252,0.8), rgba(246,208,122,0.6))',
    'immortal': 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(192,192,192,0.6))',
    'demon': 'linear-gradient(135deg, rgba(255,0,0,0.8), rgba(128,0,0,0.6))',
    'beast': 'linear-gradient(135deg, rgba(139,69,19,0.8), rgba(160,82,45,0.6))',
    'celestial': 'linear-gradient(135deg, rgba(255,215,0,0.8), rgba(255,165,0,0.6))',
    'void': 'linear-gradient(135deg, rgba(75,0,130,0.8), rgba(25,25,112,0.6))'
  };
  return styles[style as keyof typeof styles] || styles.default;
}

function Storage({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  return (
    <div className="panel card">
      <h3>储物袋</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        这里是最小可用雏形：先能看到物品与数量，后续我们再加装备位、材料分类、炼丹/炼器等系统。
      </div>
      <div className="list">
        {state.inventory.length === 0 ? (
          <div className="item">
            <div className="itemTitle">空空如也</div>
            <div className="itemSub">出去走走吧，也许会有仙缘。</div>
          </div>
        ) : (
          state.inventory.map((it) => (
            <div key={it.id} className="item">
              <div className="row">
                <div>
                  <div className="itemTitle">{it.name}</div>
                  <div className="itemSub">{it.desc}</div>
                </div>
                <div className="kbd">×{formatInt(it.count)}</div>
              </div>
            </div>
          ))
        )}

        <div className="item">
          <div className="row">
            <div>
              <div className="itemTitle">领取新手补给</div>
              <div className="itemSub">给你一点资源与一部入门功法，方便测试各系统。</div>
            </div>
            <button className="btn btnPrimary" onClick={() => dispatch({ type: 'CLAIM_STARTER' })}>
              领取
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Roots({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const root = state.roots[state.rootIndex];
  return (
    <div className="panel card">
      <h3>灵根</h3>
      <div className="item">
        <div className="itemTitle">当前灵根：{root.name}</div>
        <div className="itemSub">修炼效率加成：+{Math.round((root.efficiencyBonus - 1) * 100)}%</div>
      </div>
      <div className="item">
        <div className="row">
          <div>
            <div className="itemTitle">洗髓伐骨</div>
            <div className="itemSub">消耗灵石提升灵根品质（概率制）。</div>
          </div>
          <button className="btn btnPrimary" onClick={() => dispatch({ type: 'REROLL_ROOT' })}>
            洗髓（{formatWan(state.rootRerollCost)}灵石）
          </button>
        </div>
      </div>
      <div className="muted">提示：这是原创版本的简化实现，后续可以扩展五行、相克、天赋词条等。</div>
    </div>
  );
}

function Manuals({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  return (
    <div className="panel card">
      <h3>功法</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        已学功法会提供修炼效率加成。先做可玩闭环，之后再补齐门派、功法层级、参悟等。
      </div>
      <div className="list">
        {state.manuals.map((m) => (
          <div key={m.id} className="item">
            <div className="row">
              <div>
                <div className="itemTitle">{m.name}</div>
                <div className="itemSub">{m.desc}</div>
                <div className="itemSub">效率加成：+{Math.round((m.efficiencyBonus - 1) * 100)}%</div>
              </div>
              <button
                className={"btn " + (m.learned ? '' : 'btnPrimary')}
                onClick={() => dispatch({ type: 'LEARN_MANUAL', manualId: m.id })}
                disabled={m.learned}
              >
                {m.learned ? '已学' : `学习（${formatWan(m.costLingshi)}灵石）`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cave({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const upgradeCost = state.cave.level * 10000;
  const featureCosts = {
    spiritField: [2000, 5000, 12000, 28000, 65000, 150000],
    alchemyRoom: [3000, 8000, 20000, 48000, 110000, 250000],
    refiningForge: [4000, 10000, 25000, 60000, 140000, 320000],
    gatheringArray: [5000, 12000, 30000, 72000, 170000, 400000],
    beastPen: [2500, 6000, 15000, 36000, 85000, 200000]
  };

  const canHarvest = Date.now() - state.cave.lastHarvest > 60000; // 1分钟收获一次

  return (
    <div className="panel card">
      <h3>洞府</h3>
      
      <div className="item">
        <div className="itemTitle">洞府等级：{state.cave.level}</div>
        <div className="itemSub">基础加成：+{Math.round((state.cave.efficiencyBonus - 1) * 100)}% 修炼效率</div>
        <button 
          className="btn btnPrimary" 
          onClick={() => dispatch({ type: 'UPGRADE_CAVE', cost: upgradeCost })}
          disabled={state.lingshi < upgradeCost}
        >
          升级({formatWan(upgradeCost)}灵石)
        </button>
      </div>

      <h4 style={{ margin: '20px 0 10px', color: 'var(--gold)' }}>洞府建筑</h4>

      {/* 灵田 */}
      <div className="item">
        <div className="itemTitle">🌾 灵田 (等级 {state.cave.features.spiritField}/5)</div>
        <div className="itemSub">
          {state.cave.features.spiritField === 0 ? '未建造' : 
           `生产灵草和药材，效率+${state.cave.features.spiritField * 5}%`}
        </div>
        {state.cave.features.spiritField === 0 ? (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'spiritField' })}
            disabled={state.lingshi < featureCosts.spiritField[0]}
          >
            建造({formatWan(featureCosts.spiritField[0])}灵石)
          </button>
        ) : state.cave.features.spiritField < 5 ? (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'spiritField' })}
            disabled={state.lingshi < featureCosts.spiritField[state.cave.features.spiritField]}
          >
            升级 Lv.{state.cave.features.spiritField + 1}({formatWan(featureCosts.spiritField[state.cave.features.spiritField])}灵石)
          </button>
        ) : (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'CULTIVATE_SPIRIT_FIELD', reward: { lingshi: 500, herbs: ['common-herb', 'rare-herb'] } })}
            disabled={!canHarvest}
          >
            {canHarvest ? '收获' : '冷却中'}
          </button>
        )}
      </div>

      {/* 炼丹房 */}
      <div className="item">
        <div className="itemTitle">⚗️ 炼丹房 (等级 {state.cave.features.alchemyRoom}/5)</div>
        <div className="itemSub">
          {state.cave.features.alchemyRoom === 0 ? '未建造' : 
           `可以炼制高级丹药，成功率+${state.cave.features.alchemyRoom * 10}%`}
        </div>
        {state.cave.features.alchemyRoom === 0 ? (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'alchemyRoom' })}
            disabled={state.lingshi < featureCosts.alchemyRoom[0]}
          >
            建造({formatWan(featureCosts.alchemyRoom[0])}灵石)
          </button>
        ) : state.cave.features.alchemyRoom < 5 ? (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'alchemyRoom' })}
            disabled={state.lingshi < featureCosts.alchemyRoom[state.cave.features.alchemyRoom]}
          >
            升级 Lv.{state.cave.features.alchemyRoom + 1}({formatWan(featureCosts.alchemyRoom[state.cave.features.alchemyRoom])}灵石)
          </button>
        ) : (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'ALCHEMY_PILL', recipeId: 'advanced-qi-pill' })}
          >
            炼制高级丹药
          </button>
        )}
      </div>

      {/* 炼器炉 */}
      <div className="item">
        <div className="itemTitle">🔨 炼器炉 (等级 {state.cave.features.refiningForge}/5)</div>
        <div className="itemSub">
          {state.cave.features.refiningForge === 0 ? '未建造' : 
           `可以锻造高级装备，品质提升+${state.cave.features.refiningForge * 15}%`}
        </div>
        {state.cave.features.refiningForge === 0 ? (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'refiningForge' })}
            disabled={state.lingshi < featureCosts.refiningForge[0]}
          >
            建造({formatWan(featureCosts.refiningForge[0])}灵石)
          </button>
        ) : state.cave.features.refiningForge < 5 ? (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'refiningForge' })}
            disabled={state.lingshi < featureCosts.refiningForge[state.cave.features.refiningForge]}
          >
            升级 Lv.{state.cave.features.refiningForge + 1}({formatWan(featureCosts.refiningForge[state.cave.features.refiningForge])}灵石)
          </button>
        ) : (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'REFINING_EQUIPMENT', recipeId: 'legendary-weapon' })}
          >
            锻造传说装备
          </button>
        )}
      </div>

      {/* 聚灵阵 */}
      <div className="item">
        <div className="itemTitle">✨ 聚灵阵 (等级 {state.cave.features.gatheringArray}/5)</div>
        <div className="itemSub">
          {state.cave.features.gatheringArray === 0 ? '未建造' : 
           `修炼效率+${state.cave.features.gatheringArray * 8}%`}
        </div>
        {state.cave.features.gatheringArray === 0 ? (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'gatheringArray' })}
            disabled={state.lingshi < featureCosts.gatheringArray[0]}
          >
            建造({formatWan(featureCosts.gatheringArray[0])}灵石)
          </button>
        ) : state.cave.features.gatheringArray < 5 && (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'gatheringArray' })}
            disabled={state.lingshi < featureCosts.gatheringArray[state.cave.features.gatheringArray]}
          >
            升级 Lv.{state.cave.features.gatheringArray + 1}({formatWan(featureCosts.gatheringArray[state.cave.features.gatheringArray])}灵石)
          </button>
        )}
      </div>

      {/* 灵兽圈 */}
      <div className="item">
        <div className="itemTitle">🐾 灵兽圈 (等级 {state.cave.features.beastPen}/5)</div>
        <div className="itemSub">
          {state.cave.features.beastPen === 0 ? '未建造' : 
           `宠物成长速度+${state.cave.features.beastPen * 20}%`}
        </div>
        {state.cave.features.beastPen === 0 ? (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'beastPen' })}
            disabled={state.lingshi < featureCosts.beastPen[0]}
          >
            建造({formatWan(featureCosts.beastPen[0])}灵石)
          </button>
        ) : state.cave.features.beastPen < 5 && (
          <button 
            className="btn btnPrimary" 
            onClick={() => dispatch({ type: 'BUILD_CAVE_FEATURE', feature: 'beastPen' })}
            disabled={state.lingshi < featureCosts.beastPen[state.cave.features.beastPen]}
          >
            升级 Lv.{state.cave.features.beastPen + 1}({formatWan(featureCosts.beastPen[state.cave.features.beastPen])}灵石)
          </button>
        )}
      </div>
    </div>
  );
}

function Fate({ dispatch, state }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const [saveText, setSaveText] = useState('');

  const doExport = async () => {
    const text = exportSaveString(state);
    setSaveText(text);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 某些环境下剪贴板 API 不可用，忽略即可。
    }
  };

  const doImport = () => {
    if (!saveText.trim()) return;
    if (!confirm('导入会覆盖当前存档，确定继续吗？')) return;
    dispatch({ type: 'IMPORT_SAVE', saveText });
  };

  return (
    <div className="panel card">
      <h3>仙缘</h3>
      <div className="item">
        <div className="itemTitle">外出历练</div>
        <div className="itemSub">有概率获得资源、材料或奇遇事件（简化版）。</div>
        <div style={{ marginTop: 10 }} className="row">
          <div className="muted">消耗：20 修炼年</div>
          <button className="btn btnPrimary" onClick={() => dispatch({ type: 'ADVENTURE' })}>
            出发
          </button>
        </div>
      </div>
      <div className="item">
        <div className="itemTitle">存档</div>
        <div className="itemSub">目前自动存到浏览器本地，同时支持手动导入/导出（便于跨设备）。</div>
        <div className="itemSub">存档版本：{state.saveVersion}</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
          <button className="btn btnPrimary" onClick={doExport}>
            导出（并尝试复制）
          </button>
          <button className="btn" onClick={doImport}>
            导入覆盖
          </button>
        </div>
        <textarea
          value={saveText}
          onChange={(e) => setSaveText(e.target.value)}
          placeholder="点击导出生成文本；或粘贴文本后点击导入覆盖。"
          style={{
            width: '100%',
            marginTop: 10,
            minHeight: 110,
            resize: 'vertical',
            borderRadius: 14,
            padding: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(238,242,255,0.92)'
          }}
        />
      </div>
    </div>
  );
}

// 丹药组件
function Pills({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const usePill = (pillId: string) => {
    dispatch({ type: 'USE_PILL', pillId });
  };

  return (
    <div className="panel card">
      <h3>丹药</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        使用丹药可以快速提升修为或获得临时增益效果。
      </div>
      <div className="list">
        {state.pills.length === 0 ? (
          <div className="item">
            <div className="itemTitle">空空如也</div>
            <div className="itemSub">去历练或炼制丹药吧。</div>
          </div>
        ) : (
          state.pills.map((pill) => (
            <div key={pill.id} className="item">
              <div className="row">
                <div>
                  <div className="itemTitle">{pill.name}</div>
                  <div className="itemSub">{pill.desc}</div>
                  <div className="itemSub">{pill.effect}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="kbd">×{pill.count}</div>
                  <button
                    className="btn btnPrimary"
                    onClick={() => usePill(pill.id)}
                    disabled={pill.count <= 0}
                  >
                    使用
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 装备组件
function Equipment({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const equipItem = (equipmentId: string) => {
    dispatch({ type: 'EQUIP_ITEM', equipmentId });
  };

  const equipmentByType = state.equipment.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, typeof state.equipment>);

  return (
    <div className="panel card">
      <h3>装备</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        装备可以提供各种属性加成，提升修炼效率。
      </div>
      
      {Object.entries(equipmentByType).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--gold)' }}>
            {type === 'weapon' ? '武器' : 
             type === 'armor' ? '防具' : 
             type === 'accessory' ? '饰品' : 
             type === 'ring' ? '戒指' : '项链'}
          </h4>
          <div className="list">
            {items.map((item) => (
              <div key={item.id} className={`item ${item.equipped ? 'equipment-equipped' : ''}`}>
                <div className="row">
                  <div>
                    <div className="itemTitle">
                      {item.name} 
                      <span style={{ 
                        marginLeft: 8, 
                        fontSize: 11, 
                        color: item.quality === 'legendary' ? 'var(--gold)' : 
                               item.quality === 'epic' ? '#b19cd9' : 
                               item.quality === 'rare' ? '#87ceeb' : 'var(--muted)' 
                      }}>
                        [{item.quality === 'legendary' ? '传说' : 
                          item.quality === 'epic' ? '史诗' : 
                          item.quality === 'rare' ? '稀有' : '普通'}]
                      </span>
                    </div>
                    <div className="itemSub">{item.desc}</div>
                    <div className="itemSub">
                      等级:{item.level} | 
                      {item.stats.xiuweiBonus && ` 修为+${Math.round(item.stats.xiuweiBonus * 100)}%`}
                      {item.stats.efficiencyBonus && ` 效率+${Math.round(item.stats.efficiencyBonus * 100)}%`}
                    </div>
                  </div>
                  <button
                    className={"btn " + (item.equipped ? '' : 'btnPrimary')}
                    onClick={() => equipItem(item.id)}
                    disabled={item.equipped}
                  >
                    {item.equipped ? '已装备' : '装备'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// 宠物组件
function Pets({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const togglePet = (petId: string) => {
    dispatch({ type: 'TOGGLE_PET', petId });
  };

  return (
    <div className="panel card">
      <h3>宠物</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        宠物可以提供修炼加成和历练帮助。
      </div>
      <div className="list">
        {state.pets.length === 0 ? (
          <div className="item">
            <div className="itemTitle">没有宠物</div>
            <div className="itemSub">去历练时可能会遇到灵兽。</div>
          </div>
        ) : (
          state.pets.map((pet) => (
            <div key={pet.id} className={`item ${pet.active ? 'pet-active' : 'pet-resting'}`}>
              <div className="row">
                <div>
                  <div className="itemTitle">{pet.name}</div>
                  <div className="itemSub">{pet.desc}</div>
                  <div className="itemSub">
                    等级:{pet.level} | 进化:{pet.evolution} | 
                    效率+{Math.round(pet.bonus.efficiencyBonus * 100)}% |
                    历练+{Math.round(pet.bonus.adventureBonus * 100)}%
                  </div>
                  <div className="itemSub">技能: {pet.skills.map(skill => 
                    <span key={skill} className="skill-tag">{skill}</span>
                  )}</div>
                </div>
                <button
                  className={"btn " + (pet.active ? 'btnDanger' : 'btnPrimary')}
                  onClick={() => togglePet(pet.id)}
                >
                  {pet.active ? '休息' : '激活'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 秘籍组件
function SecretManuals({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const learnSecretManual = (manualId: string) => {
    dispatch({ type: 'LEARN_SECRET_MANUAL', manualId });
  };

  const manualsByCategory = state.secretManuals.reduce((acc, manual) => {
    if (!acc[manual.category]) acc[manual.category] = [];
    acc[manual.category].push(manual);
    return acc;
  }, {} as Record<string, typeof state.secretManuals>);

  return (
    <div className="panel card">
      <h3>秘籍</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        学习各种秘籍可以获得特殊能力和解锁新功能。
      </div>
      
      {Object.entries(manualsByCategory).map(([category, manuals]) => (
        <div key={category} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--gold)' }}>
            {category === 'combat' ? '战斗秘籍' : 
             category === 'alchemy' ? '炼丹秘籍' : 
             category === 'refining' ? '炼器秘籍' : 
             category === 'formation' ? '阵法秘籍' : '修炼秘籍'}
          </h4>
          <div className="list">
            {manuals.map((manual) => (
              <div key={manual.id} className={`item quality-${manual.rarity}`}>
                <div className="row">
                  <div>
                    <div className="itemTitle">
                      {manual.name}
                      <span style={{ 
                        marginLeft: 8, 
                        fontSize: 11, 
                        color: manual.rarity === 'legendary' ? 'var(--gold)' : 
                               manual.rarity === 'epic' ? '#b19cd9' : 
                               manual.rarity === 'rare' ? '#87ceeb' : 'var(--muted)' 
                      }}>
                        [{manual.rarity === 'legendary' ? '传说' : 
                          manual.rarity === 'epic' ? '史诗' : 
                          manual.rarity === 'rare' ? '稀有' : '普通'}]
                      </span>
                    </div>
                    <div className="itemSub">{manual.desc}</div>
                    <div className="itemSub">{manual.effect}</div>
                    {manual.requirements && (
                      <div className="itemSub">要求: {manual.requirements.join(', ')}</div>
                    )}
                  </div>
                  <button
                    className={"btn " + (manual.learned ? '' : 'btnPrimary')}
                    onClick={() => learnSecretManual(manual.id)}
                    disabled={manual.learned}
                  >
                    {manual.learned ? '已学会' : '学习'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// 历练组件
function Dungeons({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const exploreDungeon = (dungeonId: string) => {
    dispatch({ type: 'EXPLORE_DUNGEON', dungeonId });
  };

  const dungeonsByDifficulty = state.dungeons.reduce((acc, dungeon) => {
    if (!acc[dungeon.difficulty]) acc[dungeon.difficulty] = [];
    acc[dungeon.difficulty].push(dungeon);
    return acc;
  }, {} as Record<string, typeof state.dungeons>);

  return (
    <div className="panel card">
      <h3>历练</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        探索危险地带，获得丰厚奖励，但需要消耗修炼年和灵石。
      </div>
      
      {Object.entries(dungeonsByDifficulty).map(([difficulty, dungeons]) => (
        <div key={difficulty} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 
            difficulty === 'nightmare' ? 'var(--danger)' : 
            difficulty === 'hard' ? '#ff9800' : 
            difficulty === 'normal' ? 'var(--ok)' : 'var(--accent)' 
          }} className={`difficulty-${difficulty}`}>
            {difficulty === 'nightmare' ? '噩梦' : 
             difficulty === 'hard' ? '困难' : 
             difficulty === 'normal' ? '普通' : '简单'}
          </h4>
          <div className="list">
            {dungeons.map((dungeon) => (
              <div key={dungeon.id} className="item">
                <div className="row">
                  <div>
                    <div className="itemTitle">{dungeon.name}</div>
                    <div className="itemSub">{dungeon.desc}</div>
                    <div className="itemSub">
                      消耗: {dungeon.cost.yearsCultivated}修炼年
                      {dungeon.cost.lingshi && ` + ${dungeon.cost.lingshi}灵石`}
                    </div>
                    <div className="itemSub">
                      奖励: {dungeon.rewards.lingshi}灵石 + {dungeon.rewards.shengwang}声望
                      (经验倍率: {dungeon.rewards.expRate}x)
                    </div>
                    <div className="itemSub">通关次数: {dungeon.clearCount}</div>
                    {dungeon.clearCount > 0 && (
                      <div className="mini-progress">
                        <div className="mini-progress-fill" style={{ width: `${Math.min(100, dungeon.clearCount * 20)}%` }} />
                      </div>
                    )}
                  </div>
                  <button
                    className={"btn " + (!dungeon.unlocked ? '' : 'btnPrimary')}
                    onClick={() => exploreDungeon(dungeon.id)}
                    disabled={!dungeon.unlocked}
                  >
                    {!dungeon.unlocked ? '未解锁' : '探索'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// 活动组件
function Activities({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const claimActivity = (activityId: string) => {
    dispatch({ type: 'CLAIM_ACTIVITY', activityId });
  };

  const now = Date.now();
  
  return (
    <div className="panel card">
      <h3>活动</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        参与限时活动获得特殊奖励。
      </div>
      <div className="list">
        {state.activities.length === 0 ? (
          <div className="item">
            <div className="itemTitle">暂无活动</div>
            <div className="itemSub">请关注后续活动通知。</div>
          </div>
        ) : (
          state.activities.filter(activity => 
            activity.type === 'daily' || 
            activity.type === 'weekly' || 
            (activity.type === 'limited' && activity.endTime > now)
          ).map((activity) => {
            const isExpired = activity.type === 'limited' && activity.endTime <= now;
            const timeLeft = activity.type === 'limited' ? 
              Math.max(0, Math.floor((activity.endTime - now) / (1000 * 60 * 60))) : 0;
            
            return (
              <div key={activity.id} className={`item ${activity.claimed ? 'activity-completed' : activity.completed ? 'activity-available' : isExpired ? 'activity-expired' : ''}`}>
                <div className="row">
                  <div>
                    <div className="itemTitle">
                      {activity.name}
                      <span style={{ 
                        marginLeft: 8, 
                        fontSize: 11, 
                        color: activity.type === 'limited' ? 'var(--danger)' : 'var(--accent)' 
                      }}>
                        [{activity.type === 'limited' ? '限时' : 
                          activity.type === 'daily' ? '每日' : '每周'}]
                      </span>
                    </div>
                    <div className="itemSub">{activity.desc}</div>
                    {activity.type === 'limited' && (
                      <div className={`itemSub ${timeLeft <= 2 ? 'countdown-urgent' : ''}`}>
                        剩余时间: {timeLeft}小时
                      </div>
                    )}
                    <div className="itemSub">
                      奖励: 
                      {activity.rewards.lingshi && ` ${activity.rewards.lingshi}灵石`}
                      {activity.rewards.shengwang && ` ${activity.rewards.shengwang}声望`}
                    </div>
                  </div>
                  <button
                    className={"btn " + (activity.claimed ? '' : activity.completed ? 'btnPrimary' : '')}
                    onClick={() => claimActivity(activity.id)}
                    disabled={!activity.completed || activity.claimed || isExpired}
                  >
                    {activity.claimed ? '已领取' : 
                     !activity.completed ? '未完成' : 
                     isExpired ? '已过期' : '领取'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// 设置组件
function Settings({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const [showGmPanel, setShowGmPanel] = useState(false);
  const [gmCodeInput, setGmCodeInput] = useState('');

  const activateGM = () => {
    if (gmCodeInput === 'lw2b') {
      setShowGmPanel(true);
      setGmCodeInput('');
    } else {
      alert('GM码错误！');
    }
  };

  const gmAddResource = (resource: 'lingshi' | 'shengwang' | 'xiuwei' | 'yearsCultivated', amount: number) => {
    dispatch({ type: 'GM_ADD_RESOURCE', resource, amount });
  };

  const gmAddItem = (itemType: 'pill' | 'equipment' | 'pet' | 'secretManual' | 'manual', itemId: string) => {
    dispatch({ type: 'GM_ADD_ITEM', itemType, itemId });
  };

  return (
    <div className="panel card">
      <h3>游戏设置</h3>
      
      <div className="item">
        <div className="itemTitle">玩家信息</div>
        <div className="itemSub">
          当前昵称：{state.playerName} | 头像风格：{state.avatarStyle}
        </div>
      </div>

      <div className="item">
        <div className="itemTitle">存档管理</div>
        <div className="itemSub">
          游戏自动保存到本地，版本：v{state.saveVersion}
        </div>
      </div>

      <div className="item">
        <div className="itemTitle">GM模式（开发者工具）</div>
        <div className="itemSub">输入GM码激活管理功能</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <input
            type="password"
            placeholder="输入GM码"
            value={gmCodeInput}
            onChange={(e) => setGmCodeInput(e.target.value)}
            style={{
              flex: 1,
              padding: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text)',
              borderRadius: 8
            }}
          />
          <button className="btn btnPrimary" onClick={activateGM}>
            激活
          </button>
        </div>
      </div>

      {/* GM管理面板 */}
      {showGmPanel && (
        <div className="panel card" style={{ marginTop: 20, background: 'rgba(255,215,0,0.1)' }}>
          <h4 style={{ color: 'var(--gold)' }}>GM管理面板</h4>
          
          <div style={{ marginBottom: 15 }}>
            <div className="itemTitle">添加资源</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <button className="btn btnPrimary" onClick={() => gmAddResource('lingshi', 10000)}>
                +10000灵石
              </button>
              <button className="btn btnPrimary" onClick={() => gmAddResource('shengwang', 1000)}>
                +1000声望
              </button>
              <button className="btn btnPrimary" onClick={() => gmAddResource('xiuwei', 50000)}>
                +50000修为
              </button>
              <button className="btn btnPrimary" onClick={() => gmAddResource('yearsCultivated', 100)}>
                +100修炼年
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 15 }}>
            <div className="itemTitle">添加物品</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <button className="btn btnPrimary" onClick={() => gmAddItem('pill', 'spirit-essence')}>
                添加灵髓丸
              </button>
              <button className="btn btnPrimary" onClick={() => gmAddItem('equipment', 'spirit-ring')}>
                添加灵玉指环
              </button>
              <button className="btn btnPrimary" onClick={() => gmAddItem('pet', 'fire-sparrow')}>
                添加火雀
              </button>
              <button className="btn btnPrimary" onClick={() => gmAddItem('secretManual', 'cultivation-insights')}>
                添加修炼心得
              </button>
            </div>
          </div>

          <div>
            <button className="btn btnDanger" onClick={() => dispatch({ type: 'GM_UNLOCK_ALL_DUNGEONS' })}>
              解锁所有副本
            </button>
          </div>
        </div>
      )}
    </div>
  );
}