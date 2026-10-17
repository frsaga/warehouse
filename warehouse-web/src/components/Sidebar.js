import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ShoppingOutlined,
  DatabaseOutlined,
  ImportOutlined,
  ExportOutlined,
  FileTextOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Sider } = Layout;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: '商品管理',
    },
    {
      key: '/inventory',
      icon: <DatabaseOutlined />,
      label: '库存状态',
    },
    {
      key: '/inbound',
      icon: <ImportOutlined />,
      label: '入库管理',
    },
    {
      key: '/outbound',
      icon: <ExportOutlined />,
      label: '出库管理',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: '系统日志',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else {
      navigate(key);
    }
  };

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
      }}
    >
      <div style={{ 
        height: 32, 
        margin: 16, 
        color: 'white', 
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        仓库管理系统
      </div>
      <div style={{
        padding: '12px 24px',
        color: 'rgba(255, 255, 255, 0.65)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: 8,
      }}>
        {user?.username}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
};

export default Sidebar; 