import { findTokenByPassword } from '../_auth';
import { getTokenKeys } from '../_kv';
import * as XLSX from 'xlsx';

export async function onRequestGet(context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
    };

    try {
        const token = context.request.headers.get('x-auth-token');
        const tokenConfig = findTokenByPassword(context.env, token);
        if (!tokenConfig) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        let winners = [];
        if (context.env.SEAT_DATA) {
            const keys = getTokenKeys(tokenConfig.id);
            const data = await context.env.SEAT_DATA.get(keys.winners, 'json');
            if (data) winners = data;
        }

        console.log(`[Export] Token ${tokenConfig.id}, winners count: ${winners.length}`);

        // Check for seat info
        const hasSeatInfo = winners.some(w => w.winnerSeat && String(w.winnerSeat).trim() !== '');

        // Headers row
        const headerRow = ['工号', '姓名'];
        if (hasSeatInfo) headerRow.push('桌号');
        headerRow.push('奖项等级', '奖品名称', '中奖时间');
        
        const aoaData = [headerRow];

        winners.forEach(w => {
            let timeStr = '';
            try {
                if (w.winTime) {
                    const d = new Date(w.winTime);
                    if (!isNaN(d.getTime())) {
                        timeStr = d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
                    }
                }
            } catch (e) {
                // ignore date error
            }

            const row = [
                String(w.winnerId || ''),
                String(w.winnerName || '')
            ];
            
            if (hasSeatInfo) {
                row.push(String(w.winnerSeat || ''));
            }

            row.push(
                String(w.prizeLevelLabel || ''),
                String(w.prizeName || ''),
                timeStr
            );
            
            aoaData.push(row);
        });

        // Use standard xlsx utils
        const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
        if (!worksheet['!ref']) worksheet['!ref'] = 'A1:A1';

        // Set column widths
        const wscols = [{wch: 15}, {wch: 15}];
        if (hasSeatInfo) wscols.push({wch: 15});
        wscols.push({wch: 15}, {wch: 20}, {wch: 25});
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "中奖名单");

        // Write to buffer using 'array' type for compatibility with most environments
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const uint8Array = new Uint8Array(buffer);

        // Return binary response
        return new Response(uint8Array, {
            headers: {
                ...headers,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename=winners.xlsx',
                'Content-Length': uint8Array.length.toString()
            }
        });

    } catch (e) {
        console.error('[Export] Error:', e);
        return new Response(JSON.stringify({ success: false, message: e.message }), { 
            status: 500, 
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
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
