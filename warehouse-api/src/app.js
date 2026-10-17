const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getAIResponse } = require('./ai-assistant');
const morgan = require('morgan');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const logger = require('./middleware/logger');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 数据库配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'warehouse_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('数据库连接成功');
        connection.release();
    } catch (err) {
        console.error('数据库连接失败:', err);
        process.exit(1);
    }
};

testConnection();

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: '服务器内部错误' });
};

// 认证中间件
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '未提供认证令牌' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ message: '无效的认证令牌' });
    }
};

// 获取商品价格分析
app.get('/api/statistics/price-analysis', async (req, res) => {
    try {
        console.log('正在获取价格分析数据...');
        const [results] = await pool.execute(`
            WITH inbound_stats AS (
                SELECT 
                    product_id,
                    ROUND(AVG(unit_price), 2) as avg_inbound_price,
                    SUM(quantity) as total_inbound_quantity
                FROM inbound_records
                GROUP BY product_id
            ),
            outbound_stats AS (
                SELECT 
                    product_id,
                    ROUND(AVG(unit_price), 2) as avg_outbound_price,
                    SUM(quantity) as total_outbound_quantity
                FROM outbound_records
                GROUP BY product_id
            )
            SELECT 
                p.product_id,
                p.product_name,
                p.category,
                p.unit,
                COALESCE(i.avg_inbound_price, 0) as avg_inbound_price,
                COALESCE(o.avg_outbound_price, 0) as avg_outbound_price,
                COALESCE(o.avg_outbound_price - i.avg_inbound_price, 0) as unit_profit,
                CASE 
                    WHEN i.avg_inbound_price > 0 
                    THEN ROUND((o.avg_outbound_price - i.avg_inbound_price) / i.avg_inbound_price * 100, 2)
                    ELSE 0 
                END as profit_margin,
                COALESCE(o.total_outbound_quantity, 0) as total_outbound_quantity,
                COALESCE((o.avg_outbound_price - i.avg_inbound_price) * o.total_outbound_quantity, 0) as total_profit
            FROM products p
            LEFT JOIN inbound_stats i ON p.product_id = i.product_id
            LEFT JOIN outbound_stats o ON p.product_id = o.product_id
            WHERE i.avg_inbound_price IS NOT NULL 
                OR o.avg_outbound_price IS NOT NULL
            ORDER BY total_profit DESC
        `);

        console.log('价格分析数据:', results);
        res.json(results);
    } catch (err) {
        console.error('获取商品价格分析数据错误:', err);
        res.status(500).json({ message: '获取商品价格分析数据失败' });
    }
});

// 登录路由
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('登录请求:', { username, password });
        
        const [users] = await pool.execute(
            'SELECT user_id, username, password, role FROM users WHERE username = ?',
            [username]
        );
        console.log('查询结果:', users);
        
        const user = users[0];
        
        if (!user) {
            console.log('用户不存在');
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        const isValidPassword = bcrypt.compareSync(password, user.password);
        console.log('密码验证结果:', isValidPassword);
        
        if (!isValidPassword) {
            console.log('密码不正确');
            return res.status(401).json({ message: '用户名或密码错误' });
        }
        
        const token = jwt.sign(
            { id: user.user_id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            username: user.username,
            role: user.role
        });
    } catch (err) {
        console.error('登录错误:', err);
        res.status(500).json({ message: '登录失败' });
    }
});

// 获取商品列表
app.get('/api/products', async (req, res) => {
    try {
        console.log('正在获取商品列表...');
        const [products] = await pool.execute('SELECT * FROM products ORDER BY product_id DESC');
        console.log('获取到的商品列表:', products);
        res.json(products);
    } catch (err) {
        console.error('获取商品列表错误:', err);
        console.error('错误详情:', err.stack);
        res.status(500).json({ message: '获取商品列表失败', error: err.message });
    }
});

// 获取库存预警阈值
const getLowStockThreshold = async (pool) => {
    const [settings] = await pool.execute('SELECT low_stock_threshold FROM system_settings ORDER BY setting_id DESC LIMIT 1');
    return settings.length > 0 ? settings[0].low_stock_threshold : 10; // 默认值为10
};

