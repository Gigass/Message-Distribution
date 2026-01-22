// functions/api/upload.js
// Cloudflare Pages Function 处理 POST /api/upload
// 接收前端解析好的 JSON 数据，存储到 Cloudflare KV

import { findTokenByPassword } from './_auth';
import { getTokenKeys } from './_kv';

export async function onRequestPost(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
  };

  // 验证口令
  const token = context.request.headers.get('x-auth-token');

  const tokenConfig = findTokenByPassword(context.env, token);
  if (!tokenConfig) {
    return new Response(
      JSON.stringify({ success: false, message: '口令错误，无权操作' }),
      { status: 401, headers }
    );
  }

  try {
    // 解析 JSON 数据（前端已经解析好 Excel）
    const body = await context.request.json();
    const data = body.data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: '数据为空或格式不正确' }),
        { status: 400, headers }
      );
    }

    // 验证数据结构
    const isValidData = data.every(item => 
      typeof item.id === 'string' && 
      typeof item.name === 'string' && 
      typeof item.seat === 'string'
    );

    if (!isValidData) {
      return new Response(
        JSON.stringify({ success: false, message: '数据格式错误，每条记录必须包含 id, name, seat 字段' }),
        { status: 400, headers }
      );
    }

    // 保存到 KV 存储
    if (context.env.SEAT_DATA) {
      const keys = getTokenKeys(tokenConfig.id);
      await context.env.SEAT_DATA.put(keys.seatData, JSON.stringify(data));
      console.log(`[Upload] 数据已保存到 KV: ${data.length} 条记录`);
    } else {
      // 如果没有配置 KV，使用全局变量（仅在当前请求实例有效，重启后丢失）
      // 注意：Cloudflare Workers 是无状态的，这个变量不会在请求间共享
      console.warn('[Upload Warning] 未配置 KV 存储，数据将不会持久化');
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '未配置 KV 存储。请在 Cloudflare Dashboard 中配置 SEAT_DATA KV 绑定。' 
        }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `更新成功！已保存 ${data.length} 条记录` 
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('处理失败:', error);
    return new Response(
      JSON.stringify({ success: false, message: '处理失败: ' + error.message }),
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    },
  });
}
