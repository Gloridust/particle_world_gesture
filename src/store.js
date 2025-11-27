import { create } from 'zustand'

export const useStore = create((set) => ({
  currentShape: 'universe',
  text: 'PARTICLE',
  gesture: {
    isHandDetected: false,
    handState: 'open', // 'open', 'closed'
    position: { x: 0, y: 0, z: 0 },
    delta: { x: 0, y: 0 }, // Movement delta for inertia
  },
  
  setShape: (shape) => set({ currentShape: shape }),
  setText: (text) => set({ text }),
  
  updateGesture: (newGesture) => set((state) => ({
    gesture: { ...state.gesture, ...newGesture }
  })),
}))
