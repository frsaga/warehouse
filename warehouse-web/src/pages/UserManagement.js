import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Tag, message, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';

const { confirm } = Modal;
const { Option } = Select;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await getUsers();
            setUsers(response.data);
        } catch (error) {
            console.error('获取用户列表失败:', error);
            message.error('获取用户列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = () => {
        setEditingUser(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEditUser = (record) => {
        setEditingUser(record);
        form.setFieldsValue({
            username: record.username,
            role: record.role,
            password: ''
        });
        setModalVisible(true);
    };

    const handleDeleteUser = (record) => {
        confirm({
            title: '确认删除用户',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除用户 "${record.username}" 吗？`,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await deleteUser(record.user_id);
                    message.success('用户删除成功');
                    fetchUsers();
                } catch (error) {
                    console.error('删除用户失败:', error);
                    message.error('删除用户失败');
                }
            }
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingUser) {
                await updateUser(editingUser.user_id, values);
                message.success('用户更新成功');
            } else {
                await createUser(values);
                message.success('用户创建成功');
            }
            setModalVisible(false);
            fetchUsers();
        } catch (error) {
            console.error('保存用户失败:', error);
            message.error('保存用户失败');
        }
    };

    const columns = [
        {
            title: '用户ID',
            dataIndex: 'user_id',
            key: 'user_id',
            width: 80,
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: '角色',
            dataIndex: 'role',
            key: 'role',
            render: (role) => {
                let color = 'blue';
                let text = '普通用户';
                
                switch(role) {
                    case 'admin':
                        color = 'red';
                        text = '管理员';
                        break;
                    case 'superadmin':
                        color = 'purple';
                        text = '超级管理员';
                        break;
                    default:
                        color = 'blue';
                        text = '普通用户';
                }
                
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" onClick={() => handleEditUser(record)}>
                        编辑
                    </Button>
                    <Button 
                        type="link" 
                        danger 
                        size="small" 
                        onClick={() => handleDeleteUser(record)}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Card
                title="用户管理"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
                        添加用户
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="user_id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 个用户`,
                    }}
                />
            </Card>

            <Modal
                title={editingUser ? '编辑用户' : '添加用户'}
                visible={modalVisible}
                onOk={handleModalOk}
                onCancel={() => setModalVisible(false)}
                okText="保存"
                cancelText="取消"
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    <Form.Item
                        name="username"
                        label="用户名"
                        rules={[
                            { required: true, message: '请输入用户名' },
                            { min: 3, message: '用户名至少3个字符' }
                        ]}
                    >
                        <Input placeholder="请输入用户名" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="密码"
                        rules={[
                            { required: !editingUser, message: '请输入密码' },
                            { min: 6, message: '密码至少6个字符' }
                        ]}
                    >
                        <Input.Password placeholder={editingUser ? "不修改请留空" : "请输入密码"} />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="角色"
                        rules={[{ required: true, message: '请选择角色' }]}
                        initialValue="user"
                    >
                        <Select>
                            <Option value="user">普通用户</Option>
                            <Option value="admin">管理员</Option>
                            <Option value="superadmin">超级管理员</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement; 