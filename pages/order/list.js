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
          payAmount: parseFloat(o.payAmount || 0),
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

  async onPay(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '订单ID缺失', icon: 'none' });
      return;
    }
    try {
      wx.showLoading({ title: '调起支付...', mask: true });
      const payRes = await api.payOrder(id);
      wx.hideLoading();
      await api.requestWxPay(payRes.data && payRes.data.payParams);
      wx.showToast({ title: '支付成功', icon: 'success' });
      this.loadData();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.cancelled) ? '已取消支付' : (err.message || '支付失败'), icon: 'none' });
    }
  },

  onCancel(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '订单ID缺失', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认取消',
      content: '取消后将释放该时段，无需退款',
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
      title: '确认退订',
      content: '退订后将立即向微信发起退款，款项原路退回。',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '退款中...', mask: true });
          await api.cancelOrder(id);
          wx.hideLoading();
          wx.showToast({ title: '退款已提交', icon: 'success' });
          this.loadData();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '退订失败', icon: 'none' });
        }
      }
    });
  }
});