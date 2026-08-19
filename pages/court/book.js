// pages/court/book.js
const api = require('../../utils/api.js');

const WEEKS = ['日', '一', '二', '三', '四', '五', '六'];

Page({
  data: {
    court: null,
    dateList: [],
    daySlots: [],
    hasAnySlot: true,
    form: {
      dateIdx: 0,
      slotIdx: -1,
      dateText: '',
      slotText: '',
      name: '',
      phone: '',
      remark: ''
    },
    totalPrice: 0
  },

  onLoad(options) {
    this.courtId = options.id;
    this.loadDetail(options.id);
    this.initDateList();
  },

  async loadDetail(id) {
    try {
      const res = await api.getCourtDetail(id);
      this.setData({ court: res.data });
      await this.loadSlotsForIndex(0);
    } catch (e) {
      console.error(e);
    }
  },

  initDateList() {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      list.push({
        week: i === 0 ? '今' : (i === 1 ? '明' : WEEKS[d.getDay()]),
        day: `${m}/${day}`,
        dateKey: `${d.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      });
    }
    this.setData({ dateList: list, 'form.dateIdx': 0 });
  },

  async loadSlotsForIndex(idx) {
    if (!this.courtId) return;
    try {
      const scheduleRes = await api.getCourtSchedule(this.courtId);
      const grouped = scheduleRes.data?.schedules || {};
      const dateList = this.data.dateList;
      const dateKey = dateList[idx]?.dateKey;
      let slots = (dateKey && grouped[dateKey]) ? grouped[dateKey] : [];
      if (!slots.length) {
        const keys = Object.keys(grouped).sort();
        slots = grouped[keys[idx]] || [];
      }
      const daySlots = slots.map(slot => ({
        id: slot.id,
        time: slot.timeSlot ? String(slot.timeSlot).split('-')[0] : '',
        timeSlot: slot.timeSlot,
        status: slot.status,
        price: slot.price
      }));
      const hasAnySlot = Object.keys(grouped).some(k => (grouped[k] || []).length > 0);
      this.setData({
        daySlots,
        hasAnySlot,
        'form.slotIdx': -1
      });
      this.updateFormText();
    } catch (e) {
      this.setData({ daySlots: [], hasAnySlot: false });
    }
  },

  onDateSelect(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    this.setData({ 'form.dateIdx': idx, 'form.slotIdx': -1 });
    this.loadSlotsForIndex(idx);
  },

  onSlotSelect(e) {
    const idx = e.currentTarget.dataset.idx;
    const slot = this.data.daySlots[idx];
    if (!slot || slot.status === 'booked' || slot.status === 'closed') {
      return wx.showToast({ title: '该时段不可订', icon: 'none' });
    }
    if (!slot.id) {
      return wx.showToast({ title: '时段数据异常，请下拉重试', icon: 'none' });
    }
    this.setData({ 'form.slotIdx': idx });
    this.updateFormText();
  },

  updateFormText() {
    const dateItem = this.data.dateList[this.data.form.dateIdx];
    const slotItem = this.data.daySlots[this.data.form.slotIdx];
    let total = 0;
    if (slotItem && slotItem.price != null) total = Number(slotItem.price) || 0;
    else if (this.data.court) total = Number(this.data.court.price) || 0;
    this.setData({
      'form.dateText': dateItem ? `${dateItem.day}(${dateItem.week})` : '',
      'form.slotText': slotItem ? (slotItem.timeSlot || slotItem.time) : '',
      totalPrice: total
    });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value });
  },

  onGoPublishHint() {
    wx.showModal({
      title: '暂无可订时段',
      content: '该球场尚未发布空闲时段。可稍后再试，或联系球场方在小程序中「发布空闲时段」。',
      showCancel: false
    });
  },

  onSubmit() {
    if (!this.data.hasAnySlot || !this.data.daySlots.length) {
      return this.onGoPublishHint();
    }
    if (this.data.form.slotIdx < 0) return wx.showToast({ title: '请选择时段', icon: 'none' });
    const name = (this.data.form.name || '').trim();
    const phone = (this.data.form.phone || '').trim();
    if (!name) return wx.showToast({ title: '请填写联系人', icon: 'none' });
    if (!/^1\d{10}$/.test(phone)) return wx.showToast({ title: '请填写11位手机号', icon: 'none' });

    const court = this.data.court;
    const slot = this.data.daySlots[this.data.form.slotIdx];
    if (!slot?.id) return wx.showToast({ title: '请重新选择时段', icon: 'none' });

    this.doBook(court, slot, name, phone);
  },

  doBook(court, slot, name, phone) {
    wx.showLoading({ title: '预订中...', mask: true });
    api.createOrder({
      courtId: court.id,
      scheduleId: slot.id,
      contactName: name,
      contactPhone: phone,
      remark: this.data.form.remark
    }).then(orderRes => {
      wx.hideLoading();
      if (orderRes.code !== 0) {
        return wx.showToast({ title: orderRes.message || '预订失败', icon: 'none' });
      }
      const orderId = orderRes.data.orderId;
      wx.showModal({
        title: '预订成功',
        content: '已通知球场方，请保持电话畅通。费用请到球场现场结算。',
        showCancel: false,
        confirmText: '查看订单',
        success: () => {
          wx.redirectTo({ url: `/pages/order/detail?id=${orderId}` });
        }
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '预订失败，请重试', icon: 'none' });
    });
  }
});
