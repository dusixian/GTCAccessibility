"use client"

import { useState, useEffect, useRef } from "react"

export default function BlindAssistant() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [feedback, setFeedback] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Start camera when component mounts
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        console.log("Camera activated")
      } catch (error) {
        console.error("Error accessing camera:", error)
        setFeedback("Could not access camera. Please grant permission.")
      }
    }

    setupCamera()

    // Cleanup function
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Process frames when active
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isActive && !isProcessing) {
      intervalId = setInterval(processCurrentFrame, 2000) // Process every 2 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isActive, isProcessing])

  // Function to process the current video frame
  async function processCurrentFrame() {
    if (!videoRef.current || !canvasRef.current || isProcessing) return

    setIsProcessing(true)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (!context || video.videoWidth === 0) {
        // Video might not be ready yet
        setIsProcessing(false)
        return
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to blob
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            try {
              // Simulate image analysis (replace with actual API call)
              const result =
                "This is a simulated environment description. In a real app, this would be the result of image analysis."

              // Update feedback with analysis results
              setFeedback(result)

              // Provide audio feedback for blind users
              speakFeedback(result)
            } catch (analysisError) {
              console.error("Error in image analysis:", analysisError)
              setFeedback("Error analyzing the environment. Please try again.")
            }
          } else {
            setFeedback("Could not capture image from camera.")
          }
          setIsProcessing(false)
        },
        "image/jpeg",
        0.8,
      )
    } catch (error) {
      console.error("Error processing frame:", error)
      setFeedback("Error analyzing the environment. Please try again.")
      setIsProcessing(false)
    }
  }

  // Function to speak feedback using text-to-speech
  function speakFeedback(text: string) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0 // Normal speaking rate
      utterance.pitch = 1.0 // Normal pitch
      utterance.volume = 1.0 // Full volume
      window.speechSynthesis.speak(utterance)
    }
  }

  // Toggle assistant active state
  function toggleAssistant() {
    setIsActive(!isActive)
    if (!isActive) {
      setFeedback("Assistant activated. Analyzing your surroundings...")
      speakFeedback("Assistant activated. I will help you navigate by describing your surroundings.")
    } else {
      setFeedback("Assistant paused. Tap to resume.")
      speakFeedback("Assistant paused.")
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Blind Navigation Assistant</h1>

      {/* Main video feed (hidden visually but needed for processing) */}
      <div className="relative w-full max-w-md">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Feedback area */}
      <div className="w-full max-w-md mt-6 p-4 bg-gray-800 text-white rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Environment Description:</h2>
        <p className="text-lg">{feedback || "Waiting to analyze environment..."}</p>
      </div>

      {/* Controls */}
      <div className="fixed bottom-10 w-full max-w-md flex justify-center">
        <button
          className={`rounded-full w-24 h-24 text-xl ${
            isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
          }`}
          onClick={toggleAssistant}
        >
          {isActive ? "Pause" : "Start"}
        </button>
      </div>
    </div>
  )
}

