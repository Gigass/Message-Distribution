// functions/api/prizes/[id].js
// 处理 DELETE /api/prizes/:id

import { findTokenByPassword } from '../_auth';
import { getTokenKeys } from '../_kv';

export async function onRequestDelete(context) {
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
        const id = context.params.id;
        
        if (context.env.SEAT_DATA) {
            const keys = getTokenKeys(tokenConfig.id);
            let prizes = await context.env.SEAT_DATA.get(keys.prizes, 'json') || [];
            prizes = prizes.filter(p => p.id !== id);
            await context.env.SEAT_DATA.put(keys.prizes, JSON.stringify(prizes));
        }

        return new Response(JSON.stringify({ success: true }), { headers });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers });
    }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    },
  });
}
