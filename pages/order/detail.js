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
    const res = await api.getOrderList();
    const allOrders = res.data || [];
    let order = allOrders.find(o => o.id === id);
    if (!order && id) {
      // 新创建的订单从 options 拿
      order = {
        id: id,
        courtName: '天河体育中心',
        date: '今晚 20:00',
        time: '20:00-22:00',
        price: 1200,
        status: '已支付',
        createdAt: new Date().toLocaleString('zh-CN'),
        name: '广州老炮',
        phone: '138****8888'
      };
    }
    if (order) {
      this.setData({
        order: {
          ...order,
          ...STATUS_CONFIG[order.status]
        }
      });
      wx.setNavigationBarTitle({ title: '订单详情' });
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