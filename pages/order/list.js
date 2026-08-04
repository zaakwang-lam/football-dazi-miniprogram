// pages/order/list.js
const api = require('../../utils/api.js');

// 后端 status: pending/booked/paid/refunded/canceled/completed → 中文显示 + WXSS 类名 key
const CN_MAP = {
  pending: '待支付',
  booked: '已预订',  // 2026-07-29 新增：免支付预订
  paid: '已支付',
  refunded: '已退款',
  canceled: '已取消',
  completed: '已完成'
};
const STATUS_KEY_MAP = {
  '待支付': 'pending',
  '已预订': 'booked',  // 2026-07-29 新增
  '已支付': 'paid',
  '已完成': 'done',
  '已退款': 'done',
  '已取消': 'canceled'
};
// status(tab) → 英文
const TAB_TO_EN = {
  all: 'all',
  '待支付': 'pending',
  '已预订': 'booked',  // 2026-07-29 新增
  '已支付': 'paid',
  '已完成': 'completed',
  '已取消': 'canceled'
};

Page({
  data: {
    status: 'all',
    list: []
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const res = await api.getOrderList();
      let list = res.data?.list || [];
      const filterEn = TAB_TO_EN[this.data.status];
      if (filterEn && filterEn !== 'all') {
        list = list.filter(o => o.status === filterEn);
      }
      list = list.map(o => {
        const cn = CN_MAP[o.status] || o.status;
        return {
          ...o,
          status: cn,
          statusKey: STATUS_KEY_MAP[cn] || 'canceled',
          price: parseFloat(o.amount)
        };
      });
      this.setData({ list });
    } catch (e) {
      console.error('加载订单失败:', e);
      this.setData({ list: [] });
    }
  },

  onTabTap(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ status });
    this.loadData();
  },

  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order/detail?id=${id}` });
  },

  onPay(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '订单ID缺失', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/order/detail?id=${id}` });
  },

  onCancel(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '订单ID缺失', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认取消',
      content: '取消后定金将原路退回',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.cancelOrder(id);
            wx.showToast({ title: '已取消', icon: 'success' });
            this.loadData();
          } catch (err) {
            console.error(err);
            wx.showToast({ title: err.message || '取消失败', icon: 'none' });
          }
        }
      }
    });
  },

  onRefund(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '订单ID缺失', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '申请退订',
      content: '提前 24h 全额退款，是否继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '退款已提交', icon: 'success' });
        }
      }
    });
  }
});