import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Spin, message, Popconfirm } from 'antd';
import { SendOutlined, ClearOutlined } from '@ant-design/icons';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './AIAssistant.css';

const { TextArea } = Input;

// 从localStorage加载数据
const loadFromStorage = (key, defaultValue) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.error(`Error loading ${key} from storage:`, error);
        return defaultValue;
    }
};

// 保存数据到localStorage
const saveToStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key} to storage:`, error);
    }
};

const AIAssistant = () => {
    const [messages, setMessages] = useState(() => loadFromStorage('aiAssistantMessages', []));
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // 保存消息到localStorage
    useEffect(() => {
        saveToStorage('aiAssistantMessages', messages);
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        const timestamp = new Date().toLocaleString();
        
        setMessages(prev => [...prev, { 
            type: 'user', 
            content: userMessage,
            timestamp 
        }]);
        
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:3000/api/ai-assistant', {
                message: userMessage
            });

            setMessages(prev => [...prev, { 
                type: 'assistant', 
                content: response.data.response,
                timestamp: new Date().toLocaleString()
            }]);
        } catch (error) {
            console.error('AI助手请求失败:', error);
            message.error('获取AI响应失败');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearHistory = () => {
        setMessages([]);
    };

    return (
        <div className="ai-assistant">
            <div className="messages-container">
                <div className="welcome-message">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>仓库管理AI助手</h3>
                        <Popconfirm
                            title="确定要清除所有聊天记录吗？"
                            onConfirm={handleClearHistory}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Button 
                                type="text" 
                                icon={<ClearOutlined />}
                                size="small"
                            >
                                清除历史
                            </Button>
                        </Popconfirm>
                    </div>
                    <p>你可以向我询问：</p>
                    <ul>
                        <li>库存状态分析</li>
                        <li>入库出库建议</li>
                        <li>销售趋势分析</li>
                        <li>库存优化建议</li>
                        <li>其他仓库管理问题</li>
                    </ul>
                </div>
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`message ${msg.type === 'user' ? 'user-message' : 'assistant-message'}`}
                    >
                        <div className="message-content">
                            {msg.type === 'user' ? (
                                <p>{msg.content}</p>
                            ) : (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            )}
                        </div>
                        <div className="message-timestamp">{msg.timestamp}</div>
                    </div>
                ))}
                {loading && (
                    <div className="message assistant-message">
                        <Spin size="small" />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
                <TextArea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入你的问题..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                />
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSend}
                    loading={loading}
                >
                    发送
                </Button>
            </div>
        </div>
    );
};

export default AIAssistant; 