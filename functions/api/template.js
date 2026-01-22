// functions/api/template.js
// Cloudflare Pages Function for GET /api/template

export async function onRequestGet(context) {
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const requestUrl = new URL(context.request.url);
    const assetUrl = new URL(requestUrl);
    assetUrl.pathname = '/info.xlsx';

    const assetResponse = context.env && context.env.ASSETS
      ? await context.env.ASSETS.fetch(assetUrl.toString())
      : await fetch(assetUrl.toString());

    if (!assetResponse || !assetResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, message: 'Template file not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const headers = new Headers(assetResponse.headers);
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', 'attachment; filename="info.xlsx"');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(assetResponse.body, { status: 200, headers });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to download template' }),
      { status: 500, headers: jsonHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
