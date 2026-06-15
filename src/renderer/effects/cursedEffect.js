import { clamp, perpendicularVector, randomBetween } from "../../utils/geometry.js";
import {
  activePortalPlane,
  convergenceFlow,
  convergePoint,
  effectFocus,
  effectGravity,
  effectOpacity,
  effectScale,
  effectSuspension,
  particleAlpha,
  particleDepth,
  portalOutDirection,
  pruneParticles,
  randomPortalPoint,
  scaledParticleCount,
  spellLifetimeFrames,
  steadyParticleAlpha
} from "./effectUtils.js";

// Foundation for dynamic/procedural animations and cursed spells
function cursedFlowConfig(spellIR, ring, portal, frame) {
  const direction = portalOutDirection(spellIR);
  const side = perpendicularVector(direction);
  const scale = effectScale(spellIR);
  const focus = effectFocus(spellIR);
  const gravity = effectGravity(spellIR);
  const suspension = effectSuspension(spellIR);
  const suspended = suspension >= 0.55;
  const convergence = convergenceFlow(spellIR, portal, frame);

  return {
    suspended,
    gravity,
    suspension,
    direction,
    side,
    convergence,
    suspendedLife: spellLifetimeFrames(spellIR),
    suspendedHeight: ring.radius * (0.34 + spellIR.force * 0.18 + scale * 0.08),
    suspendedRadiusX: ring.radius * (0.16 + spellIR.spread * 0.16 + scale * 0.04),
    suspendedRadiusY: ring.radius * (0.11 + spellIR.spread * 0.12 + scale * 0.028),
    suspendedBob: ring.radius * (0.008 + (1 - spellIR.stability) * 0.014),
    suspendedWander: ring.radius * (0.012 + spellIR.spread * 0.03),
    suspendedTension: 0.014 + spellIR.stability * 0.018,
    suspendedDamping: 0.954 + spellIR.stability * 0.03
  };
}

function spawnFlowCursedParticle(spellIR, ring, portal, flow) {
  const scale = effectScale(spellIR);
  const source = randomPortalPoint(portal, 0.8, 0.8);
  const speed = randomBetween(2.0, 6.0) * (0.5 + spellIR.force);
  const phase = randomBetween(0, Math.PI * 2);

  return {
    x: source.x,
    y: source.y,
    vx: flow.direction.x * speed + randomBetween(-1, 1),
    vy: flow.direction.y * speed + randomBetween(-1, 1),
    radius: randomBetween(3, 8) * (0.75 + spellIR.force),
    phase,
    age: 0,
    life: randomBetween(20, 50)
  };
}

function updateFlowCursedParticle(particle, flow, dt) {
  particle.age += dt;

  // Erratic cursed movement
  particle.vx += Math.sin(particle.phase + particle.age * 0.5) * 0.5 * dt;
  particle.vy += Math.cos(particle.phase + particle.age * 0.5) * 0.5 * dt;

  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
}

function drawCursedParticle(ctx, particle, flow, spellIR, opacity) {
  const alpha = particleAlpha(particle) * opacity;
  const displayRadius = particle.radius;

  const gradient = ctx.createRadialGradient(
    particle.x, particle.y, 0,
    particle.x, particle.y, displayRadius
  );

  // Purple/Black cursed coloring
  gradient.addColorStop(0, `rgba(150, 0, 255, ${alpha})`);
  gradient.addColorStop(0.5, `rgba(50, 0, 80, ${alpha * 0.8})`);
  gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, displayRadius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCursedEffect(ctx, state, spellIR, ring, dt, config) {
  const scale = effectScale(spellIR);
  const opacity = effectOpacity(spellIR);
  const portal = activePortalPlane(ctx.canvas, ring);
  state.cursedFrame = (state.cursedFrame ?? 0) + dt;
  const flow = cursedFlowConfig(spellIR, ring, portal, state.cursedFrame);

  const targetCount = scaledParticleCount(150 * (0.78 + scale * 0.32), spellIR, config);

  while (state.particles.length < targetCount) {
    state.particles.push(spawnFlowCursedParticle(spellIR, ring, portal, flow));
  }

  for (const particle of state.particles) {
    updateFlowCursedParticle(particle, flow, dt);
    drawCursedParticle(ctx, particle, flow, spellIR, opacity);
  }

  pruneParticles(state);
}
