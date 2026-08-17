// pages/team/announce.js
const api = require('../../utils/api.js');

Page({
  data: {
    teamId: null,
    teamName: '',
    announcement: '',
    saving: false
  },

  onLoad(options) {
    const teamId = options.teamId || wx.getStorageSync('myTeamId');
    this.setData({ teamId });
    if (teamId) this.loadTeam(teamId);
  },

  async loadTeam(id) {
    try {
      const res = await api.getTeamDetail(id);
      const t = res.data || {};
      this.setData({
        teamName: t.name || '',
        announcement: t.announcement || ''
      });
      wx.setNavigationBarTitle({ title: t.name ? `${t.name}·公告` : '球队公告' });
    } catch (e) {
      console.error(e);
    }
  },

  onInput(e) {
    this.setData({ announcement: e.detail.value });
  },

  async onSave() {
    if (!this.data.teamId) {
      return wx.showToast({ title: '未关联球队', icon: 'none' });
    }
    this.setData({ saving: true });
    try {
      const res = await api.updateTeamAnnouncement(this.data.teamId, this.data.announcement || '');
      if (res.code !== 0) throw new Error(res.message || '保存失败');
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
