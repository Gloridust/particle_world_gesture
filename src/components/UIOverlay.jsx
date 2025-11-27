import { useStore } from '../store'
import { Maximize, Minimize, Hand } from 'lucide-react'
import { useState, useEffect } from 'react'

const SHAPES = [
  { id: 'universe', label: '宇宙' },
  { id: 'heart', label: '爱心' },
  { id: 'sphere', label: '星球' },
  { id: 'text', label: '文字' },
  { id: 'ironman', label: 'MK-85' },
]

export function UIOverlay() {
  const { currentShape, setShape, inputText, setInputText, handData } = useStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [localText, setLocalText] = useState('')

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const handleShapeClick = (id) => {
    setShape(id)
    if (id === 'text') {
      setShowInput(true)
    } else {
      setShowInput(false)
    }
  }

  const handleTextSubmit = (e) => {
    e.preventDefault()
    setInputText(localText)
  }

  // Detect hand status
  const hasHand = handData?.landmarks?.length > 0
  
  let gestureStatus = '等待手势...'
  if (hasHand) {
    if (handData.landmarks.length === 2) {
      gestureStatus = '双手: 距离缩放 + 移动'
    } else {
      // Check if pinching
      gestureStatus = handData.gestures?.isPinching ? '单手: 🤏 捏合旋转中' : '单手: ✋ 张开暂停'
    }
  }

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-6">
      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-4 rounded-lg text-cyan-400 font-mono text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Hand size={16} className={hasHand ? "text-cyan-400 animate-pulse" : "text-gray-600"} />
            <span className={hasHand ? "text-cyan-100" : "text-gray-500"}>{gestureStatus}</span>
          </div>
          {hasHand && (
             <div className="text-xs text-cyan-600">
               <div>Scale: {handData.gestures.scale.toFixed(2)}</div>
               <div>Rot: [{handData.gestures.rotation[0].toFixed(1)}, {handData.gestures.rotation[1].toFixed(1)}]</div>
             </div>
          )}
        </div>

        <button 
          onClick={toggleFullscreen}
          className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-3 rounded-full hover:bg-cyan-900/20 transition-colors text-cyan-400"
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>

      {/* Center Text Input */}
      {showInput && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              placeholder="输入文字..."
              className="bg-black/60 border border-cyan-500 text-cyan-100 px-4 py-2 rounded outline-none focus:ring-2 ring-cyan-400/50 font-mono"
            />
            <button type="submit" className="bg-cyan-600/20 border border-cyan-500 text-cyan-400 px-4 py-2 rounded hover:bg-cyan-600/40">
              生成
            </button>
          </form>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex justify-center gap-4 pointer-events-auto mb-8">
        <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-2 rounded-xl flex gap-2">
          {SHAPES.map(shape => (
            <button
              key={shape.id}
              onClick={() => handleShapeClick(shape.id)}
              className={`px-6 py-2 rounded-lg font-mono text-sm transition-all duration-300 ${
                currentShape === shape.id 
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                  : 'text-cyan-400 hover:bg-cyan-900/30'
              }`}
            >
              {shape.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cyan-500/20 rounded-tl-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-cyan-500/20 rounded-tr-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-cyan-500/20 rounded-bl-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-cyan-500/20 rounded-br-3xl pointer-events-none" />
    </div>
  )
}

