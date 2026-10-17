import React, { useState, useEffect } from 'react';
import { Table, Card, Row, Col, Statistic, Button, Space, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { getInventory } from '../services/api';

// 格式化数字，添加千分位分隔符
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalInbound: 0,
    totalOutbound: 0,
    lowStock: 0,
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await getInventory();
      setInventory(response.data);
      
      // 计算统计数据
      const stats = {
        totalProducts: response.data.length,
        totalStock: response.data.reduce((sum, item) => sum + parseInt(item.current_stock || 0), 0),
        totalInbound: response.data.reduce((sum, item) => sum + parseInt(item.total_inbound || 0), 0),
        totalOutbound: response.data.reduce((sum, item) => sum + parseInt(item.total_outbound || 0), 0),
        lowStock: response.data.filter(item => item.current_stock < item.low_stock_threshold).length,
      };
      setStatistics(stats);
    } catch (error) {
      console.error('获取库存数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const columns = [
    {
      title: '商品ID',
      dataIndex: 'product_id',
      key: 'product_id',
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '当前库存',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (text, record) => (
        <span style={{ color: text < record.low_stock_threshold ? '#ff4d4f' : 'inherit' }}>
          {text}
        </span>
      ),
    },
    {
      title: '入库总量',
      dataIndex: 'total_inbound',
      key: 'total_inbound',
    },
    {
      title: '出库总量',
      dataIndex: 'total_outbound',
      key: 'total_outbound',
    },
    {
      title: '最后更新时间',
      dataIndex: 'last_updated',
      key: 'last_updated',
      render: (text) => new Date(text).toLocaleString(),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="商品总数"
              value={statistics.totalProducts}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="库存总量"
              value={`${formatNumber(statistics.totalStock)} (${formatNumber(statistics.totalInbound)} - ${formatNumber(statistics.totalOutbound)})`}
              style={{ marginBottom: 8 }}
            />
            <div style={{ fontSize: '12px', color: '#666' }}>
              入库总量：{formatNumber(statistics.totalInbound)} 件
              <br />
              出库总量：{formatNumber(statistics.totalOutbound)} 件
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="低库存商品"
              value={statistics.lowStock}
              suffix="个"
              valueStyle={{ color: statistics.lowStock > 0 ? '#ff4d4f' : 'inherit' }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:3000/api/inventory/export', {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (response.ok) {
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `库存报表_${new Date().toISOString().slice(0, 10)}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  message.success('库存报表导出成功');
                } else {
                  message.error('导出失败，请确保后端服务正在运行');
                }
              } catch (error) {
                console.error('导出错误:', error);
                message.error('导出失败，请检查网络连接');
              }
            }}
          >
            导出库存报表
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchInventory}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={inventory}
        rowKey="product_id"
        loading={loading}
      />
    </div>
  );
};

export default Inventory; 