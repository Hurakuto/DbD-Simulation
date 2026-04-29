import { Sidebar } from './components/Sidebar';
import { DebugPanel } from './components/DebugPanel';
import { PhaserGame } from './game/PhaserGame';

function App() {
  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden font-sans">
      <Sidebar />
      
      <main className="flex-1 relative flex items-center justify-center p-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        <PhaserGame />
        <DebugPanel />
      </main>
    </div>
  );
}

export default App;