// 获取库存状态
app.get('/api/inventory', async (req, res) => {
    try {
        const [inventory] = await pool.execute(`
            WITH latest_threshold AS (
                SELECT low_stock_threshold
                FROM system_settings
                ORDER BY setting_id DESC
                LIMIT 1
            )
            SELECT 
                p.product_id,
                p.product_name,
                p.category,
                p.unit,
                IFNULL((SELECT SUM(quantity) FROM inbound_records WHERE product_id = p.product_id), 0) as total_inbound,
                IFNULL((SELECT SUM(quantity) FROM outbound_records WHERE product_id = p.product_id), 0) as total_outbound,
                IFNULL((SELECT SUM(quantity) FROM inbound_records WHERE product_id = p.product_id), 0) - 
                IFNULL((SELECT SUM(quantity) FROM outbound_records WHERE product_id = p.product_id), 0) as current_stock,
                GREATEST(
                    IFNULL((SELECT MAX(inbound_date) FROM inbound_records WHERE product_id = p.product_id), '1970-01-01'),
                    IFNULL((SELECT MAX(outbound_date) FROM outbound_records WHERE product_id = p.product_id), '1970-01-01')
                ) as last_updated,
                COALESCE((SELECT low_stock_threshold FROM latest_threshold), 10) as low_stock_threshold
            FROM products p
            ORDER BY p.product_id DESC
        `);
        res.json(inventory);
    } catch (err) {
        console.error('获取库存状态错误:', err);
        res.status(500).json({ message: '获取库存状态失败' });
    }
});

// 获取入库记录
app.get('/api/inbound', async (req, res) => {
    try {
        console.log('正在获取入库记录...');
        const [records] = await pool.execute(`
            SELECT 
                i.*,
                p.product_name,
                p.unit
            FROM inbound_records i
            JOIN products p ON i.product_id = p.product_id
            ORDER BY i.inbound_id DESC
        `);
        console.log('获取到的入库记录:', records);
        res.json(records);
    } catch (err) {
        console.error('获取入库记录错误:', err);
        console.error('错误详情:', err.stack);
        res.status(500).json({ message: '获取入库记录失败', error: err.message });
    }
});

// 获取最近入库记录
app.get('/api/inbound/recent', async (req, res) => {
    try {
        const [records] = await pool.execute(`
            SELECT 
                i.*,
                p.product_name,
                p.unit
            FROM inbound_records i
            JOIN products p ON i.product_id = p.product_id
            ORDER BY i.inbound_date DESC
            LIMIT 5
        `);
        res.json(records);
    } catch (err) {
        console.error('获取最近入库记录错误:', err);
        res.status(500).json({ message: '获取最近入库记录失败' });
    }
});

// 获取出库记录
app.get('/api/outbound', async (req, res) => {
    try {
        console.log('正在获取出库记录...');
        const [records] = await pool.execute(`
            SELECT 
                o.*,
                p.product_name,
                p.unit
            FROM outbound_records o
            JOIN products p ON o.product_id = p.product_id
            ORDER BY o.outbound_id DESC
        `);
        console.log('获取到的出库记录:', records);
        res.json(records);
    } catch (err) {
        console.error('获取出库记录错误:', err);
        console.error('错误详情:', err.stack);
        res.status(500).json({ message: '获取出库记录失败', error: err.message });
    }
});

// 获取最近出库记录
app.get('/api/outbound/recent', async (req, res) => {
    try {
        const [records] = await pool.execute(`
            SELECT 
                o.*,
                p.product_name,
                p.unit
            FROM outbound_records o
            JOIN products p ON o.product_id = p.product_id
            ORDER BY o.outbound_date DESC
            LIMIT 5
        `);
        res.json(records);
    } catch (err) {
        console.error('获取最近出库记录错误:', err);
        res.status(500).json({ message: '获取最近出库记录失败' });
    }
});

