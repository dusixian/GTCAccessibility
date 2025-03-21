// Create NVIDIA NIM provider instance
export async function analyzeImage(imageBlob: Blob): Promise<string> {
    try {
      // Encode image to base64
      const base64Image = await encodeImageToBase64(imageBlob)
  
      // Use server API endpoint instead of direct client-side API call
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      })
  
      if (!response.ok) {
        throw new Error("Failed to analyze image")
      }
  
      const data = await response.json()
      return data.description
    } catch (error) {
      console.error("Error analyzing image:", error)
      return "I'm having trouble analyzing your surroundings. Please try again."
    }
  }
  
  // Function to encode image to base64
  async function encodeImageToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        resolve(base64String)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
  
  