const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = 'MEILIN1!'; // 管理员口令，可在此修改

// 启用 CORS 和 JSON 解析
app.use(cors());
app.use(express.json());
// 生产环境托管 Vue 构建产物 (dist)
app.use(express.static(path.join(__dirname, 'dist')));

// 配置 Multer：临时保存上传文件
const upload = multer({ 
    dest: 'uploads_tmp/',
    fileFilter: (req, file, cb) => {
        // 简单检查扩展名
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
            return cb(new Error('只允许上传 Excel 文件 (.xlsx, .xls)'));
        }
        cb(null, true);
    }
});

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

// API: 获取 Excel 数据
app.get('/api/data', (req, res) => {
    try {
        if (!fs.existsSync('info.xlsx')) {
            return res.json({ success: true, data: [] }); // 文件不存在时返回空数据
        }
        
        const workbook = xlsx.readFile('info.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet);
        
        const formattedData = rawData.map(row => {
            const idKey = Object.keys(row).find(k => k.includes('号') && (k.includes('工') || k.includes('编')));
            const nameKey = Object.keys(row).find(k => k.includes('名'));
            const seatKey = Object.keys(row).find(k => k.includes('座'));

            return {
                id: row[idKey || '员工编号'] || '',
                name: row[nameKey || '姓名'] || '',
                seat: row[seatKey || '座位号'] || ''
            };
        }).filter(item => item.id && item.name);

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('读取 Excel 失败:', error);
        res.status(500).json({ success: false, message: '数据读取错误' });
    }
});

// API: 上传文件 (增加 authMiddleware)
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '请选择文件' });
    }

    const tempPath = req.file.path;
    const targetPath = 'info.xlsx';

    try {
        // 验证文件是否确实是 Excel (尝试读取一下)
        try {
            const workbook = xlsx.readFile(tempPath);
            if (workbook.SheetNames.length === 0) throw new Error('空文件');
        } catch (e) {
            fs.unlinkSync(tempPath); // 删除无效文件
            return res.status(400).json({ success: false, message: '无效的 Excel 文件' });
        }

        // 移动并重命名文件（覆盖旧的 info.xlsx）
        fs.copyFileSync(tempPath, targetPath);
        fs.unlinkSync(tempPath); // 删除临时文件

        res.json({ success: true, message: '更新成功！文件已自动重命名为 info.xlsx' });
    } catch (error) {
        console.error('文件处理失败:', error);
        // 清理临时文件
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(500).json({ success: false, message: '服务器内部错误: ' + error.message });
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
    
    // 确保临时目录存在
    if (!fs.existsSync('uploads_tmp')) {
        fs.mkdirSync('uploads_tmp');
    }
});
