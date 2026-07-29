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

    // 默认显示今天的排期（后端返回 { courtId, schedules: { 'YYYY-MM-DD': [{id, timeSlot, status, price}] } })
    const scheduleRes = await api.getCourtSchedule(id);
    const grouped = scheduleRes.data.schedules || {};
    const dates = Object.keys(grouped).slice(0, 7);
    const firstDate = dates[0];
    const slots = grouped[firstDate] || [];
    const daySlots = slots.map(slot => ({
      id: slot.id,
      time: slot.timeSlot ? slot.timeSlot.split('-')[0] : '',
      timeSlot: slot.timeSlot,
      status: slot.status,
      price: slot.price
    }));
    this.setData({ daySlots });
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
    // 加载对应日期的时段（后端返回按日期分组的排期）
    api.getCourtSchedule(this.data.court.id).then(res => {
      const grouped = res.data.schedules || {};
      const dates = Object.keys(grouped).slice(0, 7);
      const dateKey = dates[idx];
      const slots = grouped[dateKey] || [];
      const daySlots = slots.map(slot => ({
        id: slot.id,
        time: slot.timeSlot ? slot.timeSlot.split('-')[0] : '',
        timeSlot: slot.timeSlot,
        status: slot.status,
        price: slot.price
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

    const court = this.data.court;
    const slot = this.data.daySlots[this.data.form.slotIdx];

    // 2026-07-29 改为免支付预订
    // 先订阅消息订阅（让球场方能收到通知），不管成功与否都可以成单
    wx.requestSubscribeMessage({
      tmplIds: ['TEMPLATE_ID_PENDING_BOOK'], // 占位，宏哥拿到真实模板 ID 后在 .env + 此处同步替换
      success: () => {},
      fail: () => {}, // 拒绝不影响预订
      complete: () => {
        this.doBook(court, slot);
      }
    });
  },

  doBook(court, slot) {
    wx.showLoading({ title: '预订中...' });
    api.createOrder({
      courtId: court.id,
      scheduleId: slot.id,
      contactName: this.data.form.name,
      contactPhone: this.data.form.phone,
      remark: this.data.form.remark
    }).then(orderRes => {
      wx.hideLoading();
      if (orderRes.code !== 0) {
        return wx.showToast({ title: orderRes.message || '预订失败', icon: 'none' });
      }
      const orderNo = orderRes.data.orderNo;
      wx.showModal({
        title: '预订成功',
        content: '已通知球场方，请保持电话畅通。支付请到球场现场办理。',
        showCancel: false,
        confirmText: '查看订单',
        success: () => {
          wx.redirectTo({ url: `/pages/order/detail?id=${orderNo}` });
        }
      });
    }).catch(err => {
      wx.hideLoading();
      console.error('预订失败:', err);
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    });
  }
});