import { Activity, Eye, ShieldAlert } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const DebugPanel = () => {
  const { distance, inTerrorRadius, hasLineOfSight } = useSimulationStore();

  return (
    <div className="absolute top-6 right-6 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-5 rounded-xl text-slate-200 shadow-2xl z-20">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
        <Activity size={16} /> Live Telemetry
      </h3>
      
      <div className="space-y-4">
        
        {/* Distance Metric */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 flex items-center gap-2">
            Distance
          </span>
          <span className="font-mono text-sm font-medium">
            {distance !== null && distance > 0 ? `${distance.toFixed(1)}m` : '--'}
          </span>
        </div>

        {/* Terror Radius Metric */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 flex items-center gap-2">
            <ShieldAlert size={14} className={inTerrorRadius ? 'text-red-500' : 'text-slate-500'} />
            Terror Radius
          </span>
          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
            inTerrorRadius ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'
          }`}>
            {inTerrorRadius ? 'INSIDE' : 'OUTSIDE'}
          </span>
        </div>

        {/* Line of Sight */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 flex items-center gap-2">
            <Eye size={14} className={hasLineOfSight ? 'text-blue-400' : 'text-slate-500'} />
            Line of Sight
          </span>
          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
            hasLineOfSight ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
          }`}>
            {hasLineOfSight ? 'VISIBLE' : 'HIDDEN'}
          </span>
        </div>

      </div>
    </div>
  );
};
