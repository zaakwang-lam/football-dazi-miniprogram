// pages/lfg/lfg.js
const api = require('../../utils/api.js');

// 中文 → 英文 key (用于 wxss 类名 + tab 标识)
const TAB_CONFIG = {
  sub: { type: 'sub', icon: '🙋', actionText: '我要顶' },     // 凑人（原找人顶，个人顶个人）
  war: { type: 'war', icon: '⚔️', actionText: '接受约战' }    // 约战（球队vs球队）
};
const TYPE_KEY = {
  '凑人': 'sub',
  '约战': 'war'
};

Page({
  data: {
    activeTab: 'sub',
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
    try {
      const config = TAB_CONFIG[this.data.activeTab];
      const res = await api.getLfgList({ type: config.type });
      const list = (res.data?.list || []).map(item => {
        const typeKey = TYPE_KEY[item.type] || 'sub';
        const cfg = TAB_CONFIG[typeKey] || TAB_CONFIG.sub;
        return {
          ...item,
          typeKey,
          icon: cfg.icon,
          actionText: cfg.actionText,
          teamName: item.publisher?.nickname || item.title,
          publishTime: this.formatTime(item.createdAt),
          level: item.level || '业余',
          desc: item.description || ''
        };
      });
      this.setData({ list });
    } catch (e) {
      console.error('加载凑人失败:', e);
      this.setData({ list: [] });
    }
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return Math.floor(diff / 86400) + '天前';
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
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.joinLfg(id);
            wx.showToast({ title: '已报名！请等待联系', icon: 'success' });
          } catch (e) {
            console.error(e);
          }
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