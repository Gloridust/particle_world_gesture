import { create } from 'zustand'

export const useStore = create((set) => ({
  handData: { gestures: [], landmarks: [] },
  setHandData: (data) => set({ handData: data }),
  currentShape: 'universe', // universe, star, heart, flower, saturn, fireworks, text
  setShape: (shape) => set({ currentShape: shape }),
  inputText: '',
  setInputText: (text) => set({ inputText: text }),
}))

