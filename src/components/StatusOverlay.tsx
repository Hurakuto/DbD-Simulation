import { useSimulationStore } from '../store/useSimulationStore';
import { Heart, HeartOff, Skull } from 'lucide-react';

export const StatusOverlay = () => {
  const survivorLoadouts = useSimulationStore((state) => state.survivorLoadouts);
  const survivorStatus = useSimulationStore((state) => state.survivorStatus);
  const survivors = useSimulationStore((state) => state.survivors);

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
      {Object.entries(survivorLoadouts).map(([id, loadout], index) => {
        const status = survivorStatus[id] || 'healthy';
        const name = survivors.find(s => s.id === loadout.survivorId)?.name || `Survivor ${index + 1}`;
        
        return (
          <div 
            key={id} 
            className={`flex items-center gap-3 px-4 py-2 rounded-lg border backdrop-blur-md transition-all duration-300 ${
              status === 'healthy' ? 'bg-slate-900/60 border-slate-700/50' :
              status === 'injured' ? 'bg-red-950/60 border-red-500/30' :
              'bg-slate-950 border-red-600/50 grayscale'
            }`}
          >
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                status === 'healthy' ? 'text-slate-500' :
                status === 'injured' ? 'text-red-400' :
                'text-red-600'
              }`}>
                {status}
              </span>
              <span className="text-sm font-semibold text-white">{name}</span>
            </div>

            <div className={`p-2 rounded-full ${
              status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' :
              status === 'injured' ? 'bg-red-500/20 text-red-500 animate-pulse' :
              'bg-red-950 text-red-600'
            }`}>
              {status === 'healthy' && <Heart size={16} />}
              {status === 'injured' && <HeartOff size={16} />}
              {status === 'downed' && <Skull size={16} />}
            </div>
          </div>
        );
      })}
    </div>
  );
};
