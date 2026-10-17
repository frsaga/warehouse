import React, { useState, useEffect } from 'react';
import { Table, Tag } from 'antd';
import { getLogs } from '../services/api';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await getLogs();
        setLogs(response.data);
      } catch (error) {
        console.error('获取系统日志失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const getActionColor = (action) => {
    const colors = {
      'login': 'blue',
      'logout': 'orange',
      'create': 'green',
      'update': 'cyan',
      'delete': 'red',
    };
    return colors[action] || 'default';
  };

  const columns = [
    {
      title: '日志ID',
      dataIndex: 'log_id',
      key: 'log_id',
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (text) => (
        <Tag color={getActionColor(text)}>
          {text}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      defaultSortOrder: 'descend',
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统日志</h2>
      
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="log_id"
        loading={loading}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />
    </div>
  );
};

export default Logs; 