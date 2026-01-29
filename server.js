const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const TEMPLATE_PATHS = [
    path.join(__dirname, 'public', 'info.xlsx'),
    path.join(__dirname, 'info.xlsx'),
    // Fallback for some deployment structures
    path.join(__dirname, 'dist', 'info.xlsx'),
    path.resolve(process.cwd(), 'dist', 'info.xlsx') // Keep compat for CWD based deployments
];

const resolveTemplatePath = () => TEMPLATE_PATHS.find(p => fs.existsSync(p));

// ==========================================
// 多口令配置系统
// ==========================================

// 口令配置加载
const TOKENS_FILE = path.resolve(__dirname, 'tokens.json');
let TOKENS_CONFIG = [];

const loadTokensConfig = () => {
    try {
        if (fs.existsSync(TOKENS_FILE)) {
            const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
            TOKENS_CONFIG = data.tokens || [];
            console.log(`[System] 已加载 ${TOKENS_CONFIG.length} 个口令配置`);
        } else {
            console.warn('[System] tokens.json 不存在，使用默认口令');
            TOKENS_CONFIG = [{ id: 'default', password: 'MEILIN1!', label: '默认' }];
        }
    } catch (error) {
        console.error('[System] 加载口令配置失败:', error.message);
        TOKENS_CONFIG = [{ id: 'default', password: 'MEILIN1!', label: '默认' }];
    }
};

// 根据密码查找对应的口令配置
const findTokenByPassword = (password) => {
    return TOKENS_CONFIG.find(t => t.password === password);
};

// 根据分享码查找对应的口令配置
const findTokenByShareCode = (code) => {
    if (!code) return null;
    return TOKENS_CONFIG.find(t => t.shareCode === code || t.id === code);
};

const getDefaultTokenId = () => {
    const defaultToken = TOKENS_CONFIG.find(t => t.id === 'default') || TOKENS_CONFIG[0];
    return defaultToken ? defaultToken.id : 'default';
};

// ==========================================
// 按口令隔离的数据缓存
// ==========================================

// 数据缓存: tokenId -> { data, prizes, winners, excludedIds }
const DATA_CACHE = new Map();

// 获取或初始化某个 tokenId 的数据缓存
const getTokenCache = (tokenId) => {
    if (!DATA_CACHE.has(tokenId)) {
        DATA_CACHE.set(tokenId, {
            data: [],
            prizes: [],
            winners: [],
            excludedIds: new Set()
        });
    }
    return DATA_CACHE.get(tokenId);
};

// 获取某个 tokenId 的数据文件路径 (Use Absolute Path)
const getDataFilePath = (tokenId) => {
    // 强制使用 __dirname，确保文件路径与 server.js 所在位置一致，不受启动目录影响
    const p = path.join(__dirname, `lottery-data-${tokenId}.json`);
    return p;
};

// 加载某个 tokenId 的抽奖数据
const loadLotteryData = (tokenId) => {
    const filePath = getDataFilePath(tokenId);
    const cache = getTokenCache(tokenId);
    
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            cache.prizes = data.prizes || [];
            cache.winners = data.winners || [];
            cache.excludedIds = new Set(data.excludedIds || []);
            console.log(`[System] 已加载 ${tokenId} 的抽奖数据: ${cache.prizes.length} 种奖品, ${cache.winners.length} 位中奖者`);
        }
    } catch (error) {
        console.warn(`[System] 加载 ${tokenId} 抽奖数据失败:`, error.message);
    }
};

