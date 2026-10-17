const ExcelJS = require('exceljs');
const moment = require('moment');

class Exporter {
    constructor() {
        this.workbook = new ExcelJS.Workbook();
    }

    async exportInventory(data) {
        const worksheet = this.workbook.addWorksheet('库存状态');
        
        worksheet.columns = [
            { header: '商品编号', key: 'product_id', width: 15 },
            { header: '商品名称', key: 'product_name', width: 20 },
            { header: '当前库存', key: 'quantity', width: 15 },
            { header: '单位', key: 'unit', width: 10 },
            { header: '预警阈值', key: 'alert_threshold', width: 15 },
            { header: '更新时间', key: 'updated_at', width: 20 }
        ];

        data.forEach(item => {
            worksheet.addRow({
                ...item,
                updated_at: moment(item.updated_at).format('YYYY-MM-DD HH:mm:ss')
            });
        });

        return this.workbook;
    }

    async exportInboundRecords(data) {
        const worksheet = this.workbook.addWorksheet('入库记录');
        
        worksheet.columns = [
            { header: '入库编号', key: 'inbound_id', width: 15 },
            { header: '商品名称', key: 'product_name', width: 20 },
            { header: '入库数量', key: 'quantity', width: 15 },
            { header: '供应商', key: 'supplier', width: 20 },
            { header: '入库时间', key: 'inbound_date', width: 20 },
            { header: '操作人', key: 'operator', width: 15 }
        ];

        data.forEach(item => {
            worksheet.addRow({
                ...item,
                inbound_date: moment(item.inbound_date).format('YYYY-MM-DD HH:mm:ss')
            });
        });

        return this.workbook;
    }

    async exportOutboundRecords(data) {
        const worksheet = this.workbook.addWorksheet('出库记录');
        
        worksheet.columns = [
            { header: '出库编号', key: 'outbound_id', width: 15 },
            { header: '商品名称', key: 'product_name', width: 20 },
            { header: '出库数量', key: 'quantity', width: 15 },
            { header: '客户', key: 'customer', width: 20 },
            { header: '出库时间', key: 'outbound_date', width: 20 },
            { header: '操作人', key: 'operator', width: 15 }
        ];

        data.forEach(item => {
            worksheet.addRow({
                ...item,
                outbound_date: moment(item.outbound_date).format('YYYY-MM-DD HH:mm:ss')
            });
        });

        return this.workbook;
    }
}

module.exports = Exporter; 