import { Plus } from 'lucide-react';

interface LoadoutSlotProps {
  type: 'perk' | 'addon' | 'item';
  label?: string;
  itemId?: string | null;
  onClick: () => void;
}

export const LoadoutSlot = ({ type, label, itemId, onClick }: LoadoutSlotProps) => {
  const isPerk = type === 'perk';
  
  return (
    <div className="flex flex-col items-center gap-1 group">
      <button
        onClick={onClick}
        className={`
          relative flex items-center justify-center transition-all duration-200
          ${isPerk 
            ? 'w-12 h-12 rotate-45 border-2 hover:border-purple-500 bg-slate-900/80 shadow-[0_0_10px_rgba(0,0,0,0.5)]' 
            : 'w-12 h-12 rounded-md border hover:border-blue-500 bg-slate-800/80'}
          ${itemId ? 'border-slate-500' : 'border-slate-700 hover:bg-slate-700/50'}
        `}
      >
        <div className={`absolute inset-0 flex items-center justify-center ${isPerk ? '-rotate-45' : ''}`}>
          {itemId ? (
             <div className="w-8 h-8 bg-slate-600 rounded-sm flex items-center justify-center text-xs font-bold text-white shadow-inner">
               {/* Replace with actual image later */}
               {itemId.charAt(0).toUpperCase()}
             </div>
          ) : (
            <Plus size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          )}
        </div>
      </button>
      {label && (
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1 w-full text-center truncate px-1">
          {label}
        </span>
      )}
    </div>
  );
};
