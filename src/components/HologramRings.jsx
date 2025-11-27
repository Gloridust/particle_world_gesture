import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Ring, Torus } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'

export function HologramRings() {
  const { currentShape } = useStore()
  const groupRef = useRef()
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.1
    }
  })

  if (currentShape !== 'ironman') return null

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
      {/* Outer Ring with dashed pattern texture could be better, but simple geometry works for now */}
      <Ring args={[8, 8.2, 64]} opacity={0.3} transparent>
        <meshBasicMaterial color="#00f3ff" side={THREE.DoubleSide} transparent opacity={0.3} />
      </Ring>
      
      {/* Rotating inner rings */}
      <InnerRing radius={6} speed={-0.2} color="#00f3ff" width={0.1} />
      <InnerRing radius={5.5} speed={0.1} color="#00f3ff" width={0.05} dashed />
      <InnerRing radius={3} speed={0.3} color="#00f3ff" width={0.2} />
      
      {/* Grid floor effect */}
      <gridHelper args={[30, 30, 0x004444, 0x001111]} position={[0, -0.1, 0]} rotation={[-Math.PI/2, 0, 0]} />
    </group>
  )
}

function InnerRing({ radius, speed, color, width, dashed }) {
  const ref = useRef()
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * speed
    }
  })

  return (
    <mesh ref={ref}>
      <ringGeometry args={[radius, radius + width, 64, 1, 0, Math.PI * 2]} />
      <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.4} wireframe={dashed} />
    </mesh>
  )
}