// 保存某个 tokenId 的抽奖数据
const saveLotteryData = (tokenId) => {
    const filePath = getDataFilePath(tokenId);
    const cache = getTokenCache(tokenId);
    
    try {
        const data = {
            prizes: cache.prizes,
            winners: cache.winners,
            excludedIds: Array.from(cache.excludedIds)
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.warn(`[System] 无法持久化 ${tokenId} 抽奖数据:`, error.message);
    }
};

// 启用 CORS 和 JSON 解析
app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 生产环境托管 Vue 构建产物 (dist)
// Use __dirname to find dist securely
app.use(express.static(path.join(__dirname, 'dist')));

// 配置 Multer：使用内存存储，不写入磁盘
const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        // 简单检查扩展名
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
            return cb(new Error('只允许上传 Excel 文件 (.xlsx, .xls)'));
        }
        cb(null, true);
    }
});

// 工具函数：解析 Excel Buffer 并格式化数据
const parseExcelBuffer = (buffer) => {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);
    
    return rawData.map(row => {
        const idKey = Object.keys(row).find(k => k.includes('号') && (k.includes('工') || k.includes('编')));
        const nameKey = Object.keys(row).find(k => k.includes('名'));
        // 优先识别"桌号"或"桌",其次识别"座位"或"座"
        const seatKey = Object.keys(row).find(k => k.includes('桌')) || Object.keys(row).find(k => k.includes('座'));

        return {
            id: row[idKey || '员工编号'] || '',
            name: row[nameKey || '姓名'] || '',
            seat: row[seatKey || '桌号'] || ''
        };
    }).filter(item => item.id && item.name);
};

// 初始化：加载口令配置
loadTokensConfig();

// 初始化：为所有已配置的口令预加载数据
TOKENS_CONFIG.forEach(token => {
    loadLotteryData(token.id);
});

// 初始化：尝试从本地加载 info.xlsx 数据到默认缓存
const loadLocalData = () => {
    try {
        const templatePath = resolveTemplatePath();
        if (templatePath) {
            const fileBuffer = fs.readFileSync(templatePath);
            const parsedData = parseExcelBuffer(fileBuffer);
            // 加载到所有 tokenId 的数据缓存中（员工数据是共享的）
            TOKENS_CONFIG.forEach(token => {
                const cache = getTokenCache(token.id);
                cache.data = parsedData;
            });
            console.log(`[System] 已加载本地数据: ${parsedData.length} 条记录`);
        } else {
            console.log('[System] 本地 info.xlsx 不存在，初始数据为空');
        }
    } catch (error) {
        console.error('[System] 加载本地数据失败:', error.message);
    }
};

loadLocalData();

// 中间件：口令验证（支持多口令）
const authMiddleware = (req, res, next) => {
    const password = req.headers['x-auth-token'];
    const tokenConfig = findTokenByPassword(password);
    
    if (!tokenConfig) {
        return res.status(401).json({ success: false, message: '口令错误，无权操作' });
    }
    
    // 将 tokenId 附加到请求对象，供后续路由使用
    req.tokenId = tokenConfig.id;
    req.tokenLabel = tokenConfig.label || tokenConfig.id;
    req.tokenShareCode = tokenConfig.shareCode || tokenConfig.id;
    next();
};

// API: 验证口令 (返回 tokenId 和 label)
app.post('/api/check-auth', authMiddleware, (req, res) => {
    res.json({ 
        success: true, 
        message: 'Verified',
        tokenId: req.tokenId,
        tokenLabel: req.tokenLabel,
        shareCode: req.tokenShareCode
    });
});

// API: 获取 Excel 数据 (需要认证以获取对应口令的数据)
app.get('/api/data', (req, res) => {
    const token = req.headers['x-auth-token'];
    const shareCode = req.headers['x-share-code'] || req.query.code;
    let tokenId = getDefaultTokenId();

    if (token) {
        const tokenConfig = findTokenByPassword(String(token));
        if (!tokenConfig) {
            return res.status(401).json({ success: false, message: '口令错误，无权操作' });
        }
        tokenId = tokenConfig.id;
    } else if (shareCode) {
        const tokenConfig = findTokenByShareCode(String(shareCode));
        if (!tokenConfig) {
            return res.status(401).json({ success: false, message: '访问码无效' });
        }
        tokenId = tokenConfig.id;
    } else {
        return res.status(401).json({ success: false, message: '需要访问码' });
    }

    const cache = getTokenCache(tokenId);
    res.json({ success: true, data: cache.data });
});

