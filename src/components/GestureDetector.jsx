import { useEffect, useRef } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useStore } from '../store'

export function GestureDetector() {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const requestRef = useRef(null)
  const { setHandData } = useStore()
  const lastVideoTimeRef = useRef(-1)
  
  // Persistent Interaction State (Incremental)
  const interactionState = useRef({
    scale: 1,
    rotation: [0, 0]
  })

  // Previous frame data for delta calculation
  const prevFrameData = useRef({
    dist: null,
    center: null,
    isPinching: false
  })

  useEffect(() => {
    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        '/wasm'
      )
      
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2
      })

      startCamera()
    }

    initMediaPipe()

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [])

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.addEventListener('loadeddata', predictWebcam)
      }
    } catch (e) {
      console.error("Camera access denied", e)
    }
  }

  const lastPredictionTimeRef = useRef(0)

  const predictWebcam = () => {
    if (!landmarkerRef.current || !videoRef.current) {
      requestRef.current = requestAnimationFrame(predictWebcam)
      return
    }

    // Throttle detection to ~30 FPS
    const now = performance.now()
    // if (now - lastPredictionTimeRef.current < 33) { ... }

    try {
      if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
        lastVideoTimeRef.current = videoRef.current.currentTime
        const startTime = performance.now()
        const result = landmarkerRef.current.detectForVideo(videoRef.current, startTime)
        
        if (result.landmarks) {
          // Calculate deltas and update state
          processGestures(result.landmarks)
          
          setHandData({ 
            landmarks: result.landmarks,
            gestures: {
              scale: interactionState.current.scale,
              rotation: [...interactionState.current.rotation],
              isPinching: prevFrameData.current.isPinching
            }
          })
        } else {
           // No hands: Reset previous data to avoid huge jumps when hands reappear
           prevFrameData.current = { dist: null, center: null, isPinching: false }
           
           setHandData({ 
            landmarks: [], 
            gestures: {
              scale: interactionState.current.scale,
              rotation: [...interactionState.current.rotation],
              isPinching: false
            }
          })
        }
      }
    } catch (err) {
      console.error("MediaPipe Detect Error:", err)
    }

    requestRef.current = requestAnimationFrame(predictWebcam)
  }

  const processGestures = (landmarks) => {
    const state = interactionState.current
    const prev = prevFrameData.current
    
    let isPinching = false
    let currentDist = null
    let currentCenter = null

    // Helper: Pinch distance
    const getPinchDist = (hand) => {
      const thumb = hand[4]
      const index = hand[8]
      return Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2))
    }

    // 1. Two Hands Logic
    if (landmarks.length === 2) {
      const h1 = landmarks[0]
      const h2 = landmarks[1]
      
      const isH1Pinching = getPinchDist(h1) < 0.12
      const isH2Pinching = getPinchDist(h2) < 0.12
      
      // Only activate if BOTH hands are pinching
      if (isH1Pinching && isH2Pinching) {
        isPinching = true
        
        // Calculate Wrist Distance for Scale
        const h1Wrist = h1[0]
        const h2Wrist = h2[0]
        const dx = h1Wrist.x - h2Wrist.x
        const dy = h1Wrist.y - h2Wrist.y
        currentDist = Math.sqrt(dx*dx + dy*dy)
        
        // Calculate Center for Rotation
        currentCenter = [
           (h1Wrist.x + h2Wrist.x) / 2,
           (h1Wrist.y + h2Wrist.y) / 2
        ]

        // Apply Scale Delta
        // Only if we had a valid previous distance AND we were pinching previously
        if (prev.dist && prev.isPinching && prev.center) {
          // Scale
          const scaleFactor = currentDist / prev.dist
          // Limit extreme jumps
          if (scaleFactor > 0.8 && scaleFactor < 1.2) {
             state.scale *= scaleFactor
          }

          // Rotation (Movement Delta)
          // Map movement delta to rotation
          const deltaX = currentCenter[0] - prev.center[0]
          const deltaY = currentCenter[1] - prev.center[1]
          
          // Sensitivity
          const rotSensitivity = 4.0
          state.rotation[0] += deltaY * rotSensitivity // Up/Down movement -> X rotation
          state.rotation[1] -= deltaX * rotSensitivity // Left/Right movement -> Y rotation (Mirror corrected)
        }
      }
    } 
    // 2. Single Hand Logic
    else if (landmarks.length === 1) {
      const hand = landmarks[0]
      if (getPinchDist(hand) < 0.12) {
        isPinching = true
        
        const wrist = hand[0]
        currentCenter = [wrist.x, wrist.y]
        
        // Apply Rotation Delta (No Scale)
        if (prev.isPinching && prev.center) {
           const deltaX = currentCenter[0] - prev.center[0]
           const deltaY = currentCenter[1] - prev.center[1]
           
           const rotSensitivity = 4.0
           state.rotation[0] += deltaY * rotSensitivity
           state.rotation[1] -= deltaX * rotSensitivity
        }
      }
    }

    // Update previous frame data
    prev.dist = currentDist
    prev.center = currentCenter
    prev.isPinching = isPinching
    
    // Clamp scale
    state.scale = Math.max(0.1, Math.min(state.scale, 5.0))
  }

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      className="hidden" 
      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
    />
  )
}
