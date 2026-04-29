export interface KillerData {
  id: string;
  name: string;
  speed: number;
  terrorRadius: number;
  color: string;
  icon: string;
}

export interface SurvivorData {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface MapData {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface PerkData {
  id: string;
  name: string;
  description: string;
  role: 'killer' | 'survivor';
  icon: string;
}

export interface ItemData {
  id: string;
  name: string;
  description: string;
  rarity: 'brown' | 'yellow' | 'green' | 'purple' | 'pink';
  icon: string;
}

export interface KillerLoadout {
  killerId: string;
  perks: (string | null)[];
  addons: (string | null)[];
  rotation: number;
  fovMode: 'manual' | 'auto';
}

export interface SurvivorLoadout {
  survivorId: string;
  item: string | null;
  itemAddons: (string | null)[];
  perks: (string | null)[];
  rotation: number;
  fovMode: 'manual' | 'auto';
}
