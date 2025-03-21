import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_NVIDIA_API_KEY;
const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
const stream = true;

const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Accept": stream ? "text/event-stream" : "application/json"
};

export async function analyzeImage(imageBase64: string): Promise<string> {
  try {
    if (imageBase64.length > 180_000) {
      return "图片太大，请使用更小的图片";
    }

    const payload = {
      "model": "meta/llama-3.2-90b-vision-instruct",
      "messages": [
        {
          "role": "user",
          "content": `What is in this image? <img src="data:image/png;base64,${imageBase64}" />`
        }
      ],
      "max_tokens": 512,
      "temperature": 1.00,
      "top_p": 1.00,
      "stream": stream
    };

    console.log('Sending request to NVIDIA API...');
    console.log('API URL:', invokeUrl);
    console.log('Headers:', {
      ...headers,
      Authorization: 'Bearer [HIDDEN]'
    });

    const response = await axios.post(invokeUrl, payload, { 
      headers: headers, 
      responseType: stream ? 'stream' : 'json'
    });

    if (stream) {
      // 处理流式响应
      return new Promise((resolve, reject) => {
        let result = '';
        
        response.data.on('data', (chunk: Buffer) => {
          const chunkText = chunk.toString();
          console.log('Received chunk:', chunkText);
          
          // 尝试解析每个数据块
          try {
            const lines = chunkText.split('\n');
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(5));
                if (data.choices && data.choices[0]?.delta?.content) {
                  result += data.choices[0].delta.content;
                }
              }
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', e);
          }
        });

        response.data.on('end', () => {
          console.log('Stream ended, final result:', result);
          resolve(result || "无法解析图像分析结果");
        });

        response.data.on('error', (error: Error) => {
          console.error('Stream error:', error);
          reject(error);
        });
      });
    } else {
      // 处理非流式响应
      return response.data.choices[0]?.message?.content || "无法解析图像分析结果";
    }

  } catch (error) {
    console.error('Error analyzing image:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (!error.response) {
        return "网络连接失败，请检查网络状态";
      }
      if (error.response.status === 401) {
        return "API 认证失败，请检查 API 密钥";
      } else if (error.response.status === 400) {
        return "API 请求格式错误，请检查请求参数";
      } else if (error.response.status === 403) {
        return "API 访问被拒绝，请检查 API 密钥权限";
      } else if (error.response.status === 404) {
        return "API 端点不存在，请检查 API URL";
      } else if (error.response.status >= 500) {
        return "API 服务器错误，请稍后重试";
      }
      return `API 调用失败: ${error.response?.data?.error?.message || error.message}`;
    }
    return '图像分析失败，请稍后重试';
  }
} 