import { create } from 'zustand';
import type { Position, KillerLoadout, SurvivorLoadout } from '../types';

interface SimulationState {
  // Selected Data
  selectedMapId: string | null;

  killerLoadout: KillerLoadout;
  survivorLoadouts: Record<string, SurvivorLoadout>;
  
  globalStatusEffects: string[];

  // Active Simulation State
  killerPosition: Position;
  survivorPositions: Record<string, Position>;
  simulationRunning: boolean;
  distance: number | null;
  inTerrorRadius: boolean;
  hasLineOfSight: boolean;
  survivorStatus: Record<string, 'healthy' | 'injured' | 'downed'>;
  
  // Data lists
  killers: any[];
  survivors: any[];
  perks: any[];
  items: any[];
  addons: any[];
  
  // Actions
  setKillers: (killers: any[]) => void;
  setSurvivors: (survivors: any[]) => void;
  setPerks: (perks: any[]) => void;
  setItems: (items: any[]) => void;
  setAddons: (addons: any[]) => void;
  
  setSurvivorStatus: (id: string, status: 'healthy' | 'injured' | 'downed') => void;
  setSelectedMap: (id: string) => void;
  
  setKillerLoadout: (loadout: Partial<KillerLoadout>) => void;
  addSurvivor: (id: string) => void;
  removeSurvivor: (uniqueId: string) => void;
  setSurvivorLoadout: (uniqueId: string, loadout: Partial<SurvivorLoadout>) => void;
  toggleStatusEffect: (effectId: string) => void;
  
  setKillerPosition: (pos: Position) => void;
  setSurvivorPosition: (id: string, pos: Position) => void;
  
  setSimulationRunning: (running: boolean) => void;
  updateMetrics: (distance: number, inTerrorRadius: boolean, hasLoS: boolean) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  selectedMapId: 'macmillan',
  
  killerLoadout: {
    killerId: 'trapper',
    perks: [null, null, null, null],
    addons: [null, null],
    rotation: 0,
    fovMode: 'auto'
  },
  survivorLoadouts: {
    'dwight_1': {
      survivorId: 'dwight',
      item: null,
      itemAddons: [null, null],
      perks: [null, null, null, null],
      rotation: 0,
      fovMode: 'auto'
    }
  },
  globalStatusEffects: [],
  
  killerPosition: { x: 400, y: 300 },
  survivorPositions: { 'dwight_1': { x: 500, y: 400 } },
  simulationRunning: false,
  distance: null,
  inTerrorRadius: false,
  hasLineOfSight: false,
  survivorStatus: { 'dwight_1': 'healthy' },
  
  killers: [],
  survivors: [],
  perks: [],
  items: [],
  addons: [],

  setKillers: (killers) => set({ killers }),
  setSurvivors: (survivors) => set({ survivors }),
  setPerks: (perks) => set({ perks }),
  setItems: (items) => set({ items }),
  setAddons: (addons) => set({ addons }),

  setSurvivorStatus: (id, status) => set((state) => ({
    survivorStatus: { ...state.survivorStatus, [id]: status }
  })),

  setSelectedMap: (id) => set({ selectedMapId: id }),
  
  setKillerLoadout: (loadout) => set((state) => ({
    killerLoadout: { ...state.killerLoadout, ...loadout }
  })),
  
  addSurvivor: (id) => set((state) => {
    const uniqueId = `${id}_${Date.now()}`;
    return { 
      survivorLoadouts: {
        ...state.survivorLoadouts,
        [uniqueId]: {
          survivorId: id,
          item: null,
          itemAddons: [null, null],
          perks: [null, null, null, null],
          rotation: 0,
          fovMode: 'auto'
        }
      },
      survivorPositions: { ...state.survivorPositions, [uniqueId]: { x: 500, y: 500 } },
      survivorStatus: { ...state.survivorStatus, [uniqueId]: 'healthy' }
    };
  }),
  
  removeSurvivor: (uniqueId) => set((state) => {
    const newLoadouts = { ...state.survivorLoadouts };
    const newPositions = { ...state.survivorPositions };
    const newStatus = { ...state.survivorStatus };
    delete newLoadouts[uniqueId];
    delete newPositions[uniqueId];
    delete newStatus[uniqueId];
    return {
      survivorLoadouts: newLoadouts,
      survivorPositions: newPositions,
      survivorStatus: newStatus
    };
  }),
  
  setSurvivorLoadout: (uniqueId, loadout) => set((state) => ({
    survivorLoadouts: {
      ...state.survivorLoadouts,
      [uniqueId]: { ...state.survivorLoadouts[uniqueId], ...loadout }
    }
  })),
  
  toggleStatusEffect: (effectId) => set((state) => {
    const active = state.globalStatusEffects.includes(effectId);
    return {
      globalStatusEffects: active 
        ? state.globalStatusEffects.filter(e => e !== effectId)
        : [...state.globalStatusEffects, effectId]
    };
  }),
  
  setKillerPosition: (pos) => set({ killerPosition: pos }),
  setSurvivorPosition: (id, pos) => set((state) => ({
    survivorPositions: { ...state.survivorPositions, [id]: pos }
  })),
  
  setSimulationRunning: (running) => set({ simulationRunning: running }),
  updateMetrics: (distance, inTerrorRadius, hasLoS) => set({ distance, inTerrorRadius, hasLineOfSight: hasLoS })
}));
