const pool = require('../db');
const jwt = require('jsonwebtoken');

// 检查用户是否为管理员的中间件
const checkAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: '未登录' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.execute(
            'SELECT role FROM users WHERE user_id = ?',
            [decoded.userId]
        );

        // if (users.length === 0 || users[0].role !== 'admin') {
        //     return res.status(403).json({ message: '需要管理员权限' });
        // }
        if (
            users.length === 0 ||
            (users[0].role !== 'admin' && users[0].role !== 'superadmin')
          ) {
            return res.status(403).json({ message: '需要管理员权限' });
          }
          

        next();
    } catch (error) {
        console.error('权限验证错误:', error);
        res.status(401).json({ message: '权限验证失败' });
    }
};

// 添加商品 - 需要管理员权限
router.post('/', checkAdmin, async (req, res) => {
    // ... existing code ...
});

// 更新商品 - 需要管理员权限
router.put('/:id', checkAdmin, async (req, res) => {
    // ... existing code ...
});

// 删除商品 - 需要管理员权限
router.delete('/:id', checkAdmin, async (req, res) => {
    // ... existing code ...
}); 