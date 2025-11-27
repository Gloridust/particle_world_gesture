import { useEffect, useRef } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useStore } from '../store'

export function GestureDetector() {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const requestRef = useRef(null)
  const { setHandData } = useStore()
  const lastVideoTimeRef = useRef(-1)
  
  // Smoothing state
  const smoothedState = useRef({
    scale: 1,
    rotation: [0, 0],
    center: [0, 0]
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

    // Throttle detection to ~30 FPS to save performance
    const now = performance.now()
    // if (now - lastPredictionTimeRef.current < 33) {
    //   requestRef.current = requestAnimationFrame(predictWebcam)
    //   return
    // }
    // lastPredictionTimeRef.current = now

    try {
      if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
        lastVideoTimeRef.current = videoRef.current.currentTime
        const startTime = performance.now()
        const result = landmarkerRef.current.detectForVideo(videoRef.current, startTime)
        
        if (result.landmarks) {
          // Analyze gestures
          const rawGestures = analyzeGestures(result.landmarks)
          
          // Apply Smoothing (Exponential Moving Average)
          // Alpha 0.1 = very smooth, 0.5 = responsive
          const alpha = 0.15 
          const curr = smoothedState.current
  
          // Simple Lerp function
          const lerp = (start, end, t) => start * (1 - t) + end * t
  
          curr.scale = lerp(curr.scale, rawGestures.scale, alpha)
          curr.rotation[0] = lerp(curr.rotation[0], rawGestures.rotation[0], alpha)
          curr.rotation[1] = lerp(curr.rotation[1], rawGestures.rotation[1], alpha)
          curr.center[0] = lerp(curr.center[0], rawGestures.center[0], alpha)
          curr.center[1] = lerp(curr.center[1], rawGestures.center[1], alpha)
  
          setHandData({ 
            landmarks: result.landmarks,
            gestures: {
              scale: curr.scale,
              rotation: [...curr.rotation],
              center: [...curr.center],
              isPinching: rawGestures.isPinching // Pass pinch state
            }
          })
        } else {
          setHandData({ 
            landmarks: [], 
            gestures: smoothedState.current 
          })
        }
      }
    } catch (err) {
      console.error("MediaPipe Detect Error:", err)
    }

    requestRef.current = requestAnimationFrame(predictWebcam)
  }

  // Simple gesture analysis logic
  const analyzeGestures = (landmarks) => {
    // Use the previous smoothed rotation as the default to prevent snapping back to 0
    // when gestures are not active
    const defaultRotation = smoothedState.current ? smoothedState.current.rotation : [0, 0]
    
    if (!landmarks || landmarks.length === 0) return { scale: 1, rotation: defaultRotation }

    const gestures = {
      scale: smoothedState.current.scale, // Default to current smoothed scale
      rotation: defaultRotation, // Default to current smoothed rotation
      center: [0, 0],
      isPinching: false
    }

    // Calculate average center (still needed for some logic, though maybe less for rotation now)
    let cx = 0, cy = 0
    landmarks.forEach(hand => {
      hand.forEach(point => {
        cx += point.x
        cy += point.y
      })
    })
    const totalPoints = landmarks.length * 21
    gestures.center = [cx / totalPoints, cy / totalPoints]

    // If two hands, calculate distance for scaling
    if (landmarks.length === 2) {
      const hand1 = landmarks[0][0] // Wrist
      const hand2 = landmarks[1][0] // Wrist
      
      // Calculate 3D distance (approximate)
      const dx = hand1.x - hand2.x
      const dy = hand1.y - hand2.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      
      // Normalize distance (0.2 to 0.8 is typical range)
      gestures.scale = 1 + (dist - 0.5) * 2
      
      // Double hand rotation (optional: can keep rotation active for 2 hands or not)
      // For now, let's say rotation is only single hand pinch-drag, 
      // or maybe double hand movement rotates too? 
      // Let's keep double hand rotation for now based on center movement
      gestures.rotation = [
        (gestures.center[1] - 0.5) * 3, 
        -(gestures.center[0] - 0.5) * 3 
      ]
      gestures.isPinching = true // Treat 2 hands as active interaction

    } else if (landmarks.length === 1) {
      const hand = landmarks[0]
      const thumb = hand[4]
      const index = hand[8]
      
      const dx = thumb.x - index.x
      const dy = thumb.y - index.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      
      // Pinch Detection Threshold
      // Increased threshold to make it easier to trigger
      const isPinching = dist < 0.12
      gestures.isPinching = isPinching

      if (isPinching) {
        // PINCH DETECTED: Enable Rotation/Drag
        // Map X/Y position to rotation
        // Removed negative signs to fix inverted control direction
        gestures.rotation = [
          (gestures.center[1] - 0.5) * 3, 
          -(gestures.center[0] - 0.5) * 3 
        ]
      } 
      // Else: rotation remains defaultRotation (holding state)
    }

    return gestures
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