// 添加入库记录
app.post('/api/inbound', async (req, res) => {
    try {
        console.log('正在添加入库记录:', req.body);
        const { product_id, quantity, unit_price, supplier } = req.body;
        const operator_id = 1; // 默认操作员ID

        // 验证产品是否存在
        const [products] = await pool.execute(
            'SELECT * FROM products WHERE product_id = ?',
            [product_id]
        );
        
        if (products.length === 0) {
            return res.status(400).json({ message: '产品不存在' });
        }

        // 添加入库记录
        const [result] = await pool.execute(
            `INSERT INTO inbound_records (product_id, quantity, unit_price, supplier, operator_id)
             VALUES (?, ?, ?, ?, ?)`,
            [product_id, quantity, unit_price, supplier, operator_id]
        );
        console.log('入库记录添加结果:', result);

        // 记录操作日志
        await pool.execute(
            `INSERT INTO system_logs (user_id, action, description)
             VALUES (?, ?, ?)`,
            [operator_id, 'INBOUND', `商品入库: ${products[0].product_name}, 数量: ${quantity}`]
        );

        // 获取新添加的记录
        const [newRecord] = await pool.execute(`
            SELECT 
                i.*,
                p.product_name,
                p.unit
            FROM inbound_records i
            JOIN products p ON i.product_id = p.product_id
            WHERE i.inbound_id = ?
        `, [result.insertId]);

        console.log('新添加的入库记录:', newRecord[0]);
        res.json({ message: '入库记录添加成功', record: newRecord[0] });
    } catch (err) {
        console.error('添加入库记录错误:', err);
        console.error('错误详情:', err.stack);
        res.status(500).json({ message: '添加入库记录失败', error: err.message });
    }
});

// 添加出库记录
app.post('/api/outbound', async (req, res) => {
    try {
        const { product_id, quantity, unit_price, customer } = req.body;
        const operator_id = 1; // 默认操作员ID
        
        // 检查库存
        const [inventory] = await pool.execute(`
            SELECT 
                IFNULL((SELECT SUM(quantity) FROM inbound_records WHERE product_id = ?), 0) - 
                IFNULL((SELECT SUM(quantity) FROM outbound_records WHERE product_id = ?), 0) as current_stock
        `, [product_id, product_id]);
        
        if (!inventory[0] || inventory[0].current_stock < quantity) {
            return res.status(400).json({ message: '库存不足' });
        }
        
        await pool.execute(
            `INSERT INTO outbound_records (product_id, quantity, unit_price, customer, operator_id)
             VALUES (?, ?, ?, ?, ?)`,
            [product_id, quantity, unit_price, customer, operator_id]
        );
        
        // 记录操作日志
        await pool.execute(
            `INSERT INTO system_logs (user_id, action, description)
             VALUES (?, ?, ?)`,
            [operator_id, 'OUTBOUND', `商品出库: 产品ID ${product_id}, 数量: ${quantity}`]
        );
            
        res.json({ message: '出库记录添加成功' });
    } catch (err) {
        console.error('添加出库记录错误:', err);
        res.status(500).json({ message: '添加出库记录失败' });
    }
});

// 获取系统日志
app.get('/api/logs', async (req, res) => {
    try {
        const [logs] = await pool.execute(`
            SELECT 
                l.log_id,
                l.action,
                l.description,
                l.created_at,
                l.user_id,
                IFNULL(u.username, 'System') as username
             FROM system_logs l
            LEFT JOIN users u ON l.user_id = u.user_id
            ORDER BY l.created_at DESC
            LIMIT 100
        `);
        res.json(logs);
    } catch (err) {
        console.error('获取系统日志错误:', err);
        res.status(500).json({ message: '获取系统日志失败' });
    }
});

// 添加新商品
app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        // 检查用户权限
        const token = req.headers['authorization']?.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await pool.execute(
            'SELECT role FROM users WHERE user_id = ?',
            [decoded.id]
        );
        
        if (!users[0] || (users[0].role !== 'admin' && users[0].role !== 'superadmin')) {
            return res.status(403).json({ message: '需要管理员权限才能添加商品' });
        }
        
        console.log('正在添加新商品:', req.body);
        const { product_name, description, category, unit } = req.body;
        
        const [result] = await pool.execute(
            `INSERT INTO products (product_name, description, category, unit)
             VALUES (?, ?, ?, ?)`,
            [product_name, description, category, unit]
        );
        console.log('插入结果:', result);
        
        // 记录操作日志
        await pool.execute(
            `INSERT INTO system_logs (user_id, action, description)
             VALUES (?, ?, ?)`,
            [decoded.id, 'CREATE', `创建商品: ${product_name}`]
        );
            
        const [newProduct] = await pool.execute(
            'SELECT * FROM products WHERE product_id = ?',
            [result.insertId]
        );
        console.log('新添加的商品:', newProduct[0]);    
        res.json(newProduct[0]);
    } catch (err) {
        console.error('添加商品错误:', err);
        console.error('错误详情:', err.stack);
        res.status(500).json({ message: '添加商品失败', error: err.message });
    }
});