// API: 下载 Excel 模板
app.get('/api/template', (req, res) => {
    const templatePath = resolveTemplatePath();
    if (!templatePath) {
        return res.status(404).json({ success: false, message: '模板文件不存在' });
    }
    res.download(templatePath, 'info.xlsx');
});

// API: 上传文件 (内存处理 + 尝试持久化)
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    // 支持 JSON 方式上传（前端解析后的数据）
    if (req.body && req.body.data) {
        const newData = req.body.data;
        if (!Array.isArray(newData) || newData.length === 0) {
            return res.status(400).json({ success: false, message: '数据为空或格式不正确' });
        }

        // 更新所有口令的员工数据（员工数据是共享的）
        TOKENS_CONFIG.forEach(token => {
            const cache = getTokenCache(token.id);
            cache.data = newData;
        });
        console.log(`[Upload] 内存数据已更新: ${newData.length} 条记录`);

        return res.json({ success: true, message: '更新成功！(实时生效)' });
    }

    // 传统文件上传方式
    if (!req.file) {
        return res.status(400).json({ success: false, message: '请选择文件' });
    }

    try {
        // 1. 解析上传的文件 (Buffer) -> 更新内存缓存
        const newData = parseExcelBuffer(req.file.buffer);
        if (newData.length === 0) {
            return res.status(400).json({ success: false, message: '文件为空或格式不正确' });
        }
        
        // 更新所有口令的员工数据
        TOKENS_CONFIG.forEach(token => {
            const cache = getTokenCache(token.id);
            cache.data = newData;
        });
        console.log(`[Upload] 内存数据已更新: ${newData.length} 条记录`);

        // 2. 不再持久化文件：数据仅更新到内存（可接入数据库存储）

        res.json({ success: true, message: '更新成功！(实时生效)' });
    } catch (error) {
        console.error('文件处理失败:', error);
        res.status(500).json({ success: false, message: '解析错误: ' + error.message });
    }
});

// 处理 SPA 路由：所有非 API 请求返回 index.html
// 注意：这个中间件必须在所有 API 路由之后
// 处理 SPA 路由：所有非 API 请求返回 index.html
// 注意：这个中间件必须在所有 API 路由之后
const spaHandler = (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send(err.message);
        }
    });
};

// 错误处理中间件 (Multer 错误等) - 必须放在最后
const errorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: '上传错误: ' + err.message });
    } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
};

// ==========================================
// 抽奖系统 API（数据按口令隔离）
// ==========================================

// 1. 获取奖品列表（需认证）
app.get('/api/prizes', authMiddleware, (req, res) => {
    const cache = getTokenCache(req.tokenId);
    res.json({ success: true, data: cache.prizes });
});

// 2. 添加/更新奖品 (需认证)
app.post('/api/prizes', authMiddleware, (req, res) => {
    const { id, name, count, level, levelLabel } = req.body;
    if (!name || !count) {
        return res.status(400).json({ success: false, message: '名称和数量必填' });
    }

    const cache = getTokenCache(req.tokenId);
    
    const newPrize = {
        id: id || Date.now().toString(), // 简单ID生成
        name,
        count: parseInt(count),
        remaining: parseInt(count),
        level: level || 'participation',
        levelLabel: levelLabel || '参与奖'
    };

    // 如果是更新（带ID），则替换
    const existIndex = cache.prizes.findIndex(p => p.id === newPrize.id);
    if (existIndex >= 0) {
        // 保留剩余数量计算逻辑：如果总数变了，差异加到剩余里
        const diff = newPrize.count - cache.prizes[existIndex].count;
        newPrize.remaining = cache.prizes[existIndex].remaining + diff;
        if (newPrize.remaining < 0) newPrize.remaining = 0;
        cache.prizes[existIndex] = newPrize;
    } else {
        cache.prizes.push(newPrize);
    }
    
    saveLotteryData(req.tokenId);
    res.json({ success: true, message: '奖品已保存', data: newPrize });
});

