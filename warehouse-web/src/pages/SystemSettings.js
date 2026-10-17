import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Switch, InputNumber, Space, message } from 'antd';
import axios from 'axios';

const SystemSettings = () => {
    const [form] = Form.useForm();

    // 获取系统设置
    const fetchSettings = async () => {
        try {
            // 从localStorage获取token
            const token = localStorage.getItem('token');
            if (!token) {
                message.error('请先登录');
                return;
            }

            const response = await axios.get('http://localhost:3000/api/settings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('获取到的系统设置:', response.data);
            form.setFieldsValue({
                systemName: response.data.system_name,
                lowStockThreshold: response.data.low_stock_threshold,
                enableNotifications: response.data.enable_notifications === 1,
                backupInterval: response.data.backup_interval,
            });
        } catch (error) {
            console.error('获取系统设置失败:', error);
            if (error.response) {
                // 服务器响应的错误
                console.error('错误响应:', error.response.data);
                message.error(error.response.data.message || '获取系统设置失败');
            } else if (error.request) {
                // 请求发送了但没有收到响应
                console.error('没有收到响应');
                message.error('服务器没有响应，请检查后端服务是否运行');
            } else {
                // 请求配置出错
                console.error('请求错误:', error.message);
                message.error('请求错误: ' + error.message);
            }
        }
    };

    // 页面加载时获取设置
    useEffect(() => {
        fetchSettings();
    }, []);

    // 提交设置更新
    const handleSubmit = async (values) => {
        try {
            // 从localStorage获取token
            const token = localStorage.getItem('token');
            if (!token) {
                message.error('请先登录');
                return;
            }

            console.log('正在更新系统设置:', values);
            await axios.post('http://localhost:3000/api/settings', {
                systemName: values.systemName,
                lowStockThreshold: values.lowStockThreshold,
                enableNotifications: values.enableNotifications,
                backupInterval: values.backupInterval,
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            message.success('系统设置更新成功');
            // 重新获取设置以确保显示最新数据
            fetchSettings();
        } catch (error) {
            console.error('更新系统设置失败:', error);
            if (error.response) {
                message.error(error.response.data.message || '更新系统设置失败');
            } else if (error.request) {
                message.error('服务器没有响应，请检查后端服务是否运行');
            } else {
                message.error('请求错误: ' + error.message);
            }
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Card title="系统设置" bordered={false}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{
                        systemName: '仓库管理系统',
                        lowStockThreshold: 10,
                        enableNotifications: true,
                        backupInterval: 24,
                    }}
                >
                    <Form.Item
                        label="系统名称"
                        name="systemName"
                        rules={[{ required: true, message: '请输入系统名称' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="库存预警阈值"
                        name="lowStockThreshold"
                        rules={[{ required: true, message: '请设置库存预警阈值' }]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        label="启用通知"
                        name="enableNotifications"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="数据备份间隔（小时）"
                        name="backupInterval"
                        rules={[{ required: true, message: '请设置备份间隔' }]}
                    >
                        <InputNumber min={1} max={168} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                保存设置
                            </Button>
                            <Button onClick={() => {
                                form.resetFields();
                                fetchSettings(); // 重置时重新获取最新设置
                            }}>
                                重置
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default SystemSettings; 