import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, message, Input, Space, Button, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { getLogs } from '../services/api';

const { Text } = Typography;

const SystemLogs = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        // 过滤日志
        if (searchText) {
            const filtered = logs.filter(log => 
                log.action?.toLowerCase().includes(searchText.toLowerCase()) ||
                log.operator?.toLowerCase().includes(searchText.toLowerCase()) ||
                log.description?.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredLogs(filtered);
        } else {
            setFilteredLogs(logs);
        }
    }, [searchText, logs]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await getLogs();
            // 确保每条日志都有操作者信息
            const processedLogs = response.data.map(log => ({
                ...log,
                operator: log.operator || log.username || '系统'
            }));
            setLogs(processedLogs);
            setFilteredLogs(processedLogs);
        } catch (error) {
            console.error('获取系统日志失败:', error);
            message.error('获取系统日志失败');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: '日志ID',
            dataIndex: 'log_id',
            key: 'log_id',
            width: 80,
        },
        {
            title: '时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text) => new Date(text).toLocaleString(),
            width: 180,
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (action) => {
                const colorMap = {
                    'LOGIN': 'blue',
                    'LOGOUT': 'orange',
                    'CREATE': 'green',
                    'UPDATE': 'cyan',
                    'DELETE': 'red',
                    'EXPORT': 'purple'
                };
                return <Tag color={colorMap[action.toUpperCase()] || 'default'}>{action}</Tag>;
            }
        },
        {
            title: '操作者',
            dataIndex: 'operator',
            key: 'operator',
            width: 120,
            render: (operator) => (
                <Text>{operator || '系统'}</Text>
            )
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
    ];

    return (
        <div>
            <Card 
                title="系统日志"
                extra={
                    <Space>
                    <Input
                            placeholder="搜索日志..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 200 }}
                        prefix={<SearchOutlined />}
                            allowClear
                    />
                        <Button 
                            icon={<ReloadOutlined />}
                            onClick={fetchLogs}
                            loading={loading}
                        >
                            刷新
                    </Button>
                </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={filteredLogs}
                    rowKey="log_id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 条日志`,
                        showSizeChanger: true,
                        showQuickJumper: true,
                    }}
                />
            </Card>
        </div>
    );
};

export default SystemLogs; 