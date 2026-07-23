// pages/index/index.js
const app = getApp();
const api = require('../../utils/api.js');

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
    // 每次进入页面刷新
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    // 并行加载所有数据
    const [courtsRes, teamsRes, lfgRes] = await Promise.all([
      api.getNearbyCourts(),
      api.getTeamList(),
      api.getLfgList()
    ]);

    // 处理球队头像颜色
    const colors = [
      'linear-gradient(135deg, #FF6B00, #FF8C42)',
      'linear-gradient(135deg, #007AFF, #4FACFE)',
      'linear-gradient(135deg, #2ECC71, #58D68D)',
      'linear-gradient(135deg, #9B59B6, #BE7BDB)',
      'linear-gradient(135deg, #FFB800, #FFD75E)'
    ];

    const teams = (teamsRes.data || []).map((t, i) => ({
      ...t,
      shortName: t.name.substring(0, 2),
      bgColor: colors[i % colors.length]
    }));

    // 处理凑人 typeKey (英文 key 用于 wxss 类名映射)
    const typeKeyMap = { '找人顶': 'sub', '约战': 'war', '凑局': 'join' };
    const lfgList = (lfgRes.data || []).map(item => ({
      ...item,
      typeKey: typeKeyMap[item.type] || 'sub'
    }));

    this.setData({
      courts: courtsRes.data || [],
      teams,
      lfgList
    });
  },

  // 城市选择
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

  // 搜索
  onSearchTap() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  },

  // Banner 点击
  onBannerTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: `Banner ${id}`, icon: 'none' });
  },

  // 4 入口
  onEntryTap(e) {
    const type = e.currentTarget.dataset.type;
    const map = {
      book: '/pages/court/list',
      lfg: '/pages/lfg/lfg',
      war: '/pages/lfg/lfg?tab=war',
      event: '/pages/lfg/lfg?tab=event'
    };
    wx.switchTab({
      url: map[type].includes('/lfg') ? '/pages/lfg/lfg' : map[type],
      fail: () => {
        wx.navigateTo({ url: map[type] });
      }
    });
  },

  // 场地更多
  onMoreCourt() {
    wx.navigateTo({ url: '/pages/court/list' });
  },

  // 场地详情
  onCourtTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/court/detail?id=${id}` });
  },

  // 球队更多
  onMoreTeam() {
    wx.switchTab({ url: '/pages/team/team' });
  },

  // 球队详情
  onTeamTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/team/detail?id=${id}` });
  },

  // 凑人详情
  onLfgTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/lfg/detail?id=${id}` });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '足球搭子 - 广州业余足球一站式平台',
      path: '/pages/index/index'
    };
  }
});