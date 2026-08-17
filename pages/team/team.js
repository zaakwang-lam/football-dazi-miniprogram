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
    try {
      const res = await api.getTeamList();
      const teams = (res.data?.list || []).map((t, i) => ({
        ...t,
        members: t.memberCount || t.members || 0,
        shortName: (t.name || '球').substring(0, 2),
        bgColor: COLORS[i % COLORS.length],
        motto: t.motto || '',
        attendance: t.attendance || 0,
        wins: t.wins || 0,
        draws: t.draws || 0,
        losses: t.losses || 0
      }));

      const myTeamId = wx.getStorageSync('myTeamId');
      let myTeam = null;
      if (myTeamId) {
        myTeam = teams.find(t => t.id === Number(myTeamId));
      }
      // 若本地无 myTeamId，尝试用「我的球队」接口
      if (!myTeam) {
        try {
          const mine = await api.getMyTeams();
          const first = (mine.data?.list || [])[0];
          if (first) {
            myTeam = teams.find(t => t.id === first.id) || {
              ...first,
              members: first.memberCount || 0,
              shortName: (first.name || '球').substring(0, 2),
              bgColor: COLORS[0]
            };
            wx.setStorageSync('myTeamId', first.id);
          }
        } catch (_) { /* ignore */ }
      }

      this.setData({ teams, myTeam });
    } catch (e) {
      console.error('加载球队失败:', e);
    }
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
    const teamId = this.data.myTeam?.id;
    if (type === 'checkin') {
      wx.navigateTo({ url: `/pages/team/checkin?teamId=${teamId || ''}` });
      return;
    }
    if (type === 'announce') {
      wx.navigateTo({ url: `/pages/team/announce?teamId=${teamId || ''}` });
      return;
    }
    if (type === 'find') {
      // 约战 → 约战板块（非场地预订）
      wx.navigateTo({ url: '/pages/war/war' });
      return;
    }
  },

  onShareAppMessage() {
    return {
      title: '加入我的球队，一起踢球！',
      path: '/pages/team/team'
    };
  }
});