// 3. 删除奖品 (需认证)
app.delete('/api/prizes/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const cache = getTokenCache(req.tokenId);
    cache.prizes = cache.prizes.filter(p => p.id !== id);
    saveLotteryData(req.tokenId);
    res.json({ success: true, message: '奖品已删除' });
});

// 4. 获取中奖名单（需认证）
app.get('/api/lottery/winners', authMiddleware, (req, res) => {
    const cache = getTokenCache(req.tokenId);
    res.json({ success: true, data: [...cache.winners].reverse() }); // 最新在前
});

// 4.1 清空奖品库 (需认证)
app.post('/api/prizes/reset', authMiddleware, (req, res) => {
    const cache = getTokenCache(req.tokenId);
    cache.prizes = [];
    saveLotteryData(req.tokenId);
    res.json({ success: true, message: '奖品库已清空' });
});

// 5. 执行抽奖 (需认证)
app.post('/api/lottery/draw', authMiddleware, (req, res) => {
    const { prizeId, count = 1 } = req.body;
    const cache = getTokenCache(req.tokenId);
    
    // 1. 获取符合抽奖资格的人员
    if (cache.data.length === 0) {
        return res.status(400).json({ success: false, message: '人员名单为空，请先上传数据' });
    }
    
    const availableCandidates = cache.data.filter(emp => !cache.excludedIds.has(String(emp.id)));
    
    if (availableCandidates.length === 0) {
        return res.status(400).json({ success: false, message: '所有人都已中奖，无人可抽' });
    }

    // 2. 确定目标奖品
    let targetPrize;
    if (prizeId) {
        targetPrize = cache.prizes.find(p => p.id === prizeId);
        if (!targetPrize) {
            return res.status(404).json({ success: false, message: '奖品不存在' });
        }
        if (targetPrize.remaining <= 0) {
            return res.status(400).json({ success: false, message: '该奖品已抽完' });
        }
    } else {
        // 随机模式：只从有剩余的奖品里抽
        const availablePrizes = cache.prizes.filter(p => p.remaining > 0);
        if (availablePrizes.length === 0) {
            return res.status(400).json({ success: false, message: '所有奖品已抽完' });
        }
        // 简单随机选一个奖品种类
        targetPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
    }

    // 3. 确定抽取人数
    // 不能超过剩余奖品数，也不能超过现有候选人数
    const drawCount = Math.min(parseInt(count), targetPrize.remaining, availableCandidates.length);

    if (drawCount <= 0) {
        return res.status(400).json({ success: false, message: '无法抽取：名额不足或人员不足' });
    }

    // 4. 随机逻辑 (Fisher-Yates Shuffle 变体)
    const winners = [];
    // 复制一份候选人用于抽取，避免污染
    const candidatesCopy = [...availableCandidates];
    
    for (let i = 0; i < drawCount; i++) {
        const randomIndex = Math.floor(Math.random() * candidatesCopy.length);
        const winner = candidatesCopy.splice(randomIndex, 1)[0]; // 移除并获取
        winners.push(winner);
    }

    // 5. 更新状态
    const newRecords = [];
    const timestamp = new Date().toISOString();

    winners.forEach(w => {
        // 标记已中奖
        cache.excludedIds.add(String(w.id));
        
        // 创建记录
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
        cache.winners.push(record);
    });

    // 扣减库存
    targetPrize.remaining -= winners.length;

    // 持久化
    saveLotteryData(req.tokenId);

    res.json({
        success: true,
        message: `成功抽取 ${winners.length} 人`,
        data: newRecords
    });
});

