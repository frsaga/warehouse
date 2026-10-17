import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Tabs, Select } from 'antd';
import { UserOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { TabPane } = Tabs;
const { Option } = Select;

const Login = () => {
    const [activeTab, setActiveTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:3000/api/auth/login', values);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userRole', response.data.role);
            localStorage.setItem('username', response.data.username);
            message.success('登录成功');
            navigate('/');
        } catch (error) {
            message.error(error.response?.data?.message || '登录失败');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (values) => {
        setLoading(true);
        try {
            // 添加默认的user角色
            const registerData = {
                ...values,
                role: 'user'  // 默认角色
            };
            await axios.post('http://localhost:3000/api/auth/register', registerData);
            message.success('注册成功，请登录');
            setActiveTab('login');
        } catch (error) {
            console.error('注册错误:', error);
            message.error(error.response?.data?.message || '注册失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#f0f2f5'
        }}>
            <Card style={{ width: 400 }}>
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>仓库管理系统</h2>
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab="登录" key="login">
                        <Form onFinish={handleLogin}>
                            <Form.Item
                                name="username"
                                rules={[{ required: true, message: '请输入用户名' }]}
                            >
                                <Input
                                    prefix={<UserOutlined />}
                                    placeholder="用户名"
                                />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                rules={[{ required: true, message: '请输入密码' }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="密码"
                                />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" block loading={loading}>
                                    登录
                                </Button>
                            </Form.Item>
                        </Form>
                    </TabPane>
                    <TabPane tab="注册" key="register">
                        <Form onFinish={handleRegister}>
                            <Form.Item
                                name="username"
                                rules={[
                                    { required: true, message: '请输入用户名' },
                                    { min: 3, message: '用户名至少3个字符' },
                                    { max: 20, message: '用户名最多20个字符' }
                                ]}
                            >
                                <Input
                                    prefix={<UserOutlined />}
                                    placeholder="用户名"
                                />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                rules={[
                                    { required: true, message: '请输入密码' },
                                    { min: 6, message: '密码长度至少6位' }
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="密码"
                                />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" block loading={loading}>
                                    注册
                                </Button>
                            </Form.Item>
                        </Form>
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
};

export default Login; 