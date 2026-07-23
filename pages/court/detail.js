// pages/court/detail.js
const api = require('../../utils/api.js');

const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

Page({
  data: {
    court: null,
    schedule: [],
    timeSlots: TIME_SLOTS
  },

  onLoad(options) {
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    const res = await api.getCourtDetail(id);
    const court = res.data;
    this.setData({
      court: {
        ...court,
        bgColor1: '#4FACFE',
        bgColor2: '#00F2FE'
      }
    });
    wx.setNavigationBarTitle({ title: court.name });

    // 加载排期
    const scheduleRes = await api.getCourtSchedule(id);
    this.setData({ schedule: scheduleRes.data });
  },

  onCallTap(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.showModal({
      title: '联系场地方',
      content: phone,
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: phone });
        }
      }
    });
  },

  onBookTap() {
    wx.navigateTo({ url: `/pages/court/book?id=${this.data.court.id}` });
  },

  onEvalTap() {
    wx.navigateTo({ url: `/pages/court/eval?id=${this.data.court.id}` });
  },

  onShareAppMessage() {
    return {
      title: this.data.court ? `${this.data.court.name} - ¥${this.data.court.price}/场` : '球场预订',
      path: `/pages/court/detail?id=${this.data.court ? this.data.court.id : ''}`
    };
  }
});