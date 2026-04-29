import { useState, useEffect } from 'react';
import { Map, Users, Skull, Wand2, UserPlus, X } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { LoadoutSlot } from './LoadoutSlot';
import { SelectionModal } from './SelectionModal';

export const Sidebar = () => {
  const { 
    killerLoadout, 
    survivorLoadouts, 
    globalStatusEffects,
    simulationRunning, 
    setSimulationRunning,
    addSurvivor,
    removeSurvivor,
    toggleStatusEffect,
    setKillerLoadout,
    setSurvivorLoadout,
    killers,
    survivors,
    perks,
    items,
    setKillers,
    setSurvivors,
    setPerks,
    setItems,
    setAddons
  } = useSimulationStore();

  const [activeTab, setActiveTab] = useState<'match' | 'killer' | 'survivors'>('killer');
  const [modalConfig, setModalConfig] = useState<{
    type: 'perk' | 'addon' | 'item';
    role: 'killer' | 'survivor';
    targetId?: string; // uniqueId for survivor
    slotIndex: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/killers.json').then(res => res.json()),
      fetch('/data/survivors.json').then(res => res.json()),
      fetch('/data/perks.json').then(res => res.json()),
      fetch('/data/items.json').then(res => res.json()),
      fetch('/data/addons.json').then(res => res.json()),
    ]).then(([k, s, p, i, a]) => {
      setKillers(k);
      setSurvivors(s);
      setPerks(p);
      setItems(i);
      setAddons(a);
    });
  }, []);

  const availableMaps = [{ id: 'macmillan', name: 'MacMillan Estate' }];
  const availableStatusEffects = ['Bloodlust', 'Exposed', 'Exhausted', 'Haste'];

  const handleSelect = (itemId: string | null) => {
    if (!modalConfig) return;

    const { role, targetId, slotIndex, type } = modalConfig;

    if (role === 'killer') {
      if (type === 'perk') {
        const newPerks = [...killerLoadout.perks];
        newPerks[slotIndex] = itemId;
        setKillerLoadout({ perks: newPerks });
      } else if (type === 'addon') {
        const newAddons = [...killerLoadout.addons];
        newAddons[slotIndex] = itemId;
        setKillerLoadout({ addons: newAddons });
      }
    } else if (role === 'survivor' && targetId) {
      if (type === 'perk') {
        const newPerks = [...survivorLoadouts[targetId].perks];
        newPerks[slotIndex] = itemId;
        setSurvivorLoadout(targetId, { perks: newPerks });
      } else if (type === 'item') {
        setSurvivorLoadout(targetId, { item: itemId });
      }
    }

    setModalConfig(null);
  };

  const getModalProps = () => {
    if (!modalConfig) return null;
    const { type, role } = modalConfig;

    if (type === 'perk') {
      return {
        title: `Select ${role === 'killer' ? 'Killer' : 'Survivor'} Perk`,
        items: perks.filter(p => p.role === role)
      };
    } else if (type === 'item') {
      return {
        title: 'Select Item',
        items: items
      };
    } else if (type === 'addon') {
      return {
        title: 'Select Add-on',
        items: [] 
      };
    }
    return null;
  };

  const modalProps = getModalProps();

  return (
    <div className="w-[380px] h-full bg-slate-950 border-r border-slate-800 flex flex-col text-slate-200 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10 relative">
      
      {/* Selection Modal */}
      {modalConfig && modalProps && (
        <SelectionModal 
          title={modalProps.title}
          items={modalProps.items}
          onSelect={handleSelect}
          onClose={() => setModalConfig(null)}
        />
      )}

      {/* Header */}
      <div className="p-6 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
          <Skull className="text-red-500" /> DbD Tactics
        </h1>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Configuration Panel</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/30">
        <TabButton active={activeTab === 'match'} onClick={() => setActiveTab('match')} icon={<Map size={14}/>} label="Match" />
        <TabButton active={activeTab === 'killer'} onClick={() => setActiveTab('killer')} icon={<Skull size={14}/>} label="Killer" />
        <TabButton active={activeTab === 'survivors'} onClick={() => setActiveTab('survivors')} icon={<Users size={14}/>} label="Survivors" />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {/* MATCH TAB */}
        {activeTab === 'match' && (
          <div className="space-y-6 animate-fade-in">
            <section>
              <h2 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest">Map Selection</h2>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                {availableMaps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </section>

            <section>
              <h2 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest">Global Status Effects</h2>
              <div className="grid grid-cols-2 gap-2">
                {availableStatusEffects.map(effect => {
                  const isActive = globalStatusEffects.includes(effect);
                  return (
                    <button 
                      key={effect}
                      onClick={() => toggleStatusEffect(effect)}
                      className={`text-xs font-medium py-2 px-3 rounded-md border transition-all ${
                        isActive 
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {effect}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* KILLER TAB */}
        {activeTab === 'killer' && (
          <div className="space-y-8 animate-fade-in">
            <section>
              <select 
                value={killerLoadout.killerId}
                onChange={(e) => setKillerLoadout({ killerId: e.target.value })}
                className="w-full bg-slate-900 border border-red-900/50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none font-semibold text-white">
                {killers.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </section>

            <section>
              <h2 className="text-xs font-bold uppercase text-slate-500 mb-4 tracking-widest flex items-center justify-between">
                Field of View <span className="text-slate-600">Mode</span>
              </h2>
              <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button 
                  onClick={() => setKillerLoadout({ fovMode: 'auto' })}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${killerLoadout.fovMode === 'auto' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Auto
                </button>
                <button 
                  onClick={() => setKillerLoadout({ fovMode: 'manual' })}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${killerLoadout.fovMode === 'manual' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Manual
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 italic">
                {killerLoadout.fovMode === 'auto' ? 'Locked to movement direction' : 'Use the handle on the map to rotate'}
              </p>
            </section>

            <section>
              <h2 className="text-xs font-bold uppercase text-slate-500 mb-4 tracking-widest flex items-center justify-between">
                Perks <span className="text-slate-600">4/4</span>
              </h2>
              <div className="flex justify-center gap-6 py-4">
                {killerLoadout.perks.map((p, i) => (
                  <div key={i} className={i % 2 !== 0 ? 'mt-6' : ''}>
                    <LoadoutSlot 
                      type="perk" 
                      itemId={p} 
                      onClick={() => setModalConfig({ type: 'perk', role: 'killer', slotIndex: i })} 
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-bold uppercase text-slate-500 mb-4 tracking-widest flex items-center justify-between">
                Power & Add-ons <span className="text-slate-600">2/2</span>
              </h2>
              <div className="flex justify-center items-center gap-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="w-16 h-16 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center shadow-lg">
                   <Wand2 className="text-slate-400" />
                </div>
                <div className="flex gap-4">
                  {killerLoadout.addons.map((a, i) => (
                    <LoadoutSlot 
                      key={i} 
                      type="addon" 
                      itemId={a} 
                      onClick={() => setModalConfig({ type: 'addon', role: 'killer', slotIndex: i })} 
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* SURVIVORS TAB */}
        {activeTab === 'survivors' && (
          <div className="space-y-6 animate-fade-in">
            {Object.entries(survivorLoadouts).map(([id, loadout], index) => (
              <div key={id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                <div className="bg-slate-800/80 p-3 flex justify-between items-center border-b border-slate-700/50">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    {survivors.find(s => s.id === loadout.survivorId)?.name || 'Survivor'} {index + 1}
                  </div>
                  <button onClick={() => removeSurvivor(id)} className="text-slate-500 hover:text-red-400 p-1">
                    <X size={14} />
                  </button>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="flex gap-4">
                    {/* Item */}
                    <div className="flex-shrink-0">
                      <h3 className="text-[10px] uppercase text-slate-500 font-bold mb-2 text-center">Item</h3>
                      <LoadoutSlot 
                        type="item" 
                        itemId={loadout.item} 
                        onClick={() => setModalConfig({ type: 'item', role: 'survivor', targetId: id, slotIndex: 0 })} 
                      />
                    </div>
                    {/* Perks Miniature */}
                    <div className="flex-1">
                      <h3 className="text-[10px] uppercase text-slate-500 font-bold mb-2">Perks</h3>
                      <div className="flex gap-2">
                        {loadout.perks.map((p, i) => (
                          <button 
                            key={i} 
                            onClick={() => setModalConfig({ type: 'perk', role: 'survivor', targetId: id, slotIndex: i })}
                            className="w-8 h-8 rotate-45 bg-slate-800 border border-slate-600 flex items-center justify-center hover:border-blue-500 transition-colors"
                          >
                            <div className="-rotate-45 text-[10px] font-bold text-slate-300">
                              {p ? p.charAt(0).toUpperCase() : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* FOV Toggle for Survivor */}
                  <div className="pt-2 border-t border-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">FOV Mode</span>
                      <div className="flex bg-slate-950 rounded-md p-0.5 border border-slate-800">
                        <button 
                          onClick={() => setSurvivorLoadout(id, { fovMode: 'auto' })}
                          className={`px-3 py-1 text-[9px] font-bold uppercase rounded-sm transition-all ${loadout.fovMode === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                        >
                          Auto
                        </button>
                        <button 
                          onClick={() => setSurvivorLoadout(id, { fovMode: 'manual' })}
                          className={`px-3 py-1 text-[9px] font-bold uppercase rounded-sm transition-all ${loadout.fovMode === 'manual' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                        >
                          Man
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {Object.keys(survivorLoadouts).length < 4 && (
              <button 
                onClick={() => addSurvivor('dwight')}
                className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 font-medium hover:border-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus size={16} /> Add Survivor
              </button>
            )}
          </div>
        )}

      </div>

      {/* Footer Controls */}
      <div className="p-6 border-t border-slate-800 bg-slate-900">
        <button
          onClick={() => setSimulationRunning(!simulationRunning)}
          className={`w-full py-3.5 rounded-lg font-bold tracking-wide transition-all duration-300 shadow-xl flex items-center justify-center gap-2 ${
            simulationRunning 
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50 hover:border-red-400' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 border border-emerald-400/50 hover:shadow-emerald-500/20'
          }`}
        >
          {simulationRunning ? 'Stop Simulation' : 'Start Simulation'}
        </button>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
      active 
        ? 'border-purple-500 text-purple-400 bg-slate-800/50' 
        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
    }`}
  >
    {icon} {label}
  </button>
);
