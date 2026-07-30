// pages/war/publish.js
// 发布约战（type='war' 球队对球队）
// 2026-07-28 调整：时间改为日期 picker + 时间 picker，跟 lfg/publish 规则一致
const api = require('../../utils/api.js');

// 生成 picker 边界（今天 ~ 今天+60天）
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
      needCount: 1,  // 保留但 wxml 不显示（宏哥 11:13 要求去除挑战人数模块）
      level: '养生',  // 2026-07-28 改：默认养生
      matchType: '11人制',  // 2026-07-30 改：单选（原来 matchTypes 多选）
      fee: '',  // 人均费用（可选）
      contact: '',
      description: ''
    },
    levelOptions: ['养生', '竞技'],  // 2026-07-28 宏哥要求分为「养生」「竞技」
    matchTypeOptions: ['11人制', '8人制', '7人制', '5人制', '3人制'],  // 2026-07-30 增加 8 人制 + 3 人制
    // picker 边界
    dateMin: fmtDate(new Date()),
    dateMax: (() => { const d = new Date(); d.setDate(d.getDate() + 60); return fmtDate(d); })()
  },

  onLoad() {
    // 默认 matchType 为 '11人制'
    this.setData({ 'form.matchType': '11人制' });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  onNumChange(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const need = Math.max(1, Math.min(20, this.data.form.needCount + delta));
    this.setData({ 'form.needCount': need });
  },

  onLevelSelect(e) {
    const level = e.currentTarget.dataset.level;
    this.setData({ 'form.level': level });
  },

  // 人制单选 select（2026-07-30 宏哥改为单选）
  onMatchTypeSelect(e) {
    const value = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value;
    if (!value) return;
    console.log('[war/publish] onMatchTypeSelect, value=', value);
    this.setData({ 'form.matchType': value });
  },

  // 日期选择
  onDateChange(e) {
    const dateStr = e.detail.value;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateText = `${m}月${d}日`;
    this.setData({
      'form.dateValue': dateStr,
      'form.dateText': dateText
    });
    this.recomposePlayTime(y, m, d, this.data.form.timeValue);
  },

  // 时间选择
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
    if (!location) return wx.showToast({ title: '请填写比赛地点', icon: 'none' });
    if (!dateValue || !timeValue) return wx.showToast({ title: '请选择比赛时间', icon: 'none' });
    if (!matchType) {
      return wx.showToast({ title: '请选择人制', icon: 'none' });
    }
    if (!contact) return wx.showToast({ title: '请输入联系方式', icon: 'none' });

    try {
      const res = await api.publishLfg({
        type: 'war',  // 硬编码：约战发布
        matchTypes: [matchType],  // 2026-07-30 后端还是存数组
        title: `${teamName} ${matchType} 约战`,
        location,
        fee: fee ? Number(fee) : null,
        playTime,
        needCount: this.data.form.needCount,
        level: this.data.form.level,
        contact,
        description: this.data.form.description
      });
      if (res.code === 0) {
        wx.showToast({ title: '约战已发布！', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (e) {
      console.error('约战发布失败:', e);
      wx.showToast({ title: '发布失败', icon: 'none' });
    }
  }
});