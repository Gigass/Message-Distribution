const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'MEILIN1!'; // 管理员口令，可在此修改

// 全局内存缓存 (适配 Deno Deploy 等只读文件系统环境)
let CACHE_DATA = [];
let CACHE_PRIZES = [];
let CACHE_WINNERS = [];
let EXCLUDED_IDS = new Set();
const DATA_FILE = 'lottery-data.json';

// 启用 CORS 和 JSON 解析
app.use(cors());
app.use(express.json());
// 生产环境托管 Vue 构建产物 (dist)
app.use(express.static(path.resolve(process.cwd(), 'dist')));

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

// 初始化：尝试从本地加载 info.xlsx 数据到内存
const loadLocalData = () => {
    try {
        if (fs.existsSync('info.xlsx')) {
            const fileBuffer = fs.readFileSync('info.xlsx');
            CACHE_DATA = parseExcelBuffer(fileBuffer);
            console.log(`[System] 已加载本地数据: ${CACHE_DATA.length} 条记录`);
        } else {
            console.log('[System] 本地 info.xlsx 不存在，初始数据为空');
        }
    } catch (error) {
        console.error('[System] 加载本地数据失败:', error.message);
    }
};

// 加载抽奖数据
const loadLotteryData = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            CACHE_PRIZES = data.prizes || [];
            CACHE_WINNERS = data.winners || [];
            EXCLUDED_IDS = new Set(data.excludedIds || []);
            console.log(`[System] 已加载抽奖数据: ${CACHE_PRIZES.length} 种奖品, ${CACHE_WINNERS.length} 位中奖者`);
        }
    } catch (error) {
        console.warn('[System] 加载抽奖数据失败 (可能是首次运行):', error.message);
    }
};

// 保存抽奖数据
const saveLotteryData = () => {
    try {
        const data = {
            prizes: CACHE_PRIZES,
            winners: CACHE_WINNERS,
            excludedIds: Array.from(EXCLUDED_IDS)
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.warn('[System] 无法持久化抽奖数据:', error.message);
    }
};

// 立即加载一次
loadLocalData();
loadLotteryData();

// 中间件：口令验证
const authMiddleware = (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (token !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: '口令错误，无权操作' });
    }
    next();
};

// API: 验证口令 (新增)
app.post('/api/check-auth', authMiddleware, (req, res) => {
    res.json({ success: true, message: 'Verified' });
});

// API: 获取 Excel 数据 (直接返回内存数据)
app.get('/api/data', (req, res) => {
    res.json({ success: true, data: CACHE_DATA });
});

// API: 上传文件 (内存处理 + 尝试持久化)
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '请选择文件' });
    }

    try {
        // 1. 解析上传的文件 (Buffer) -> 更新内存缓存
        const newData = parseExcelBuffer(req.file.buffer);
        if (newData.length === 0) {
            return res.status(400).json({ success: false, message: '文件为空或格式不正确' });
        }
        
        // 更新内存
        CACHE_DATA = newData;
        console.log(`[Upload] 内存数据已更新: ${newData.length} 条记录`);

        // 2. 尝试写入磁盘 (兼容本地开发环境)
        // Deno Deploy 等只读环境会报错，捕获忽略即可
        try {
            fs.writeFileSync('info.xlsx', req.file.buffer);
            console.log('[Upload] 文件已持久化到 info.xlsx');
        } catch (writeErr) {
            console.warn('[Upload Warning] 无法写入磁盘 (可能是只读文件系统)，仅更新了内存数据:', writeErr.message);
        }

        res.json({ success: true, message: '更新成功！(实时生效)' });
    } catch (error) {
        console.error('文件处理失败:', error);
        res.status(500).json({ success: false, message: '解析错误: ' + error.message });
    }
});

// 处理 SPA 路由：所有非 API 请求返回 index.html
app.use((req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send(err.message);
        }
    });
});

// 错误处理中间件 (Multer 错误等) - 必须放在最后
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: '上传错误: ' + err.message });
    } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

// ==========================================
// 抽奖系统 API
// ==========================================

// 1. 获取奖品列表
app.get('/api/prizes', (req, res) => {
    res.json({ success: true, data: CACHE_PRIZES });
});

