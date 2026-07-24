// pages/index/index.js
const app = getApp();
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
    city: '广州',
    banners: [
      { id: 1, title: '夜场8折起', sub: '广州业余球员专享', color1: '#FF6B00', color2: '#FF8C42' },
      { id: 2, title: '新人首单立减20', sub: '加入球队再领10元', color1: '#007AFF', color2: '#4FACFE' },
      { id: 3, title: '队长招募', sub: '免半年 SaaS 服务费', color1: '#2ECC71', color2: '#58D68D' }
    ],
    courts: [],
    teams: [],
    lfgList: []
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
    const promises = [api.getNearbyCourts(), api.getTeamList(), api.getLfgList()];
    const [courtsRes, teamsRes, lfgRes] = await Promise.allSettled(promises);

    const courts = (courtsRes.status === 'fulfilled' ? courtsRes.value.data?.list || [] : []).map(c => ({
      ...c,
      freeSlots: c.freeSlots || []
    }));

    const teams = (teamsRes.status === 'fulfilled' ? teamsRes.value.data?.list || [] : []).map((t, i) => ({
      ...t,
      shortName: t.name.substring(0, 2),
      bgColor: COLORS[i % COLORS.length]
    }));

    const TYPE_KEY = { '找人顶': 'sub', '约战': 'war', '凑局': 'join' };
    const lfgList = (lfgRes.status === 'fulfilled' ? lfgRes.value.data?.list || [] : []).map(item => ({
      ...item,
      typeKey: TYPE_KEY[item.type] || 'sub',
      teamName: item.publisher?.nickname || item.title || '招募中',
      time: this.formatTime(item.playTime)
    }));

    this.setData({ courts, teams, lfgList });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / 86400000);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    if (diffDays === 0) return `今晚 ${hours}:${mins}`;
    if (diffDays === 1) return `明晚 ${hours}:${mins}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${hours}:${mins}`;
  },

  onCityTap() {
    wx.showActionSheet({
      itemList: ['广州', '深圳', '佛山', '东莞'],
      success: (res) => {
        const cities = ['广州', '深圳', '佛山', '东莞'];
        this.setData({ city: cities[res.tapIndex] });
        wx.showToast({ title: `已切换到${cities[res.tapIndex]}`, icon: 'none' });
      }
    });
  },

  onSearchTap() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  },

  onBannerTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: `Banner ${id}`, icon: 'none' });
  },

  onEntryTap(e) {
    const type = e.currentTarget.dataset.type;
    const map = {
      book: '/pages/court/list',
      lfg: '/pages/lfg/lfg',
      war: '/pages/lfg/lfg?tab=war',
      event: '/pages/lfg/lfg?tab=join'
    };
    if (map[type].includes('/lfg/lfg')) {
      wx.switchTab({ url: '/pages/lfg/lfg' });
    } else {
      wx.navigateTo({ url: map[type] });
    }
  },

  onMoreCourt() {
    wx.navigateTo({ url: '/pages/court/list' });
  },

  onCourtTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/court/detail?id=${id}` });
  },

  onMoreTeam() {
    wx.switchTab({ url: '/pages/team/team' });
  },

  onTeamTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/team/detail?id=${id}` });
  },

  onLfgTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/lfg/detail?id=${id}` });
  },

  onShareAppMessage() {
    return {
      title: '足球搭子 - 广州业余足球一站式平台',
      path: '/pages/index/index'
    };
  }
});