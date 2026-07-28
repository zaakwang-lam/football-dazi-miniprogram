// pages/lfg/lfg.js
// 凑人 tab：仅显示凑人（type='sub'），参与者是个人
const api = require('../../utils/api.js');

Page({
  data: {
    list: [],
    loaded: false
  },

  onLoad() {
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
      const res = await api.getLfgList({ type: 'sub' });
      const list = (res.data?.list || []).map(item => ({
        ...item,
        typeKey: 'sub',
        teamName: item.publisher?.nickname || item.title || '广州老炮',
        publishTime: this.formatTime(item.createdAt),
        level: item.level || '业余',
        desc: item.description || '',
        need: item.needCount,
        // 2026-07-28 新增字段格式化
        matchTypesText: (item.matchTypes && item.matchTypes.length > 0)
          ? item.matchTypes.join('/')
          : ''
      }));
      this.setData({ list, loaded: true });
    } catch (e) {
      console.error('加载凑人失败:', e);
      this.setData({ list: [], loaded: true });
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