// 更新商品
app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        // 检查用户权限
        const token = req.headers['authorization']?.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await pool.execute(
            'SELECT role FROM users WHERE user_id = ?',
            [decoded.id]
        );
        
        if (!users[0] || (users[0].role !== 'admin' && users[0].role !== 'superadmin')) {
            return res.status(403).json({ message: '需要管理员权限才能修改商品' });
        }
        
        const { id } = req.params;
        const { product_name, description, category, unit } = req.body;
        
        await pool.execute(
            `UPDATE products 
             SET product_name = ?, description = ?, category = ?, unit = ?
             WHERE product_id = ?`,
            [product_name, description, category, unit, id]
        );
        
        // 记录操作日志
        await pool.execute(
            `INSERT INTO system_logs (user_id, action, description)
             VALUES (?, ?, ?)`,
            [decoded.id, 'UPDATE', `更新商品: ${product_name} (ID: ${id})`]
        );
        
        const [updatedProduct] = await pool.execute(
            'SELECT * FROM products WHERE product_id = ?',
            [id]
        );
        
        res.json(updatedProduct[0]);
    } catch (err) {
        console.error('更新商品错误:', err);
        res.status(500).json({ message: '更新商品失败' });
    }
});

// 删除商品
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        // 检查用户权限
        const token = req.headers['authorization']?.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await pool.execute(
            'SELECT role FROM users WHERE user_id = ?',
            [decoded.id]
        );
        
        if (!users[0] || (users[0].role !== 'admin' && users[0].role !== 'superadmin')) {
            return res.status(403).json({ message: '需要管理员权限才能删除商品' });
        }
        
        const { id } = req.params;
        
        // 先获取商品信息用于日志记录
        const [product] = await pool.execute(
            'SELECT product_name FROM products WHERE product_id = ?',
            [id]
        );
        
        await pool.execute('DELETE FROM products WHERE product_id = ?', [id]);
        
        // 记录操作日志
        if (product[0]) {
            await pool.execute(
                `INSERT INTO system_logs (user_id, action, description)
                 VALUES (?, ?, ?)`,
                [decoded.id, 'DELETE', `删除商品: ${product[0].product_name} (ID: ${id})`]
            );
        }
        
        res.json({ message: '商品删除成功' });
    } catch (err) {
        console.error('删除商品错误:', err);
        res.status(500).json({ message: '删除商品失败' });
    }
});

