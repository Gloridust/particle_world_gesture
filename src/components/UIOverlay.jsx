import React, { useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

const SHAPES = [
  { id: 'universe', label: 'Universe', icon: '🌌' },
  { id: 'starry_sky', label: 'Star Field', icon: '✨' },
  { id: 'heart', label: 'Heart', icon: '❤️' },
  { id: 'flower', label: 'Flower', icon: '🌸' },
  { id: 'saturn', label: 'Saturn', icon: '🪐' },
  { id: 'fireworks', label: 'Fireworks', icon: '🎆' },
];

const UIOverlay = () => {
  const { currentShape, setShape, text, setText } = useStore();
  const [inputText, setInputText] = useState(text);
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    setText(inputText);
    setShape('text');
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-40">
      
      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-tech-panel backdrop-blur-md p-4 rounded-lg border border-tech-blue shadow-[0_0_15px_rgba(0,243,255,0.3)]">
          <h1 className="text-2xl font-bold text-tech-blue tracking-wider">PARTICLE WORLD</h1>
          <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            SYSTEM ONLINE
          </div>
        </div>

        <button 
          onClick={toggleFullScreen}
          className="bg-tech-panel backdrop-blur-md p-3 rounded-lg border border-gray-600 hover:border-tech-blue hover:text-tech-blue transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>
      </div>

      {/* Controls */}
      <div className="pointer-events-auto self-center md:self-end flex flex-col gap-4 max-w-sm w-full">
        
        {/* Toggle Menu */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden self-end bg-tech-panel p-2 rounded border border-tech-blue text-tech-blue"
        >
          {isMenuOpen ? 'Hide Controls' : 'Show Controls'}
        </button>

        <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-tech-panel backdrop-blur-md p-5 rounded-xl border border-gray-700 shadow-2xl"
          >
            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-700 pb-2">Holographic Projector</h3>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => setShape(shape.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-300 ${
                    currentShape === shape.id 
                      ? 'bg-tech-blue/20 border-tech-blue text-tech-blue shadow-[0_0_10px_rgba(0,243,255,0.3)]' 
                      : 'bg-black/40 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  <span className="text-2xl mb-1">{shape.icon}</span>
                  <span className="text-[10px] font-bold">{shape.label}</span>
                </button>
              ))}
            </div>

            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-700 pb-2">Text Matrix</h3>
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text..."
                maxLength={10}
                className="flex-1 bg-black/50 border border-gray-600 rounded px-3 py-2 text-white focus:border-tech-blue focus:outline-none text-sm font-tech"
              />
              <button 
                type="submit"
                className="bg-tech-blue/20 border border-tech-blue text-tech-blue px-4 py-2 rounded hover:bg-tech-blue hover:text-black transition-colors font-bold text-sm"
              >
                GENERATE
              </button>
            </form>
            
            <div className="mt-6 text-[10px] text-gray-500 font-mono">
              <p>GESTURE CONTROL ACTIVE</p>
              <p>HAND DETECTED: <span className="text-green-500">SCANNING...</span></p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default UIOverlay;
