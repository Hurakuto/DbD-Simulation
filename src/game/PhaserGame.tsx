import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { GameScene } from './GameScene';
import { useSimulationStore } from '../store/useSimulationStore';

import { StatusOverlay } from '../components/StatusOverlay';

export const PhaserGame = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  
  const setKillerPosition = useSimulationStore((state) => state.setKillerPosition);
  const setSurvivorPosition = useSimulationStore((state) => state.setSurvivorPosition);
  const setKillerLoadout = useSimulationStore((state) => state.setKillerLoadout);
  const setSurvivorLoadout = useSimulationStore((state) => state.setSurvivorLoadout);
  const updateMetrics = useSimulationStore((state) => state.updateMetrics);
  
  const killerPosition = useSimulationStore((state) => state.killerPosition);
  const survivorPositions = useSimulationStore((state) => state.survivorPositions);
  const survivorLoadouts = useSimulationStore((state) => state.survivorLoadouts);
  const killerLoadout = useSimulationStore((state) => state.killerLoadout);
  const simulationRunning = useSimulationStore((state) => state.simulationRunning);
  const killers = useSimulationStore((state) => state.killers);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1000,
      height: 1000,
      parent: gameRef.current,
      scene: [GameScene],
      backgroundColor: '#0f172a',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      }
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    game.events.on('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene;
      
      // Bind Phaser events to Zustand actions
      scene.onKillerMove = (x, y) => {
        setKillerPosition({ x, y });
        calculateMetrics(x, y, survivorPositions);
      };

      scene.onKillerRotate = (angle) => {
        setKillerLoadout({ rotation: angle });
      };

      scene.onSurvivorMove = (id, x, y) => {
        setSurvivorPosition(id, { x, y });
        calculateMetrics(killerPosition.x, killerPosition.y, { ...survivorPositions, [id]: { x, y } });
      };

      scene.onSurvivorRotate = (id, angle) => {
        setSurvivorLoadout(id, { rotation: angle });
      };

      scene.onSurvivorHit = (id) => {
        const currentStatus = useSimulationStore.getState().survivorStatus[id];
        if (currentStatus === 'healthy') {
          useSimulationStore.getState().setSurvivorStatus(id, 'injured');
        } else if (currentStatus === 'injured') {
          useSimulationStore.getState().setSurvivorStatus(id, 'downed');
        }
      };

      // Add initial survivors
      Object.keys(survivorLoadouts).forEach((id) => {
        scene.addSurvivor(id, survivorPositions[id]?.x || 500, survivorPositions[id]?.y || 500);
        scene.setFOVMode(id, survivorLoadouts[id].fovMode);
        scene.updateFOV(id, survivorLoadouts[id].rotation);
      });
      scene.setFOVMode('killer', killerLoadout.fovMode);
      scene.updateFOV('killer', killerLoadout.rotation);
    });

    return () => {
      game.destroy(true);
      phaserGameRef.current = null;
    };
  }, []); // Init only once

  // Dynamic survivor management and FOV updates
  useEffect(() => {
    if (!phaserGameRef.current) return;
    const scene = phaserGameRef.current.scene.getScene('GameScene') as GameScene;
    if (!scene) return;

    // Sync Killer speed if data is available
    if (killers.length > 0) {
      const currentKillerData = killers.find((k: any) => k.id === killerLoadout.killerId);
      if (currentKillerData) {
        scene.setKillerBaseSpeed(currentKillerData.movementSpeed);
      }
    }

    const currentLoadoutIds = Object.keys(survivorLoadouts);
    const spawnedIds = scene.getSurvivorIds();

    // Add missing survivors
    currentLoadoutIds.forEach(id => {
      if (!scene.hasSurvivor(id)) {
        scene.addSurvivor(id, survivorPositions[id]?.x || 500, survivorPositions[id]?.y || 500);
      }
      // Sync FOV mode and rotation
      scene.setFOVMode(id, survivorLoadouts[id].fovMode);
      if (survivorLoadouts[id].fovMode === 'manual') {
        scene.updateFOV(id, survivorLoadouts[id].rotation);
      }
    });

    // Remove extra survivors
    spawnedIds.forEach(id => {
      if (!survivorLoadouts[id]) {
        scene.removeSurvivor(id);
      }
    });

    // Sync Killer FOV
    scene.setFOVMode('killer', killerLoadout.fovMode);
    if (killerLoadout.fovMode === 'manual') {
      scene.updateFOV('killer', killerLoadout.rotation);
    }

    // Sync Survivor Statuses
    const survivorStatuses = useSimulationStore.getState().survivorStatus;
    Object.keys(survivorStatuses).forEach(id => {
      scene.setSurvivorStatus(id, survivorStatuses[id]);
    });

    scene.setSimulationRunning(simulationRunning);

  }, [survivorLoadouts, survivorPositions, killerLoadout, simulationRunning, killers]);

  const calculateMetrics = (kx: number, ky: number, survs: Record<string, {x: number, y: number}>) => {
    const ids = Object.keys(survs);
    const survivorStatuses = useSimulationStore.getState().survivorStatus;
    
    if (ids.length > 0) {
      let minDistancePx = Infinity;
      let isVisible = false;
      const scene = phaserGameRef.current?.scene.getScene('GameScene') as GameScene;

      ids.forEach(id => {
        // Skip downed survivors for metrics
        if (survivorStatuses[id] === 'downed') return;

        const sx = survs[id].x;
        const sy = survs[id].y;
        const d = Math.sqrt(Math.pow(kx - sx, 2) + Math.pow(ky - sy, 2));
        if (d < minDistancePx) minDistancePx = d;

        // Check LoS for this survivor
        if (scene && scene.canSee('killer', sx, sy)) {
          isVisible = true;
        }
      });
      
      const finalDistMeters = minDistancePx === Infinity ? 0 : minDistancePx / 4.68;
      updateMetrics(finalDistMeters, finalDistMeters > 0 && finalDistMeters <= 32, isVisible);
    }
  };

  return (
    <div className="flex-1 w-full flex justify-center items-center bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-xl relative min-h-[400px]">
      <StatusOverlay />
      <div ref={gameRef} className="w-full max-w-[800px] aspect-square" />
    </div>
  );
};
