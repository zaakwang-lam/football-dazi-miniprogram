// pages/lfg/lfg.js
const api = require('../../utils/api.js');

const TAB_CONFIG = {
  sub: { type: '找人顶', icon: '🙋', actionText: '我要顶' },
  war: { type: '约战', icon: '⚔️', actionText: '接受约战' },
  join: { type: '凑局', icon: '👥', actionText: '加入队伍' }
};

Page({
  data: {
    activeTab: 'sub',
    tabLabels: { sub: '找人顶', war: '约战', join: '凑局' },
    list: []
  },

  onLoad(options) {
    if (options.tab && TAB_CONFIG[options.tab]) {
      this.setData({ activeTab: options.tab });
    }
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh());
  },

  async loadList() {
    const config = TAB_CONFIG[this.data.activeTab];
    const res = await api.getLfgList();

    // 根据当前 tab 过滤（模拟数据）
    const allList = res.data || [];
    const filtered = allList.filter(item => item.type === config.type);

    // 如果没有匹配的，补充 mock 数据使三个 tab 都有内容
    const typeKeyMap = { '找人顶': 'sub', '约战': 'war', '凑局': 'join' };
    const list = (filtered.length > 0 ? filtered : allList).map(item => ({
      ...item,
      typeKey: typeKeyMap[item.type] || 'sub',
      icon: config.icon,
      actionText: config.actionText
    }));

    this.setData({ list });
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    this.loadList();
  },

  onFilterTap(e) {
    const key = e.currentTarget.dataset.key;
    const labels = { distance: '距离', level: '水平', time: '时间', district: '区域' };
    wx.showActionSheet({
      itemList: ['全部', '1km内', '3km内', '5km内', '天河区', '越秀区', '海珠区', '番禺区'],
      success: () => {
        wx.showToast({ title: `已筛选${labels[key]}`, icon: 'none' });
      }
    });
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/lfg/detail?id=${id}` });
  },

  onActionTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认加入',
      content: '加入后将通过微信服务通知联系你，是否继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已报名！请等待联系', icon: 'success' });
        }
      }
    });
  },

  onPublishTap() {
    wx.navigateTo({ url: '/pages/lfg/publish' });
  },

  onShareAppMessage() {
    return {
      title: '缺人？来足球搭子凑一波！',
      path: '/pages/lfg/lfg'
    };
  }
});