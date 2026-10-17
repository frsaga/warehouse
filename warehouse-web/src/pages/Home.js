import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, message } from 'antd';
import { 
    ShoppingOutlined, 
    InboxOutlined, 
    ExportOutlined, 
    DatabaseOutlined 
} from '@ant-design/icons';
import { getStatistics, getProducts, getInventory } from '../services/api';
import axios from 'axios';

const Home = () => {
    const [statistics, setStatistics] = useState({
        productCount: 0,
        todayInbound: 0,
        todayOutbound: 0,
        lowStock: 0,
        threshold: 0
    });
    const [recentInbound, setRecentInbound] = useState([]);
    const [recentOutbound, setRecentOutbound] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // 获取统计数据
            const statsRes = await getStatistics();
            const productsRes = await getProducts();
            const inventoryRes = await getInventory();
            
            // 计算低库存商品数量
            const lowStockCount = inventoryRes.data.filter(item => 
                item.current_stock < item.low_stock_threshold
            ).length;
            
            // 设置统计数据
            setStatistics({
                productCount: productsRes.data.length,
                todayInbound: statsRes.data.today.inbound.total,
                todayOutbound: statsRes.data.today.outbound.total,
                lowStock: lowStockCount,
                threshold: statsRes.data.threshold
            });

            // 获取最近的出入库记录
            try {
                const inboundRes = await axios.get('http://localhost:3000/api/inbound/recent');
                const outboundRes = await axios.get('http://localhost:3000/api/outbound/recent');
            setRecentInbound(inboundRes.data);
            setRecentOutbound(outboundRes.data);
            } catch (error) {
                console.log('获取最近记录失败，使用空数据');
                setRecentInbound([]);
                setRecentOutbound([]);
            }
        } catch (error) {
            console.error('获取数据失败:', error);
            message.error('获取系统数据失败');
        } finally {
            setLoading(false);
        }
    };

    const inboundColumns = [
        {
            title: '时间',
            dataIndex: 'inbound_date',
            key: 'inbound_date',
            render: (text) => new Date(text).toLocaleString(),
            width: 150,
        },
        {
            title: '产品',
            dataIndex: 'product_name',
            key: 'product_name',
            ellipsis: true,
        },
        {
            title: '数量',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 60,
        },
        {
            title: '供应商',
            dataIndex: 'supplier',
            key: 'supplier',
            ellipsis: true,
        }
    ];

    const outboundColumns = [
        {
            title: '时间',
            dataIndex: 'outbound_date',
            key: 'outbound_date',
            render: (text) => new Date(text).toLocaleString(),
            width: 150,
        },
        {
            title: '产品',
            dataIndex: 'product_name',
            key: 'product_name',
            ellipsis: true,
        },
        {
            title: '数量',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 60,
        },
        {
            title: '客户',
            dataIndex: 'customer',
            key: 'customer',
            ellipsis: true,
        }
    ];

    return (
        <div>
            <h2>系统概览</h2>
            <Row gutter={16}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="商品总数"
                            value={statistics.productCount}
                            prefix={<ShoppingOutlined />}
                            loading={loading}
                            suffix="个"
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="今日入库"
                            value={statistics.todayInbound}
                            prefix={<InboxOutlined />}
                            loading={loading}
                            suffix="件"
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="今日出库"
                            value={statistics.todayOutbound}
                            prefix={<ExportOutlined />}
                            loading={loading}
                            suffix="件"
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="库存预警"
                            value={statistics.lowStock}
                            prefix={<DatabaseOutlined />}
                            loading={loading}
                            suffix="个"
                            valueStyle={{ color: statistics.lowStock > 0 ? '#ff4d4f' : 'inherit' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: '24px' }}>
                <Col span={12}>
                    <Card title="最近入库记录" bodyStyle={{ padding: '12px' }}>
                        <Table
                            columns={inboundColumns}
                            dataSource={recentInbound}
                            rowKey="inbound_id"
                            pagination={false}
                            loading={loading}
                            size="small"
                            locale={{ emptyText: '暂无入库记录' }}
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="最近出库记录" bodyStyle={{ padding: '12px' }}>
                        <Table
                            columns={outboundColumns}
                            dataSource={recentOutbound}
                            rowKey="outbound_id"
                            pagination={false}
                            loading={loading}
                            size="small"
                            locale={{ emptyText: '暂无出库记录' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Home; 