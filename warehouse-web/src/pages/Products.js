import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const userRole = localStorage.getItem('userRole');
  // const isAdmin = userRole === 'admin';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      message.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // 模糊搜索
    if (searchText) {
      const filtered = products.filter(product => 
        product.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchText.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        product.unit?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchText, products]);

  const columns = [
    {
      title: '商品ID',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 80,
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString(),
      width: 180,
    },
    ...(isAdmin ? [{
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个商品吗？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.product_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  const handleEdit = (product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      product_name: product.product_name,
      description: product.description,
      category: product.category,
      unit: product.unit,
    });
    setModalVisible(true);
  };

  const handleDelete = async (productId) => {
    try {
      await deleteProduct(productId);
      message.success('删除商品成功');
      fetchProducts();
    } catch (error) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('删除商品失败');
      }
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.product_id, values);
        message.success('更新商品成功');
      } else {
      await addProduct(values);
      message.success('添加商品成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      message.error(editingProduct ? '更新商品失败' : '添加商品失败');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingProduct(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input
            placeholder="搜索商品..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Button 
            icon={<ReloadOutlined />}
            onClick={fetchProducts}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            添加商品
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={filteredProducts}
        rowKey="product_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      <Modal
        title={editingProduct ? '编辑商品' : '添加商品'}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="product_name"
            label="商品名称"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input placeholder="请输入商品名称" />
          </Form.Item>

            <Form.Item
              name="description"
              label="描述"
            >
              <Input.TextArea rows={3} placeholder="请输入商品描述" />
            </Form.Item>

            <Form.Item
              name="category"
              label="类别"
              rules={[{ required: true, message: '请输入商品类别' }]}
            >
              <Input placeholder="请输入商品类别" />
            </Form.Item>

            <Form.Item
              name="unit"
              label="单位"
              rules={[{ required: true, message: '请输入商品单位' }]}
            >
              <Input placeholder="请输入商品单位（如：个、台、件）" />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={handleModalClose}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingProduct ? '更新' : '提交'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      
    </div>
  );
};

export default Products; 