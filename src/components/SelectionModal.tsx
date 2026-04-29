import { X, Search } from 'lucide-react';
import { useState } from 'react';

interface SelectionModalProps {
  title: string;
  items: { id: string, name: string, description?: string, icon?: string }[];
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

export const SelectionModal = ({ title, items, onSelect, onClose }: SelectionModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  const filteredItems = sortedItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-slate-400">Select an item to equip</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar">
          <button
            onClick={() => onSelect(null)}
            className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-red-400 transition-colors">
              <X size={24} />
            </div>
            <span className="text-sm font-semibold text-slate-500 group-hover:text-red-400 transition-colors">None</span>
          </button>

          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="flex flex-col items-start gap-2 p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-white font-bold group-hover:border-purple-500/50 transition-colors">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-200 group-hover:text-purple-400 transition-colors">{item.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Equip</div>
                </div>
              </div>
              {item.description && (
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
