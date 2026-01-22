// functions/api/lottery/invalidate.js
// POST /api/lottery/invalidate

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

        const { id } = await context.request.json();
        
        const keys = getTokenKeys(tokenConfig.id);
        let [winners, prizes, excludedIdsRaw] = await Promise.all([
            context.env.SEAT_DATA.get(keys.winners, 'json').then(r => r || []),
            context.env.SEAT_DATA.get(keys.prizes, 'json').then(r => r || []),
            context.env.SEAT_DATA.get(keys.excludedIds, 'json').then(r => r || [])
        ]);

        const winnerIndex = winners.findIndex(w => w.id === id);
        if (winnerIndex === -1) {
            return new Response(JSON.stringify({ success: false, message: 'Winner record not found' }), { status: 404, headers });
        }

        const winnerRecord = winners[winnerIndex];
        const excludedIds = new Set(excludedIdsRaw);

        // 1. Remove winner
        winners.splice(winnerIndex, 1);

        // 2. Remove from excluded
        excludedIds.delete(String(winnerRecord.winnerId));

        // 3. Restore prize stock
        const prizeIndex = prizes.findIndex(p => p.id === winnerRecord.prizeId);
        if (prizeIndex !== -1) {
            prizes[prizeIndex].remaining++;
        }

        // Save
        await Promise.all([
            context.env.SEAT_DATA.put(keys.winners, JSON.stringify(winners)),
            context.env.SEAT_DATA.put(keys.prizes, JSON.stringify(prizes)),
            context.env.SEAT_DATA.put(keys.excludedIds, JSON.stringify(Array.from(excludedIds)))
        ]);

        return new Response(JSON.stringify({ success: true, message: 'Record invalidated, stock restored' }), { headers });

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
