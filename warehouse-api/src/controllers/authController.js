const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const config = require('../config/database');

const pool = mysql.createPool(config);

const authController = {
    // 用户登录
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // 验证输入
            if (!username || !password) {
                return res.status(400).json({ message: '用户名和密码不能为空' });
            }

            // 查询用户
            const [users] = await pool.execute(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            const user = users[0];
            if (!user) {
                return res.status(401).json({ message: '用户名或密码错误' });
            }

            // 验证密码
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: '用户名或密码错误' });
            }

            // 生成JWT令牌
            const token = jwt.sign(
                { id: user.user_id, username: user.username, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // 记录登录日志
            await pool.execute(
                'INSERT INTO system_logs (user_id, action, description) VALUES (?, ?, ?)',
                [user.user_id, 'LOGIN', `用户 ${username} 登录系统`]
            );

            res.json({
                token,
                username: user.username,
                role: user.role
            });
        } catch (error) {
            console.error('登录错误:', error);
            res.status(500).json({ message: '登录失败，请稍后重试' });
        }
    },

    // 用户注册
    register: async (req, res) => {
        try {
            const { username, password } = req.body;

            // 验证输入
            if (!username || !password) {
                return res.status(400).json({ message: '用户名和密码不能为空' });
            }

            // 检查用户名是否已存在
            const [existingUsers] = await pool.execute(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ message: '用户名已被使用' });
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // 使用事务来确保数据一致性
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // 创建用户
                await connection.execute(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    [username, hashedPassword]
                );

                // 查询新创建的用户ID
                const [userResult] = await connection.execute(
                    'SELECT user_id FROM users WHERE username = ?',
                    [username]
                );

                if (userResult.length === 0) {
                    throw new Error('用户创建失败');
                }

                const userId = userResult[0].user_id;

                // 记录注册日志
                await connection.execute(
                    'INSERT INTO system_logs (user_id, action, description) VALUES (?, ?, ?)',
                    [userId, 'REGISTER', '新用户注册']
                );

                await connection.commit();
                res.status(201).json({ 
                    message: '注册成功',
                    userId: userId,
                    username: username,
                    role: 'user' // 默认角色
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('注册错误:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: '注册失败，请稍后重试' });
            }
        }
    },

    // 验证令牌
    verifyToken: async (req, res) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: '未提供认证令牌' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [users] = await pool.execute(
                'SELECT user_id, username, role FROM users WHERE user_id = ? AND status = ?',
                [decoded.id, 'active']
            );

            if (!users[0]) {
                return res.status(401).json({ message: '用户不存在或已被禁用' });
            }

            res.json(users[0]);
        } catch (error) {
            console.error('令牌验证错误:', error);
            res.status(401).json({ message: '无效的认证令牌' });
        }
    }
};

module.exports = authController; 