// pages/court-orders/list.js
// 球场方专属页面：我的预订（接收微信通知后点击进来）
const api = require('../../utils/api.js');

const STATUS_MAP = {
  booked: { label: '已预订', icon: '⏰', cls: 'pending' },
  completed: { label: '已接单', icon: '✓', cls: 'success' },
  canceled: { label: '已取消', icon: '✕', cls: 'canceled' }
};

Page({
  data: {
    loading: true,
    openid: '',
    status: 'all',
    orders: [],
    total: 0,
    page: 1,
    pageSize: 20
  },

  async onLoad(options) {
    // 接收推送 deep-link: ?orderNo=O202607290001
    const app = getApp();
    this.setData({ openid: app.globalData.openid || '' });

    if (options.orderNo) {
      // 跳转到指定订单的详情（暂未实现，先按 list 走）
      wx.showToast({ title: `查看订单 ${options.orderNo}`, icon: 'none' });
    }

    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    if (!this.data.openid) {
      this.setData({ loading: false, orders: [] });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await api.getAdminOrders({
        status: this.data.status,
        page: this.data.page,
        pageSize: this.data.pageSize
      });
      const list = (res.data?.list || []).map(o => ({
        ...o,
        statusInfo: STATUS_MAP[o.status] || { label: o.status, icon: '?', cls: 'unknown' },
        dateText: o.schedule?.date || '',
        timeText: o.schedule?.timeSlot || ''
      }));
      this.setData({
        loading: false,
        orders: list,
        total: res.data?.total || 0
      });
    } catch (e) {
      console.error('加载订单失败:', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onTabTap(e) {
    this.setData({ status: e.currentTarget.dataset.status, page: 1 });
    this.loadData();
  },

  onPhoneTap(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) {
      return wx.showToast({ title: '无联系电话', icon: 'none' });
    }
    wx.makePhoneCall({
      phoneNumber: phone,
      success: () => console.log('拨号成功:', phone),
      fail: (err) => {
        console.error('拨号失败:', err);
        // 用户拒绝或取消 - 不提示错误
      }
    });
  },

  async onAccept(e) {
    const id = e.currentTarget.dataset.id;
    const orderNo = e.currentTarget.dataset.no;
    wx.showModal({
      title: '确认接单',
      content: `确认接单 ${orderNo} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.acceptAdminOrder(id);
            wx.showToast({ title: '已接单', icon: 'success' });
            this.loadData();
          } catch (err) {
            wx.showToast({ title: err.message || '接单失败', icon: 'none' });
          }
        }
      }
    });
  },

  async onDecline(e) {
    const id = e.currentTarget.dataset.id;
    const orderNo = e.currentTarget.dataset.no;
    wx.showModal({
      title: '拒绝预订',
      content: `确认拒绝 ${orderNo} 吗？拒绝后该时段会重新开放给其他用户。`,
      editable: true,
      placeholderText: '可选：拒绝原因',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.cancelAdminOrder(id, res.content || '');
            wx.showToast({ title: '已拒绝', icon: 'success' });
            this.loadData();
          } catch (err) {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  }
});
