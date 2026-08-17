// pages/order/detail.js
const api = require('../../utils/api.js');

const STATUS_CONFIG = {
  '已预订': { icon: '✓', statusDesc: '已通知球场方，请保持电话畅通。费用请到现场结算。', statusKey: 'booked' },
  '已完成': { icon: '🏆', statusDesc: '本次预订已完成', statusKey: 'done' },
  '已取消': { icon: '✕', statusDesc: '订单已取消', statusKey: 'canceled' },
  '待支付': { icon: '⏰', statusDesc: '当前为到场付款模式，无需在线支付', statusKey: 'pending' },
  '已支付': { icon: '✓', statusDesc: '已支付', statusKey: 'paid' }
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
      this.setData({
        order: {
          ...order,
          status: cnStatus,
          orderNo: order.orderNo,
          courtName: order.court?.name || order.courtName,
          courtPhone: order.court?.phone || '',
          date: order.schedule ? `${order.schedule.date} ${order.schedule.timeSlot}` : '',
          price: order.amount,
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
      content: '取消后该时段会重新开放给其他用户',
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
