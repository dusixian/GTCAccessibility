import { NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_NVIDIA_API_KEY;
const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "没有提供图片数据" },
        { status: 400 }
      );
    }

    if (image.length > 180_000) {
      return NextResponse.json(
        { error: "图片太大，请使用更小的图片" },
        { status: 400 }
      );
    }

    const payload = {
      "model": "meta/llama-3.2-90b-vision-instruct",
      "messages": [
        {
          "role": "user",
          "content": `What is in this image? <img src="data:image/png;base64,${image}" />`
        }
      ],
      "max_tokens": 512,
      "temperature": 1.00,
      "top_p": 1.00,
      "stream": false
    };

    const headers = {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    console.log('Sending request to NVIDIA API...');
    
    const response = await axios.post(invokeUrl, payload, { headers });

    if (response.data && response.data.choices && response.data.choices[0]) {
      return NextResponse.json({
        result: response.data.choices[0].message.content
      });
    } else {
      console.error('Unexpected API response structure:', response.data);
      return NextResponse.json(
        { error: "API 返回格式异常" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in API route:', error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      return NextResponse.json(
        { error: `API 调用失败: ${message}` },
        { status }
      );
    }
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
} 