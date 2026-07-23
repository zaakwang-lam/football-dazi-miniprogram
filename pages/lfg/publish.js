// pages/lfg/publish.js
const api = require('../../utils/api.js');

Page({
  data: {
    form: {
      type: '找人顶',
      typeKey: 'sub',  // CSS 类名 key (sub/war/join)
      teamName: '',
      location: '',
      time: '',
      need: 2,
      level: '业余',
      contact: '',
      desc: ''
    }
  },

  onTypeSelect(e) {
    const type = e.currentTarget.dataset.type;
    const key = e.currentTarget.dataset.key;
    this.setData({ 
      'form.type': type,
      'form.typeKey': key
    });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  onNumChange(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const need = Math.max(1, Math.min(20, this.data.form.need + delta));
    this.setData({ 'form.need': need });
  },

  onLevelSelect(e) {
    const level = e.currentTarget.dataset.level;
    this.setData({ 'form.level': level });
  },

  async onSubmit() {
    const { teamName, location, time, contact } = this.data.form;
    if (!teamName) return wx.showToast({ title: '请输入球队名称', icon: 'none' });
    if (!location) return wx.showToast({ title: '请输入地点', icon: 'none' });
    if (!time) return wx.showToast({ title: '请输入时间', icon: 'none' });
    if (!contact) return wx.showToast({ title: '请输入联系方式', icon: 'none' });

    wx.showLoading({ title: '发布中...' });
    try {
      const res = await api.publishLfg(this.data.form);
      wx.hideLoading();
      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '发布失败', icon: 'none' });
    }
  }
});