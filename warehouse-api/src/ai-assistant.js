const axios = require('axios');

const API_KEY = process.env.QWEN_API_KEY || "";
const QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

// AI助手系统提示词
const SYSTEM_PROMPT = `你是一个专业的仓库管理AI助手。你可以：
1. 分析库存状态
2. 提供入库和出库建议
3. 分析产品销售趋势
4. 提供库存优化建议
5. 回答仓库管理相关问题

你可以访问数据库中的以下信息：
- 产品信息（产品名称、类别、单位等）
- 库存状态（当前库存量）
- 入库记录（时间、数量、供应商等）
- 出库记录（时间、数量、客户等）

请以专业、简洁的方式回答问题，必要时可以使用表格、列表等格式来展示数据。`;

async function getAIResponse(pool, userMessage) {
    try {
        // 获取相关数据
        const [products] = await pool.execute('SELECT * FROM products');
        const [inventory] = await pool.execute('SELECT * FROM vw_inventory_status');
        const [inbound] = await pool.execute('SELECT * FROM inbound_records ORDER BY inbound_date DESC LIMIT 10');
        const [outbound] = await pool.execute('SELECT * FROM outbound_records ORDER BY outbound_date DESC LIMIT 10');

        // 构建数据上下文
        const dataContext = `
当前数据库状态：

产品信息：
${JSON.stringify(products, null, 2)}

库存状态：
${JSON.stringify(inventory, null, 2)}

最近10条入库记录：
${JSON.stringify(inbound, null, 2)}

最近10条出库记录：
${JSON.stringify(outbound, null, 2)}
`;

        // 调用通义千问API
        const response = await axios.post(QWEN_API_URL, {
            model: "qwen-turbo",
            input: {
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "system", content: dataContext },
                    { role: "user", content: userMessage }
                ]
            },
            parameters: {
                temperature: 0.7
            }
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.output.text;
    } catch (error) {
        console.error('AI助手错误:', error);
        throw error;
    }
}

module.exports = { getAIResponse }; 