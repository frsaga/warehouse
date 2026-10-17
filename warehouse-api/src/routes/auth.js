const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 登录路由
router.post('/login', authController.login);

// 注册路由
router.post('/register', authController.register);

// 验证令牌路由
router.get('/verify', authController.verifyToken);

module.exports = router; 