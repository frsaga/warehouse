import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Spin, Tabs, message } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { getStatistics, getPriceAnalysis } from '../services/api';

const { TabPane } = Tabs;

const Statistics = () => {
  const [loading, setLoading] = useState(false);
  const [priceAnalysisLoading, setPriceAnalysisLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    today: { inbound: { count: 0, total: 0 }, outbound: { count: 0, total: 0 } },
    week: { inbound: { count: 0, total: 0 }, outbound: { count: 0, total: 0 } },
    month: { inbound: { count: 0, total: 0 }, outbound: { count: 0, total: 0 } },
    hotProducts: []
  });
  const [priceAnalysis, setPriceAnalysis] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
    fetchPriceAnalysis();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStatistics();
      console.log('统计数据:', response.data);
      setStatistics(response.data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      message.error('获取统计数据失败');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceAnalysis = async () => {
    try {
      setPriceAnalysisLoading(true);
      setError(null);
      const response = await getPriceAnalysis();
      console.log('价格分析数据:', response.data);
      setPriceAnalysis(response.data || []);
    } catch (error) {
      console.error('获取价格分析数据失败:', error);
      message.error('获取价格分析数据失败');
      setError(error.message);
      setPriceAnalysis([]);
    } finally {
      setPriceAnalysisLoading(false);
    }
  };

  const hotProductColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '出库总量',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span>,
    },
  ];

  const priceAnalysisColumns = [
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      fixed: 'left',
      width: 150,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '平均入库价',
      dataIndex: 'avg_inbound_price',
      key: 'avg_inbound_price',
      width: 120,
      render: (text) => `¥${text}`,
    },
    {
      title: '平均出库价',
      dataIndex: 'avg_outbound_price',
      key: 'avg_outbound_price',
      width: 120,
      render: (text) => `¥${text}`,
    },
    {
      title: '单位利润',
      dataIndex: 'unit_profit',
      key: 'unit_profit',
      width: 120,
      render: (text) => (
        <span style={{ color: text >= 0 ? '#52c41a' : '#f5222d' }}>
          {text >= 0 ? <RiseOutlined /> : <FallOutlined />} ¥{Math.abs(text)}
        </span>
      ),
    },
    {
      title: '利润率',
      dataIndex: 'profit_margin',
      key: 'profit_margin',
      width: 100,
      render: (text) => (
        <span style={{ color: text >= 0 ? '#52c41a' : '#f5222d' }}>
          {text}%
        </span>
      ),
    },
    {
      title: '出库总量',
      dataIndex: 'total_outbound_quantity',
      key: 'total_outbound_quantity',
      width: 100,
    },
    {
      title: '总利润',
      dataIndex: 'total_profit',
      key: 'total_profit',
      width: 120,
      render: (text) => (
        <span style={{ color: text >= 0 ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}>
          ¥{Math.abs(text)}
        </span>
      ),
    },
  ];

  const renderOverview = () => (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据统计分析</h2>
      
      <h3 style={{ marginBottom: 16 }}>今日统计</h3>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日入库单数"
              value={statistics.today.inbound.count}
              prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日入库数量"
              value={statistics.today.inbound.total}
              prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
              suffix="件"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日出库单数"
              value={statistics.today.outbound.count}
              prefix={<ArrowDownOutlined style={{ color: '#f5222d' }} />}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日出库数量"
              value={statistics.today.outbound.total}
              prefix={<ArrowDownOutlined style={{ color: '#f5222d' }} />}
              suffix="件"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <h3 style={{ marginBottom: 16 }}>本周统计</h3>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="本周入库单数"
              value={statistics.week.inbound.count}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本周入库数量"
              value={statistics.week.inbound.total}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本周出库单数"
              value={statistics.week.outbound.count}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本周出库数量"
              value={statistics.week.outbound.total}
              suffix="件"
            />
          </Card>
        </Col>
      </Row>

      <h3 style={{ marginBottom: 16 }}>本月统计</h3>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月入库单数"
              value={statistics.month.inbound.count}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月入库数量"
              value={statistics.month.inbound.total}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月出库单数"
              value={statistics.month.outbound.count}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月出库数量"
              value={statistics.month.outbound.total}
              suffix="件"
            />
          </Card>
        </Col>
      </Row>

      <Card title="本月热门商品TOP5" style={{ marginTop: 24 }}>
        <Table
          columns={hotProductColumns}
          dataSource={statistics.hotProducts}
          rowKey="product_name"
          pagination={false}
        />
      </Card>
    </div>
  );

  const renderPriceAnalysis = () => (
    <div>
      <h2 style={{ marginBottom: 24 }}>商品价格分析</h2>
      <Card>
        {error ? (
          <div style={{ textAlign: 'center', color: '#ff4d4f', marginBottom: 16 }}>
            {error}
          </div>
        ) : null}
        <Table
          columns={priceAnalysisColumns}
          dataSource={priceAnalysis}
          rowKey="product_id"
          loading={priceAnalysisLoading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: error ? '加载失败' : '暂无数据'
          }}
        />
      </Card>
    </div>
  );

  if (loading && priceAnalysisLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Tabs defaultActiveKey="1">
      <TabPane tab="概览统计" key="1">
        {renderOverview()}
      </TabPane>
      <TabPane tab="价格分析" key="2">
        {renderPriceAnalysis()}
      </TabPane>
    </Tabs>
  );
};

export default Statistics; 