// 6. 重置中奖数据 (仅清空记录和恢复库存)
app.post('/api/lottery/reset-winners', authMiddleware, (req, res) => {
    const cache = getTokenCache(req.tokenId);
    
    // 清空名单和排除集合
    cache.winners = [];
    cache.excludedIds = new Set();
    
    // 恢复奖品库存
    cache.prizes.forEach(p => {
        p.remaining = p.count;
    });

    saveLotteryData(req.tokenId);
    res.json({ success: true, message: '中奖数据已重置，奖品库存已恢复' });
});

// 7. 作废/重抽 (需认证)
app.post('/api/lottery/invalidate', authMiddleware, (req, res) => {
    const { id } = req.body; // winner record id, not employee id
    if (!id) return res.status(400).json({ success: false, message: 'ID必填' });

    const cache = getTokenCache(req.tokenId);
    const winnerIndex = cache.winners.findIndex(w => w.id === id);
    if (winnerIndex === -1) {
        return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const winnerRecord = cache.winners[winnerIndex];
    
    // 1. 移除中奖记录
    cache.winners.splice(winnerIndex, 1);
    
    // 2. 从排除名单中移除人员 (允许再次中奖)
    cache.excludedIds.delete(String(winnerRecord.winnerId));
    
    // 3. 恢复奖品库存
    const prize = cache.prizes.find(p => p.id === winnerRecord.prizeId);
    if (prize) {
        prize.remaining++;
    }

    saveLotteryData(req.tokenId);
    res.json({ success: true, message: '已作废该中奖记录，奖品已回库' });
});

// 8. 导出中奖名单 (需认证)
app.get('/api/lottery/export', authMiddleware, (req, res) => {
    try {
        const cache = getTokenCache(req.tokenId);
        const winners = cache.winners;
        
        console.log(`[Export] Request for token ${req.tokenId}, winners count: ${winners.length}`);

        // Check if any winner has seat info
        const hasSeatInfo = winners.some(w => w.winnerSeat && String(w.winnerSeat).trim() !== '');

        // headers definition
        const headers = ['工号', '姓名'];
        if (hasSeatInfo) headers.push('桌号');
        headers.push('奖项等级', '奖品名称', '中奖时间');
        
        // Prepare AOA data
        const aoaData = [headers];

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
                console.error('Date parse error:', e);
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

        console.log(`[Export] Generated ${aoaData.length} rows (including header)`);

        // Use aoa_to_sheet
        const worksheet = xlsx.utils.aoa_to_sheet(aoaData);
        
        // Force referencing to ensure the sheet is active and visible
        if (!worksheet['!ref']) {
            worksheet['!ref'] = 'A1:A1'; // Fallback for empty sheet
        }

        // 设置列宽
        const wscols = [
            {wch: 15}, // id
            {wch: 15}  // name
        ];
        if (hasSeatInfo) wscols.push({wch: 15}); // seat
        wscols.push(
            {wch: 15}, // level
            {wch: 20}, // prize
            {wch: 25}  // time
        );
        worksheet['!cols'] = wscols;

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "中奖名单");

        // Write to buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        console.log(`[Export] Buffer size: ${buffer.length} bytes`);

        // Set Headers explicitly
        res.setHeader('Content-Disposition', 'attachment; filename=winners.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Length', buffer.length); // IMPORTANT for some proxies/clients
        
        res.send(buffer);

    } catch (error) {
        console.error('[Export] Error:', error);
        res.status(500).json({ success: false, message: '导出失败: ' + error.message });
    }
});

// API 404 处理：防止 API 请求落入 SPA 路由返回 HTML
app.all('/api/*', (req, res) => {
    console.warn(`[404] API Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ success: false, message: `API Endpoint matched no route: ${req.method} ${req.url}` });
});

// SPA 路由处理（放在所有 API 之后）
app.use(spaHandler);

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Front-end: http://localhost:${PORT}/`);
    console.log(`Back-end:  http://localhost:${PORT}/admin`);
    console.log(`口令配置: ${TOKENS_CONFIG.length} 个口令已加载`);
});
