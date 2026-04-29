import * as Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private killerToken!: Phaser.GameObjects.Arc;
  private survivorTokens: Record<string, Phaser.GameObjects.Arc> = {};
  private fovCones: Record<string, Phaser.GameObjects.Graphics> = {};
  private rotationHandles: Record<string, Phaser.GameObjects.Arc> = {};
  private terrorRadiusCircle!: Phaser.GameObjects.Arc;
  private losLine!: Phaser.GameObjects.Line;

  private fovModes: Record<string, 'manual' | 'auto'> = { killer: 'auto' };
  private lastAngles: Record<string, number> = { killer: 0 };
  private isSimulationRunning: boolean = false;
  private survivorAiData: Record<string, { 
    fleeTimer: number, 
    state: 'idle' | 'flee' | 'lookback', 
    scanBaseAngle: number,
    wanderTarget: { x: number, y: number } | null,
    wanderWaitTimer: number
  }> = {};
  
  private killerBaseSpeed: number = 4.6; // m/s
  private killerState: { 
    lunging: boolean, 
    lungeTimer: number, 
    lungeCooldown: number,
    wanderTarget: { x: number, y: number } | null,
    wanderWaitTimer: number,
    lostTargetTimer: number,
    lastKnownTargetPos: { x: number, y: number } | null,
    isCurrentlyTracking: boolean
  } = {
    lunging: false,
    lungeTimer: 0,
    lungeCooldown: 0,
    wanderTarget: null,
    wanderWaitTimer: 0,
    lostTargetTimer: 0,
    lastKnownTargetPos: null,
    isCurrentlyTracking: false
  };
  
  public onKillerMove?: (x: number, y: number) => void;
  public onKillerRotate?: (angle: number) => void;
  public onSurvivorMove?: (id: string, x: number, y: number) => void;
  public onSurvivorRotate?: (id: string, angle: number) => void;
  public onSurvivorHit?: (id: string) => void;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // No external image loading for MVP, using native grid instead
  }

  create() {
    // 1. Draw Native Grid Background
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x334155, 0.5); // Slate 700 with alpha
    
    // Draw vertical lines
    for (let x = 0; x <= 1000; x += 50) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, 1000);
    }
    // Draw horizontal lines
    for (let y = 0; y <= 1000; y += 50) {
      graphics.moveTo(0, y);
      graphics.lineTo(1000, y);
    }
    graphics.strokePath();

    // 2. Terror Radius (behind killer)
    this.terrorRadiusCircle = this.add.circle(400, 300, 150, 0xff0000, 0.15); // 150px = ~32m visual representation
    
    // 3. Line of Sight
    this.losLine = this.add.line(0, 0, 400, 300, 500, 400, 0xffffff, 0.5).setOrigin(0, 0);

    // 4. Killer Token
    this.killerToken = this.add.circle(400, 300, 15, 0xff0000);
    this.killerToken.setInteractive({ draggable: true });
    
    // Initial Killer FOV
    this.drawFOV('killer', 400, 300, 0, 0xff0000);
    
    // Drag events for Killer
    this.input.setDraggable(this.killerToken);
    this.killerToken.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      const boundedX = Phaser.Math.Clamp(dragX, 20, 980);
      const boundedY = Phaser.Math.Clamp(dragY, 20, 980);
      
      const dx = boundedX - this.killerToken.x;
      const dy = boundedY - this.killerToken.y;
      
      this.killerToken.setPosition(boundedX, boundedY);
      this.terrorRadiusCircle.setPosition(boundedX, boundedY);
      this.updateLineOfSight();
      if (this.onKillerMove) this.onKillerMove(boundedX, boundedY);

      // Auto-rotation with threshold and smoothing to prevent jitter
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (this.fovModes['killer'] === 'auto' && dist > 2) {
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = this.lastAngles['killer'] || 0;
        const smoothedAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, 0.2);
        
        this.updateFOV('killer', smoothedAngle);
        if (this.onKillerRotate) this.onKillerRotate(smoothedAngle);
      } else {
        this.updateFOV('killer'); // Just update position
      }
    });
  }

  public setFOVMode(id: string, mode: 'manual' | 'auto') {
    this.fovModes[id] = mode;
  }

  private drawFOV(id: string, x: number, y: number, angle: number, color: number) {
    let fov = this.fovCones[id];
    if (!fov) {
      fov = this.add.graphics();
      this.fovCones[id] = fov;
    }
    fov.clear();
    fov.fillStyle(color, 0.2);
    fov.beginPath();
    fov.moveTo(x, y);
    
    const viewDistance = 1000;
    const viewAngle = Phaser.Math.DegToRad(45); // 90 degree FOV total
    
    fov.arc(x, y, viewDistance, angle - viewAngle, angle + viewAngle);
    fov.closePath();
    fov.fillPath();
    
    // Update rotation handle position
    let handle = this.rotationHandles[id];
    if (!handle) {
      handle = this.add.circle(0, 0, 8, 0xffffff, 0.8).setInteractive({ draggable: true });
      this.rotationHandles[id] = handle;
      this.input.setDraggable(handle);
      
      handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        const token = id === 'killer' ? this.killerToken : this.survivorTokens[id];
        if (!token) return;
        
        const newAngle = Phaser.Math.Angle.Between(token.x, token.y, dragX, dragY);
        this.updateFOV(id, newAngle);
        if (id === 'killer' && this.onKillerRotate) this.onKillerRotate(newAngle);
        if (id !== 'killer' && this.onSurvivorRotate) this.onSurvivorRotate(id, newAngle);
      });
    }
    
    const handleDist = 25;
    handle.setPosition(
      x + Math.cos(angle) * handleDist,
      y + Math.sin(angle) * handleDist
    );
  }

  public updateFOV(id: string, angle?: number) {
    const token = id === 'killer' ? this.killerToken : this.survivorTokens[id];
    if (!token) return;
    
    // If angle is not provided, use existing handle position to keep angle
    let finalAngle = angle;
    if (finalAngle === undefined) {
      const handle = this.rotationHandles[id];
      if (handle) {
        finalAngle = Phaser.Math.Angle.Between(token.x, token.y, handle.x, handle.y);
      } else {
        finalAngle = 0;
      }
    }
    
    this.lastAngles[id] = finalAngle;
    const color = id === 'killer' ? 0xff0000 : 0x4287f5;
    this.drawFOV(id, token.x, token.y, finalAngle, color);
  }

  public addSurvivor(id: string, x: number, y: number, color: number = 0x4287f5) {
    if (this.survivorTokens[id]) return;
    
    const token = this.add.circle(x, y, 12, color);
    token.setInteractive({ draggable: true });
    this.input.setDraggable(token);
    
    this.drawFOV(id, x, y, 0, color);
    
    token.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      const boundedX = Phaser.Math.Clamp(dragX, 20, 980);
      const boundedY = Phaser.Math.Clamp(dragY, 20, 980);
      
      const dx = boundedX - token.x;
      const dy = boundedY - token.y;
      
      token.setPosition(boundedX, boundedY);
      this.updateLineOfSight();
      if (this.onSurvivorMove) this.onSurvivorMove(id, boundedX, boundedY);

      // When manually dragging, update scan base angle
      if (this.survivorAiData[id]) {
        this.survivorAiData[id].scanBaseAngle = Phaser.Math.Angle.Between(token.x - dx, token.y - dy, token.x, token.y);
      }

      // Auto-rotation with threshold and smoothing to prevent jitter
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (this.fovModes[id] === 'auto' && dist > 2) {
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = this.lastAngles[id] || 0;
        const smoothedAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, 0.2);
        
        this.updateFOV(id, smoothedAngle);
        if (this.onSurvivorRotate) this.onSurvivorRotate(id, smoothedAngle);
      } else {
        this.updateFOV(id);
      }
    });
    
    this.fovModes[id] = 'auto';
    this.lastAngles[id] = 0;
    this.survivorAiData[id] = { 
      fleeTimer: 0, 
      state: 'idle', 
      scanBaseAngle: 0,
      wanderTarget: null,
      wanderWaitTimer: 0
    };
    this.survivorTokens[id] = token;
    this.updateLineOfSight();
  }

  public removeSurvivor(id: string) {
    if (this.survivorTokens[id]) {
      this.survivorTokens[id].destroy();
      delete this.survivorTokens[id];
      
      if (this.fovCones[id]) {
        this.fovCones[id].destroy();
        delete this.fovCones[id];
      }
      if (this.rotationHandles[id]) {
        this.rotationHandles[id].destroy();
        delete this.rotationHandles[id];
      }
      
      delete this.survivorAiData[id];
      this.updateLineOfSight();
    }
  }

  public hasSurvivor(id: string): boolean {
    return !!this.survivorTokens[id];
  }

  public getSurvivorIds(): string[] {
    return Object.keys(this.survivorTokens);
  }

  public setKillerPosition(x: number, y: number) {
    if (this.killerToken) {
      this.killerToken.setPosition(x, y);
      this.terrorRadiusCircle.setPosition(x, y);
      this.updateLineOfSight();
    }
  }

  public setSimulationRunning(running: boolean) {
    this.isSimulationRunning = running;
  }

  public setKillerBaseSpeed(speed: number) {
    this.killerBaseSpeed = speed;
  }

  private survivorStatuses: Record<string, 'healthy' | 'injured' | 'downed'> = {};

  public setSurvivorStatus(id: string, status: 'healthy' | 'injured' | 'downed') {
    this.survivorStatuses[id] = status;
    if (this.survivorAiData[id]) {
      if (status === 'downed') {
        this.survivorAiData[id].state = 'idle';
        this.survivorAiData[id].fleeTimer = 0;
      }
    }
  }

  private canSee(sourceId: string, targetX: number, targetY: number, fovAngle: number = 45): boolean {
    const token = sourceId === 'killer' ? this.killerToken : this.survivorTokens[sourceId];
    if (!token) return false;

    const angleToTarget = Phaser.Math.Angle.Between(token.x, token.y, targetX, targetY);
    const currentAngle = this.lastAngles[sourceId] || 0;
    
    // Normalize angles
    const diff = Phaser.Math.Angle.ShortestBetween(
      Phaser.Math.RadToDeg(currentAngle),
      Phaser.Math.RadToDeg(angleToTarget)
    );
    
    return Math.abs(diff) < fovAngle; 
  }

  private triggerHit(id: string, token: Phaser.GameObjects.Arc) {
    if (this.killerState.lunging) {
      this.killerState.lunging = false;
      this.killerState.lungeTimer = 0;
    }

    // Visual feedback (Flash)
    const flash = this.add.circle(token.x, token.y, 25, 0xffffff, 0.8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => flash.destroy()
    });

    // Survivor speed burst / reaction
    const ai = this.survivorAiData[id];
    if (ai && ai.state !== 'lookback') { // Don't reset if already in advanced flee
       ai.state = 'flee';
       ai.fleeTimer = 8;
    }
    
    if (this.onSurvivorHit) this.onSurvivorHit(id);
    
    // Brief killer slowdown after hit (cooldown)
    this.killerState.lungeCooldown = 2.0;
  }

  update(_time: number, delta: number) {
    if (!this.isSimulationRunning) return;
    
    const deltaSeconds = delta / 1000;
    
    // Dynamic speeds based on killer stats (1m = 4.68px)
    const walkSpeed = this.killerBaseSpeed * 4.68 * deltaSeconds;
    const lungeSpeed = walkSpeed * 1.5; // 150% speed during lunge
    const survivorSpeed = 4.0 * 4.68 * deltaSeconds;

    // 1. Killer AI
    let killerTargetPos: { x: number, y: number } | null = null;
    let targetId: string | null = null;
    let isChasingNow = false;
    
    // Lunge State Management
    if (this.killerState.lungeCooldown > 0) this.killerState.lungeCooldown -= deltaSeconds;
    if (this.killerState.lungeTimer > 0) {
      this.killerState.lungeTimer -= deltaSeconds;
      if (this.killerState.lungeTimer <= 0) this.killerState.lunging = false;
    }

    // Find first standing visible survivor to chase
    for (const id in this.survivorTokens) {
      if (this.survivorStatuses[id] === 'downed') continue;
      const surv = this.survivorTokens[id];
      if (this.canSee('killer', surv.x, surv.y)) {
        killerTargetPos = { x: surv.x, y: surv.y };
        targetId = id;
        isChasingNow = true;
        break;
      }
    }

    // Persistence Logic: If lost sight, keep moving to last known for 5s
    if (isChasingNow) {
      this.killerState.isCurrentlyTracking = true;
      this.killerState.lostTargetTimer = 5.0; // Reset timer
      this.killerState.lastKnownTargetPos = killerTargetPos;
    } else if (this.killerState.isCurrentlyTracking) {
      this.killerState.lostTargetTimer -= deltaSeconds;
      killerTargetPos = this.killerState.lastKnownTargetPos;
      
      if (this.killerState.lostTargetTimer <= 0) {
        this.killerState.isCurrentlyTracking = false;
        this.killerState.lastKnownTargetPos = null;
        killerTargetPos = null;
      }
    }

    // If no one to chase/track, patrol
    if (!killerTargetPos) {
      if (this.killerState.wanderWaitTimer > 0) {
        this.killerState.wanderWaitTimer -= deltaSeconds;
        this.updateFOV('killer'); // Just update position
      } else {
        if (!this.killerState.wanderTarget) {
          this.killerState.wanderTarget = { x: Phaser.Math.Between(100, 900), y: Phaser.Math.Between(100, 900) };
        }
        killerTargetPos = this.killerState.wanderTarget;
        
        if (Phaser.Math.Distance.Between(this.killerToken.x, this.killerToken.y, killerTargetPos.x, killerTargetPos.y) < 20) {
          this.killerState.wanderTarget = null;
          this.killerState.wanderWaitTimer = Phaser.Math.Between(1, 3);
          killerTargetPos = null;
        }
      }
    }

    if (killerTargetPos) {
      const dist = Phaser.Math.Distance.Between(this.killerToken.x, this.killerToken.y, killerTargetPos.x, killerTargetPos.y);
      const angle = Phaser.Math.Angle.Between(this.killerToken.x, this.killerToken.y, killerTargetPos.x, killerTargetPos.y);
      
      let currentSpeed = walkSpeed;
      if (isChasingNow || this.killerState.isCurrentlyTracking) {
        if (isChasingNow && !this.killerState.lunging && this.killerState.lungeCooldown <= 0 && dist < 40) {
          this.killerState.lunging = true;
          this.killerState.lungeTimer = 0.5;
        }
        currentSpeed = this.killerState.lunging ? lungeSpeed : walkSpeed;
      } else {
        currentSpeed = walkSpeed * 0.7; // Patrolling is slower
      }
      
      const nextX = this.killerToken.x + Math.cos(angle) * currentSpeed;
      const nextY = this.killerToken.y + Math.sin(angle) * currentSpeed;
      
      const boundedX = Phaser.Math.Clamp(nextX, 20, 980);
      const boundedY = Phaser.Math.Clamp(nextY, 20, 980);
      
      this.killerToken.setPosition(boundedX, boundedY);
      this.terrorRadiusCircle.setPosition(boundedX, boundedY);
      
      if (isChasingNow && targetId && this.killerState.lunging && dist < 15) {
        this.triggerHit(targetId, this.survivorTokens[targetId]);
      }

      if (this.fovModes['killer'] === 'auto') {
        const smoothedAngle = Phaser.Math.Angle.RotateTo(this.lastAngles['killer'], angle, 0.1);
        this.updateFOV('killer', smoothedAngle);
        if (this.onKillerRotate) this.onKillerRotate(smoothedAngle);
      } else {
        this.updateFOV('killer');
      }

      if (this.onKillerMove) this.onKillerMove(boundedX, boundedY);
    }

    // 2. Survivor AI
    for (const id in this.survivorTokens) {
      const surv = this.survivorTokens[id];
      const ai = this.survivorAiData[id];
      if (!ai) continue;
      
      if (this.survivorStatuses[id] === 'downed') {
        this.updateFOV(id);
        continue;
      }

      const dist = Phaser.Math.Distance.Between(surv.x, surv.y, this.killerToken.x, this.killerToken.y);
      const seesKiller = this.canSee(id, this.killerToken.x, this.killerToken.y, 35);
      
      // State Transitions
      if (seesKiller && dist < 120) {
        if (ai.state === 'idle') {
          ai.state = 'flee';
          ai.fleeTimer = 5;
        }
      }

      // Movement behavior
      if (ai.state === 'idle') {
        // WANDERING OR SCANNING
        if (dist < 200) {
          // Calculate intensity: 0 at 200px, 1 at 0px
          const intensity = 1 - (dist / 200);
          
          // Modulate range: from 45 deg to 180 deg (full sweep)
          const scanRange = (Math.PI / 4) + (intensity * (Math.PI * 0.75));
          
          // Modulate speed: period from 400ms down to 100ms (frantic)
          const scanSpeed = 400 - (intensity * 300);
          
          const scanAngle = Math.sin(this.time.now / scanSpeed) * scanRange;
          this.updateFOV(id, ai.scanBaseAngle + scanAngle);
          ai.wanderTarget = null; // Stop wandering if killer is close
          
          if (seesKiller && dist < 120) {
            ai.state = 'flee';
            ai.fleeTimer = 5;
          }
        } else {
          // Normal Wandering
          if (ai.wanderWaitTimer > 0) {
            ai.wanderWaitTimer -= deltaSeconds;
            this.updateFOV(id);
          } else {
            if (!ai.wanderTarget) {
              ai.wanderTarget = { x: Phaser.Math.Between(50, 950), y: Phaser.Math.Between(50, 950) };
            }
            
            const distToTarget = Phaser.Math.Distance.Between(surv.x, surv.y, ai.wanderTarget.x, ai.wanderTarget.y);
            if (distToTarget < 20) {
              ai.wanderTarget = null;
              ai.wanderWaitTimer = Phaser.Math.Between(2, 5);
            } else {
              const wanderAngle = Phaser.Math.Angle.Between(surv.x, surv.y, ai.wanderTarget.x, ai.wanderTarget.y);
              const currentWanderSpeed = survivorSpeed * 0.5; // Exploration is slow
              
              const nextX = surv.x + Math.cos(wanderAngle) * currentWanderSpeed;
              const nextY = surv.y + Math.sin(wanderAngle) * currentWanderSpeed;
              
              const boundedX = Phaser.Math.Clamp(nextX, 20, 980);
              const boundedY = Phaser.Math.Clamp(nextY, 20, 980);
              
              surv.setPosition(boundedX, boundedY);
              
              if (this.fovModes[id] === 'auto') {
                const smoothedAngle = Phaser.Math.Angle.RotateTo(this.lastAngles[id], wanderAngle, 0.1);
                this.updateFOV(id, smoothedAngle);
                if (this.onSurvivorRotate) this.onSurvivorRotate(id, smoothedAngle);
              } else {
                this.updateFOV(id);
              }
              if (this.onSurvivorMove) this.onSurvivorMove(id, boundedX, boundedY);
            }
          }
        }
      } else {
        // FLEEING OR LOOKBACK
        ai.fleeTimer -= deltaSeconds;
        
        if (ai.fleeTimer <= 0 && ai.state === 'flee') {
          ai.state = 'lookback';
        }

        // NEW: If looking back and see the killer, panic and flee again!
        if (ai.state === 'lookback' && seesKiller) {
          ai.state = 'flee';
          ai.fleeTimer = 4; // Flee for 4 more seconds before checking again
        }

        if (dist > 350) {
          ai.state = 'idle';
          ai.fleeTimer = 0;
          ai.scanBaseAngle = this.lastAngles[id] || 0;
          ai.wanderTarget = null;
        }

        const angleAway = Phaser.Math.Angle.Between(this.killerToken.x, this.killerToken.y, surv.x, surv.y);
        const currentSurvivorSpeed = ai.fleeTimer > 5 ? survivorSpeed * 1.5 : survivorSpeed;

        const nextX = surv.x + Math.cos(angleAway) * currentSurvivorSpeed;
        const nextY = surv.y + Math.sin(angleAway) * currentSurvivorSpeed;
        
        const boundedX = Phaser.Math.Clamp(nextX, 20, 980);
        const boundedY = Phaser.Math.Clamp(nextY, 20, 980);
        
        surv.setPosition(boundedX, boundedY);
        
        if (this.fovModes[id] === 'auto') {
          let fovTargetAngle = angleAway;
          if (ai.state === 'lookback') {
            fovTargetAngle = Phaser.Math.Angle.Between(surv.x, surv.y, this.killerToken.x, this.killerToken.y);
          }

          const smoothedAngle = Phaser.Math.Angle.RotateTo(this.lastAngles[id], fovTargetAngle, 0.1);
          this.updateFOV(id, smoothedAngle);
          if (this.onSurvivorRotate) this.onSurvivorRotate(id, smoothedAngle);
        } else {
          this.updateFOV(id);
        }
        
        if (this.onSurvivorMove) this.onSurvivorMove(id, boundedX, boundedY);
      }
    }
    
    this.updateLineOfSight();
  }

  public setSurvivorPosition(id: string, x: number, y: number) {
    if (this.survivorTokens[id]) {
      this.survivorTokens[id].setPosition(x, y);
      this.updateLineOfSight();
    }
  }

  private updateLineOfSight() {
    const survivorIds = Object.keys(this.survivorTokens);
    if (survivorIds.length > 0 && this.killerToken && this.losLine) {
      const firstSurv = this.survivorTokens[survivorIds[0]];
      this.losLine.setTo(
        this.killerToken.x, this.killerToken.y,
        firstSurv.x, firstSurv.y
      );
      this.losLine.setVisible(true);
    } else if (this.losLine) {
      this.losLine.setVisible(false);
    }
  }
}
