// pages/team/checkin.js
const util = require('../../utils/util.js');
const api = require('../../utils/api.js');

Page({
  data: {
    today: '',
    location: { name: '定位中...', distance: null },
    checked: false,
    members: [],
    attendCount: 0,
    teamId: null
  },

  onLoad(options) {
    const teamId = options.teamId || wx.getStorageSync('myTeamId') || null;
    this.setData({
      today: util.formatTime(new Date(), 'YYYY-MM-DD') + ' ' + ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()],
      teamId
    });
    this.loadMembers();
    this.getLocation();
  },

  async loadMembers() {
    const teamId = this.data.teamId;
    if (!teamId) {
      this.setData({ members: [] });
      return;
    }
    try {
      const res = await api.getTeamDetail(teamId);
      const list = (res.data?.memberList || []).map(m => ({
        id: m.id,
        name: m.nickname || '队员',
        shortName: (m.nickname || '队').slice(0, 1),
        checked: false
      }));
      this.setData({ members: list, attendCount: 0 });
    } catch (e) {
      console.error(e);
      this.setData({ members: [] });
    }
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: {
            name: '当前位置已获取',
            distance: null,
            longitude: res.longitude,
            latitude: res.latitude
          }
        });
      },
      fail: () => {
        this.setData({
          location: { name: '未获取到位置（仍可打卡）', distance: null }
        });
      }
    });
  },

  async onCheckin() {
    if (this.data.checked) {
      wx.showToast({ title: '已打卡', icon: 'none' });
      return;
    }
    if (!this.data.teamId) {
      return wx.showToast({ title: '未关联球队', icon: 'none' });
    }

    try {
      await api.checkin({
        teamId: this.data.teamId,
        longitude: this.data.location.longitude || null,
        latitude: this.data.location.latitude || null
      });
      const members = this.data.members.map(m => m);
      // 标记自己为已打卡（前端即时反馈）
      this.setData({
        checked: true,
        attendCount: this.data.attendCount + 1
      });
      wx.showToast({ title: '打卡成功！', icon: 'success' });
    } catch (e) {
      console.error(e);
    }
  }
});
