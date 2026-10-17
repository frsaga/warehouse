import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, InputNumber, message, Table, Tabs, Tag, Space } from 'antd';
import { getProducts, addOutbound, getOutbound } from '../services/api';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const Outbound = () => {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [outboundRecords, setOutboundRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchOutboundRecords();
  }, []);

  useEffect(() => {
    // 模糊搜索
    if (searchText) {
      const filtered = outboundRecords.filter(record => 
        record.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        record.customer?.toLowerCase().includes(searchText.toLowerCase()) ||
        String(record.quantity).includes(searchText) ||
        String(record.unit_price).includes(searchText)
      );
      setFilteredRecords(filtered);
    } else {
      setFilteredRecords(outboundRecords);
    }
  }, [searchText, outboundRecords]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data);
    } catch (error) {
      message.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutboundRecords = async () => {
    try {
      setTableLoading(true);
      const response = await getOutbound();
      setOutboundRecords(response.data);
      setFilteredRecords(response.data);
    } catch (error) {
      message.error('获取出库记录失败');
    } finally {
      setTableLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await addOutbound(values);
      message.success('出库记录添加成功');
      form.resetFields();
      fetchOutboundRecords(); // 刷新出库记录
    } catch (error) {
      if (error.response?.data?.message === '库存不足') {
        message.error('库存不足，无法出库');
      } else {
        message.error('出库记录添加失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '出库编号',
      dataIndex: 'outbound_id',
      key: 'outbound_id',
      // width: 80,
      sorter: (a, b) => a.outbound_id - b.outbound_id,
      defaultSortOrder: 'descend'
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '出库数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (text, record) => (
        <Tag color="red">-{text} {record.unit}</Tag>
      ),
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (text) => `¥${parseFloat(text).toFixed(2)}`,
    },
    {
      title: '总金额',
      key: 'total_amount',
      render: (_, record) => `¥${(record.quantity * record.unit_price).toFixed(2)}`,
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: '出库时间',
      dataIndex: 'outbound_date',
      key: 'outbound_date',
      render: (text) => new Date(text).toLocaleString(),
    },
  ];

  const addOutboundForm = (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="product_id"
          label="选择商品"
          rules={[{ required: true, message: '请选择商品' }]}
        >
          <Select
            loading={loading}
            placeholder="请选择商品"
            showSearch
            filterOption={(input, option) =>
              option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            options={products.map(product => ({
              label: `${product.product_name} (${product.category})`,
              value: product.product_id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="quantity"
          label="出库数量"
          rules={[{ required: true, message: '请输入出库数量' }]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            placeholder="请输入出库数量"
          />
        </Form.Item>

        <Form.Item
          name="unit_price"
          label="单价"
          rules={[{ required: true, message: '请输入单价' }]}
        >
          <InputNumber
            min={0}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            placeholder="请输入单价"
            prefix="¥"
          />
        </Form.Item>

        <Form.Item
          name="customer"
          label="客户"
          rules={[{ required: true, message: '请输入客户' }]}
        >
          <Input placeholder="请输入客户名称" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            block
          >
            提交出库
          </Button>
        </Form.Item>
      </Form>
    </div>
  );

  return (
    <div>
      <Tabs defaultActiveKey="1">
        <TabPane tab="添加出库" key="1">
          {addOutboundForm}
        </TabPane>
        <TabPane tab="出库记录" key="2">
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Input
                placeholder="搜索出库记录..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 200 }}
                prefix={<SearchOutlined />}
                allowClear
              />
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchOutboundRecords}
                loading={tableLoading}
              >
                刷新
              </Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={filteredRecords}
            rowKey="outbound_id"
            loading={tableLoading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Outbound; 