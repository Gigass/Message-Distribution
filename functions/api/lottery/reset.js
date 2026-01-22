// functions/api/lottery/reset.js
// POST /api/lottery/reset

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

        // Load prizes to restore counts if needed (logic: set remaining = count)
        let prizes = await context.env.SEAT_DATA.get('prizes', 'json') || [];
        prizes.forEach(p => p.remaining = p.count);

        await Promise.all([
            context.env.SEAT_DATA.put('winners', JSON.stringify([])),
            context.env.SEAT_DATA.put('excludedIds', JSON.stringify([])),
            context.env.SEAT_DATA.put('prizes', JSON.stringify(prizes))
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
