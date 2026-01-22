// functions/api/prizes.js
// 处理 /api/prizes
// GET: 获取奖品列表
// POST: 添加/更新奖品

const ADMIN_PASSWORD = 'MEILIN1!';

export async function onRequestGet(context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };

    try {
        let prizes = [];
        if (context.env.SEAT_DATA) {
            const data = await context.env.SEAT_DATA.get('prizes', 'json');
            if (data) prizes = data;
        }

        return new Response(JSON.stringify({ success: true, data: prizes }), { headers });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers });
    }
}

export async function onRequestPost(context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    };

    // Auth
    const password = context.env.ADMIN_PASSWORD || ADMIN_PASSWORD;
    const token = context.request.headers.get('x-auth-token');
    if (token !== password) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        const body = await context.request.json();
        const { id, name, count, level, levelLabel } = body;

        if (!name || !count) {
             return new Response(JSON.stringify({ success: false, message: 'Missing name or count' }), { status: 400, headers });
        }

        // Get current prizes
        let prizes = [];
        if (context.env.SEAT_DATA) {
            const data = await context.env.SEAT_DATA.get('prizes', 'json');
            if (data) prizes = data;
        }

        const newPrize = {
            id: id || Date.now().toString(),
            name,
            count: parseInt(count),
            remaining: parseInt(count),
            level: level || 'participation',
            levelLabel: levelLabel || '参与奖'
        };

        const existIndex = prizes.findIndex(p => p.id === newPrize.id);
        if (existIndex >= 0) {
            const diff = newPrize.count - prizes[existIndex].count;
            newPrize.remaining = prizes[existIndex].remaining + diff;
            if (newPrize.remaining < 0) newPrize.remaining = 0;
            prizes[existIndex] = newPrize;
        } else {
            prizes.push(newPrize);
        }

        if (context.env.SEAT_DATA) {
            await context.env.SEAT_DATA.put('prizes', JSON.stringify(prizes));
        }

        return new Response(JSON.stringify({ success: true, data: newPrize }), { headers });

    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers });
    }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    },
  });
}