// 2. 添加/更新奖品 (需认证)
app.post('/api/prizes', authMiddleware, (req, res) => {
    const { id, name, count, level, levelLabel } = req.body;
    if (!name || !count) {
        return res.status(400).json({ success: false, message: '名称和数量必填' });
    }

    const newPrize = {
        id: id || Date.now().toString(), // 简单ID生成
        name,
        count: parseInt(count),
        remaining: parseInt(count),
        level: level || 'participation',
        levelLabel: levelLabel || '参与奖'
    };

    // 如果是更新（带ID），则替换
    const existIndex = CACHE_PRIZES.findIndex(p => p.id === newPrize.id);
    if (existIndex >= 0) {
        // 保留剩余数量计算逻辑：如果总数变了，差异加到剩余里
        const diff = newPrize.count - CACHE_PRIZES[existIndex].count;
        newPrize.remaining = CACHE_PRIZES[existIndex].remaining + diff;
        if (newPrize.remaining < 0) newPrize.remaining = 0;
        CACHE_PRIZES[existIndex] = newPrize;
    } else {
        CACHE_PRIZES.push(newPrize);
    }
    
    saveLotteryData();
    res.json({ success: true, message: '奖品已保存', data: newPrize });
});

// 3. 删除奖品 (需认证)
app.delete('/api/prizes/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    CACHE_PRIZES = CACHE_PRIZES.filter(p => p.id !== id);
    saveLotteryData();
    res.json({ success: true, message: '奖品已删除' });
});

// 4. 获取中奖名单
app.get('/api/lottery/winners', (req, res) => {
    res.json({ success: true, data: CACHE_WINNERS.reverse() }); // 最新在钱
});

// 4.1 清空奖品库 (新增)
app.post('/api/prizes/reset', authMiddleware, (req, res) => {
    CACHE_PRIZES = [];
    saveLotteryData();
    res.json({ success: true, message: '奖品库已清空' });
});

// 5. 执行抽奖 (需认证)
app.post('/api/lottery/draw', authMiddleware, (req, res) => {
    const { prizeId, count = 1 } = req.body;
    
    // 1. 获取符合抽奖资格的人员
    if (CACHE_DATA.length === 0) {
        return res.status(400).json({ success: false, message: '人员名单为空，请先上传数据' });
    }
    
    const availableCandidates = CACHE_DATA.filter(emp => !EXCLUDED_IDS.has(String(emp.id)));
    
    if (availableCandidates.length === 0) {
        return res.status(400).json({ success: false, message: '所有人都已中奖，无人可抽' });
    }

    // 2. 确定目标奖品
    let targetPrize;
    if (prizeId) {
        targetPrize = CACHE_PRIZES.find(p => p.id === prizeId);
        if (!targetPrize) {
            return res.status(404).json({ success: false, message: '奖品不存在' });
        }
        if (targetPrize.remaining <= 0) {
            return res.status(400).json({ success: false, message: '该奖品已抽完' });
        }
    } else {
        // 随机模式：只从有剩余的奖品里抽
        const availablePrizes = CACHE_PRIZES.filter(p => p.remaining > 0);
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
        EXCLUDED_IDS.add(String(w.id));
        
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
        CACHE_WINNERS.push(record);
    });

    // 扣减库存
    targetPrize.remaining -= winners.length;

    // 持久化
    saveLotteryData();

    res.json({
        success: true,
        message: `成功抽取 ${winners.length} 人`,
        data: newRecords
    });
});

// 6. 重置中奖数据 (仅清空记录和恢复库存)
app.post('/api/lottery/reset-winners', authMiddleware, (req, res) => {
    // 清空名单和排除集合
    CACHE_WINNERS = [];
    EXCLUDED_IDS = new Set();
    
    // 恢复奖品库存
    CACHE_PRIZES.forEach(p => {
        p.remaining = p.count;
    });

    saveLotteryData();
    res.json({ success: true, message: '中奖数据已重置，奖品库存已恢复' });
});

// 7. 作废/重抽 (需认证)
app.post('/api/lottery/invalidate', authMiddleware, (req, res) => {
    const { id } = req.body; // winner record id, not employee id
    if (!id) return res.status(400).json({ success: false, message: 'ID必填' });

    const winnerIndex = CACHE_WINNERS.findIndex(w => w.id === id);
    if (winnerIndex === -1) {
        return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const winnerRecord = CACHE_WINNERS[winnerIndex];
    
    // 1. 移除中奖记录
    CACHE_WINNERS.splice(winnerIndex, 1);
    
    // 2. 从排除名单中移除人员 (允许再次中奖)
    EXCLUDED_IDS.delete(String(winnerRecord.winnerId));
    
    // 3. 恢复奖品库存
    const prize = CACHE_PRIZES.find(p => p.id === winnerRecord.prizeId);
    if (prize) {
        prize.remaining++;
    }

    saveLotteryData();
    res.json({ success: true, message: '已作废该中奖记录，奖品已回库' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Front-end: http://localhost:${PORT}/`);
    console.log(`Back-end:  http://localhost:${PORT}/admin`);
});
