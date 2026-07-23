// pages/court/list.js
const api = require('../../utils/api.js');

const COLOR_PAIRS = [
  ['#4FACFE', '#00F2FE'],
  ['#FF6B00', '#FF8C42'],
  ['#2ECC71', '#58D68D'],
  ['#9B59B6', '#BE7BDB'],
  ['#FFB800', '#FFD75E']
];

Page({
  data: {
    filters: { type: 'all' },
    courts: []
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    const res = await api.getNearbyCourts();
    const courts = (res.data || []).map((c, i) => ({
      ...c,
      bgColor1: COLOR_PAIRS[i % COLOR_PAIRS.length][0],
      bgColor2: COLOR_PAIRS[i % COLOR_PAIRS.length][1]
    }));
    this.setData({ courts });
    this.applyFilters();
  },

  applyFilters() {
    const { type } = this.data.filters;
    let courts = this.data.courts;
    if (type !== 'all') {
      courts = courts.filter(c => c.type === type);
    }
    this.setData({ courts });
  },

  onFilterTap(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.currentTarget.dataset.val;
    this.setData({ [`filters.${key}`]: val });
    this.applyFilters();
  },

  onSortTap() {
    wx.showActionSheet({
      itemList: ['距离最近', '价格最低', '评分最高'],
      success: () => {
        wx.showToast({ title: '已应用排序', icon: 'none' });
      }
    });
  },

  onCourtTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/court/detail?id=${id}` });
  }
});