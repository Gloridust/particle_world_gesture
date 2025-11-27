import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

const COUNT = 8000;
const PARTICLE_SIZE = 0.05;

// Helper to generate shapes
const generateShape = (type, text = '') => {
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  
  const color = new THREE.Color();

  for (let i = 0; i < COUNT; i++) {
    let x, y, z;
    
    if (type === 'universe') {
      // Random spread
      const r = 10 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
      color.setHSL(Math.random(), 0.8, 0.8);
    } else if (type === 'starry_sky') {
      x = (Math.random() - 0.5) * 30;
      y = (Math.random() - 0.5) * 30;
      z = (Math.random() - 0.5) * 10;
      color.setHSL(0.6, 0.8, 0.9);
    } else if (type === 'heart') {
      // Heart shape
      // x = 16sin^3(t)
      // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
      // z = random thickness
      const t = Math.random() * 2 * Math.PI;
      const r = Math.sqrt(Math.random()); // Even distribution
      // Re-map t to distribute points better? simple random is okay for now
      
      // We need to distribute points inside the heart volume or surface
      // Let's do surface + some noise
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI; // Just random sphere-ish mapping but applied to heart eq?
      
      // Let's use simple rejection sampling or parametric surface
      // 3D Heart: (x^2 + 9/4y^2 + z^2 - 1)^3 - x^2z^3 - 9/80y^2z^3 = 0
      // Hard to generate random points directly.
      
      // Use 2D heart extruded or rotated?
      // Let's use 2D parametric and add Z depth
      const tt = Math.random() * 2 * Math.PI;
      const scale = 0.3;
      x = scale * 16 * Math.pow(Math.sin(tt), 3);
      y = scale * (13 * Math.cos(tt) - 5 * Math.cos(2*tt) - 2 * Math.cos(3*tt) - Math.cos(4*tt));
      z = (Math.random() - 0.5) * 2;
      
      // Randomize slightly to fill volume
      x += (Math.random() - 0.5) * 0.5;
      y += (Math.random() - 0.5) * 0.5;
      
      color.setHSL(0.95, 1, 0.6); // Red/Pink
    } else if (type === 'flower') {
        const u = Math.random() * 2 * Math.PI;
        const v = Math.random() * Math.PI;
        const scale = 3;
        // Rose/Flower parametric
        const k = 5; // Petals
        const r = Math.cos(k * u);
        x = scale * r * Math.cos(u);
        y = scale * r * Math.sin(u);
        z = (Math.random() - 0.5) * 2;
        color.setHSL(u / (2 * Math.PI), 0.8, 0.6);
    } else if (type === 'saturn') {
        // Planet + Rings
        const isRing = Math.random() > 0.4;
        if (isRing) {
             const angle = Math.random() * Math.PI * 2;
             const dist = 3 + Math.random() * 3;
             x = Math.cos(angle) * dist;
             z = Math.sin(angle) * dist;
             y = (Math.random() - 0.5) * 0.2;
             color.setHSL(0.1, 0.8, 0.6); // Gold/Orange
        } else {
            // Planet body
            const r = 2 * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = r * Math.cos(phi);
            color.setHSL(0.08, 0.9, 0.5);
        }
        // Tilt Saturn
        const tilt = 0.4;
        const tempY = y;
        y = y * Math.cos(tilt) - z * Math.sin(tilt);
        z = tempY * Math.sin(tilt) + z * Math.cos(tilt);
        
    } else if (type === 'fireworks') {
        const r = 5 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        color.setHSL(Math.random(), 1, 0.6);
    } else {
       // Default sphere
       const r = 5 * Math.cbrt(Math.random());
       const theta = Math.random() * 2 * Math.PI;
       const phi = Math.acos(2 * Math.random() - 1);
       x = r * Math.sin(phi) * Math.cos(theta);
       y = r * Math.sin(phi) * Math.sin(theta);
       z = r * Math.cos(phi);
       color.setHSL(0.6, 1, 0.5);
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  return { positions, colors };
};

// Text generation helper
const generateTextPoints = (text) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 100;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const validPoints = [];
    for(let y = 0; y < canvas.height; y += 2) {
        for(let x = 0; x < canvas.width; x += 2) {
            const index = (y * canvas.width + x) * 4;
            if (data[index] > 128) {
                // Found a pixel
                // Map to 3D space. 
                // Canvas 200x100 -> World 10x5
                const worldX = (x / canvas.width - 0.5) * 10;
                const worldY = -(y / canvas.height - 0.5) * 5;
                validPoints.push({ x: worldX, y: worldY, z: 0 });
            }
        }
    }
    
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const color = new THREE.Color();
    color.setHSL(0.55, 0.9, 0.7);

    for (let i = 0; i < COUNT; i++) {
        const pt = validPoints[i % validPoints.length] || {x:0, y:0, z:0};
        // Add some jitter
        positions[i * 3] = pt.x + (Math.random() - 0.5) * 0.1;
        positions[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 0.1;
        positions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 0.5;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    return { positions, colors };
}


const ParticleSystem = () => {
  const { currentShape, text, gesture } = useStore();
  const pointsRef = useRef();
  
  // Buffers for current state and target state
  const particles = useMemo(() => {
    const { positions, colors } = generateShape('universe');
    return {
      currentPositions: new Float32Array(positions),
      targetPositions: new Float32Array(positions),
      colors: new Float32Array(colors),
      targetColors: new Float32Array(colors),
    };
  }, []);

  // Update target when shape changes
  useEffect(() => {
    let data;
    if (currentShape === 'text') {
        data = generateTextPoints(text);
    } else {
        data = generateShape(currentShape);
    }
    
    // Update target buffers
    particles.targetPositions.set(data.positions);
    particles.targetColors.set(data.colors);
    
  }, [currentShape, text, particles]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array;
    const colors = pointsRef.current.geometry.attributes.color.array;
    
    const smoothing = 3 * delta; // Interpolation speed
    
    const { isHandDetected, position: handPos, handState } = gesture;
    
    // Convert hand pos to world space roughly
    // Hand pos is -1 to 1 in x, -1 to 1 in y.
    // Camera is at z=5 usually.
    // World space width at z=0 is approx 10 units?
    const targetX = handPos.x * 5;
    const targetY = handPos.y * 3;
    const targetZ = 0;
    
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      
      // 1. Interpolate towards target shape
      const tx = particles.targetPositions[i3];
      const ty = particles.targetPositions[i3 + 1];
      const tz = particles.targetPositions[i3 + 2];
      
      // Current pos
      let cx = positions[i3];
      let cy = positions[i3 + 1];
      let cz = positions[i3 + 2];
      
      // Basic Morphing
      cx += (tx - cx) * smoothing;
      cy += (ty - cy) * smoothing;
      cz += (tz - cz) * smoothing;
      
      // 2. Apply Gesture Interaction
      if (isHandDetected) {
         const dx = cx - targetX;
         const dy = cy - targetY;
         const dz = cz - targetZ;
         const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
         
         if (handState === 'closed') {
             // Attraction / Shrink
             if (dist < 4) {
                 const force = (4 - dist) * 2 * delta;
                 cx -= dx * force;
                 cy -= dy * force;
                 cz -= dz * force;
             }
         } else {
             // Repulsion / Diffusion / Wave
             // If open hand, maybe repel slightly or follow?
             // Requirement: "zoom and diffusion"
             // Let's say open hand = diffuse/repel
             if (dist < 2.5) {
                 const force = (2.5 - dist) * 5 * delta;
                 cx += dx * force;
                 cy += dy * force;
                 cz += dz * force;
             }
         }
      } else {
          // Inertia / Gravity / Breathing
          // Add subtle noise movement
          const time = state.clock.elapsedTime;
          cx += Math.sin(time + cx) * 0.002;
          cy += Math.cos(time + cy) * 0.002;
          cz += Math.sin(time + cz) * 0.002;
      }

      positions[i3] = cx;
      positions[i3 + 1] = cy;
      positions[i3 + 2] = cz;
      
      // Color interpolation
      colors[i3] += (particles.targetColors[i3] - colors[i3]) * smoothing;
      colors[i3 + 1] += (particles.targetColors[i3 + 1] - colors[i3 + 1]) * smoothing;
      colors[i3 + 2] += (particles.targetColors[i3 + 2] - colors[i3 + 2]) * smoothing;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    
    // Rotate entire system slowly
    if (!isHandDetected) {
        pointsRef.current.rotation.y += 0.05 * delta;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={particles.currentPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={COUNT}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={PARTICLE_SIZE}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ParticleSystem;