// 导出库存报表
app.get('/api/inventory/export', async (req, res) => {
    try {
        console.log('开始导出库存报表...');
        
        // 检查数据库连接
        try {
            const connection = await pool.getConnection();
            console.log('数据库连接成功');
            connection.release();
        } catch (dbErr) {
            console.error('数据库连接失败:', dbErr);
            return res.status(500).json({ 
                message: '数据库连接失败',
                error: dbErr.message
            });
        }
        
        // 首先检查products表是否有数据
        const [productsCheck] = await pool.execute('SELECT COUNT(*) as count FROM products');
        console.log('商品总数:', productsCheck[0].count);
        
        if (productsCheck[0].count === 0) {
            console.log('没有商品数据');
            return res.status(400).json({ message: '没有可导出的商品数据' });
        }

        console.log('正在执行库存查询...');
        const [inventory] = await pool.execute(`
            SELECT 
                p.product_id as '商品ID',
                p.product_name as '商品名称',
                p.category as '类别',
                p.unit as '单位',
                IFNULL((SELECT SUM(quantity) FROM inbound_records WHERE product_id = p.product_id), 0) as '入库总量',
                IFNULL((SELECT SUM(quantity) FROM outbound_records WHERE product_id = p.product_id), 0) as '出库总量',
                IFNULL((SELECT SUM(quantity) FROM inbound_records WHERE product_id = p.product_id), 0) - 
                IFNULL((SELECT SUM(quantity) FROM outbound_records WHERE product_id = p.product_id), 0) as '当前库存',
                CASE 
                    WHEN (IFNULL((SELECT SUM(quantity) FROM inbound_records WHERE product_id = p.product_id), 0) - 
                          IFNULL((SELECT SUM(quantity) FROM outbound_records WHERE product_id = p.product_id), 0)) < 10 
                    THEN '低库存' 
                    ELSE '正常' 
                END as '库存状态'
            FROM products p
            ORDER BY p.product_id
        `);
        
        console.log('查询完成，获取到的记录数:', inventory.length);
        
        if (!inventory || inventory.length === 0) {
            console.log('查询结果为空');
            return res.status(400).json({ message: '没有可导出的库存数据' });
        }

        try {
            // 创建CSV内容
            console.log('开始生成CSV内容...');
            const csvHeaders = Object.keys(inventory[0] || {}).join(',');
            const csvData = inventory.map(row => Object.values(row).join(',')).join('\n');
            const csv = `${csvHeaders}\n${csvData}`;
            
            console.log('CSV头部:', csvHeaders);
            console.log('CSV第一行数据:', inventory[0] ? Object.values(inventory[0]).join(',') : '无数据');
            
            // 设置响应头
            const filename = `库存报表_${new Date().toISOString().slice(0, 10)}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            
            // 记录操作日志
            console.log('记录导出操作日志...');
            await pool.execute(
                `INSERT INTO system_logs (user_id, action, description)
                 VALUES (?, ?, ?)`,
                [decoded.id, 'EXPORT', `导出库存报表: ${inventory.length}条记录`]
            );
            
            console.log('发送CSV文件...');
            // 添加BOM以支持Excel正确显示中文
            res.send('\ufeff' + csv);
            console.log('导出完成');
        } catch (csvErr) {
            console.error('生成或发送CSV文件时出错:', csvErr);
            return res.status(500).json({ 
                message: '生成导出文件失败',
                error: csvErr.message
            });
        }
    } catch (err) {
        console.error('导出库存报表错误:', err);
        console.error('错误详情:', err.stack);
        // 检查是否是数据库连接错误
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            return res.status(500).json({ 
                message: '数据库连接已断开，请检查数据库服务',
                error: err.message
            });
        }
        res.status(500).json({ 
            message: '导出库存报表失败',
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 获取统计数据
app.get('/api/statistics', async (req, res) => {
    try {
        // 获取最新的库存预警阈值
        const [thresholdResult] = await pool.execute(`
            SELECT low_stock_threshold
            FROM system_settings
            ORDER BY setting_id DESC
            LIMIT 1
        `);
        const threshold = thresholdResult.length > 0 ? thresholdResult[0].low_stock_threshold : 10;

        // 获取今日、本周、本月的统计数据
        const now = new Date();
        now.setHours(0, 0, 0, 0);  // 设置为今天的开始时间
        const today = now.toISOString().slice(0, 10);
        
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);

        // 今日统计
        const [todayInbound] = await pool.execute(`
            SELECT 
                COUNT(*) as count, 
                IFNULL(SUM(quantity), 0) as total 
            FROM inbound_records 
            WHERE DATE(inbound_date) = CURRENT_DATE()
        `);
        
        const [todayOutbound] = await pool.execute(`
            SELECT 
                COUNT(*) as count, 
                IFNULL(SUM(quantity), 0) as total 
            FROM outbound_records 
            WHERE DATE(outbound_date) = CURRENT_DATE()
        `);

        // 本周统计
        const [weekInbound] = await pool.execute(`
            SELECT 
                COUNT(*) as count, 
                IFNULL(SUM(quantity), 0) as total 
            FROM inbound_records 
            WHERE inbound_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        `);
        
        const [weekOutbound] = await pool.execute(`
            SELECT 
                COUNT(*) as count, 
                IFNULL(SUM(quantity), 0) as total 
            FROM outbound_records 
            WHERE outbound_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        `);

        // 本月统计
        const [monthInbound] = await pool.execute(`
            SELECT 
                COUNT(*) as count, 
                IFNULL(SUM(quantity), 0) as total 
            FROM inbound_records 
            WHERE inbound_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        `);
        
        const [monthOutbound] = await pool.execute(`
            SELECT 
                COUNT(*) as count, 
                IFNULL(SUM(quantity), 0) as total 
            FROM outbound_records 
            WHERE outbound_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        `);

        // 热门商品（出库最多的前5个）
        const [hotProducts] = await pool.execute(`
            SELECT 
                p.product_name,
                SUM(o.quantity) as total_quantity,
                IFNULL((
                    SELECT SUM(quantity) 
                    FROM inbound_records 
                    WHERE product_id = p.product_id
                ), 0) - 
                IFNULL((
                    SELECT SUM(quantity) 
                    FROM outbound_records 
                    WHERE product_id = p.product_id
                ), 0) as current_stock,
                ? as low_stock_threshold
            FROM outbound_records o
            JOIN products p ON o.product_id = p.product_id
            WHERE o.outbound_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            GROUP BY p.product_id, p.product_name
            ORDER BY total_quantity DESC
            LIMIT 5
        `, [threshold]);

        res.json({
            today: {
                inbound: todayInbound[0],
                outbound: todayOutbound[0]
            },
            week: {
                inbound: weekInbound[0],
                outbound: weekOutbound[0]
            },
            month: {
                inbound: monthInbound[0],
                outbound: monthOutbound[0]
            },
            hotProducts,
            threshold
        });
    } catch (err) {
        console.error('获取统计数据错误:', err);
        res.status(500).json({ message: '获取统计数据失败' });
    }
});

// AI助手API
app.post('/api/ai-assistant', async (req, res) => {
    try {
        const { message } = req.body;
        console.log('收到AI助手请求:', message);
        
        const response = await getAIResponse(pool, message);
        console.log('AI助手响应:', response);
        
        res.json({ response });
    } catch (err) {
        console.error('AI助手错误:', err);
        res.status(500).json({ message: 'AI助手服务出错', error: err.message });
    }
});

// 获取用户列表
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT user_id, username, role, created_at FROM users'
        );
        res.json(users);
    } catch (err) {
        console.error('获取用户列表错误:', err);
        res.status(500).json({ message: '获取用户列表失败' });
    }
});

// 创建用户
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // 验证必填字段
        if (!username || !password || !role) {
            return res.status(400).json({ message: '用户名、密码和角色都是必填项' });
        }

        // 检查用户名是否已存在
        const [existingUsers] = await pool.execute(
            'SELECT user_id FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: '用户名已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const [result] = await pool.execute(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );

        // 记录操作日志
        await pool.execute(
            'INSERT INTO system_logs (user_id, action, description) VALUES (?, ?, ?)',
            [req.user.id, 'CREATE', `创建用户: ${username}`]
        );

        const [newUser] = await pool.execute(
            'SELECT user_id, username, role, created_at FROM users WHERE user_id = ?',
            [result.insertId]
        );

        res.status(201).json(newUser[0]);
    } catch (err) {
        console.error('创建用户错误:', err);
        res.status(500).json({ message: '创建用户失败' });
    }
});

// 更新用户
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;

        // 检查用户是否存在
        const [existingUser] = await pool.execute(
            'SELECT * FROM users WHERE user_id = ?',
            [id]
        );

        if (existingUser.length === 0) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 如果更新用户名，检查新用户名是否已存在
        if (username && username !== existingUser[0].username) {
            const [duplicateUser] = await pool.execute(
                'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
                [username, id]
            );

            if (duplicateUser.length > 0) {
                return res.status(400).json({ message: '用户名已存在' });
            }
        }

        // 构建更新SQL
        let updateSQL = 'UPDATE users SET ';
        const updateParams = [];
        const updates = [];

        if (username) {
            updates.push('username = ?');
            updateParams.push(username);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            updateParams.push(hashedPassword);
        }
        if (role) {
            updates.push('role = ?');
            updateParams.push(role);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: '没有提供要更新的字段' });
        }

        updateSQL += updates.join(', ');
        updateSQL += ' WHERE user_id = ?';
        updateParams.push(id);

        await pool.execute(updateSQL, updateParams);

        // 记录操作日志
        await pool.execute(
            'INSERT INTO system_logs (user_id, action, description) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE', `更新用户: ${username || existingUser[0].username}`]
        );

        const [updatedUser] = await pool.execute(
            'SELECT user_id, username, role, created_at FROM users WHERE user_id = ?',
            [id]
        );

        res.json(updatedUser[0]);
    } catch (err) {
        console.error('更新用户错误:', err);
        res.status(500).json({ message: '更新用户失败' });
    }
});

// 删除用户
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        // 检查用户是否存在
        const [existingUser] = await connection.execute(
            'SELECT username FROM users WHERE user_id = ?',
            [id]
        );

        if (existingUser.length === 0) {
            connection.release();
            return res.status(404).json({ message: '用户不存在' });
        }

        // 不允许删除自己
        if (parseInt(id) === req.user.id) {
            connection.release();
            return res.status(400).json({ message: '不能删除当前登录用户' });
        }

        await connection.beginTransaction();

        // 将该用户的入库记录中的operator_id设为null
        await connection.execute(
            'UPDATE inbound_records SET operator_id = NULL WHERE operator_id = ?',
            [id]
        );

        // 将该用户的出库记录中的operator_id设为null
        await connection.execute(
            'UPDATE outbound_records SET operator_id = NULL WHERE operator_id = ?',
            [id]
        );

        // 将该用户的系统设置更新记录中的updated_by设为null
        await connection.execute(
            'UPDATE system_settings SET updated_by = NULL WHERE updated_by = ?',
            [id]
        );

        // 删除该用户的所有系统日志
        await connection.execute(
            'DELETE FROM system_logs WHERE user_id = ?',
            [id]
        );

        // 最后删除用户
        await connection.execute(
            'DELETE FROM users WHERE user_id = ?',
            [id]
        );

        // 记录删除操作的日志（使用操作者的ID）
        await connection.execute(
            'INSERT INTO system_logs (user_id, action, description) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE', `删除用户: ${existingUser[0].username}`]
        );

        await connection.commit();
        res.json({ 
            message: '用户删除成功',
            details: '已清理该用户的所有关联数据'
        });
    } catch (err) {
        await connection.rollback();
        console.error('删除用户错误:', err);
        res.status(500).json({ 
            message: '删除用户失败',
            error: err.message 
        });
    } finally {
        connection.release();
    }
});

// 获取系统设置
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const [settings] = await pool.execute('SELECT * FROM system_settings ORDER BY setting_id DESC LIMIT 1');
        
        if (settings.length === 0) {
            // 如果没有设置记录，返回默认值
            return res.json({
                systemName: '仓库管理系统',
                lowStockThreshold: 10,
                enableNotifications: true,
                backupInterval: 24
            });
        }
        
        res.json(settings[0]);
    } catch (err) {
        console.error('获取系统设置错误:', err);
        res.status(500).json({ message: '获取系统设置失败' });
    }
});

// 更新系统设置
app.post('/api/settings', authenticateToken, async (req, res) => {
    try {
        const { systemName, lowStockThreshold, enableNotifications, backupInterval } = req.body;
        
        // 验证必填字段
        if (!systemName || !lowStockThreshold || backupInterval === undefined) {
            return res.status(400).json({ message: '请填写所有必填字段' });
        }
        
        // 验证数值范围
        if (lowStockThreshold < 1) {
            return res.status(400).json({ message: '库存预警阈值必须大于0' });
        }
        
        if (backupInterval < 1 || backupInterval > 168) {
            return res.status(400).json({ message: '备份间隔必须在1-168小时之间' });
        }
        
        // 插入新的设置记录
        const [result] = await pool.execute(
            `INSERT INTO system_settings 
            (system_name, low_stock_threshold, enable_notifications, backup_interval, updated_by)
            VALUES (?, ?, ?, ?, ?)`,
            [systemName, lowStockThreshold, enableNotifications ? 1 : 0, backupInterval, req.user.id]
        );
        
        // 记录操作日志
        await pool.execute(
            `INSERT INTO system_logs (user_id, action, description)
             VALUES (?, ?, ?)`,
            [req.user.id, 'UPDATE', '更新系统设置']
        );
        
        // 获取更新后的设置
        const [updatedSettings] = await pool.execute(
            'SELECT * FROM system_settings WHERE setting_id = ?',
            [result.insertId]
        );
        
        res.json(updatedSettings[0]);
    } catch (err) {
        console.error('更新系统设置错误:', err);
        res.status(500).json({ message: '更新系统设置失败' });
    }
});

// 路由
app.use('/api/auth', authRoutes);

// 使用错误处理中间件
app.use(errorHandler);

// 404处理
app.use((req, res) => {
    console.log('404 Not Found:', req.method, req.url);
    res.status(404).json({ message: '请求的资源不存在' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app; 