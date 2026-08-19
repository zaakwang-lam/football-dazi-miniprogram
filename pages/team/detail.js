// pages/team/detail.js
const api = require('../../utils/api.js');

const COLORS = [
  'linear-gradient(135deg, #FF6B00, #FF8C42)',
  'linear-gradient(135deg, #007AFF, #4FACFE)',
  'linear-gradient(135deg, #2ECC71, #58D68D)',
  'linear-gradient(135deg, #9B59B6, #BE7BDB)'
];

Page({
  data: {
    team: null,
    members: [],
    isMember: false,
    isCaptain: false
  },

  onLoad(options) {
    this.teamId = options.id;
    this.loadDetail(options.id);
  },

  onShow() {
    if (this.teamId) this.loadDetail(this.teamId);
  },

  async loadDetail(id) {
    try {
      const res = await api.getTeamDetail(id);
      const team = res.data;
      const members = (team.memberList || []).map(m => ({
        id: m.id,
        name: m.nickname || '队员',
        shortName: (m.nickname || '队').slice(0, 1),
        role: m.role === 'captain' ? '队长' : '队员'
      }));
      this.setData({
        team: {
          ...team,
          shortName: (team.name || '球').substring(0, 2),
          bgColor: COLORS[(team.id || 0) % COLORS.length],
          members: team.memberCount || members.length
        },
        members,
        isMember: !!team.isMember,
        isCaptain: !!team.isCaptain
      });
      wx.setNavigationBarTitle({ title: team.name || '球队详情' });
    } catch (e) {
      console.error(e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async onJoinTap() {
    if (!wx.getStorageSync('token')) {
      return wx.navigateTo({ url: '/pages/login/login' });
    }
    wx.showModal({
      title: '加入球队',
      content: `确认加入「${this.data.team?.name || ''}」吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const r = await api.joinTeam(this.teamId);
          if (r.code !== 0) throw new Error(r.message || '加入失败');
          wx.showToast({ title: '加入成功', icon: 'success' });
          this.loadDetail(this.teamId);
        } catch (e) {
          wx.showToast({ title: e.message || '加入失败', icon: 'none' });
        }
      }
    });
  },

  onLeaveTap() {
    wx.showModal({
      title: '退出球队',
      content: '确认退出该球队？',
      confirmColor: '#FF4757',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.leaveTeam(this.teamId);
          wx.showToast({ title: '已退出', icon: 'success' });
          this.loadDetail(this.teamId);
        } catch (e) {
          wx.showToast({ title: e.message || '退出失败', icon: 'none' });
        }
      }
    });
  },

  onEditTap() {
    wx.navigateTo({ url: `/pages/team/edit?id=${this.teamId}` });
  },

  onDissolveTap() {
    wx.showModal({
      title: '解散球队',
      content: '解散后所有队员将退出，且不可恢复。确认解散？',
      confirmColor: '#FF4757',
      confirmText: '解散',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.dissolveTeam(this.teamId);
          wx.showToast({ title: '已解散', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1200);
        } catch (e) {
          wx.showToast({ title: e.message || '解散失败', icon: 'none' });
        }
      }
    });
  },

  onShareAppMessage() {
    const t = this.data.team;
    return {
      title: t ? `${t.name} 欢迎加入！` : '来踢球',
      path: `/pages/team/detail?id=${t ? t.id : ''}`
    };
  }
});
