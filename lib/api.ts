import axios from 'axios';

export async function analyzeImage(imageBase64: string): Promise<string> {
  try {
    if (imageBase64.length > 180_000) {
      return "图片太大，请使用更小的图片";
    }

    console.log('Sending request to API route...');
    
    const response = await axios.post('/api/analyze', {
      image: imageBase64
    });

    return response.data.result;

  } catch (error) {
    console.error('Error analyzing image:', error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error('API Error details:', {
        status: error.response?.status,
        message: errorMessage
      });
      return errorMessage;
    }
    return '图像分析失败，请稍后重试';
  }
} 