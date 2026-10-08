// pages/order/detail.js
const api = require('../../utils/api.js');

const STATUS_CONFIG = {
  '已预订': { icon: '✓', statusDesc: '免费场次已通知球场方，请保持电话畅通。', statusKey: 'booked' },
  '已完成': { icon: '🏆', statusDesc: '球场方已接单', statusKey: 'done' },
  '已取消': { icon: '✕', statusDesc: '订单已取消，时段已释放', statusKey: 'canceled' },
  '已退款': { icon: '↩', statusDesc: '已向微信发起退款，款项将原路退回', statusKey: 'canceled' },
  '待支付': { icon: '⏰', statusDesc: '请完成支付。款项进入平台对公账户。', statusKey: 'pending' },
  '已支付': { icon: '✓', statusDesc: '已支付到平台对公账户，球场方会收到通知。', statusKey: 'paid' }
};

Page({
  data: { order: null },

  onLoad(options) {
    this.orderId = options.id;
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    try {
      const res = await api.getOrderDetail(id);
      const order = res.data;
      const statusMap = {
        pending: '待支付', booked: '已预订', paid: '已支付',
        refunded: '已退款', canceled: '已取消', completed: '已完成'
      };
      const cnStatus = statusMap[order.status] || order.status;
      const config = STATUS_CONFIG[cnStatus] || STATUS_CONFIG['已预订'];
      const paidOnline = Number(order.payAmount || 0) > 0 || order.status === 'paid' || order.status === 'pending';
      this.setData({
        order: {
          ...order,
          status: cnStatus,
          rawStatus: order.status,
          paidOnline,
          orderNo: order.orderNo,
          courtName: order.court?.name || order.courtName,
          courtPhone: order.court?.phone || '',
          date: order.schedule ? `${order.schedule.date} ${order.schedule.timeSlot}` : '',
          price: order.payAmount || order.amount,
          name: order.contactName,
          phone: order.contactPhone,
          ...config
        }
      });
      wx.setNavigationBarTitle({ title: '订单详情' });
    } catch (e) {
      console.error('加载订单失败:', e);
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  async onCancelBook() {
    const order = this.data.order;
    if (!order) return;
    wx.showModal({
      title: '取消预订',
      content: order.rawStatus === 'pending' ? '取消后将释放该时段，无需退款' : '取消后该时段会重新开放给其他用户',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.cancelOrder(order.id);
          wx.showToast({ title: '已取消', icon: 'success' });
          this.loadDetail(order.id);
        } catch (e) {
          wx.showToast({ title: e.message || '取消失败', icon: 'none' });
        }
      }
    });
  },

  async onPay() {
    const order = this.data.order;
    if (!order) return;
    try {
      wx.showLoading({ title: '调起支付...', mask: true });
      const payRes = await api.payOrder(order.id);
      wx.hideLoading();
      await api.requestWxPay(payRes.data && payRes.data.payParams);
      wx.showToast({ title: '支付成功', icon: 'success' });
      this.loadDetail(order.id);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.cancelled) ? '已取消支付' : (err.message || '支付失败'), icon: 'none' });
    }
  },

  onRefund() {
    const order = this.data.order;
    if (!order) return;
    wx.showModal({
      title: '确认退订',
      content: '退订后将立即向微信发起退款，款项原路退回。',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '退款中...', mask: true });
          await api.cancelOrder(order.id);
          wx.hideLoading();
          wx.showToast({ title: '退款已提交', icon: 'success' });
          this.loadDetail(order.id);
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: e.message || '退订失败', icon: 'none' });
        }
      }
    });
  },

  onContactCourt() {
    const phone = this.data.order?.courtPhone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: String(phone) });
      return;
    }
    wx.showModal({
      title: '联系球场方',
      content: '暂无球场电话，请通过订单联系人或微信群沟通。',
      showCancel: false
    });
  }
});
