// pages/mine/lfg-publish.js
// 发起组队（个人凑人活动）
const api = require('../../utils/api.js');

Page({
  data: {
    teamTypes: ['11人场', '7人场', '5人场'],
    teamTypeIndex: 0,
    // 未来 14 天的日期
    dateRange: [[], []],
    dateIndex: [0, 0],
    form: {
      location: '',
      playTime: null,
      playTimeLabel: '请选择比赛时间',
      type: '11人场',
      needCount: 5,
      costPerPerson: '',
      contact: '',
      description: ''
    }
  },

  onLoad() {
    // 生成未来 14 天
    const dates = [];
    const timeSlots = ['08:00', '10:00', '14:00', '16:00', '19:00', '21:00'];
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.now() + i * 86400000);
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      dates.push(`${m}/${day} (周${['日','一','二','三','四','五','六'][d.getDay()]})`);
    }
    this.setData({
      'dateRange[0]': dates,
      'dateRange[1]': timeSlots
    });
  },

  onTeamTypeChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      teamTypeIndex: idx,
      'form.type': this.data.teamTypes[idx]
    });
  },

  onDateChange(e) {
    const [dateIdx, timeIdx] = e.detail.value;
    const dateStr = this.data.dateRange[0][dateIdx];
    const timeStr = this.data.dateRange[1][timeIdx];
    // 转成 ISO
    const today = new Date();
    today.setDate(today.getDate() + dateIdx);
    today.setHours(parseInt(timeStr), 0, 0, 0);
    this.setData({
      dateIndex: [dateIdx, timeIdx],
      'form.playTime': today.toISOString(),
      'form.playTimeLabel': `${dateStr} ${timeStr}`
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onCountChange(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const next = Math.max(1, Math.min(22, this.data.form.needCount + delta));
    this.setData({ 'form.needCount': next });
  },

  async onSubmit() {
    const f = this.data.form;
    if (!f.location) return wx.showToast({ title: '请填写场地位置', icon: 'none' });
    if (!f.playTime) return wx.showToast({ title: '请选择比赛时间', icon: 'none' });

    wx.showLoading({ title: '发布中...' });
    try {
      // type 映射：'11人场' → 'sub'（凑人）；'约战'才是 war
      const res = await api.publishLfg({
        type: 'sub',
        title: `${f.location} ${f.type} 凑人`,
        location: f.location,
        playTime: f.playTime,
        needCount: f.needCount,
        contact: f.contact,
        description: `${f.description}${f.costPerPerson ? '\n人均：¥' + f.costPerPerson : ''}`
      });
      wx.hideLoading();

      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: res.message || '发布失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  }
});