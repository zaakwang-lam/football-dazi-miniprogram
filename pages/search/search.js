// pages/search/search.js
const api = require('../../utils/api.js');

Page({
  data: {
    keyword: '',
    tab: 'all', // all | court | team
    courts: [],
    teams: [],
    loaded: false,
    searching: false
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value || '' });
  },

  onClear() {
    this.setData({ keyword: '', courts: [], teams: [], loaded: false });
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  async onSearch() {
    const kw = (this.data.keyword || '').trim();
    if (!kw) return wx.showToast({ title: '请输入关键词', icon: 'none' });
    this.setData({ searching: true });
    try {
      const [courtRes, teamRes] = await Promise.allSettled([
        api.getNearbyCourts({ keyword: kw, pageSize: 30 }),
        api.getTeamList({ keyword: kw, pageSize: 30 })
      ]);
      const courts = courtRes.status === 'fulfilled' ? (courtRes.value.data?.list || []) : [];
      const teams = teamRes.status === 'fulfilled' ? (teamRes.value.data?.list || []) : [];
      this.setData({
        courts: courts.map(c => ({
          ...c,
          typeLabel: (c.types && c.types.length) ? c.types.join('/') : (c.type || '')
        })),
        teams,
        loaded: true
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ searching: false });
    }
  },

  onConfirm() { this.onSearch(); },

  onCourtTap(e) {
    wx.navigateTo({ url: `/pages/court/detail?id=${e.currentTarget.dataset.id}` });
  },

  onTeamTap(e) {
    wx.navigateTo({ url: `/pages/team/detail?id=${e.currentTarget.dataset.id}` });
  }
});
