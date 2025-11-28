import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

// Shader
const vertexShader = `
  uniform float uTime;
  uniform float uMorph;
  uniform float uScale;
  uniform vec2 uRotation;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  
  attribute vec3 aTarget;
  attribute float aSize;
  
  varying vec3 vColor;
  varying float vAlpha;

  // Simplex noise function (simplified)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // Mix positions
    vec3 pos = mix(position, aTarget, uMorph);
    
    // Add noise based movement
    float noiseVal = snoise(vec3(pos.x * 0.5, pos.y * 0.5, uTime * 0.5));
    pos += normal * noiseVal * 0.2;
    
    // Apply Hand Gesture Transformations
    // Rotation (Simplified around Y and X axis)
    float c = cos(uRotation.y);
    float s = sin(uRotation.y);
    mat3 rotY = mat3(
      c, 0.0, -s,
      0.0, 1.0, 0.0,
      s, 0.0, c
    );
    
    c = cos(uRotation.x);
    s = sin(uRotation.x);
    mat3 rotX = mat3(
      1.0, 0.0, 0.0,
      0.0, c, s,
      0.0, -s, c
    );
    
    pos = rotY * rotX * pos;
    
    // Scale
    pos *= uScale;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = aSize * (20.0 / -mvPosition.z);
    
    // Color gradient
    vColor = mix(uColor1, uColor2, pos.y * 0.1 + 0.5);
    vAlpha = 0.8 + noiseVal * 0.2;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;
    
    // Soft edge
    float alpha = smoothstep(0.5, 0.3, dist) * vAlpha;
    
    gl_FragColor = vec4(vColor, alpha);
  }
`

const COUNT = 3000

