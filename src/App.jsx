import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import GestureDetector from './components/GestureDetector';
import ParticleSystem from './components/ParticleSystem';
import UIOverlay from './components/UIOverlay';

function App() {
  return (
    <>
      <GestureDetector />
      <UIOverlay />
      
      <div className="absolute inset-0 z-0 bg-black">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{ antialias: false, alpha: false }}
          dpr={[1, 2]} // Support high DPI
        >
          <color attach="background" args={['#050505']} />
          
          <Suspense fallback={null}>
            <ParticleSystem />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          </Suspense>
          
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={0.5}
            maxDistance={20}
            minDistance={2}
          />
        </Canvas>
      </div>
    </>
  );
}

export default App;
