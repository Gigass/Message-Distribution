// functions/api/check-auth.js
// Cloudflare Pages Function 处理 POST /api/check-auth

import { findTokenByPassword } from './_auth';

export async function onRequestPost(context) {
  const token = context.request.headers.get('x-auth-token');
  const tokenConfig = findTokenByPassword(context.env, token);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
  };

  if (!tokenConfig) {
    return new Response(
      JSON.stringify({ success: false, message: '口令错误，无权操作' }),
      { status: 401, headers }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Verified',
      tokenId: tokenConfig.id,
      tokenLabel: tokenConfig.label,
      shareCode: tokenConfig.shareCode || tokenConfig.id
    }),
    { status: 200, headers }
  );
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
