import React, { useState } from 'react';
import { Layout, Menu, message, Button } from 'antd';
import {
    HomeOutlined,
    InboxOutlined,
    ExportOutlined,
    DatabaseOutlined,
    RobotOutlined,
    SettingOutlined,
    UserOutlined,
    FileTextOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useNavigate } from 'react-router-dom';

import Home from './pages/Home';
import Products from './pages/Products';
import Inbound from './pages/Inbound';
import Outbound from './pages/Outbound';
import Inventory from './pages/Inventory';
import Statistics from './pages/Statistics';
import AIAssistant from './components/AIAssistant';
import UserManagement from './pages/UserManagement';
import SystemSettings from './pages/SystemSettings';
import SystemLogs from './pages/SystemLogs';
import Login from './pages/Login';

const { Header, Content, Sider } = Layout;
const { SubMenu } = Menu;

// 路由保护组件
const ProtectedRoute = ({ children, requiredRole = [] }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (!token) {
        return <Navigate to="/login" />;
    }

    if (requiredRole.length > 0 && !requiredRole.includes(userRole)) {
        message.error('没有访问权限');
        return <Navigate to="/" />;
    }

    return children;
};

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [showAI, setShowAI] = useState(true);
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        navigate('/login');
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0 }}>仓库管理系统111</h1>
                <div>
                    <span style={{ marginRight: 16 }}>
                        欢迎，{localStorage.getItem('username')}
                    </span>
                    <Button type="link" onClick={handleLogout}>
                        退出登录
                    </Button>
                </div>
            </Header>
            <Layout>
                <Sider 
                    collapsible 
                    collapsed={collapsed} 
                    onCollapse={setCollapsed}
                    width={200}
                    style={{ background: '#fff' }}
                >
                    <Menu
                        mode="inline"
                        defaultSelectedKeys={['1']}
                        defaultOpenKeys={['sub1']}
                        style={{ height: '100%', borderRight: 0 }}
                    >
                        <Menu.Item key="1" icon={<HomeOutlined />}>
                            <Link to="/">首页</Link>
                        </Menu.Item>
                        <Menu.Item key="2" icon={<DatabaseOutlined />}>
                            <Link to="/products">商品管理</Link>
                        </Menu.Item>
                        <Menu.Item key="3" icon={<InboxOutlined />}>
                            <Link to="/inbound">入库管理</Link>
                        </Menu.Item>
                        <Menu.Item key="4" icon={<ExportOutlined />}>
                            <Link to="/outbound">出库管理</Link>
                        </Menu.Item>
                        <Menu.Item key="5" icon={<DatabaseOutlined />}>
                            <Link to="/inventory">库存状态</Link>
                        </Menu.Item>
                        <Menu.Item key="10" icon={<BarChartOutlined />}>
                            <Link to="/statistics">统计分析</Link>
                        </Menu.Item>
                        {(userRole === 'admin' || userRole === 'superadmin') && (
                            <SubMenu key="sub1" icon={<SettingOutlined />} title="系统管理">
                                {userRole === 'superadmin' && (
                                    <Menu.Item key="6" icon={<UserOutlined />}>
                                        <Link to="/users">用户管理</Link>
                                    </Menu.Item>
                                )}
                                <Menu.Item key="7" icon={<SettingOutlined />}>
                                    <Link to="/settings">系统设置</Link>
                                </Menu.Item>
                                <Menu.Item key="8" icon={<FileTextOutlined />}>
                                    <Link to="/logs">系统日志</Link>
                                </Menu.Item>
                            </SubMenu>
                        )}
                        <Menu.Item key="9" icon={<RobotOutlined />} onClick={() => setShowAI(!showAI)}>
                            AI助手
                        </Menu.Item>
                    </Menu>
                </Sider>
                <Layout style={{ padding: '24px' }}>
                    <Content style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ flex: 1, background: '#fff', padding: '24px', minHeight: 280 }}>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/products" element={<Products />} />
                                <Route path="/inbound" element={<Inbound />} />
                                <Route path="/outbound" element={<Outbound />} />
                                <Route path="/inventory" element={<Inventory />} />
                                <Route path="/statistics" element={<Statistics />} />
                                <Route 
                                    path="/users" 
                                    element={
                                        <ProtectedRoute requiredRole={['superadmin']}>
                                            <UserManagement />
                                        </ProtectedRoute>
                                    } 
                                />
                                <Route 
                                    path="/settings" 
                                    element={
                                        <ProtectedRoute requiredRole={['admin', 'superadmin']}>
                                            <SystemSettings />
                                        </ProtectedRoute>
                                    } 
                                />
                                <Route 
                                    path="/logs" 
                                    element={
                                        <ProtectedRoute requiredRole={['admin', 'superadmin']}>
                                            <SystemLogs />
                                        </ProtectedRoute>
                                    } 
                                />
                            </Routes>
                        </div>
                        {showAI && (
                            <div style={{ width: '600px', background: '#fff', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                <AIAssistant />
                            </div>
                        )}
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App; 