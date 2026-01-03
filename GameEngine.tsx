import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  GameStatus, 
  GooseState, 
  HoopState, 
  DragState, 
  Point 
} from '../types';
import { 
  GRAVITY, 
  HOOP_RADIUS, 
  GOOSE_HITBOX_RADIUS, 
  THROW_POWER_MULTIPLIER, 
  MAX_DRAG_DISTANCE, 
  GOOSE_SPEED, 
  BACKGROUND_IMAGE_URL,
  GOOSE_IMAGE_URL,
  HOOP_IMAGE_URL,
  GROUND_Y_START,
  MAX_HOOPS,
  FRICTION
} from '../constants';

interface GameEngineProps {
  status: GameStatus;
  setStatus: (s: GameStatus) => void;
  onScoreUpdate: (points: number, isCombo: boolean) => void;
  onHoopThrow: () => void;
}

const GameEngine: React.FC<GameEngineProps> = ({ status, setStatus, onScoreUpdate, onHoopThrow }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State Refs (for Loop)
  const gameState = useRef({
    goose: {
      pos: { x: 0, y: 100, z: 0 }, // y is depth (Z in normal 3d), z is height (Y in normal 3d)
      vel: { x: 1, y: 0.5, z: 0 },
      targetPos: { x: 0, y: 0, z: 0 },
      isCaught: false,
      neckAngle: 0,
      legFrame: 0,
      direction: 1,
      pauseTimer: 0,
    } as GooseState,
    hoop: {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      active: false,
      landed: false,
      scale: 1,
    } as HoopState,
    drag: {
      isDragging: false,
      start: { x: 0, y: 0 },
      current: { x: 0, y: 0 },
    } as DragState,
    particles: [] as { x: number, y: number, vx: number, vy: number, life: number, color: string }[],
  });

  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const gooseImageRef = useRef<HTMLImageElement | null>(null);
  const hoopImageRef = useRef<HTMLImageElement | null>(null);

  // Initialize Resources
  useEffect(() => {
    // Background
    const bgImg = new Image();
    bgImg.src = BACKGROUND_IMAGE_URL;
    bgImg.onload = () => { bgImageRef.current = bgImg; };

    // Custom Goose
    if (GOOSE_IMAGE_URL) {
      const gImg = new Image();
      gImg.src = GOOSE_IMAGE_URL;
      gImg.onload = () => { gooseImageRef.current = gImg; };
    }

    // Custom Hoop
    if (HOOP_IMAGE_URL) {
      const hImg = new Image();
      hImg.src = HOOP_IMAGE_URL;
      hImg.onload = () => { hoopImageRef.current = hImg; };
    }
  }, []);

  // Initialize Game Logic
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    gameState.current.goose = {
      pos: { x: canvas.width / 2, y: 200, z: 0 },
      vel: { x: GOOSE_SPEED, y: 0, z: 0 },
      targetPos: { x: canvas.width / 2, y: 200, z: 0 },
      isCaught: false,
      neckAngle: 0,
      legFrame: 0,
      direction: 1,
      pauseTimer: 0,
    };

    resetHoop(canvas);
  }, []);

  const resetHoop = (canvas: HTMLCanvasElement) => {
    gameState.current.hoop = {
      pos: { x: canvas.width / 2, y: -50, z: 0 }, // Start at player position (negative Y implies close to camera)
      vel: { x: 0, y: 0, z: 0 },
      active: false,
      landed: false,
      scale: 1,
    };
    gameState.current.drag.isDragging = false;
  };

  // Input Handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (status !== GameStatus.PLAYING || gameState.current.hoop.active) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking near the hoop (bottom center)
    const hoopScreenX = canvas.width / 2;
    const hoopScreenY = canvas.height - 80;

    // Increased grab radius for easier mobile use
    if (Math.hypot(x - hoopScreenX, y - hoopScreenY) < 150) {
      gameState.current.drag.isDragging = true;
      gameState.current.drag.start = { x, y };
      gameState.current.drag.current = { x, y };
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!gameState.current.drag.isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    gameState.current.drag.current = { x, y };
  };

  const calculateThrowVelocity = (start: Point, current: Point) => {
    const dx = start.x - current.x; // Dragging LEFT creates Positive X velocity
    const dy = start.y - current.y; // Dragging UP creates Positive Y velocity (We want dragging DOWN to create forward velocity)
    
    // Slingshot logic: Pull BACK (Down) to shoot FORWARD (Into screen)
    // If dy is negative (dragged down), we want positive depth velocity.
    
    // Clamp drag distance for consistent power feel
    const dragDist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dragDist, MAX_DRAG_DISTANCE);
    const ratio = clampedDist / dragDist || 0;
    
    const clampedDx = dx * ratio;
    const clampedDy = dy * ratio;

    // x velocity
    const vx = clampedDx * THROW_POWER_MULTIPLIER * 1.5; 
    
    // y velocity (depth). Only if dragging down (dy < 0).
    // If dragging up, we still allow it but maybe weaker? 
    // Usually slingshot is pull back.
    const forwardPower = Math.abs(clampedDy); 
    const vy = forwardPower * THROW_POWER_MULTIPLIER * 2.0; 

    // z velocity (upwards arc). Depends on how hard you pull.
    const vz = forwardPower * THROW_POWER_MULTIPLIER * 1.5 + 5; 

    return { x: vx, y: vy, z: vz };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!gameState.current.drag.isDragging) return;
    
    const { start, current } = gameState.current.drag;
    const dragDist = Math.hypot(start.x - current.x, start.y - current.y);

    // Prevent accidental clicks
    if (dragDist < 20) {
      gameState.current.drag.isDragging = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Launch Hoop
    gameState.current.hoop.active = true;
    gameState.current.hoop.landed = false;
    gameState.current.hoop.pos.x = canvas.width / 2;
    gameState.current.hoop.pos.y = 0; 
    gameState.current.hoop.pos.z = 80; // Start height

    const velocity = calculateThrowVelocity(start, current);
    gameState.current.hoop.vel = velocity;
    
    gameState.current.drag.isDragging = false;
    onHoopThrow();
  };

  // Reset/Start handlers
  useEffect(() => {
    if (status === GameStatus.MENU) {
      initGame();
    }
  }, [status, initGame]);

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = 0;

    const render = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      // 1. Update Physics
      if (status === GameStatus.PLAYING) {
        updateGoose(canvas);
        updateHoop(canvas);
        updateParticles();
      }

      // 2. Draw
      draw(ctx, canvas);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, [status]);


  // --- Update Logic ---

  const updateGoose = (canvas: HTMLCanvasElement) => {
    const g = gameState.current.goose;
    
    if (g.isCaught) {
        // Spin or wobble if caught
        g.neckAngle = Math.sin(Date.now() / 100) * 0.5;
        return;
    }

    // Pause Logic
    if (g.pauseTimer > 0) {
        g.pauseTimer--;
        g.legFrame += 0.05; // Idle breathing
        g.neckAngle = Math.sin(Date.now() / 500) * 0.05;
        return;
    }

    // Random Movement AI
    if (Math.random() < 0.005) {
        // Stop for a bit
        g.pauseTimer = 60 + Math.random() * 100;
        return;
    }
    
    if (Math.random() < 0.02) {
      g.direction = Math.random() > 0.5 ? 1 : -1;
    }
    if (Math.random() < 0.01) {
      // Change depth slightly
      g.vel.y = (Math.random() - 0.5) * 2;
    }

    // Move X
    g.pos.x += g.vel.x * g.direction;
    // Move Depth (Y)
    g.pos.y += g.vel.y;

    // Boundaries
    const margin = 100;
    if (g.pos.x < margin) g.direction = 1;
    if (g.pos.x > canvas.width - margin) g.direction = -1;
    
    const minY = 50; // Far back
    const maxY = canvas.height * 0.55; // Close up
    if (g.pos.y < minY) g.vel.y = Math.abs(g.vel.y);
    if (g.pos.y > maxY) g.vel.y = -Math.abs(g.vel.y);

    // Animation
    g.legFrame += 0.2;
    g.neckAngle = Math.sin(g.legFrame * 0.5) * 0.15 + (g.direction * 0.1);
  };

  const updateHoop = (canvas: HTMLCanvasElement) => {
    const h = gameState.current.hoop;
    
    if (!h.active || h.landed) return;

    // Apply Velocity
    h.pos.x += h.vel.x;
    h.pos.y += h.vel.y; // Distance travel
    h.pos.z += h.vel.z;
    
    // Gravity
    h.vel.z -= GRAVITY;

    // Check Ground Collision
    if (h.pos.z <= 0) {
      h.pos.z = 0;
      h.landed = true;
      h.active = false;

      checkCollision(canvas);
      
      // Auto reset hoop after delay
      setTimeout(() => {
        resetHoop(canvas);
      }, 1000);
    }
  };

  const updateParticles = () => {
    gameState.current.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.life -= 0.05;
      if (p.life <= 0) gameState.current.particles.splice(i, 1);
    });
  };

  const checkCollision = (canvas: HTMLCanvasElement) => {
    const h = gameState.current.hoop;
    const g = gameState.current.goose;

    // Collision Logic
    // Screen coords calculation must match draw() logic.
    const horizon = canvas.height * 0.4;
    const gooseScreenY = horizon + g.pos.y;
    const gooseScreenX = g.pos.x;

    const hoopStartScreenY = canvas.height - 50;
    const hoopDepthFactor = h.pos.y; 
    const hoopScreenY = hoopStartScreenY - hoopDepthFactor; 
    
    // Distance Check
    const dist = Math.hypot(h.pos.x - gooseScreenX, hoopScreenY - gooseScreenY);
    
    // Allow generous hit
    if (dist < GOOSE_HITBOX_RADIUS) {
      handleHit(g.pos.x, gooseScreenY - 60); 
    } else {
      handleMiss(h.pos.x, hoopScreenY);
    }
  };

  const handleHit = (x: number, y: number) => {
    onScoreUpdate(100, true);
    // Spawn particles
    createParticles(x, y, '#fbbf24'); // Gold
    gameState.current.goose.isCaught = true;
    
    // Reset goose after a moment
    setTimeout(() => {
        if(gameState.current.goose.isCaught) {
             const canvas = canvasRef.current;
             if(canvas) {
                gameState.current.goose.isCaught = false;
                gameState.current.goose.pos.x = Math.random() * (canvas.width - 200) + 100;
             }
        }
    }, 1500);
  };

  const handleMiss = (x: number, y: number) => {
    onScoreUpdate(0, false);
    createParticles(x, y, '#9ca3af'); // Dust
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      gameState.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 3,
        life: 1,
        color
      });
    }
  };

  // --- Draw Logic ---

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const { width, height } = canvas;
    const { goose, hoop, drag, particles } = gameState.current;

    // 1. Background
    // Clear
    ctx.fillStyle = '#1e1b4b'; // Deep blue fallback
    ctx.fillRect(0, 0, width, height);

    if (bgImageRef.current) {
        // Draw image cover
        const imgRatio = bgImageRef.current.width / bgImageRef.current.height;
        const canvasRatio = width / height;
        let drawW, drawH, offX, offY;
        
        if (imgRatio > canvasRatio) {
             drawH = height;
             drawW = height * imgRatio;
             offX = (width - drawW) / 2;
             offY = 0;
        } else {
             drawW = width;
             drawH = width / imgRatio;
             offX = 0;
             offY = (height - drawH) / 2;
        }
        
        ctx.globalAlpha = 0.5; // Darken bg
        ctx.drawImage(bgImageRef.current, offX, offY, drawW, drawH);
        ctx.globalAlpha = 1;
    }
    
    // Draw "Ground" gradient
    const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.4, width, height * 0.6);

    // 2. Draw Goose
    const horizon = height * 0.4;
    // Scale based on screen Y roughly
    const gooseScreenY = horizon + goose.pos.y;
    // Closer to bottom (higher Y) = Bigger
    const depthRatio = goose.pos.y / (height * 0.6);
    const gooseScale = 0.5 + depthRatio * 0.7;
    
    // Draw Goose
    drawGoose(ctx, goose.pos.x, gooseScreenY, gooseScale, goose);

    // 3. Draw Hoop
    drawHoop(ctx, canvas, hoop, drag);

    // 4. Particles
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // 5. Slingshot Guide (Trajectory)
    if (drag.isDragging && !hoop.active) {
        drawTrajectory(ctx, canvas, drag);
    }
  };

  const drawGoose = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, goose: GooseState) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * (goose.direction), scale);

    // Shadow (Always draw shadow)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (gooseImageRef.current) {
         // --- Image Based Goose ---
         const img = gooseImageRef.current;
         const bob = Math.sin(goose.legFrame) * 3;
         
         // Calculate aspect ratio
         const ratio = img.naturalWidth / img.naturalHeight;
         const height = 90; // Target height
         const width = height * ratio;
         
         // Draw image centered horizontally, feet at 0 (approx bottom of image)
         // Adjust Y offset so feet touch the ground (0,0)
         ctx.drawImage(img, -width/2, -height + 15 + bob, width, height);
    } else {
        // --- Procedural Goose ---
        // Legs
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        const legOffset = Math.sin(goose.legFrame) * 5;
        
        ctx.beginPath();
        ctx.moveTo(-10, 10);
        ctx.lineTo(-10, 30 + legOffset);
        ctx.lineTo(-18, 30 + legOffset); 
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(10, 30 - legOffset);
        ctx.lineTo(2, 30 - legOffset); 
        ctx.stroke();

        // Body
        ctx.fillStyle = '#f3f4f6';
        ctx.beginPath();
        ctx.ellipse(0, -10, 32, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.save();
        ctx.translate(22, -20);
        ctx.rotate(goose.neckAngle);
        
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(-6, -35, 12, 40);
        
        // Head
        ctx.beginPath();
        ctx.arc(0, -38, 14, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(5, -40, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Blush
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(-2, -36, 3, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(12, -38);
        ctx.lineTo(28, -35);
        ctx.lineTo(12, -32);
        ctx.fill();

        ctx.restore(); 
        
        // Wing
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.ellipse(-5, -8, 18, 10, -0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  };

  const drawHoop = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, hoop: HoopState, drag: DragState) => {
    const startX = canvas.width / 2;
    const startY = canvas.height - 50;

    let x, y, scale;

    if (hoop.active || hoop.landed) {
        x = hoop.pos.x;
        // Map Y physics (distance) to Screen Y
        // StartY is bottom. As distance increases, screenY goes UP.
        y = startY - hoop.pos.y - hoop.pos.z; 
        
        // Scale decreases with distance
        // Max distance usually ~ 600
        scale = Math.max(0.3, 1 - (hoop.pos.y / 1000));
        
        // Shadow
        if (!hoop.landed) {
            const shadowY = startY - hoop.pos.y;
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(x, shadowY, 20 * scale, 8 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (drag.isDragging) {
        // Hoop follows mouse but anchored
        x = drag.current.x;
        y = drag.current.y;
        scale = 1.3;
    } else {
        x = startX;
        y = startY + 40; 
        scale = 1;
        return; 
    }

    ctx.save();
    ctx.translate(x, y);
    // Flatten the circle (or image) to simulate perspective
    ctx.scale(scale, scale * 0.4); 

    if (hoopImageRef.current) {
      // Draw Image Hoop
      // Ensure image is drawn centered
      const size = HOOP_RADIUS * 2.5; 
      ctx.drawImage(hoopImageRef.current, -size/2, -size/2, size, size);
    } else {
      // Draw Procedural Hoop
      ctx.beginPath();
      ctx.arc(0, 0, HOOP_RADIUS, 0, Math.PI * 2);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();
      
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fca5a5'; 
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawTrajectory = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, drag: DragState) => {
    const startX = canvas.width / 2;
    const startY = canvas.height - 50;
    
    // Calculate predicted path
    const vel = calculateThrowVelocity(drag.start, drag.current);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    let simX = startX;
    let simY_dist = 0; // Physics Y (distance)
    let simZ = 80;
    let simVelX = vel.x;
    let simVelY = vel.y;
    let simVelZ = vel.z;

    // Simulate roughly 60 frames
    for(let i=0; i<60; i++) {
        simX += simVelX;
        simY_dist += simVelY;
        simZ += simVelZ;
        simVelZ -= GRAVITY;
        
        // Check if hit ground
        if (simZ <= 0) {
            simZ = 0;
            const screenY = startY - simY_dist;
            
            // Draw Target Marker
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.translate(simX, screenY);
            ctx.scale(1, 0.5);
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
            break;
        }

        const screenY = startY - simY_dist - simZ;
        
        if (i % 5 === 0) {
            ctx.lineTo(simX, screenY);
        }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Drag Line
    ctx.beginPath();
    ctx.moveTo(drag.start.x, drag.start.y);
    ctx.lineTo(drag.current.x, drag.current.y);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="block w-full h-full cursor-crosshair touch-none"
      />
    </div>
  );
};

export default GameEngine;