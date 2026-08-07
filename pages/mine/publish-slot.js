// pages/mine/publish-slot.js
const api = require('../../utils/api.js');

Page({
  data: {
    courts: [],
    courtIndex: 0,
    courtId: null,
    date: '',
    timeSlot: '18:00-20:00',
    price: '',
    slots: []
  },

  onLoad(options) {
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    this.setData({ date });
    this.loadCourts(options.courtId);
  },

  async loadCourts(preferId) {
    try {
      const res = await api.getMyCourts();
      const list = (res.data?.list || []).filter(c => c.status === 1);
      if (!list.length) {
        wx.showToast({ title: '暂无已营业球场', icon: 'none' });
        this.setData({ courts: [] });
        return;
      }
      let idx = 0;
      if (preferId) {
        const found = list.findIndex(c => String(c.id) === String(preferId));
        if (found >= 0) idx = found;
      }
      this.setData({
        courts: list,
        courtIndex: idx,
        courtId: list[idx].id,
        price: list[idx].price != null ? String(list[idx].price) : ''
      });
      this.loadSlots(list[idx].id);
    } catch (e) {
      console.error(e);
    }
  },

  async loadSlots(courtId) {
    if (!courtId) return;
    try {
      const res = await api.getFreeSlots(courtId);
      this.setData({ slots: res.data?.list || [] });
    } catch (e) {
      this.setData({ slots: [] });
    }
  },

  onCourtChange(e) {
    const idx = Number(e.detail.value);
    const court = this.data.courts[idx];
    this.setData({
      courtIndex: idx,
      courtId: court.id,
      price: court.price != null ? String(court.price) : ''
    });
    this.loadSlots(court.id);
  },

  onDateChange(e) { this.setData({ date: e.detail.value }); },
  onTimeInput(e) { this.setData({ timeSlot: e.detail.value }); },
  onPriceInput(e) { this.setData({ price: e.detail.value }); },

  async onPublish() {
    const { courtId, date, timeSlot, price } = this.data;
    if (!courtId) return wx.showToast({ title: '请选择球场', icon: 'none' });
    if (!date || !timeSlot) return wx.showToast({ title: '请填写日期和时段', icon: 'none' });
    try {
      const res = await api.publishFreeSlots(courtId, [{
        date,
        timeSlot: String(timeSlot).trim(),
        price: Number(price) || 0
      }]);
      if (res.code !== 0) throw new Error(res.message || '发布失败');
      wx.showToast({ title: res.message || '发布成功', icon: 'success' });
      this.loadSlots(courtId);
    } catch (e) {
      wx.showToast({ title: e.message || '发布失败', icon: 'none' });
    }
  }
});
