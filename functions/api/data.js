// functions/api/data.js
// Cloudflare Pages Function 处理 GET /api/data
// 从 Cloudflare KV 读取座位数据

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    let data = [];
    
    // 从 KV 存储读取数据
    if (context.env.SEAT_DATA) {
      const kvData = await context.env.SEAT_DATA.get('seat_data', 'json');
      if (kvData) {
        data = kvData;
      }
    } else {
      console.warn('[Data] 未配置 KV 存储，返回空数据');
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('获取数据失败:', error);
    return new Response(
      JSON.stringify({ success: false, message: '获取数据失败: ' + error.message }),
      { status: 500, headers }
    );
  }
}

// 处理 CORS 预检请求
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
