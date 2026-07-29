// pages/order/detail.js
const api = require('../../utils/api.js');

const STATUS_CONFIG = {
  '待支付': { icon: '⏰', desc: '请在 15 分钟内完成支付', statusKey: 'pending' },
  '已预订': { icon: '✓', desc: '已通知球场方，请保持电话畅通。付款请到现场办理。', statusKey: 'booked' },
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
        booked: '已预订',  // 2026-07-29 新增：免支付预订状态
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
  },

  // 2026-07-29 新增：免支付预订后的辅助操作
  onCancelBook() {
    wx.showModal({
      title: '取消预订',
      content: '取消后该时段会重新开放给其他用户预订',
      success: (res) => {
        if (res.confirm) {
          // 调用取消接口（此处 mock）：
          this.setData({
            'order.status': '已取消',
            ...STATUS_CONFIG['已取消']
          });
          wx.showToast({ title: '已取消', icon: 'success' });
        }
      }
    });
  },

  onContactCourt() {
    // 2026-07-29 占位：球场方接收订单后才能联系，需后续接入
    // 当前仅提示用户主动联系（球场方电话在 court 详情里有）
    wx.showModal({
      title: '联系球场方',
      content: '请通过订单中的电话直接联系球场方。如有疑问，请在微信群反馈。',
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});