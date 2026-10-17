import React, { useState, useEffect } from 'react';
import { Table, Form, Input, Button, Select, InputNumber, message, Space, Tabs } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;

const Inbound = () => {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inboundRecords, setInboundRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchInboundRecords();
  }, []);

  useEffect(() => {
    // 模糊搜索
    if (searchText) {
      const filtered = inboundRecords.filter(record => 
        record.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        record.supplier?.toLowerCase().includes(searchText.toLowerCase()) ||
        String(record.quantity).includes(searchText) ||
        String(record.unit_price).includes(searchText)
      );
      setFilteredRecords(filtered);
    } else {
      setFilteredRecords(inboundRecords);
    }
  }, [searchText, inboundRecords]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/products');
      console.log('获取到的产品列表:', response.data);
      setProducts(response.data);
    } catch (error) {
      console.error('获取产品列表失败:', error);
      message.error('获取产品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchInboundRecords = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/inbound');
      console.log('获取到的入库记录:', response.data);
      setInboundRecords(response.data);
      setFilteredRecords(response.data);
    } catch (error) {
      console.error('获取入库记录失败:', error);
      message.error('获取入库记录失败');
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      console.log('提交的入库数据:', values);
      await axios.post('http://localhost:3000/api/inbound', values);
      message.success('入库成功');
      form.resetFields();
      fetchInboundRecords();
    } catch (error) {
      console.error('入库失败:', error);
      message.error('入库失败: ' + (error.response?.data?.message || error.message));
    }
    setLoading(false);
  };

  const columns = [
    {
      title: '入库编号',
      dataIndex: 'inbound_id',
      key: 'inbound_id',
      sorter: (a, b) => a.inbound_id - b.inbound_id,
      defaultSortOrder: 'descend'
    },
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '入库数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (text) => text ? `¥${text}` : '-',
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: '入库时间',
      dataIndex: 'inbound_date',
      key: 'inbound_date',
      render: (text) => new Date(text).toLocaleString(),
    }
  ];

  const addInboundForm = (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
      >
        <Form.Item
          name="product_id"
          label="产品"
          rules={[{ required: true, message: '请选择产品' }]}
        >
          <Select 
            style={{ width: '100%' }} 
            placeholder="选择产品"
            showSearch
            loading={loading}
            optionFilterProp="label"
            filterOption={(input, option) => {
              const label = `${option.label}`.toLowerCase();
              return label.includes(input.toLowerCase());
            }}
            options={products.map(product => ({
              label: `${product.product_name} (${product.category})`,
              value: product.product_id
            }))}
          />
        </Form.Item>

        <Form.Item
          name="quantity"
          label="数量"
          rules={[{ required: true, message: '请输入数量' }]}
        >
          <InputNumber 
            min={1} 
            placeholder="入库数量" 
            style={{ width: '100%' }}
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
            placeholder="单价"
            prefix="¥"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="supplier"
          label="供应商"
          rules={[{ required: true, message: '请输入供应商' }]}
        >
          <Input placeholder="供应商名称" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<PlusOutlined />}
            block
          >
            添加入库
          </Button>
        </Form.Item>
      </Form>
    </div>
  );

  return (
    <div>
      <Tabs defaultActiveKey="1">
        <TabPane tab="添加入库" key="1">
          {addInboundForm}
        </TabPane>
        <TabPane tab="入库记录" key="2">
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Input
                placeholder="搜索入库记录..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 200 }}
                prefix={<SearchOutlined />}
                allowClear
              />
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchInboundRecords}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={filteredRecords}
            rowKey="inbound_id"
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

export default Inbound; 