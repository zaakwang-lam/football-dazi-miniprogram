// pages/team/edit.js
const api = require('../../utils/api.js');

Page({
  data: {
    teamId: null,
    matchTypes: ['11人制', '8人制', '7人制', '5人制', '3人制'],
    form: {
      name: '',
      province: '广东省',
      city: '广州市',
      district: '',
      matchType: '11人制',
      captainPhone: '',
      motto: '',
      recruitment: true
    }
  },

  onLoad(options) {
    this.setData({ teamId: options.id });
    this.load(options.id);
  },

  async load(id) {
    try {
      const res = await api.getTeamDetail(id);
      const t = res.data || {};
      if (!t.isCaptain) {
        wx.showToast({ title: '仅队长可编辑', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1200);
        return;
      }
      this.setData({
        form: {
          name: t.name || '',
          province: t.province || '广东省',
          city: t.city || '广州市',
          district: t.district || '',
          matchType: t.matchType || '11人制',
          captainPhone: t.captainPhone || '',
          motto: t.motto || '',
          recruitment: t.recruitment !== false
        }
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value });
  },

  onMatchType(e) {
    this.setData({ 'form.matchType': e.currentTarget.dataset.val });
  },

  onRecruitToggle() {
    this.setData({ 'form.recruitment': !this.data.form.recruitment });
  },

  async onSave() {
    const f = this.data.form;
    if (!f.name) return wx.showToast({ title: '请填写球队名称', icon: 'none' });
    if (!f.district) return wx.showToast({ title: '请填写区域', icon: 'none' });
    try {
      await api.updateTeam(this.data.teamId, f);
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (e) {
      // toast by api
    }
  }
});
