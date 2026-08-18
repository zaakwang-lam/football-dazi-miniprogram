// pages/war/publish.js — 发布约战
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
      type: 'war',
      teamName: '',
      location: '',
      dateValue: '',
      dateText: '',
      timeValue: '',
      timeText: '',
      playTime: '',
      playTimeLabel: '',
      needCount: 1,
      level: '养生',
      matchType: '11人制',
      fee: '',
      contact: '',
      description: ''
    },
    levelOptions: ['养生', '竞技'],
    matchTypeOptions: ['11人制', '8人制', '7人制', '5人制', '3人制'],
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

  onLevelSelect(e) {
    this.setData({ 'form.level': e.currentTarget.dataset.level });
  },

  onMatchTypeSelect(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({ 'form.matchType': value });
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
    const { teamName, location, playTime, contact, dateValue, timeValue, matchType, fee } = this.data.form;
    if (!teamName) return wx.showToast({ title: '请输入队伍名称', icon: 'none' });
    if (!location) return wx.showToast({ title: '请用地图选择比赛地点', icon: 'none' });
    if (!dateValue || !timeValue) return wx.showToast({ title: '请选择比赛时间', icon: 'none' });
    if (!matchType) return wx.showToast({ title: '请选择人制', icon: 'none' });
    if (!isMobile(contact)) return wx.showToast({ title: '请填写11位手机号码', icon: 'none' });

    try {
      const res = await api.publishLfg({
        type: 'war',
        matchTypes: [matchType],
        title: `${teamName} ${matchType} 约战`,
        location,
        fee: fee ? Number(fee) : null,
        playTime,
        needCount: this.data.form.needCount,
        level: this.data.form.level,
        contact: String(contact).trim(),
        description: this.data.form.description
      });
      if (res.code === 0) {
        wx.showToast({ title: '约战已发布！', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (e) {
      console.error('约战发布失败:', e);
    }
  }
});
