import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense } from 'react'
import { UIOverlay } from './components/UIOverlay'
import { GestureDetector } from './components/GestureDetector'
import { ParticleSystem } from './components/ParticleSystem'

function App() {
  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
         <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
            <color attach="background" args={['#050510']} />
            <Suspense fallback={null}>
              <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <ParticleSystem />
            </Suspense>
            <OrbitControls makeDefault enablePan={false} enableZoom={true} />
         </Canvas>
      </div>
      
      {/* Components */}
      <GestureDetector />
      <UIOverlay />
    </div>
  )
}

export default App

