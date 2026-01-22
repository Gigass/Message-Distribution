// functions/api/data.js
// Cloudflare Pages Function 处理 GET /api/data
// 从 Cloudflare KV 读取座位数据（按口令隔离）

import { findTokenByPassword, findTokenByShareCode, getTokensFromEnv } from './_auth';
import { getTokenKeys } from './_kv';

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-auth-token, x-share-code',
  };

  try {
    let data = [];
    const token = context.request.headers.get('x-auth-token');
    const requestUrl = new URL(context.request.url);
    const shareCode =
      context.request.headers.get('x-share-code') || requestUrl.searchParams.get('code');
    const tokens = getTokensFromEnv(context.env);
    const defaultToken = tokens.find(t => t.id === 'default') || tokens[0];
    const defaultTokenId = defaultToken ? defaultToken.id : 'default';
    let tokenId = defaultTokenId;

    if (token) {
      const tokenConfig = findTokenByPassword(context.env, token);
      if (!tokenConfig) {
        return new Response(
          JSON.stringify({ success: false, message: '口令错误，无权操作' }),
          { status: 401, headers }
        );
      }
      tokenId = tokenConfig.id;
    } else if (shareCode) {
      const tokenConfig = findTokenByShareCode(context.env, shareCode);
      if (!tokenConfig) {
        return new Response(
          JSON.stringify({ success: false, message: '访问码无效' }),
          { status: 401, headers }
        );
      }
      tokenId = tokenConfig.id;
    } else {
      return new Response(
        JSON.stringify({ success: false, message: '需要访问码' }),
        { status: 401, headers }
      );
    }
    
    // 从 KV 存储读取数据
    if (context.env.SEAT_DATA) {
      const keys = getTokenKeys(tokenId);
      const kvData = await context.env.SEAT_DATA.get(keys.seatData, 'json');
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
      'Access-Control-Allow-Headers': 'Content-Type, x-auth-token, x-share-code',
    },
  });
}
