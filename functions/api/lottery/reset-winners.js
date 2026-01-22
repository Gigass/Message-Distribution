// functions/api/lottery/reset-winners.js
// POST /api/lottery/reset-winners
// 清空中奖记录 & 恢复奖品库存 (不删除奖品配置)

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

        // 1. 获取奖品数据
        let prizes = await context.env.SEAT_DATA.get(keys.prizes, 'json') || [];
        
        // 2. 恢复库存
        prizes.forEach(p => p.remaining = p.count);

        // 3. 保存: 清空 winners, 清空 excludedIds, 更新 prizes
        await Promise.all([
            context.env.SEAT_DATA.put(keys.winners, JSON.stringify([])),
            context.env.SEAT_DATA.put(keys.excludedIds, JSON.stringify([])),
            context.env.SEAT_DATA.put(keys.prizes, JSON.stringify(prizes))
        ]);

        return new Response(JSON.stringify({ success: true, message: '中奖数据已重置，奖品库存已恢复' }), { headers });

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
