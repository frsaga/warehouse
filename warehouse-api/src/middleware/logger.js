const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

async function logActivity(userId, action, description, ip) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.execute(
            'INSERT INTO system_logs (user_id, action, description,  created_at) VALUES (?, ?, ?, NOW())',
            [userId, action, description, ip]
        );
    } catch (error) {
        console.error('记录系统日志失败:', error);
    } finally {
        await connection.end();
    }
}

const logger = async (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
        res.send = originalSend;
        if (req.user) {
            const action = `${req.method} ${req.path}`;
            const description = JSON.stringify({
                query: req.query,
                body: req.method !== 'GET' ? req.body : undefined,
                status: res.statusCode
            });
            const ip = req.ip || req.connection.remoteAddress;
            
            logActivity(req.user.id, action, description, ip);
        }
        return res.send(data);
    };
    next();
};

module.exports = logger; 