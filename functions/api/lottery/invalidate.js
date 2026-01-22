// functions/api/lottery/invalidate.js
// POST /api/lottery/invalidate

const ADMIN_PASSWORD = 'MEILIN1!';

export async function onRequestPost(context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    };

    const password = context.env.ADMIN_PASSWORD || ADMIN_PASSWORD;
    const token = context.request.headers.get('x-auth-token');
    if (token !== password) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        if (!context.env.SEAT_DATA) {
            throw new Error('KV Not Configured');
        }

        const { id } = await context.request.json();
        
        let [winners, prizes, excludedIdsRaw] = await Promise.all([
            context.env.SEAT_DATA.get('winners', 'json').then(r => r || []),
            context.env.SEAT_DATA.get('prizes', 'json').then(r => r || []),
            context.env.SEAT_DATA.get('excludedIds', 'json').then(r => r || [])
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
            context.env.SEAT_DATA.put('winners', JSON.stringify(winners)),
            context.env.SEAT_DATA.put('prizes', JSON.stringify(prizes)),
            context.env.SEAT_DATA.put('excludedIds', JSON.stringify(Array.from(excludedIds)))
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
