// functions/api/prizes/reset.js
// POST /api/prizes/reset
// 清空所有奖品配置 (慎用)

import { findTokenByPassword } from '../_auth';
import { getTokenKeys } from '../_kv';

export async function onRequestPost(context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    };

    const token = context.request.headers.get('x-auth-token');
    const tokenConfig = findTokenByPassword(context.env, token);
    if (!tokenConfig) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        if (!context.env.SEAT_DATA) {
            throw new Error('KV Not Configured');
        }

        // 清空奖品列表
        const keys = getTokenKeys(tokenConfig.id);
        await context.env.SEAT_DATA.put(keys.prizes, JSON.stringify([]));

        return new Response(JSON.stringify({ success: true, message: '奖品库已清空' }), { headers });

    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers });
    }
}

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
