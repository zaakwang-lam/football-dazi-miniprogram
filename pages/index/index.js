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
    // 当前仅开发广州，城市选择器已移除
    banners: [],  // 2026-07-28 隐藏轮播，改为顶部固定 hero-banner（wxml 硬编码）
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
    // 取消滚动菜单后，只加载「进行中」（凑人+约战有效信息）
    const lfgRes = await Promise.allSettled([api.getLfgList()]);
    const lfgData = lfgRes[0].status === 'fulfilled' ? lfgRes[0].value.data?.list || [] : [];

    const TYPE_KEY = { sub: 'sub', war: 'war' };  // 取消 join 类型
    const TYPE_LABEL = { sub: '找人顶', war: '约战' };
    const lfgList = lfgData.map(item => ({
      ...item,
      typeKey: TYPE_KEY[item.type] || 'sub',
      typeLabel: TYPE_LABEL[item.type] || '凑人',
      teamName: item.title || item.publisher?.nickname || '招募中',
      time: this.formatTime(item.playTime)
    }));

    this.setData({ lfgList });
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

  onSearchTap() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  },

  onBannerTap(e) {
    // 2026-07-28: hero-banner 点击仅弹 toast，待运营位填充后再调跳转
    wx.showToast({ title: '一起踢球，一起FUNS', icon: 'none' });
  },

  onEntryTap(e) {
    const type = e.currentTarget.dataset.type;
    // tabBar 加回 凑人/约战：lfg/war 都是 tab 页 → switchTab
    const map = {
      book: '/pages/court/list',
      // 2026-07-28: tabBar 删了凑人/约战 tab，走 navigateTo
      lfg: '/pages/lfg/lfg',
      war: '/pages/war/war'
    };
    const dest = map[type];
    if (!dest) return;
    // 所有都走 navigateTo，因为凑人/约战已不在 tabBar
    wx.navigateTo({ url: dest });
  },

  onNearbyTap() {
    wx.navigateTo({ url: '/pages/nearby/nearby' });
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
