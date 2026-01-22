// functions/api/lottery/winners.js
// GET /api/lottery/winners

import { findTokenByPassword } from '../_auth';
import { getTokenKeys } from '../_kv';

export async function onRequestGet(context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    };

    try {
        const token = context.request.headers.get('x-auth-token');
        const tokenConfig = findTokenByPassword(context.env, token);
        if (!tokenConfig) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers });
        }

        let winners = [];
        if (context.env.SEAT_DATA) {
            const keys = getTokenKeys(tokenConfig.id);
            const data = await context.env.SEAT_DATA.get(keys.winners, 'json');
            if (data) winners = data;
        }

        return new Response(
            JSON.stringify({ success: true, data: winners.reverse() }),
            { headers }
        );
    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers });
    }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    },
  });
}
