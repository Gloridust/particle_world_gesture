import { useEffect, useRef } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useStore } from '../store'

export function GestureDetector() {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const requestRef = useRef(null)
  const { setHandData } = useStore()
  const lastVideoTimeRef = useRef(-1)

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

  const predictWebcam = () => {
    if (!landmarkerRef.current || !videoRef.current) return

    let startTimeMs = performance.now()
    
    if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
      lastVideoTimeRef.current = videoRef.current.currentTime
      const startTime = performance.now()
      const result = landmarkerRef.current.detectForVideo(videoRef.current, startTime)
      
      if (result.landmarks) {
        // Analyze gestures
        const gestureData = analyzeGestures(result.landmarks)
        setHandData({ 
          landmarks: result.landmarks,
          gestures: gestureData
        })
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam)
  }

  // Simple gesture analysis logic
  const analyzeGestures = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return { scale: 1, rotation: [0, 0] }

    const gestures = {
      scale: 1,
      rotation: [0, 0],
      center: [0, 0]
    }

    // If two hands, calculate distance for scaling
    if (landmarks.length === 2) {
      const hand1 = landmarks[0][0] // Wrist
      const hand2 = landmarks[1][0] // Wrist
      
      // Calculate 3D distance (approximate)
      const dx = hand1.x - hand2.x
      const dy = hand1.y - hand2.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      
      // Normalize distance (0.2 to 0.8 is typical range)
      // Map to scale factor
      gestures.scale = 1 + (dist - 0.5) * 2
    } else if (landmarks.length === 1) {
      // Single hand pinch detection (Thumb tip 4 and Index tip 8)
      const hand = landmarks[0]
      const thumb = hand[4]
      const index = hand[8]
      
      const dx = thumb.x - index.x
      const dy = thumb.y - index.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      
      // Map pinch distance to scale
      // Normal pinch is close to 0, open hand is > 0.2
      // Let's map 0.05 -> 1.0 scale, 0.2 -> 2.0 scale
      gestures.scale = 0.5 + dist * 5
    }

    // Calculate average center for rotation/movement effect
    let cx = 0, cy = 0
    landmarks.forEach(hand => {
      hand.forEach(point => {
        cx += point.x
        cy += point.y
      })
    })
    const totalPoints = landmarks.length * 21
    gestures.center = [cx / totalPoints, cy / totalPoints]

    // Map X position to rotation Y (left/right swipe)
    // Reversed directions to fix mirroring issue
    gestures.rotation = [
      -(gestures.center[1] - 0.5) * 3, // Y rotation based on X pos (inverted) - Increased sensitivity
      -(gestures.center[0] - 0.5) * 3  // X rotation based on Y pos - Increased sensitivity
    ]

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

