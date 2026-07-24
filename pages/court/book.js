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

    wx.showLoading({ title: '下单中...' });

    // 1. 创建订单
    api.createOrder({
      courtId: court.id,
      scheduleId: slot.id,  // 排期 ID（从后端 schedule 接口返回）
      contactName: this.data.form.name,
      contactPhone: this.data.form.phone,
      remark: this.data.form.remark
    }).then(orderRes => {
      if (orderRes.code !== 0) return;
      const orderId = orderRes.data.orderId;
      const orderNo = orderRes.data.orderNo;
      const amount = orderRes.data.amount;

      // 2. 调起微信支付（需要 openid）
      const app = getApp();
      const openid = app.globalData.openid || '';

      api.payOrder(orderId, openid).then(payRes => {
        wx.hideLoading();
        if (payRes.code !== 0) return;

        const payParams = payRes.data.payParams;
        // 3. 调起微信支付
        wx.requestPayment({
          timeStamp: payParams.timeStamp,
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType,
          paySign: payParams.paySign,
          success: () => {
            wx.showToast({ title: '支付成功', icon: 'success' });
            setTimeout(() => {
              wx.redirectTo({ url: `/pages/order/detail?id=${orderNo}` });
            }, 1500);
          },
          fail: (err) => {
            console.error('支付失败:', err);
            wx.showModal({
              title: '支付未完成',
              content: '订单已创建，可在我的订单中继续支付',
              confirmText: '去查看',
              success: (r) => {
                if (r.confirm) {
                  wx.redirectTo({ url: '/pages/order/list' });
                }
              }
            });
          }
        });
      });
    }).catch(err => {
      wx.hideLoading();
      console.error('下单失败:', err);
    });
  },

  mockPay(orderId) {
    // 保留兼容：开发模式下后端未启动时可模拟
    wx.showModal({
      title: '模拟支付',
      content: '点击确定模拟微信支付成功（仅开发环境）',
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