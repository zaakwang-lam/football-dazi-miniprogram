// pages/mine/lfg-publish.js — 发起组队（与约战同一套日期+时间选择）
const api = require('../../utils/api.js');
const { chooseLocationOnMap } = require('../../utils/location.js');

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isMobile(s) {
  return /^1\d{10}$/.test(String(s || '').trim());
}

Page({
  data: {
    teamTypes: ['11人制', '8人制', '7人制', '5人制', '3人制'],
    form: {
      location: '',
      dateValue: '',
      dateText: '',
      timeValue: '',
      timeText: '',
      playTime: null,
      playTimeLabel: '',
      matchTypes: [],
      needCount: 5,
      fee: '',
      contact: '',
      description: ''
    },
    dateMin: fmtDate(new Date()),
    dateMax: (() => { const d = new Date(); d.setDate(d.getDate() + 60); return fmtDate(d); })()
  },

  onTeamTypeToggle(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    const list = [...(this.data.form.matchTypes || [])];
    const idx = list.indexOf(value);
    if (idx >= 0) list.splice(idx, 1); else list.push(value);
    this.setData({ 'form.matchTypes': list });
  },

  async onChooseLocation() {
    const loc = await chooseLocationOnMap();
    if (!loc) return;
    const text = loc.name && loc.address && loc.address.indexOf(loc.name) < 0
      ? `${loc.name} ${loc.address}`
      : (loc.address || loc.name);
    this.setData({ 'form.location': text });
  },

  onDateChange(e) {
    const dateStr = e.detail.value;
    const [y, m, d] = dateStr.split('-').map(Number);
    this.setData({
      'form.dateValue': dateStr,
      'form.dateText': `${m}月${d}日`
    });
    this.recomposePlayTime(y, m, d, this.data.form.timeValue);
  },

  onTimeChange(e) {
    const timeStr = e.detail.value;
    this.setData({
      'form.timeValue': timeStr,
      'form.timeText': timeStr
    });
    if (this.data.form.dateValue) {
      const [y, m, d] = this.data.form.dateValue.split('-').map(Number);
      this.recomposePlayTime(y, m, d, timeStr);
    }
  },

  recomposePlayTime(y, m, d, timeStr) {
    if (!y || !m || !d || !timeStr) return;
    const [hh, mm] = timeStr.split(':').map(Number);
    const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
    this.setData({
      'form.playTime': dt.toISOString(),
      'form.playTimeLabel': `${m}月${d}日 ${timeStr}`
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
    if (!f.location) return wx.showToast({ title: '请用地图选择场地位置', icon: 'none' });
    if (!f.dateValue || !f.timeValue || !f.playTime) {
      return wx.showToast({ title: '请选择比赛时间', icon: 'none' });
    }
    if (!f.matchTypes || f.matchTypes.length === 0) {
      return wx.showToast({ title: '请至少选择一种人制', icon: 'none' });
    }
    if (!isMobile(f.contact)) {
      return wx.showToast({ title: '请填写11位手机号码', icon: 'none' });
    }

    wx.showLoading({ title: '发布中...' });
    try {
      const res = await api.publishLfg({
        type: 'sub',
        matchTypes: f.matchTypes,
        title: `${f.location} ${f.matchTypes.join('/')} 凑人`,
        location: f.location,
        fee: f.fee ? Number(f.fee) : null,
        playTime: f.playTime,
        needCount: f.needCount,
        contact: String(f.contact).trim(),
        description: f.description
      });
      wx.hideLoading();
      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (e) {
      wx.hideLoading();
    }
  }
});
