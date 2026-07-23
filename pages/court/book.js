// pages/court/book.js
const api = require('../../utils/api.js');

const WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

Page({
  data: {
    court: null,
    dateList: [],
    daySlots: [],
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
    this.loadDetail(options.id);
    this.initDateList();
  },

  async loadDetail(id) {
    const res = await api.getCourtDetail(id);
    this.setData({ court: res.data });
    this.calcTotal();

    // 默认显示今天的排期
    const scheduleRes = await api.getCourtSchedule(id);
    const todaySlots = scheduleRes.data[0].hours.map(h => ({
      time: h.time,
      status: h.status
    }));
    this.setData({ daySlots: todaySlots });
    this.updateFormText();
  },

  initDateList() {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push({
        week: i === 0 ? '今天' : (i === 1 ? '明天' : WEEKS[d.getDay()]),
        day: `${d.getMonth() + 1}/${d.getDate()}`,
        date: d
      });
    }
    this.setData({ dateList: list, 'form.dateIdx': 0 });
    this.updateFormText();
  },

  onDateSelect(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ 'form.dateIdx': idx, 'form.slotIdx': -1 });
    // 加载对应日期的时段
    api.getCourtSchedule(this.data.court.id).then(res => {
      const daySlots = res.data[idx].hours.map(h => ({
        time: h.time,
        status: h.status
      }));
      this.setData({ daySlots });
      this.updateFormText();
    });
  },

  onSlotSelect(e) {
    const idx = e.currentTarget.dataset.idx;
    if (this.data.daySlots[idx].status === 'booked') {
      wx.showToast({ title: '该时段已被预订', icon: 'none' });
      return;
    }
    this.setData({ 'form.slotIdx': idx });
    this.updateFormText();
  },

  updateFormText() {
    const dateItem = this.data.dateList[this.data.form.dateIdx];
    const slotItem = this.data.daySlots[this.data.form.slotIdx];
    this.setData({
      'form.dateText': dateItem ? `${dateItem.day} ${dateItem.week}` : '',
      'form.slotText': slotItem ? slotItem.time : ''
    });
    this.calcTotal();
  },

  calcTotal() {
    const total = this.data.court && this.data.form.slotIdx >= 0 ? this.data.court.price : 0;
    this.setData({ totalPrice: total });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  onSubmit() {
    if (this.data.form.slotIdx < 0) return wx.showToast({ title: '请选择时段', icon: 'none' });
    if (!this.data.form.name) return wx.showToast({ title: '请填写联系人', icon: 'none' });
    if (!this.data.form.phone) return wx.showToast({ title: '请填写联系电话', icon: 'none' });

    wx.showLoading({ title: '下单中...' });
    api.createOrder({
      courtId: this.data.court.id,
      courtName: this.data.court.name,
      date: this.data.form.dateText,
      time: this.data.form.slotText,
      price: this.data.court.price,
      name: this.data.form.name,
      phone: this.data.form.phone,
      remark: this.data.form.remark
    }).then(res => {
      wx.hideLoading();
      if (res.code === 0) {
        // 模拟微信支付
        this.mockPay(res.data.id);
      }
    });
  },

  mockPay(orderId) {
    wx.showModal({
      title: '模拟支付',
      content: '点击确定模拟微信支付成功',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '支付成功！', icon: 'success' });
          setTimeout(() => {
            wx.redirectTo({ url: `/pages/order/detail?id=${orderId}` });
          }, 1500);
        }
      }
    });
  }
});