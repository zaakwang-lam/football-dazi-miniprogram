// pages/lfg/publish.js
const api = require('../../utils/api.js');

Page({
  data: {
    form: {
      type: 'sub',  // 后端英文
      typeName: '找人顶',  // 前端显示
      teamName: '',
      location: '',
      playTime: '',  // ISO 格式
      timeText: '',   // 显示用
      needCount: 2,
      level: '业余',
      contact: '',
      description: ''
    }
  },

  onTypeSelect(e) {
    const key = e.currentTarget.dataset.key;
    const name = e.currentTarget.dataset.name;
    this.setData({
      'form.type': key,
      'form.typeName': name
    });
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

  onPickTime() {
    wx.showActionSheet({
      itemList: ['今晚 20:00', '明晚 20:00', '本周六 15:00', '本周日 15:00'],
      success: (res) => {
        const times = ['今晚 20:00', '明晚 20:00', '本周六 15:00', '本周日 15:00'];
        const timeText = times[res.tapIndex];
        // 简单转换为 ISO（假设是今晚或明天 20:00）
        const now = new Date();
        let playTime = new Date(now);
        if (res.tapIndex === 0) {
          playTime.setHours(20, 0, 0, 0);
        } else if (res.tapIndex === 1) {
          playTime.setDate(playTime.getDate() + 1);
          playTime.setHours(20, 0, 0, 0);
        } else if (res.tapIndex === 2) {
          const sat = 6 - now.getDay();
          playTime.setDate(playTime.getDate() + (sat < 0 ? sat + 7 : sat));
          playTime.setHours(15, 0, 0, 0);
        } else {
          const sun = 0 - now.getDay();
          playTime.setDate(playTime.getDate() + (sun <= 0 ? sun + 7 : sun));
          playTime.setHours(15, 0, 0, 0);
        }
        this.setData({
          'form.timeText': timeText,
          'form.playTime': playTime.toISOString()
        });
      }
    });
  },

  async onSubmit() {
    const { type, location, playTime, contact } = this.data.form;
    if (!location) return wx.showToast({ title: '请选择地点', icon: 'none' });
    if (!playTime) return wx.showToast({ title: '请选择时间', icon: 'none' });
    if (!contact) return wx.showToast({ title: '请输入联系方式', icon: 'none' });

    try {
      const res = await api.publishLfg({
        type: this.data.form.type,
        title: this.data.form.teamName || `${location} ${this.data.form.timeText}`,
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
    }
  }
});