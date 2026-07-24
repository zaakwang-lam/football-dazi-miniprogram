// pages/order/detail.js
const api = require('../../utils/api.js');

const STATUS_CONFIG = {
  '待支付': { icon: '⏰', desc: '请在 15 分钟内完成支付', statusKey: 'pending' },
  '已支付': { icon: '✓', desc: '预订成功，期待您的到来！', statusKey: 'paid' },
  '已完成': { icon: '🏆', desc: '本次预订已完成，欢迎评价', statusKey: 'done' },
  '已取消': { icon: '✕', desc: '订单已取消', statusKey: 'canceled' }
};

Page({
  data: {
    order: null
  },

  onLoad(options) {
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    try {
      const res = await api.getOrderDetail(id);
      const order = res.data;
      // 后端 status: pending/paid/refunded/canceled/completed → 中文映射
      const statusMap = {
        pending: '待支付',
        paid: '已支付',
        refunded: '已退款',
        canceled: '已取消',
        completed: '已完成'
      };
      const cnStatus = statusMap[order.status] || order.status;
      const config = STATUS_CONFIG[cnStatus] || STATUS_CONFIG['待支付'];
      this.setData({
        order: {
          ...order,
          status: cnStatus,
          courtName: order.court?.name || order.courtName,
          date: order.schedule ? `${order.schedule.date} ${order.schedule.timeSlot}` : order.createdAt,
          price: order.amount,
          ...config
        }
      });
      wx.setNavigationBarTitle({ title: '订单详情' });
    } catch (e) {
      console.error('加载订单失败:', e);
    }
  },

  onPay() {
    wx.showToast({ title: '支付成功！', icon: 'success' });
    setTimeout(() => {
      this.setData({
        'order.status': '已支付',
        ...STATUS_CONFIG['已支付']
      });
    }, 1000);
  },

  onCancel() {
    wx.showModal({
      title: '确认取消',
      content: '取消后定金将原路退回',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'order.status': '已取消',
            ...STATUS_CONFIG['已取消']
          });
        }
      }
    });
  },

  onRefund() {
    wx.showModal({
      title: '申请退订',
      content: '提前 24h 全额退款，是否继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '退款已提交', icon: 'success' });
        }
      }
    });
  },

  onCheckin() {
    wx.navigateTo({ url: '/pages/team/checkin' });
  }
});