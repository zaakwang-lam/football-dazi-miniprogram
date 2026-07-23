// pages/team/detail.js
const api = require('../../utils/api.js');

const COLORS = [
  'linear-gradient(135deg, #FF6B00, #FF8C42)',
  'linear-gradient(135deg, #007AFF, #4FACFE)',
  'linear-gradient(135deg, #2ECC71, #58D68D)',
  'linear-gradient(135deg, #9B59B6, #BE7BDB)'
];

const MOCK_MEMBERS = [
  { id: 1, name: '老王', role: '队长', shortName: '王' },
  { id: 2, name: '阿强', role: '前锋', shortName: '强' },
  { id: 3, name: '小林', role: '中场', shortName: '林' },
  { id: 4, name: '大壮', role: '后卫', shortName: '壮' },
  { id: 5, name: '阿飞', role: '门将', shortName: '飞' },
  { id: 6, name: '阿杰', role: '队员', shortName: '杰' },
  { id: 7, name: '阿军', role: '队员', shortName: '军' },
  { id: 8, name: '阿辉', role: '队员', shortName: '辉' }
];

Page({
  data: {
    team: null,
    members: MOCK_MEMBERS
  },

  onLoad(options) {
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    const res = await api.getTeamList();
    const teams = res.data || [];
    const team = teams.find(t => t.id === Number(id)) || teams[0];
    if (team) {
      const idx = teams.indexOf(team);
      this.setData({
        team: {
          ...team,
          shortName: team.name.substring(0, 2),
          bgColor: COLORS[idx % COLORS.length]
        }
      });
      wx.setNavigationBarTitle({ title: team.name });
    }
  },

  onJoinTap() {
    wx.showModal({
      title: '申请加入',
      content: '已向队长发送申请，请等待审批',
      showCancel: false,
      success: () => {
        wx.showToast({ title: '申请已发送', icon: 'success' });
      }
    });
  },

  onShareTap() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.team ? `${this.data.team.name} 招募中！` : '来踢球',
      path: `/pages/team/detail?id=${this.data.team ? this.data.team.id : ''}`
    };
  }
});