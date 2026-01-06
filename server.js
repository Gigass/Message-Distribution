const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'admin'; // 管理员口令，可在此修改

// 全局内存缓存 (适配 Deno Deploy 等只读文件系统环境)
let CACHE_DATA = [];

// 启用 CORS 和 JSON 解析
app.use(cors());
app.use(express.json());
// 生产环境托管 Vue 构建产物 (dist)
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
        const seatKey = Object.keys(row).find(k => k.includes('座'));

        return {
            id: row[idKey || '员工编号'] || '',
            name: row[nameKey || '姓名'] || '',
            seat: row[seatKey || '座位号'] || ''
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

// 立即加载一次
loadLocalData();

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

// 错误处理中间件 (Multer 错误等)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: '上传错误: ' + err.message });
    } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

// 处理 SPA 路由：所有非 API 请求返回 index.html
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Front-end: http://localhost:${PORT}/`);
    console.log(`Back-end:  http://localhost:${PORT}/admin`);
});
