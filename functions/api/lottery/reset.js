// functions/api/lottery/reset.js
// POST /api/lottery/reset

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

        const keys = getTokenKeys(tokenConfig.id);

        // Load prizes to restore counts if needed (logic: set remaining = count)
        let prizes = await context.env.SEAT_DATA.get(keys.prizes, 'json') || [];
        prizes.forEach(p => p.remaining = p.count);

        await Promise.all([
            context.env.SEAT_DATA.put(keys.winners, JSON.stringify([])),
            context.env.SEAT_DATA.put(keys.excludedIds, JSON.stringify([])),
            context.env.SEAT_DATA.put(keys.prizes, JSON.stringify(prizes))
        ]);

        return new Response(JSON.stringify({ success: true, message: 'Lottery Reset Complete' }), { headers });

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
