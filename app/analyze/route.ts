import { type NextRequest, NextResponse } from "next/server"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { generateText } from "ai"

// Create NVIDIA NIM provider instance
const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Extract base64 data from the data URL
    const base64Data = image.split(",")[1]

    // Use NVIDIA NIM to analyze the image
    const { text } = await generateText({
      model: nim.chatModel("deepseek-ai/deepseek-r1"),
      prompt: `
        You are an assistant for blind people. Analyze this image and describe:
        1. Any obstacles or hazards in the path
        2. Signs, displays, or information boards with their content
        3. General description of the environment (indoors/outdoors, crowded/empty)
        4. Directions or pathways visible
        
        Keep your description concise (under 100 words), focused on navigation-relevant details, 
        and formatted for text-to-speech. Start with the most important safety information.
      `,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image for a blind person navigating a space." },
            { type: "image", image: new URL(`data:image/jpeg;base64,${base64Data}`) },
          ],
        },
      ],
    })

    return NextResponse.json({ description: text })
  } catch (error) {
    console.error("Error processing image:", error)
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 })
  }
}

