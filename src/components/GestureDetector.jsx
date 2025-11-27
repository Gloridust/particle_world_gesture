import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useStore } from '../store';

const GestureDetector = () => {
  const videoRef = useRef(null);
  const { updateGesture } = useStore();
  const [status, setStatus] = useState('initializing'); // initializing, loading_wasm, loading_model, ready, error
  const [errorMsg, setErrorMsg] = useState('');
  const handLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    let animationFrameId;

    const predictWebcam = () => {
      if (!handLandmarkerRef.current || !videoRef.current) return;

      if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
        lastVideoTimeRef.current = videoRef.current.currentTime;
        
        const startTimeMs = performance.now();
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
        
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          // Calculate center of palm
          const centerX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
          const centerY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;
          
          // Map to -1 to 1 range (flip X because webcam is mirrored usually)
          const x = (centerX - 0.5) * -2; 
          const y = -(centerY - 0.5) * 2; 
          
          const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
          
          // Normalize by hand size (wrist to middle MCP)
          const handSize = dist(landmarks[0], landmarks[9]);
          const tipDist = dist(landmarks[0], landmarks[12]);
          
          const isClosed = tipDist < handSize * 1.2; 
          
          updateGesture({
            isHandDetected: true,
            position: { x, y, z: 0 },
            handState: isClosed ? 'closed' : 'open',
          });
        } else {
          updateGesture({ isHandDetected: false });
        }
      }

      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    const startWebcam = async () => {
      try {
        setStatus('requesting_camera');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
             setStatus('ready');
             predictWebcam();
          });
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setStatus('error');
        setErrorMsg('无法访问摄像头，请检查权限。');
      }
    };

    const initMediaPipe = async () => {
      try {
        setStatus('loading_wasm');
        // Use local WASM files from /public/wasm
        const vision = await FilesetResolver.forVisionTasks(
          "/wasm"
        );
        
        setStatus('loading_model');
        // Try to load model. 
        // Note: Ideally this should be a local file too, but user download failed.
        // We keep the google storage URL as primary but user might need VPN.
        // If we had a local file, we would use "/models/hand_landmarker.task"
        // Let's check if the file exists locally (partial download?) -> No way to check from browser easily without trying to fetch.
        // We will try local first, then fallback to CDN?
        // Actually, just use the CDN link but catch error.
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        startWebcam();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setStatus('error');
        setErrorMsg(`AI 初始化失败: ${error.message || '网络错误，无法加载模型'}`);
      }
    };

    initMediaPipe();

    // Capture ref value for cleanup
    const videoElement = videoRef.current;

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      // Clean up video stream
      if (videoElement && videoElement.srcObject) {
         const tracks = videoElement.srcObject.getTracks();
         tracks.forEach(track => track.stop());
      }
    };
  }, [updateGesture]);

  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-none">
      {/* Status / Error Display */}
      {status !== 'ready' && (
        <div className="bg-black/80 text-tech-blue p-4 rounded border border-tech-blue mb-2 backdrop-blur max-w-xs pointer-events-auto">
            <div className="font-bold mb-1">SYSTEM STATUS</div>
            <div className="text-xs font-mono">
                {status === 'initializing' && 'INITIALIZING...'}
                {status === 'loading_wasm' && 'LOADING ENGINE (WASM)...'}
                {status === 'loading_model' && 'DOWNLOADING AI MODEL (10MB)...'}
                {status === 'requesting_camera' && 'WAITING FOR CAMERA...'}
                {status === 'error' && <span className="text-red-500">{errorMsg}</span>}
            </div>
            {status === 'error' && (
                <div className="mt-2 text-[10px] text-gray-400">
                    <p>如果下载失败，请尝试手动下载模型文件：</p>
                    <a href="https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">点击下载 hand_landmarker.task</a>
                    <p className="mt-1">下载后放入项目 public/models/ 目录中。</p>
                </div>
            )}
        </div>
      )}

       {/* Small preview of webcam to know it's working */}
      <video 
        ref={videoRef} 
        className={`w-32 h-24 object-cover rounded-lg border-2 border-tech-blue transform scale-x-[-1] transition-opacity duration-500 ${status === 'ready' ? 'opacity-50 hover:opacity-100 pointer-events-auto' : 'opacity-0'}`}
        autoPlay 
        playsInline
        muted
      />
    </div>
  );
};

export default GestureDetector;
