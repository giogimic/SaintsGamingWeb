import { BabylonEngine, SpriteSheetConfig } from './BabylonEngine';
import { clampCameraFocus } from './helpers/babylonViewHelpers';

import { HemisphericLight, DirectionalLight, ImageProcessingPostProcess, Light, ShadowGenerator, Camera, TargetCamera, Vector3, Matrix, Color3, Color4, Texture, StandardMaterial } from '@babylonjs/core';

import { DynamicTexture, Scene, ParticleSystem, FreeCamera } from '@babylonjs/core';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';


export class Renderer {
  public engine: BabylonEngine;
  constructor(engine: BabylonEngine) {
    this.engine = engine;
  }

public ambientLight?: HemisphericLight;
public dirLight?: DirectionalLight;
public shadowGen?: ShadowGenerator;
public vignettePostProcess?: ImageProcessingPostProcess;
public isFreeCam: boolean = false;
public cameraYaw: number = 0;
public cameraPitch: number = Math.PI / 4;
public cameraDistance: number = 20;
public targetCameraDistance: number = 20;
public cameraVelocityYaw: number = 0;
public cameraVelocityPitch: number = 0;
public cameraVelocityPanX: number = 0;
public cameraVelocityPanZ: number = 0;
public cameraSettings = {
    fov: 0.8,
    orbitSensitivity: 1.0,
    panSensitivity: 1.0,
    damping: 0.90,
    invertOrbitX: false,
    invertOrbitY: false,
    cursorAnchoredZoom: true,
    isometricPitch: Math.PI / 4,
    isometricDistance: 14,
    playerFollowSmoothing: 0.35,
    playerCameraStyle: 'isometric' as 'isometric' | 'follow45' | 'topdown' | 'free',
    borderClamping: true,
    vignetteEnabled: true,
    vignetteWeight: 1.5,
  };
public updateCameraAspect = (orthoSize: number = 10) => {
    if (!this.engine || !this.camera) return;
    const aspect = this.engine.engine.getRenderWidth() / Math.max(1, this.engine.engine.getRenderHeight());
    this.camera.orthoLeft = -orthoSize * aspect;
    this.camera.orthoRight = orthoSize * aspect;
    this.camera.orthoTop = orthoSize;
    this.camera.orthoBottom = -orthoSize;
  };
public onResize = () => {
    if (!this.engine) return;
    this.engine.engine.resize();
    // Re-apply current ortho size on resize
    const currentOrtho = this.camera.orthoTop || 10;
    this.updateCameraAspect(currentOrtho);
  };
public cameraProfile = { pitch: Math.PI / 4, distance: 14, lerpFactor: 0.15 };
public editorCameraBookmark: { x: number; z: number; ortho: number } | null = null;
public camera!: FreeCamera;
public cameraTargetX: number = 0;
public cameraTargetZ: number = 0;
public cameraSnapped: boolean = false;
public createProceduralTextures() {
    // Wood Floor Texture
    const woodTex = new DynamicTexture('woodFloorTex', { width: 128, height: 128 }, this.engine.scene, false);
    const wCtx = woodTex.getContext();
    wCtx.fillStyle = '#7a4f2a';
    wCtx.fillRect(0, 0, 128, 128);
    wCtx.fillStyle = '#6e4524';
    for (let j = 0; j < 60; j++) {
      wCtx.globalAlpha = 0.15;
      wCtx.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 20 + 5, Math.random() * 2 + 1);
    }
    wCtx.globalAlpha = 1;
    woodTex.update();
    this.engine.woodFloorTexture = woodTex;

