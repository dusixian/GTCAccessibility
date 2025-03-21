import { NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_NVIDIA_API_KEY;
const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    if (image.length > 180_000) {
      return NextResponse.json(
        { error: "Image is too large, please use a smaller image" },
        { status: 400 }
      );
    }
    const systemPrompt = `You are a professional navigation assistant for blind people. Analyze the image and return a valid JSON response that follows this structure exactly:

{
  "summary": "A brief summary of the scene (max 20 words)",
  "safe_to_proceed": true/false,
  "urgent_warnings": [
    {
      "type": "danger type",
      "description": "Brief description of the immediate danger",
      "location": "specific location of the danger"
    }
  ],
  "obstacles": [
    {
      "type": "obstacle type",
      "position": "left/center/right/front",
      "distance": "distance in meters",
      "size": "small/medium/large",
      "description": "Brief description"
    }
  ],
  "ground_conditions": {
    "is_level": true/false,
    "surface_type": "concrete/grass/gravel/etc",
    "hazards": ["list of ground hazards if any"],
    "elevation_changes": {
      "type": "stairs/ramp/slope",
      "details": "number of steps or gradient"
    }
  },
  "signs": [
    {
      "type": "sign type",
      "content": "text on the sign",
      "location": "location relative to user"
    }
  ],
  "navigation": {
    "recommended_direction": "specific direction in degrees or clock position",
    "safety_instructions": "specific safety instructions",
    "distance_to_next_decision": "distance in meters"
  },
  "assistance": {
    "available": true/false,
    "type": "staff/facility/emergency button",
    "location": "location of assistance",
    "distance": "distance in meters"
  }
}

Rules:
1. Return ONLY valid JSON. No additional text or explanations.
2. Omit any empty arrays or null values.
3. Only include sections where there is relevant information.
4. Set safe_to_proceed to false if there are any immediate dangers.
5. Keep descriptions concise and specific.
6. Use metric measurements (meters) for all distances.
7. If the path is completely clear and safe, only include summary, safe_to_proceed (true), and navigation fields.`;

    const payload = {
      "model": "meta/llama-3.2-90b-vision-instruct",
      "messages": [
        {
          "role": "user",
          "content": [
            { "type": "text", "text": systemPrompt },
            { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${image}` } }
          ]
        }
      ],
      "max_tokens": 1024,
      "temperature": 0.2
    };

    const headers = {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    console.log('Sending request to NVIDIA API...');
    
    const response = await axios.post(invokeUrl, payload, { headers });

    if (response.data && response.data.choices && response.data.choices[0]) {
      try {
        const jsonResponse = JSON.parse(response.data.choices[0].message.content);
        
        // Build concise instruction
        let instruction = '';
        
        // Handle urgent warnings first
        if (!jsonResponse.safe_to_proceed) {
          if (jsonResponse.urgent_warnings && jsonResponse.urgent_warnings.length > 0) {
            instruction = `Warning: ${jsonResponse.urgent_warnings[0].description}`;
          } else {
            instruction = "Warning: Path ahead is not safe, please proceed with caution.";
          }
        } else {
          // If safe, build navigation instruction
          let details = [];
          
          // Add obstacle information
          if (jsonResponse.obstacles && jsonResponse.obstacles.length > 0) {
            const obstacle = jsonResponse.obstacles[0];
            details.push(`${obstacle.type} detected ${obstacle.distance} meters ${obstacle.position}`);
          }
          
          // Add ground conditions
          if (jsonResponse.ground_conditions && !jsonResponse.ground_conditions.is_level) {
            if (jsonResponse.ground_conditions.elevation_changes) {
              details.push(`${jsonResponse.ground_conditions.elevation_changes.type} ahead`);
            }
          }
          
          // Add navigation recommendations
          if (jsonResponse.navigation) {
            details.push(jsonResponse.navigation.safety_instructions);
          }
          
          // If completely safe with no obstacles
          if (details.length === 0) {
            instruction = "Path ahead is clear and level, safe to proceed.";
          } else {
            instruction = details.join(', ') + '.';
          }
        }

        return NextResponse.json({
          result: instruction
        });

      } catch (error) {
        console.error('Error parsing or processing JSON:', error);
        return NextResponse.json(
          { error: "Error processing response data" },
          { status: 500 }
        );
      }
    } else {
      console.error('Unexpected API response structure:', response.data);
      return NextResponse.json(
        { error: "Unexpected API response format" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in API route:', error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      return NextResponse.json(
        { error: `API call failed: ${message}` },
        { status }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 