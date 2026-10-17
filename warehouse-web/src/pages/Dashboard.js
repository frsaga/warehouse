import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { getInventory } from '../services/api';
import {
  ShoppingOutlined,
  DatabaseOutlined,
  WarningOutlined,
  DollarOutlined,
} from '@ant-design/icons';

const Dashboard = () => {
  const [statistics, setStatistics] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStock: 0,
    totalValue: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getInventory();
        const data = response.data;
        
        const stats = {
          totalProducts: data.length,
          totalStock: data.reduce((sum, item) => sum + item.current_stock, 0),
          lowStock: data.filter(item => item.current_stock < item.low_stock_threshold).length,
          totalValue: data.reduce((sum, item) => {
            const lastInbound = item.total_inbound || 0;
            const lastOutbound = item.total_outbound || 0;
            return sum + (item.current_stock * (lastInbound - lastOutbound));
          }, 0),
        };
        
        setStatistics(stats);
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };

    fetchData();
  }, []);

  const cards = [
    {
      title: '商品总数',
      value: statistics.totalProducts,
      prefix: <ShoppingOutlined />,
      suffix: '个',
      color: '#1890ff',
    },
    {
      title: '库存总量',
      value: statistics.totalStock,
      prefix: <DatabaseOutlined />,
      suffix: '件',
      color: '#52c41a',
    },
    {
      title: '低库存商品',
      value: statistics.lowStock,
      prefix: <WarningOutlined />,
      suffix: '个',
      color: '#faad14',
    },
    {
      title: '库存总值',
      value: statistics.totalValue.toFixed(2),
      prefix: <DollarOutlined />,
      suffix: '元',
      color: '#13c2c2',
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>仪表盘</h2>
      
      <Row gutter={[16, 16]}>
        {cards.map((card, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Statistic
                title={
                  <span style={{ color: card.color }}>
                    {card.prefix} {card.title}
                  </span>
                }
                value={card.value}
                suffix={card.suffix}
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 24, textAlign: 'center', color: '#999' }}>
        最后更新时间：{new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default Dashboard; 