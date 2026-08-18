// pages/lfg/publish.js — 发布凑人
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
    form: {
      type: 'sub',
      teamName: '',
      location: '',
      dateValue: '',
      dateText: '',
      timeValue: '',
      timeText: '',
      playTime: '',
      playTimeLabel: '',
      needCount: 2,
      level: '业余',
      contact: '',
      description: ''
    },
    dateMin: fmtDate(new Date()),
    dateMax: (() => { const d = new Date(); d.setDate(d.getDate() + 60); return fmtDate(d); })()
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  async onChooseLocation() {
    const loc = await chooseLocationOnMap();
    if (!loc) return;
    const text = loc.name && loc.address && loc.address.indexOf(loc.name) < 0
      ? `${loc.name} ${loc.address}`
      : (loc.address || loc.name);
    this.setData({ 'form.location': text });
  },

  onNumChange(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const need = Math.max(1, Math.min(20, this.data.form.needCount + delta));
    this.setData({ 'form.needCount': need });
  },

  onLevelSelect(e) {
    this.setData({ 'form.level': e.currentTarget.dataset.level });
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

  async onSubmit() {
    const { location, playTime, contact, dateValue, timeValue, description, teamName } = this.data.form;
    if (!location) return wx.showToast({ title: '请用地图选择地点', icon: 'none' });
    if (!dateValue || !timeValue) return wx.showToast({ title: '请选择比赛时间', icon: 'none' });
    if (!isMobile(contact)) return wx.showToast({ title: '请填写11位手机号码', icon: 'none' });

    try {
      const res = await api.publishLfg({
        type: 'sub',
        title: teamName || `${location} ${this.data.form.playTimeLabel}`,
        location,
        playTime,
        needCount: this.data.form.needCount,
        level: this.data.form.level,
        contact: String(contact).trim(),
        description: description || ''
      });
      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (e) {
      console.error('发布失败:', e);
    }
  }
});
