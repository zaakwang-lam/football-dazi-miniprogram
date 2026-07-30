// pages/mine/lfg-publish.js
// 发起组队（个人凑人活动）
const api = require('../../utils/api.js');

Page({
  data: {
    teamTypes: ['11人制', '8人制', '7人制', '5人制', '3人制'],  // 2026-07-30 增加 8 人制 + 3 人制
    // 未来 14 天的日期
    dateRange: [[], []],
    dateIndex: [0, 0],
    form: {
      location: '',
      playTime: null,
      playTimeLabel: '请选择比赛时间',
      matchTypes: [],  // 人制多选（2026-07-28 升级）
      needCount: 5,
      fee: '',  // 人均费用（2026-07-28 升级：原 costPerPerson 改为 fee，与后端对齐）
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

  onTeamTypeToggle(e) {
    const value = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value;
    console.log('[mine/lfg-publish] onTeamTypeToggle, value=', value);
    if (!value) return;
    const list = [...(this.data.form.matchTypes || [])];
    const idx = list.indexOf(value);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(value);
    }
    this.setData({ 'form.matchTypes': list });
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
    if (!f.matchTypes || f.matchTypes.length === 0) {
      return wx.showToast({ title: '请至少选择一种人制', icon: 'none' });
    }

    wx.showLoading({ title: '发布中...' });
    try {
      // type 映射：凑人为 'sub'（约战才是 war）
      const res = await api.publishLfg({
        type: 'sub',
        matchTypes: f.matchTypes,  // 人制多选（2026-07-28 升级）
        title: `${f.location} ${f.matchTypes.join('/')} 凑人`,
        location: f.location,
        fee: f.fee ? Number(f.fee) : null,  // 人均费用（2026-07-28 升级）
        playTime: f.playTime,
        needCount: f.needCount,
        contact: f.contact,
        description: f.description
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