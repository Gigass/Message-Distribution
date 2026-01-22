// functions/api/lottery/draw.js
// POST /api/lottery/draw

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

        const body = await context.request.json();
        const { prizeId, count = 1 } = body;

        // 1. Load all data
        const keys = getTokenKeys(tokenConfig.id);
        const [prizes, winners, excludedIdsRaw, seatData] = await Promise.all([
            context.env.SEAT_DATA.get(keys.prizes, 'json').then(r => r || []),
            context.env.SEAT_DATA.get(keys.winners, 'json').then(r => r || []),
            context.env.SEAT_DATA.get(keys.excludedIds, 'json').then(r => r || []),
            context.env.SEAT_DATA.get(keys.seatData, 'json').then(r => r || [])
        ]);

        const excludedIds = new Set(excludedIdsRaw);

        if (seatData.length === 0) {
            return new Response(JSON.stringify({ success: false, message: 'No personnel data' }), { status: 400, headers });
        }

        // 2. Filter available candidates
        const availableCandidates = seatData.filter(emp => !excludedIds.has(String(emp.id)));
        if (availableCandidates.length === 0) {
            return new Response(JSON.stringify({ success: false, message: 'No one available to draw' }), { status: 400, headers });
        }

        // 3. Select Target Prize
        let targetPrize;
        let targetPrizeIndex;

        if (prizeId) {
            targetPrizeIndex = prizes.findIndex(p => p.id === prizeId);
            if (targetPrizeIndex === -1) {
                return new Response(JSON.stringify({ success: false, message: 'Prize not found' }), { status: 404, headers });
            }
            targetPrize = prizes[targetPrizeIndex];
            if (targetPrize.remaining <= 0) {
                return new Response(JSON.stringify({ success: false, message: 'Prize out of stock' }), { status: 400, headers });
            }
        } else {
             // Random Logic
             const availablePrizes = prizes.filter(p => p.remaining > 0);
             if (availablePrizes.length === 0) {
                 return new Response(JSON.stringify({ success: false, message: 'All prizes out of stock' }), { status: 400, headers });
             }
             targetPrizeIndex = prizes.indexOf(availablePrizes[Math.floor(Math.random() * availablePrizes.length)]);
             targetPrize = prizes[targetPrizeIndex];
        }

        // 4. Determine count
        const drawCount = Math.min(parseInt(count), targetPrize.remaining, availableCandidates.length);
        if (drawCount <= 0) {
            return new Response(JSON.stringify({ success: false, message: 'Not enough candidates or prizes' }), { status: 400, headers });
        }

        // 5. Draw Winners
        const currentWinners = [];
        const candidatesCopy = [...availableCandidates];
        for (let i = 0; i < drawCount; i++) {
            const randomIndex = Math.floor(Math.random() * candidatesCopy.length);
            const winner = candidatesCopy.splice(randomIndex, 1)[0];
            currentWinners.push(winner);
        }

        // 6. Update State
        const timestamp = new Date().toISOString();
        const newRecords = [];

        currentWinners.forEach(w => {
            excludedIds.add(String(w.id));
            const record = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                prizeId: targetPrize.id,
                prizeName: targetPrize.name,
                prizeLevel: targetPrize.level,
                prizeLevelLabel: targetPrize.levelLabel,
                winnerId: w.id,
                winnerName: w.name,
                winnerSeat: w.seat,
                winTime: timestamp
            };
            newRecords.push(record);
            winners.push(record);
        });

        // Update prize
        targetPrize.remaining -= currentWinners.length;
        prizes[targetPrizeIndex] = targetPrize;

        // 7. Save to KV (Parallel)
        await Promise.all([
            context.env.SEAT_DATA.put(keys.prizes, JSON.stringify(prizes)),
            context.env.SEAT_DATA.put(keys.winners, JSON.stringify(winners)),
            context.env.SEAT_DATA.put(keys.excludedIds, JSON.stringify(Array.from(excludedIds)))
        ]);

        return new Response(JSON.stringify({ 
            success: true, 
            message: `Success`, 
            data: newRecords 
        }), { headers });

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
