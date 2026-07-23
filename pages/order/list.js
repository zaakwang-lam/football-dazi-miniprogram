// pages/order/list.js
const api = require('../../utils/api.js');

const STATUS_KEY_MAP = {
  '待支付': 'pending',
  '已支付': 'paid',
  '已完成': 'done',
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
    const res = await api.getOrderList();
    let list = res.data || [];
    if (this.data.status !== 'all') {
      list = list.filter(o => o.status === this.data.status);
    }
    list = list.map(o => ({
      ...o,
      statusKey: STATUS_KEY_MAP[o.status] || '已取消'
    }));
    this.setData({ list });
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

  onPay() {
    wx.showToast({ title: '支付功能待对接', icon: 'none' });
  },

  onCancel() {
    wx.showModal({
      title: '确认取消',
      content: '取消后定金将原路退回',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已取消', icon: 'success' });
          this.loadData();
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
  }
});