export function ParticleSystem() {
  const meshRef = useRef()
  const pointsRef = useRef()
  const { currentShape, inputText, handData } = useStore()
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uScale: { value: 1 },
    uRotation: { value: new THREE.Vector2(0, 0) },
    uColor1: { value: new THREE.Color(0.2, 0.5, 1.0) },
    uColor2: { value: new THREE.Color(1.0, 0.2, 0.5) }
  }), [])

  // Generate initial positions (Universe)
  const [initialPositions, sizes] = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)
    
    for (let i = 0; i < COUNT; i++) {
      const r = 10 * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      
      sizes[i] = Math.random() * 2 + 0.5
    }
    return [positions, sizes]
  }, [])

  // Target positions buffer
  const targetPositions = useMemo(() => new Float32Array(COUNT * 3), [])

  // Update target positions based on shape
  useEffect(() => {
    generateShape(currentShape, targetPositions, inputText)
    
    // Trigger morph animation
    if (meshRef.current) {
      // Need to update the 'position' attribute to be the PREVIOUS target
      // And 'aTarget' to be the NEW target
      // For simplicity in this iteration, we just animate uMorph from 0 to 1
      // But to make it continuous, we swap buffers.
      
      // Swap logic:
      // 1. current visual state -> position attribute
      // 2. new shape -> aTarget attribute
      // 3. animate uMorph 0 -> 1
      
      // For this MVP, we assume uMorph is always animating 0->1 when shape changes
      // But we need to capture current state. 
      // A simpler approach: Always keep 'position' as the source and update 'aTarget'.
      // When morph is done, copy 'aTarget' to 'position' and reset uMorph.
      
      // Let's use a simple linear interpolation reset
      const attrPos = meshRef.current.geometry.attributes.position
      const attrTarget = meshRef.current.geometry.attributes.aTarget
      
      // If this is not the first run
      if (uniforms.uMorph.value >= 1) {
         // Copy target to position
         attrPos.array.set(attrTarget.array)
         attrPos.needsUpdate = true
         uniforms.uMorph.value = 0
      }
      
      attrTarget.array.set(targetPositions)
      attrTarget.needsUpdate = true
      
      // Update colors based on shape
      if (currentShape === 'ironman') {
        uniforms.uColor1.value.set(0.0, 0.8, 1.0) // Cyan
        uniforms.uColor2.value.set(0.0, 0.4, 1.0) // Deep Blue
      } else if (currentShape === 'heart') {
        uniforms.uColor1.value.set(1.0, 0.2, 0.5) // Pink
        uniforms.uColor2.value.set(1.0, 0.0, 0.2) // Red
      } else {
        uniforms.uColor1.value.set(0.2, 0.5, 1.0) // Blue
        uniforms.uColor2.value.set(1.0, 0.2, 0.5) // Pink/Red
      }
    }
  }, [currentShape, inputText])

  useFrame((state, delta) => {
    if (meshRef.current) {
      uniforms.uTime.value += delta
      
      // Morph animation
      uniforms.uMorph.value = THREE.MathUtils.lerp(uniforms.uMorph.value, 1, delta * 2)
      
      // Hand Interaction
      if (handData && handData.gestures) {
        const { scale, rotation } = handData.gestures
        // Smoothly interpolate gestures - Reduced factor for smoother, heavier feel
        // Lower value = more lag/smoothness (heavier). Higher = more responsive (snappier)
        const smoothFactor = 3.5
        uniforms.uScale.value = THREE.MathUtils.lerp(uniforms.uScale.value, scale || 1, delta * smoothFactor)
        uniforms.uRotation.value.x = THREE.MathUtils.lerp(uniforms.uRotation.value.x, rotation?.[0] || 0, delta * smoothFactor)
        uniforms.uRotation.value.y = THREE.MathUtils.lerp(uniforms.uRotation.value.y, rotation?.[1] || 0, delta * smoothFactor)
      }
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={initialPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTarget"
          count={COUNT}
          array={targetPositions} // Initially same as position or empty, updated by effect
          itemSize={3}
        />
         <bufferAttribute
          attach="attributes-aSize"
          count={COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function generateShape(type, buffer, text) {
  const count = buffer.length / 3
  
  if (type === 'universe') {
    for (let i = 0; i < count; i++) {
      const r = 10 * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      buffer[i*3] = r * Math.sin(phi) * Math.cos(theta)
      buffer[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      buffer[i*3+2] = r * Math.cos(phi)
    }
  } else if (type === 'heart') {
    for (let i = 0; i < count; i++) {
       // Heart surface/volume
       const t = Math.random() * Math.PI * 2
       const u = Math.random() * Math.PI
       
       // A simple heart curve expanded to 3D
       const x = 16 * Math.pow(Math.sin(t), 3)
       const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)
       const z = (Math.random() - 0.5) * 5 // Thickness
       
       const scale = 0.3
       buffer[i*3] = x * scale + (Math.random()-0.5)
       buffer[i*3+1] = y * scale + (Math.random()-0.5)
       buffer[i*3+2] = z * scale
    }
  } else if (type === 'sphere' || type === 'planet') {
     for (let i = 0; i < count; i++) {
      const r = 5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      buffer[i*3] = r * Math.sin(phi) * Math.cos(theta)
      buffer[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      buffer[i*3+2] = r * Math.cos(phi)
    }
  } else if (type === 'text' && text) {
    // Generate text points
    const points = getTextPoints(text)
    if (points.length > 0) {
      for (let i = 0; i < count; i++) {
        const p = points[i % points.length]
        buffer[i*3] = p.x * 0.1 - 10 // Scale and center approx
        buffer[i*3+1] = -p.y * 0.1 + 5
        buffer[i*3+2] = (Math.random() - 0.5) * 2
      }
    }
  } else if (type === 'ironman') {
    // Arc Reactor Shape
    for (let i = 0; i < count; i++) {
      const section = Math.random()
      let x, y, z
      
      if (section < 0.2) {
        // Center core
        const r = 2 * Math.sqrt(Math.random())
        const theta = Math.random() * Math.PI * 2
        x = r * Math.cos(theta)
        y = r * Math.sin(theta)
        z = (Math.random() - 0.5) * 1
      } else if (section < 0.6) {
        // Outer ring
        const r = 6 + Math.random() * 0.5
        const theta = Math.random() * Math.PI * 2
        x = r * Math.cos(theta)
        y = r * Math.sin(theta)
        z = (Math.random() - 0.5) * 0.5
      } else {
        // Spokes/Tech details
        const r = 2 + Math.random() * 4
        // 10 main spokes
        const spoke = Math.floor(Math.random() * 10)
        const theta = (spoke / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.1
        x = r * Math.cos(theta)
        y = r * Math.sin(theta)
        z = (Math.random() - 0.5) * 2
      }
      
      buffer[i*3] = x
      buffer[i*3+1] = y
      buffer[i*3+2] = z
    }
  } else {
    // Fallback random
     for (let i = 0; i < count; i++) {
      buffer[i*3] = (Math.random() - 0.5) * 20
      buffer[i*3+1] = (Math.random() - 0.5) * 20
      buffer[i*3+2] = (Math.random() - 0.5) * 20
    }
  }
}

function getTextPoints(text) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 400
  canvas.height = 200
  
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, 400, 200)
  ctx.fillStyle = 'white'
  ctx.font = 'bold 100px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 200, 100)
  
  const imageData = ctx.getImageData(0, 0, 400, 200)
  const points = []
  const step = 2 // Sampling step
  
  for (let y = 0; y < 200; y += step) {
    for (let x = 0; x < 400; x += step) {
      const index = (y * 400 + x) * 4
      if (imageData.data[index] > 128) {
        points.push({ x: x - 200, y: y - 100 })
      }
    }
  }
  return points
}
