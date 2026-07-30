// pages/lfg/publish.js
// 发布凑人（type='sub' 个人顶个人）
// 2026-07-28 调整：时间改为日期 picker + 时间 picker，日期可选未来 60 天，时间可选任意时分
const api = require('../../utils/api.js');

// 生成 picker 边界（今天 ~ 今天+60天）
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

Page({
  data: {
    form: {
      type: 'sub',
      teamName: '',
      location: '',
      // 拆开存：日期 picker 值 + 时间 picker 值 + 最终 playTime ISO + 中文显示
      dateValue: '',         // picker mode=date 的 v-model，YYYY-MM-DD
      dateText: '',          // 中文日期，如 "7月30"
      timeValue: '',         // picker mode=time 的 v-model，HH:MM
      timeText: '',          // 中文时间，如 "18:30"
      playTime: '',          // 最终 ISO 字符串（提交用）
      playTimeLabel: '',     // 完整中文显示，如 "7月30 18:30"
      needCount: 2,
      level: '业余',  // 2026-07-30：选项改为「养生/业余/竞技/职业」（中间为默认）
      contact: '',
      description: ''
    },
    // picker 边界
    dateMin: fmtDate(new Date()),
    dateMax: (() => { const d = new Date(); d.setDate(d.getDate() + 60); return fmtDate(d); })()
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

  // 日期选择（YYYY-MM-DD）
  onDateChange(e) {
    const dateStr = e.detail.value;  // "2026-07-30"
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateText = `${m}月${d}日`;
    this.setData({
      'form.dateValue': dateStr,
      'form.dateText': dateText
    });
    this.recomposePlayTime(y, m, d, this.data.form.timeValue);
  },

  // 时间选择（HH:MM）
  onTimeChange(e) {
    const timeStr = e.detail.value;  // "18:30"
    const [hh, mm] = timeStr.split(':').map(Number);
    this.setData({
      'form.timeValue': timeStr,
      'form.timeText': timeStr
    });
    if (this.data.form.dateValue) {
      const [y, m, d] = this.data.form.dateValue.split('-').map(Number);
      this.recomposePlayTime(y, m, d, timeStr);
    }
  },

  // 合成最终 playTime
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
    const { location, playTime, contact, dateValue, timeValue } = this.data.form;
    if (!location) return wx.showToast({ title: '请选择地点', icon: 'none' });
    if (!dateValue || !timeValue) return wx.showToast({ title: '请选择比赛时间', icon: 'none' });
    if (!contact) return wx.showToast({ title: '请输入联系方式', icon: 'none' });

    try {
      const res = await api.publishLfg({
        type: 'sub',  // 硬编码：凑人发布
        title: this.data.form.teamName || `${location} ${this.data.form.playTimeLabel}`,
        location,
        playTime,
        needCount: this.data.form.needCount,
        level: this.data.form.level,
        contact,
        description: this.data.form.description
      });
      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (e) {
      console.error('发布失败:', e);
      wx.showToast({ title: '发布失败', icon: 'none' });
    }
  }
});