// pages/team/team.js
const api = require('../../utils/api.js');

const COLORS = [
  'linear-gradient(135deg, #FF6B00, #FF8C42)',
  'linear-gradient(135deg, #007AFF, #4FACFE)',
  'linear-gradient(135deg, #2ECC71, #58D68D)',
  'linear-gradient(135deg, #9B59B6, #BE7BDB)',
  'linear-gradient(135deg, #FFB800, #FFD75E)'
];

Page({
  data: {
    myTeam: null,
    teams: []
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    const res = await api.getTeamList();
    const teams = (res.data || []).map((t, i) => ({
      ...t,
      shortName: t.name.substring(0, 2),
      bgColor: COLORS[i % COLORS.length]
    }));

    // 从本地缓存获取用户的球队
    const myTeamId = wx.getStorageSync('myTeamId');
    let myTeam = null;
    if (myTeamId) {
      myTeam = teams.find(t => t.id === Number(myTeamId));
    }

    this.setData({ teams, myTeam });
  },

  onTeamTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/team/detail?id=${id}` });
  },

  onCreateTeam() {
    wx.navigateTo({ url: '/pages/team/create' });
  },

  onQuickTap(e) {
    const type = e.currentTarget.dataset.type;
    const map = {
      checkin: '/pages/team/checkin',
      aa: '/pages/team/aa',
      announce: '/pages/team/team',
      find: '/pages/court/list'
    };
    if (type === 'announce') {
      wx.showToast({ title: '公告功能开发中', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: map[type] });
  },

  onShareAppMessage() {
    return {
      title: '加入我的球队，一起踢球！',
      path: '/pages/team/team'
    };
  }
});