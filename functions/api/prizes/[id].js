// functions/api/prizes/[id].js
// 处理 DELETE /api/prizes/:id

const ADMIN_PASSWORD = 'MEILIN1!';

export async function onRequestDelete(context) {
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
        const id = context.params.id;
        
        if (context.env.SEAT_DATA) {
            let prizes = await context.env.SEAT_DATA.get('prizes', 'json') || [];
            prizes = prizes.filter(p => p.id !== id);
            await context.env.SEAT_DATA.put('prizes', JSON.stringify(prizes));
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
