// pages/war/war.js
// 约战 tab：仅显示约战（type='war'），球队对球队
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
      const res = await api.getLfgList({ type: 'war' });
      const list = (res.data?.list || []).map(item => ({
        ...item,
        typeKey: 'war',
        teamName: item.publisher?.nickname || item.title || '海珠飓风队',
        publishTime: this.formatTime(item.createdAt),
        level: item.level || '业余',
        desc: item.description || '',
        time: this.formatPlayTime(item.playTime)
      }));
      this.setData({ list, loaded: true });
    } catch (e) {
      console.error('加载约战失败:', e);
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

  formatPlayTime(dateStr) {
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
    wx.navigateTo({ url: `/pages/war/detail?id=${id}` });
  },

  onActionTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '接受约战',
      content: '确认挑战对方球队？挑战请求将通过微信服务通知联系。',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.joinLfg(id);
            wx.showToast({ title: '已发起挑战！', icon: 'success' });
          } catch (e) {
            console.error(e);
          }
        }
      }
    });
  },

  onPublishTap() {
    wx.navigateTo({ url: '/pages/war/publish' });
  },

  onShareAppMessage() {
    return {
      title: '来足球搭子约一队！',
      path: '/pages/war/war'
    };
  }
});