    // Indoor Wall Texture
    const wallTex = new DynamicTexture('indoorWallTex', { width: 128, height: 128 }, this.engine.scene, false);
    const pCtx = wallTex.getContext();
    pCtx.fillStyle = '#d4dae4';
    pCtx.fillRect(0, 0, 128, 128);
    pCtx.fillStyle = '#bdc5d1';
    pCtx.fillRect(0, 110, 128, 18);
    pCtx.fillRect(0, 0, 128, 10);
    pCtx.fillStyle = 'rgba(0,0,0,0.025)';
    for (let i = 0; i < 300; i++) {
      pCtx.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
    wallTex.update();
    this.engine.indoorWallTexture = wallTex;

    // Animated Water Base Texture
    const waterTex = new DynamicTexture('waterTex', { width: 128, height: 128 }, this.engine.scene, true);
    this.engine.waterTexture = waterTex;
    this.updateWaterTexture(0);
  }

public updateWaterTexture(time: number) {
    if (!this.engine.waterTexture) return;
    const ctx = this.engine.waterTexture.getContext();
    const w = 128; const h = 128;
    // Base deep water
    ctx.fillStyle = '#1a4a7a';
    ctx.fillRect(0, 0, w, h);
    // Animated shimmer ripples
    ctx.strokeStyle = 'rgba(100,180,255,0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const phase = (time * 0.8 + i * 0.9) % (Math.PI * 2);
      const y = (i / 6) * h + Math.sin(phase) * 8;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const wy = y + Math.sin(x * 0.15 + phase) * 4;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    // Foam highlights
    ctx.fillStyle = 'rgba(200,230,255,0.15)';
    for (let i = 0; i < 12; i++) {
      const fx = (Math.sin(time * 0.3 + i) * 0.5 + 0.5) * w;
      const fy = (Math.cos(time * 0.4 + i * 1.3) * 0.5 + 0.5) * h;
      ctx.beginPath();
      ctx.arc(fx, fy, 4 + Math.sin(time + i) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    this.engine.waterTexture.update();
    // Apply to water materials
    this.engine.waterMaterials.forEach(m => {
      m.diffuseTexture = this.engine.waterTexture!;
    });
  }

public updateRealmVisuals(settings: any) {
    if (!this.engine.scene) return;

    // Time of Day Lighting Palette
    const tod = settings.timeOfDayPreset || 'day';
    let ambientDiffuse = new Color3(0.95, 0.95, 1.0);
    let ambientGround = new Color3(0.15, 0.2, 0.15);
    let sunDiffuse = new Color3(1.0, 0.97, 0.88);
    let defaultFog = '#0b1626';

    const moonPhase = settings.moonPhase || 'full';

    if (tod === 'golden_hour') {
      ambientDiffuse = new Color3(1.0, 0.85, 0.7);
      ambientGround = new Color3(0.25, 0.15, 0.1);
      sunDiffuse = new Color3(1.0, 0.6, 0.3);
      defaultFog = '#1c1208';
    } else if (tod === 'dusk') {
      ambientDiffuse = new Color3(0.65, 0.55, 0.85);
      ambientGround = new Color3(0.15, 0.1, 0.25);
      sunDiffuse = new Color3(0.85, 0.45, 0.65);
      defaultFog = '#140c20';
    } else if (tod === 'midnight') {
      if (moonPhase === 'eclipse') {
        ambientDiffuse = new Color3(0.35, 0.15, 0.25);
        ambientGround = new Color3(0.08, 0.04, 0.08);
        sunDiffuse = new Color3(0.75, 0.2, 0.25);
        defaultFog = '#1a0508';
      } else if (moonPhase === 'crescent') {
        ambientDiffuse = new Color3(0.18, 0.22, 0.4);
        ambientGround = new Color3(0.04, 0.06, 0.1);
        sunDiffuse = new Color3(0.3, 0.38, 0.6);
        defaultFog = '#040710';
      } else if (moonPhase === 'new') {
        ambientDiffuse = new Color3(0.1, 0.12, 0.25);
        ambientGround = new Color3(0.02, 0.03, 0.06);
        sunDiffuse = new Color3(0.15, 0.18, 0.35);
        defaultFog = '#020408';
      } else {
        // Full Moon (Default)
        ambientDiffuse = new Color3(0.3, 0.35, 0.65);
        ambientGround = new Color3(0.05, 0.08, 0.15);
        sunDiffuse = new Color3(0.5, 0.6, 0.95);
        defaultFog = '#050a14';
      }
    } else if (tod === 'fantasy_night') {
      if (moonPhase === 'eclipse') {
        ambientDiffuse = new Color3(0.35, 0.2, 0.3);
        ambientGround = new Color3(0.08, 0.05, 0.1);
        sunDiffuse = new Color3(0.65, 0.3, 0.5);
        defaultFog = '#160818';
      } else {
        ambientDiffuse = new Color3(0.2, 0.45, 0.5);
        ambientGround = new Color3(0.05, 0.15, 0.12);
        sunDiffuse = new Color3(0.3, 0.8, 0.65);
        defaultFog = '#061214';
      }
    }

    // 3D Lighting
    if (this.ambientLight) {
      this.ambientLight.intensity = settings.enable3DLighting !== false ? 0.85 : 1.1;
      this.ambientLight.diffuse = ambientDiffuse;
      this.ambientLight.groundColor = ambientGround;
    }
    if (this.dirLight) {
      this.dirLight.intensity = settings.enable3DLighting !== false ? 0.55 : 0.0;
      this.dirLight.diffuse = sunDiffuse;
    }

    // Atmospheric Depth Fog
    if (settings.enableAtmosphericFog !== false) {
      this.engine.scene.fogMode = Scene.FOGMODE_EXP2;
      this.engine.scene.fogDensity = settings.fogDensity || 0.015;
      const fogHex = settings.fogColor || defaultFog;
      this.engine.scene.fogColor = Color3.FromHexString(fogHex);
    } else {
      this.engine.scene.fogMode = Scene.FOGMODE_NONE;
    }

    // Vignette Post-Process
    if (this.vignettePostProcess) {
      this.vignettePostProcess.vignetteEnabled = settings.enableVignette !== false && settings.vignetteEnabled !== false;
      if (settings.vignetteWeight !== undefined) {
        this.vignettePostProcess.vignetteWeight = settings.vignetteWeight / 10;
      }
    }

    // Weather Particle Systems
    const weather = settings.weatherPreset || 'none';
    const intensity = (settings.weatherIntensity || 50) / 100;

    if (weather === 'none') {
      if (this.engine.weatherParticleSystem) {
        this.engine.weatherParticleSystem.stop();
        this.engine.weatherParticleSystem.dispose();
        this.engine.weatherParticleSystem = undefined;
      }
      this.engine.activeWeatherPreset = 'none';
    } else if (this.engine.activeWeatherPreset !== weather && this.camera) {
      if (this.engine.weatherParticleSystem) {
        this.engine.weatherParticleSystem.stop();
        this.engine.weatherParticleSystem.dispose();
        this.engine.weatherParticleSystem = undefined;
      }

      const ps = new ParticleSystem('realm_weather', Math.round(600 * intensity), this.engine.scene);
      this.engine.weatherParticleSystem = ps;
      this.engine.activeWeatherPreset = weather;

      // Particle Emitter Volume
      ps.emitter = new Vector3(this.cameraTargetX, 12, this.cameraTargetZ);
      ps.minEmitBox = new Vector3(-25, -2, -25);
      ps.maxEmitBox = new Vector3(25, 6, 25);

      const wind = settings.windDirection || 'south';
      const windX = wind === 'east' ? 1.5 : wind === 'west' ? -1.5 : 0;
      const windZ = wind === 'north' ? 1.5 : wind === 'south' ? -1.5 : 0;

      if (weather === 'gentle_rain') {
        ps.color1 = new Color4(0.7, 0.85, 1.0, 0.7);
        ps.color2 = new Color4(0.6, 0.75, 0.95, 0.4);
        ps.colorDead = new Color4(0.5, 0.7, 0.9, 0.0);
        ps.minSize = 0.08;
        ps.maxSize = 0.18;
        ps.minLifeTime = 0.6;
        ps.maxLifeTime = 1.2;
        ps.emitRate = Math.round(400 * intensity);
        ps.direction1 = new Vector3(windX - 0.5, -18, windZ - 0.5);
        ps.direction2 = new Vector3(windX - 1.0, -22, windZ - 1.0);
        ps.gravity = new Vector3(windX * 0.5, -9.81, windZ * 0.5);
      } else if (weather === 'falling_leaves') {
        ps.color1 = new Color4(0.95, 0.6, 0.15, 0.9);
        ps.color2 = new Color4(0.85, 0.35, 0.1, 0.8);
        ps.colorDead = new Color4(0.6, 0.2, 0.05, 0.0);
        ps.minSize = 0.25;
        ps.maxSize = 0.55;
        ps.minLifeTime = 3.0;
        ps.maxLifeTime = 6.0;
        ps.emitRate = Math.round(80 * intensity);
        ps.direction1 = new Vector3(windX * 1.5 - 1.5, -2.5, windZ * 1.5 - 1.0);
        ps.direction2 = new Vector3(windX * 1.5 + 1.5, -4.0, windZ * 1.5 + 1.0);
        ps.minAngularSpeed = -2;
        ps.maxAngularSpeed = 2;
        ps.gravity = new Vector3(windX * 0.8 - 0.5, -1.5, windZ * 0.8 - 0.5);
      } else if (weather === 'snow_flurries') {
        ps.color1 = new Color4(1.0, 1.0, 1.0, 0.9);
        ps.color2 = new Color4(0.9, 0.95, 1.0, 0.8);
        ps.colorDead = new Color4(0.8, 0.9, 1.0, 0.0);
        ps.minSize = 0.15;
        ps.maxSize = 0.35;
        ps.minLifeTime = 2.5;
        ps.maxLifeTime = 5.0;
        ps.emitRate = Math.round(200 * intensity);
        ps.direction1 = new Vector3(windX * 0.8 - 0.8, -2.0, windZ * 0.8 - 0.8);
        ps.direction2 = new Vector3(windX * 0.8 + 0.8, -3.5, windZ * 0.8 + 0.8);
        ps.gravity = new Vector3(windX * 0.3, -1.0, windZ * 0.3);
      } else if (weather === 'fireflies') {
        ps.color1 = new Color4(0.9, 1.0, 0.3, 0.95);
        ps.color2 = new Color4(0.4, 1.0, 0.6, 0.85);
        ps.colorDead = new Color4(0.2, 0.8, 0.4, 0.0);
        ps.minSize = 0.12;
        ps.maxSize = 0.28;
        ps.minLifeTime = 2.0;
        ps.maxLifeTime = 4.5;
        ps.emitRate = Math.round(60 * intensity);
        ps.direction1 = new Vector3(-0.5, 0.2, -0.5);
        ps.direction2 = new Vector3(0.5, 1.0, 0.5);
        ps.gravity = new Vector3(0, 0.2, 0);
      }

      ps.start();
    } else if (this.engine.weatherParticleSystem && this.engine.activeWeatherPreset === weather) {
      // Update emission rate on intensity slide
      this.engine.weatherParticleSystem.emitRate = Math.round(
        (weather === 'gentle_rain' ? 400 : weather === 'falling_leaves' ? 80 : weather === 'snow_flurries' ? 200 : 60) * intensity
      );
    }
  }

public createDefaultPlayerTexture() {
    const dynTex = new DynamicTexture('defaultPlayerTex', { width: 64, height: 64 }, this.engine.scene, false);
    const ctx = dynTex.getContext();

    ctx.clearRect(0, 0, 64, 64);

    // Shadow (oval using scale trick — ICanvasRenderingContext lacks ellipse)
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.save();
    ctx.scale(1, 0.28);
    ctx.beginPath();
    ctx.arc(32, 60 / 0.28, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(20, 46, 10, 16);
    ctx.fillRect(34, 46, 10, 16);

    // Boots
    ctx.fillStyle = '#3b2a1a';
    ctx.fillRect(19, 58, 12, 5);
    ctx.fillRect(33, 58, 12, 5);

    // Tunic Body (Saints purple)
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(14, 26, 36, 22);

    // Gold belt
    ctx.fillStyle = '#eab308';
    ctx.fillRect(14, 44, 36, 3);
    ctx.fillRect(29, 41, 6, 7);

    // Gold tunic trim center
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(28, 26, 8, 18);

    // Cloak/cape sides
    ctx.fillStyle = '#5b21b6';
    ctx.fillRect(10, 28, 6, 18);
    ctx.fillRect(48, 28, 6, 18);

    // Arms / Gauntlets
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(10, 26, 6, 14);
    ctx.fillRect(48, 26, 6, 14);

    // Hands
    ctx.fillStyle = '#f6c99a';
    ctx.fillRect(10, 38, 7, 7);
    ctx.fillRect(47, 38, 7, 7);

    // Neck
    ctx.fillStyle = '#f6c99a';
    ctx.fillRect(28, 20, 8, 7);

    // Head
    ctx.fillStyle = '#f6c99a';
    ctx.fillRect(18, 8, 28, 20);

    // Hair
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(16, 4, 32, 10);
    ctx.fillRect(16, 8, 4, 12);
    ctx.fillRect(44, 8, 4, 12);

    // Eyes (expressive)
    ctx.fillStyle = '#101828';
    ctx.fillRect(22, 16, 5, 6);
    ctx.fillRect(37, 16, 5, 6);
    ctx.fillStyle = '#3b82f6'; // Blue iris
    ctx.fillRect(23, 17, 3, 4);
    ctx.fillRect(38, 17, 3, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, 17, 1, 1);
    ctx.fillRect(39, 17, 1, 1);

    // Mouth
    ctx.fillStyle = '#c07050';
    ctx.fillRect(26, 24, 12, 2);

    dynTex.update();
    this.engine.defaultPlayerTexture = dynTex;
  }

public startRenderLoop(onTick?: (deltaTime: number) => void) {
    if (this.engine.isRunning) return;
    this.engine.isRunning = true;

    this.engine.engine.runRenderLoop(() => {
      if (typeof performance !== 'undefined') performance.mark('scene_render_start');
      const deltaTime = this.engine.engine.getDeltaTime() / 1000;
      this.engine.waterAnimTime += deltaTime;
      // Animate water tiles smoothly at ~10 Hz (every 100ms) to avoid CPU-to-GPU texture upload thrashing
      if (this.engine.waterAnimTime - this.engine.lastWaterUpdateTime >= 0.1) {
        this.engine.lastWaterUpdateTime = this.engine.waterAnimTime;
        this.updateWaterTexture(this.engine.waterAnimTime);
      }

      // Viewport bounds for screen-space culling (with a 4-tile margin for seamless transitions)
      const orthoH = (this.camera.orthoTop || 10) + 4.0;
      const orthoW = (this.camera.orthoRight || 16) + 4.0;
      const camX = this.cameraTargetX;
      const camZ = this.cameraTargetZ;

      // Smooth Grid Interpolation & Walking Animations
      this.engine.entityMeshes.forEach((mesh, entityId) => {
        const state = mesh.metadata;
        if (!state) return;

        // Viewport culling check (players and on-screen entities receive full animation & interpolation)
        const posX = mesh.position.x;
        const posZ = mesh.position.z;
        const isNearScreen =
          state.isPlayer ||
          (Math.abs(posX - camX) <= orthoW && Math.abs(posZ - camZ) <= orthoH);

        if (!isNearScreen) {
          // Off-screen: hide mesh & shadow, snap position directly, skip vertex UV calculations
          if (mesh.isVisible) mesh.isVisible = false;
          const shadow = this.engine.shadowMeshes.get(entityId);
          if (shadow && shadow.isVisible) shadow.isVisible = false;

          mesh.position = state.targetPos;
          return;
        }

        // On-screen: ensure visible
        if (!mesh.isVisible) mesh.isVisible = true;
        const shadow = this.engine.shadowMeshes.get(entityId);
        if (shadow && !shadow.isVisible) shadow.isVisible = true;

        // 1. Movement Interpolation
        const dist = Vector3.Distance(mesh.position, state.targetPos);
        if (state.isEditor && !state.isPlayer && !state.isCreature) {
          mesh.position = state.targetPos;
        } else {
          if (dist > 0.001) {
            // Speed matches the 250ms input cadence (4.0 tiles/sec) for seamless continuous gliding.
            // If network lag or warp creates a gap (> 1.25 tiles), smoothly accelerate to catch up.
            const speed = dist > 1.25 ? Math.min(14.0, dist * 5.5) : 4.0;
            const moveStep = speed * deltaTime;
            if (moveStep >= dist) {
              mesh.position = state.targetPos;
            } else {
              const dir = state.targetPos.subtract(mesh.position).normalize();
              mesh.position.addInPlace(dir.scale(moveStep));
            }
          } else {
            mesh.position = state.targetPos;
          }
        }

        // 2. UV Frame Cycling (per-mesh vertex UVs — not shared Texture.uScale)
        if (state.spriteConfig) {
          const config = state.spriteConfig as SpriteSheetConfig;
          if (config.columns <= 1 && config.rows <= 1) {
            if (!state.uvFullFrame) {
              this.engine.setSpriteCellUVs(mesh, 0, 0, 1, 1);
              state.uvFullFrame = true;
            }
          } else {
            state.uvFullFrame = false;
            const dir = state.direction || 'down';
            const rowIdx = config.directions[dir] ?? config.directions.down;
            let col = config.idleFrame;
            // Animate walking if moving flag is true OR if actively interpolating to targetPos
            const isEntityWalking = state.isMoving || dist > 0.01;
            if (isEntityWalking) {
              const cycleLength = config.walkCycle?.length || 4;
              const effectiveSpeed = config.walkSpeed || (cycleLength > 4 ? 10 : 6);
              state.animTime = (state.animTime || 0) + deltaTime * effectiveSpeed;
              const frameSeq = config.walkCycle;
              col = frameSeq[Math.floor(state.animTime) % frameSeq.length];
            } else {
              state.animTime = 0;
            }
            if (
              state.uvCol !== col ||
              state.uvRow !== rowIdx ||
              state.uvCols !== config.columns ||
              state.uvRows !== config.rows
            ) {
              this.engine.setSpriteCellUVs(mesh, col, rowIdx, config.columns, config.rows);
              state.uvCol = col;
              state.uvRow = rowIdx;
              state.uvCols = config.columns;
              state.uvRows = config.rows;
            }
          }
        }
      });

      // Real-time Combat & Focus Target Reticle Following
      this.engine.entity.updateTargetSelectionIndicator(deltaTime);

      // 3D Camera Momentum & Smooth Zoom Lerping
      this.applyFreeCamMomentum();

      // 2D Items rendered in 3D (bobbing, spinning, glow updates)
      this.engine.itemBillboards.update(deltaTime);

      // Dynamic Water Animation Shimmer
      if (this.engine.waterTexture) {
        this.engine.waterAnimTime += deltaTime * (this.engine.waterFlowSpeed || 1.0);
        if (performance.now() - this.engine.lastWaterUpdateTime > 50) {
          this.engine.lastWaterUpdateTime = performance.now();
          this.updateWaterTexture(this.engine.waterAnimTime);
        }
      }

      if (onTick) onTick(deltaTime);
      this.engine.scene.render();
      
      if (typeof performance !== 'undefined') {
        performance.mark('scene_render_end');
        performance.measure('scene_render_time', 'scene_render_start', 'scene_render_end');
      }
    });
  }

public stopRenderLoop() {
    this.engine.isRunning = false;
    this.engine.engine.stopRenderLoop();
  }

public snapCameraTo(worldX: number, worldZ: number) {
    if (this.cameraSettings.borderClamping) {
      const clamped = clampCameraFocus(
        worldX,
        worldZ,
        this.engine.currentMapWidth,
        this.engine.currentMapHeight,
        this.engine.currentTileSize
      );
      worldX = clamped.x;
      worldZ = clamped.z;
    }

    this.cameraTargetX = worldX;
    this.cameraTargetZ = worldZ;
    const pitch = this.cameraProfile.pitch || Math.PI / 4;
    const dist = this.cameraProfile.distance || 14;
    const yaw = this.cameraYaw || 0;
    const camY = Math.max(1.5, dist * Math.sin(pitch));
    const horizDist = dist * Math.cos(pitch);
    const offsetX = -horizDist * Math.sin(yaw);
    const offsetZ = -horizDist * Math.cos(yaw);
    this.camera.position = new Vector3(worldX + offsetX, camY, worldZ + offsetZ);
    this.camera.setTarget(new Vector3(worldX, 0, worldZ));
    this.cameraSnapped = true;
  }

public setCameraPosition(targetX: number, targetZ: number, lerpFactor: number = 0.35) {
    if (this.engine.editorCameraMode) return;

    if (this.cameraSettings.borderClamping) {
      const clamped = clampCameraFocus(
        targetX,
        targetZ,
        this.engine.currentMapWidth,
        this.engine.currentMapHeight,
        this.engine.currentTileSize
      );
      targetX = clamped.x;
      targetZ = clamped.z;
    }

    this.cameraTargetX = targetX;
    this.cameraTargetZ = targetZ;

    if (!this.cameraSnapped) {
      // Snap immediately on first call
      this.snapCameraTo(targetX, targetZ);
      return;
    }

    const pitch = this.cameraProfile.pitch || Math.PI / 4;
    const dist = this.cameraProfile.distance || 14;
    const yaw = this.cameraYaw || 0;
    const camY = Math.max(1.5, dist * Math.sin(pitch));
    const horizDist = dist * Math.cos(pitch);
    const offsetX = -horizDist * Math.sin(yaw);
    const offsetZ = -horizDist * Math.cos(yaw);
    const targetCamPos = new Vector3(targetX + offsetX, camY, targetZ + offsetZ);
    
    // Spring damper / Decoupled Physics with snappy responsive follow
    const dt = this.engine.engine.getDeltaTime() / 1000.0;
    const factor = this.cameraSettings.playerFollowSmoothing ?? lerpFactor ?? this.cameraProfile.lerpFactor ?? 0.35;
    const smoothFactor = 1.0 - Math.exp(-factor * 60 * dt);
    
    this.camera.position = Vector3.Lerp(this.camera.position, targetCamPos, smoothFactor);
    this.camera.setTarget(Vector3.Lerp(
      this.camera.getTarget(),
      new Vector3(targetX, 0, targetZ),
      smoothFactor
    ));
  }

public isEditorCameraMode(): boolean {
    return this.engine.editorCameraMode;
  }

public setEditorCameraMode(enabled: boolean) {
    if (this.engine.editorCameraMode === enabled) return;
    this.engine.editorCameraMode = enabled;
    if (this.engine.currentRawMapData) {
      this.engine.loadTilemap(this.engine.currentRawMapData);
    }
    if (enabled) {
      this.editorCameraBookmark = {
        x: this.cameraTargetX,
        z: this.cameraTargetZ,
        ortho: this.camera.orthoTop || 10,
      };
      this.engine.canvas.addEventListener('pointerdown', this.engine.input.onEditorPointerDown);
      this.engine.canvas.addEventListener('dblclick', this.engine.input.onEditorDblClick);
      this.engine.canvas.addEventListener('auxclick', this.engine.input.onEditorAuxClick);
      this.engine.canvas.addEventListener('wheel', this.engine.input.onEditorWheel, { passive: false });
      window.addEventListener('pointermove', this.engine.input.onEditorPointerMove);
      window.addEventListener('pointerup', this.engine.input.onEditorPointerUp);
      window.addEventListener('keydown', this.engine.input.onEditorKeyDown);
      window.addEventListener('keyup', this.engine.input.onEditorKeyUp);
      if (this.engine.currentMapWidth > 0 && this.engine.currentMapHeight > 0) {
        this.fitMapInView();
      }
      this.engine.setEditorMapBordersVisible(true);
    } else {
      this.engine.setEditorMapBordersVisible(false);
      this.engine.canvas.removeEventListener('pointerdown', this.engine.input.onEditorPointerDown);
      this.engine.canvas.removeEventListener('dblclick', this.engine.input.onEditorDblClick);
      this.engine.canvas.removeEventListener('auxclick', this.engine.input.onEditorAuxClick);
      this.engine.canvas.removeEventListener('wheel', this.engine.input.onEditorWheel);
      window.removeEventListener('pointermove', this.engine.input.onEditorPointerMove);
      window.removeEventListener('pointerup', this.engine.input.onEditorPointerUp);
      window.removeEventListener('keydown', this.engine.input.onEditorKeyDown);
      window.removeEventListener('keyup', this.engine.input.onEditorKeyUp);
      this.engine.input.editorPanPointerId = null;
      this.engine.input.editorSpaceHeld = false;
      this.cameraSnapped = true;
    }
  }

public restoreEditorCameraBookmark() {
    if (!this.editorCameraBookmark) return;
    const { x, z, ortho } = this.editorCameraBookmark;
    this.updateCameraAspect(ortho);
    this.snapCameraTo(x, z);
  }

public getCameraFocus(): { x: number; z: number; ortho: number } {
    return {
      x: this.cameraTargetX,
      z: this.cameraTargetZ,
      ortho: this.camera.orthoTop || 10,
    };
  }

public setFreeCam(enabled: boolean) {
    this.isFreeCam = enabled;
    if (enabled) {
      this.camera.mode = FreeCamera.PERSPECTIVE_CAMERA;
      this.camera.fov = this.cameraSettings.fov || 0.8;
      this.updateFreeCamPosition();
    } else {
      this.camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
      this.cameraYaw = 0;
      this.cameraPitch = this.cameraSettings.isometricPitch || Math.PI / 4;
      this.updateCameraAspect(this.camera.orthoTop || 10);
      this.camera.position = new Vector3(this.cameraTargetX, this.cameraSettings.isometricDistance || 14, this.cameraTargetZ - (this.cameraSettings.isometricDistance || 14));
      this.camera.setTarget(new Vector3(this.cameraTargetX, 0, this.cameraTargetZ));
      this.cameraSnapped = true;
    }
  }

public getCameraSettings() {
    return { ...this.cameraSettings };
  }

public applyPlayerCameraStyle(style: 'isometric' | 'follow45' | 'topdown' | 'free') {
    this.cameraSettings.playerCameraStyle = style;
    if (style === 'topdown') {
      this.camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
      this.cameraProfile.pitch = Math.PI / 2 - 0.01;
      this.cameraProfile.distance = 14;
      this.cameraYaw = 0;
      this.updateCameraAspect(this.camera.orthoTop || 10);
    } else if (style === 'follow45') {
      this.camera.mode = FreeCamera.PERSPECTIVE_CAMERA;
      this.camera.fov = this.cameraSettings.fov || 0.8;
      this.cameraProfile.pitch = Math.PI / 4;
      this.cameraProfile.distance = 16;
      this.cameraYaw = 0;
    } else if (style === 'free') {
      this.camera.mode = FreeCamera.PERSPECTIVE_CAMERA;
      this.camera.fov = this.cameraSettings.fov || 0.8;
      this.cameraProfile.pitch = this.cameraPitch || Math.PI / 4;
      this.cameraProfile.distance = this.cameraDistance || 18;
    } else if (style === 'isometric') {
      this.camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
      this.cameraProfile.pitch = this.cameraSettings.isometricPitch || Math.PI / 4;
      this.cameraProfile.distance = this.cameraSettings.isometricDistance || 14;
      this.cameraYaw = 0;
      this.updateCameraAspect(this.camera.orthoTop || 10);
    }
    if (!this.engine.editorCameraMode) {
      this.snapCameraTo(this.cameraTargetX, this.cameraTargetZ);
    }
  }

public setCameraSettings(settings: Partial<typeof this.cameraSettings>) {
    this.cameraSettings = { ...this.cameraSettings, ...settings };
    if (settings.fov !== undefined && this.camera) {
      this.camera.fov = settings.fov;
    }
    if (settings.vignetteEnabled !== undefined && this.vignettePostProcess) {
      this.vignettePostProcess.vignetteEnabled = settings.vignetteEnabled;
    }
    if (settings.vignetteWeight !== undefined && this.vignettePostProcess) {
      this.vignettePostProcess.vignetteWeight = settings.vignetteWeight;
    }
    if (settings.playerFollowSmoothing !== undefined) {
      this.cameraProfile.lerpFactor = settings.playerFollowSmoothing;
    }
    if (settings.playerCameraStyle !== undefined) {
      this.applyPlayerCameraStyle(settings.playerCameraStyle);
    }
    if (settings.isometricPitch !== undefined && !this.isFreeCam) {
      this.cameraProfile.pitch = settings.isometricPitch;
      this.snapCameraTo(this.cameraTargetX, this.cameraTargetZ);
    }
    if (this.isFreeCam) {
      this.updateFreeCamPosition();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('studio_camera_state_changed', { detail: { settings: this.cameraSettings } })
      );
    }
  }

public setViewAngle(preset: 'isometric' | 'topdown' | 'front' | 'back' | 'east' | 'west' | 'free') {
    switch (preset) {
      case 'isometric':
        this.cameraYaw = 0;
        this.cameraPitch = this.cameraSettings.isometricPitch || Math.PI / 4;
        this.killCameraMomentum();
        this.updateFreeCamPosition();
        break;
      case 'topdown':
        this.cameraYaw = 0;
        this.cameraPitch = Math.PI / 2 - 0.02;
        this.killCameraMomentum();
        this.updateFreeCamPosition();
        break;
      case 'front':
        this.cameraYaw = 0;
        this.cameraPitch = 0.15;
        this.killCameraMomentum();
        this.updateFreeCamPosition();
        break;
      case 'back':
        this.cameraYaw = Math.PI;
        this.cameraPitch = 0.15;
        this.killCameraMomentum();
        this.updateFreeCamPosition();
        break;
      case 'east':
        this.cameraYaw = Math.PI / 2;
        this.cameraPitch = 0.15;
        this.killCameraMomentum();
        this.updateFreeCamPosition();
        break;
      case 'west':
        this.cameraYaw = -Math.PI / 2;
        this.cameraPitch = 0.15;
        this.killCameraMomentum();
        this.updateFreeCamPosition();
        break;
      case 'free':
        if (!this.isFreeCam) {
          this.setFreeCam(true);
        }
        break;
    }
  }

public updateFreeCamPosition() {
    const cosP = Math.cos(this.cameraPitch);
    const sinP = Math.sin(this.cameraPitch);
    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    const posX = this.cameraTargetX + this.cameraDistance * cosP * sinY;
    const posY = Math.max(1.5, this.cameraDistance * sinP);
    const posZ = this.cameraTargetZ - this.cameraDistance * cosP * cosY;
    this.camera.position = new Vector3(posX, posY, posZ);
    this.camera.setTarget(new Vector3(this.cameraTargetX, 0, this.cameraTargetZ));
    this.cameraSnapped = true;
  }

public rotateFreeCam(dxPx: number, dyPx: number) {
    const invX = this.cameraSettings.invertOrbitX ? -1 : 1;
    const invY = this.cameraSettings.invertOrbitY ? -1 : 1;
    const yawDelta = dxPx * 0.004 * (this.cameraSettings.orbitSensitivity || 1.0) * invX;
    const pitchDelta = -dyPx * 0.004 * (this.cameraSettings.orbitSensitivity || 1.0) * invY;
    this.cameraYaw += yawDelta;
    this.cameraPitch = Math.max(0.08, Math.min(Math.PI / 2 - 0.05, this.cameraPitch + pitchDelta));
    // Store velocity for momentum on release
    this.cameraVelocityYaw = yawDelta;
    this.cameraVelocityPitch = pitchDelta;
    this.updateFreeCamPosition();
  }

public panFreeCamByScreenDelta(dxPx: number, dyPx: number) {
    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    const speed = (this.cameraDistance / 20) * 0.035 * (this.cameraSettings.panSensitivity || 1.0);
    const moveX = (-dxPx * cosY + dyPx * sinY) * speed;
    const moveZ = (-dxPx * sinY - dyPx * cosY) * speed;
    this.cameraTargetX += moveX;
    this.cameraTargetZ += moveZ;
    // Store velocity for momentum on release
    this.cameraVelocityPanX = moveX;
    this.cameraVelocityPanZ = moveZ;
    this.updateFreeCamPosition();
  }

public zoomFreeCam(deltaY: number) {
    // Multiplicative zoom for smooth feel instead of fixed +-2 steps
    const zoomFactor = deltaY > 0 ? 1.08 : 0.93;
    this.targetCameraDistance = Math.max(4, Math.min(120, this.targetCameraDistance * zoomFactor));
  }

public applyFreeCamMomentum() {
    if (!this.isFreeCam) return;
    let needsUpdate = false;
    const damping = this.cameraSettings.damping || 0.90;

    // Only apply momentum when pointer is NOT actively dragging
    if (this.engine.input.editorPanPointerId === null) {
      // Orbit momentum
      if (Math.abs(this.cameraVelocityYaw) > 0.0001 || Math.abs(this.cameraVelocityPitch) > 0.0001) {
        this.cameraYaw += this.cameraVelocityYaw;
        this.cameraPitch = Math.max(0.08, Math.min(Math.PI / 2 - 0.05, this.cameraPitch + this.cameraVelocityPitch));
        this.cameraVelocityYaw *= damping;
        this.cameraVelocityPitch *= damping;
        needsUpdate = true;
      }
      // Pan momentum
      if (Math.abs(this.cameraVelocityPanX) > 0.0001 || Math.abs(this.cameraVelocityPanZ) > 0.0001) {
        this.cameraTargetX += this.cameraVelocityPanX;
        this.cameraTargetZ += this.cameraVelocityPanZ;
        this.cameraVelocityPanX *= damping;
        this.cameraVelocityPanZ *= damping;
        needsUpdate = true;
      }
    }

    // Smooth zoom lerp
    const dDist = this.targetCameraDistance - this.cameraDistance;
    if (Math.abs(dDist) > 0.01) {
      this.cameraDistance += dDist * 0.15;
      needsUpdate = true;
    } else if (this.cameraDistance !== this.targetCameraDistance) {
      this.cameraDistance = this.targetCameraDistance;
      needsUpdate = true;
    }

    if (needsUpdate) {
      this.updateFreeCamPosition();
    }
  }

public killCameraMomentum() {
    this.cameraVelocityYaw = 0;
    this.cameraVelocityPitch = 0;
    this.cameraVelocityPanX = 0;
    this.cameraVelocityPanZ = 0;
  }

public resetCameraSnap() {
    this.cameraSnapped = false;
  }

public zoomCamera(factor: number) {
    const currentOrtho = this.camera.orthoTop || 10;
    const maxZoom = this.engine.editorCameraMode ? 120 : 11.0;
    const newOrtho = Math.max(2.5, Math.min(maxZoom, currentOrtho * factor));
    this.updateCameraAspect(newOrtho);
    const zoomPercent = Math.round((10 / newOrtho) * 100);
    window.dispatchEvent(
      new CustomEvent('studio_zoom_changed', { detail: { ortho: newOrtho, percent: zoomPercent } })
    );
  }

public setZoomPercent(percent: number) {
    const maxZoom = this.engine.editorCameraMode ? 120 : 11.0;
    const newOrtho = Math.max(2.5, Math.min(maxZoom, 10 / (Math.max(5, percent) / 100)));
    this.updateCameraAspect(newOrtho);
    const zoomPercent = Math.round((10 / newOrtho) * 100);
    window.dispatchEvent(
      new CustomEvent('studio_zoom_changed', { detail: { ortho: newOrtho, percent: zoomPercent } })
    );
  }

public fitMapInView() {
    const w = this.engine.currentMapWidth;
    const h = this.engine.currentMapHeight;
    const s = this.engine.currentTileSize || 1;
    if (!w || !h || !this.engine) return;
    const aspect = this.engine.engine.getRenderWidth() / Math.max(1, this.engine.engine.getRenderHeight());
    // The orthographic size needed to fit the larger dimension.
    const orthoH = (h * s) / 2 + 2;
    const orthoW = (w * s) / (2 * Math.max(0.1, aspect)) + 2;
    // Always allow large zooms when trying to fit a map in view
    const maxZoom = 120;
    const ortho = Math.max(orthoH, orthoW);
    const clamped = Math.max(2.5, Math.min(maxZoom, ortho));
    this.updateCameraAspect(clamped);
    // Center camera on true geometric map center in Babylon world coordinates
    const centerX = -0.5 * s;
    const centerZ = 0.5 * s;
    this.snapCameraTo(centerX, centerZ);
    const zoomPercent = Math.round((10 / clamped) * 100);
    window.dispatchEvent(
      new CustomEvent('studio_zoom_changed', { detail: { ortho: clamped, percent: zoomPercent } })
    );
  }

}
