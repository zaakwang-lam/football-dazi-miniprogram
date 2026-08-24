// pages/court/detail.js
const api = require('../../utils/api.js');

const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

function formatMonthDay(dateStr) {
  const s = String(dateStr || '').substring(0, 10);
  const parts = s.split('-');
  if (parts.length >= 3) return `${Number(parts[1])}/${Number(parts[2])}`;
  return s;
}

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

    // 加载排期（后端返回 { courtId, schedules: { 'YYYY-MM-DD': [...] } }）
    const scheduleRes = await api.getCourtSchedule(id);
    const grouped = scheduleRes.data.schedules || {};
    const dates = Object.keys(grouped).slice(0, 7);
    let timeSlots = TIME_SLOTS;
    if (dates[0] && grouped[dates[0]] && grouped[dates[0]].length) {
      const fromData = grouped[dates[0]].map(slot => {
        const raw = String(slot.timeSlot || '');
        const start = raw.split('-')[0] || raw;
        return start.length > 5 ? start.slice(0, 5) : start;
      }).filter(Boolean);
      if (fromData.length) timeSlots = fromData;
    }
    const schedule = dates.map(date => ({
      date,
      dateShort: formatMonthDay(date),
      hours: grouped[date].map(slot => ({
        time: slot.timeSlot ? slot.timeSlot.split('-')[0] : '',
        status: slot.status
      }))
    }));
    this.setData({ schedule, timeSlots });
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

  onShareAppMessage() {
    return {
      title: this.data.court ? `${this.data.court.name} - ¥${this.data.court.price}/场` : '球场预订',
      path: `/pages/court/detail?id=${this.data.court ? this.data.court.id : ''}`
    };
  }
});