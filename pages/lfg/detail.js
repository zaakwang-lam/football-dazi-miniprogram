// pages/lfg/detail.js
const api = require('../../utils/api.js');

const TYPE_CONFIG = {
  sub: { icon: '🙋', cnName: '凑人', actionText: '我要加入', confirmTitle: '确认我要加入', confirmDesc: '队长会通过微信服务通知联系你' },
  war: { icon: '⚔️', cnName: '约战', actionText: '接受挑战', confirmTitle: '确认接受挑战', confirmDesc: '队长会通过微信服务通知联系你' }
};

Page({
  data: {
    detail: null,
    typeFromQuery: null,
    currentUserId: null
  },

  onLoad(options) {
    this.setData({ typeFromQuery: options.type || null });
    if (!options.id) {
      wx.showToast({ title: '缺少组队 ID', icon: 'none' });
      return;
    }
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    try {
      const res = await api.getLfgDetail(id);
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && res.message) || '详情为空');
      }
      const detail = res.data;
      const typeKey = detail.type || this.data.typeFromQuery || 'sub';
      const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.sub;
      const userInfo = wx.getStorageSync('userInfo');
      const currentUserId = userInfo?.id;
      const joined = !!(detail.joins && detail.joins.find(j => Number(j.userId) === Number(currentUserId)));
      this.setData({
        currentUserId,
        detail: {
          ...detail,
          typeKey,
          joined,
          icon: config.icon,
          typeLabel: config.cnName,
          actionText: config.actionText,
          confirmTitle: config.confirmTitle,
          confirmDesc: config.confirmDesc,
          teamName: detail.title || detail.publisher?.nickname || '未命名',
          desc: detail.description || '',
          contact: detail.contact || '微信同名',
          status: detail.status === 'open' ? '招募中' : (detail.status === 'full' ? '已满' : '已关闭'),
          matchTypesText: (detail.matchTypes && detail.matchTypes.length > 0)
            ? detail.matchTypes.join(' / ')
            : '不限',
          publishTime: this.formatPublishTime(detail.createdAt),
          time: this.formatPlayTime(detail.playTime) || '待定',
          need: detail.needCount || 0,
          joinedCount: detail.joinedCount || 0
        }
      });
      wx.setNavigationBarTitle({
        title: config.cnName + (detail.publisher?.nickname ? ` · ${detail.publisher.nickname}` : '')
      });
    } catch (e) {
      console.error('加载详情失败:', e);
      const msg = (e && e.message) || '加载失败';
      wx.showToast({
        title: msg.length > 20 ? msg.slice(0, 20) + '…' : msg,
        icon: 'none',
        duration: 3000
      });
    }
  },

  onContactTap() {
    const contact = this.data.detail?.contact || '';
    if (!contact) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: contact,
      success: () => wx.showToast({ title: '已复制联系方式', icon: 'success' })
    });
  },

  formatPublishTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  formatPlayTime(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (isToday) return `今天 ${hm}`;
    if (isTomorrow) return `明天 ${hm}`;
    return `${date.getMonth() + 1}月${date.getDate()}日 ${hm}`;
  },

  onJoinTap() {
    const id = this.data.detail?.id;
    if (!id) return;
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 800);
      return;
    }
    const detail = this.data.detail;
    wx.showModal({
      title: detail.confirmTitle || `确认${detail.actionText || '参与'}`,
      content: detail.confirmDesc || '队长会通过微信服务通知联系你',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.joinLfg(id);
            wx.showToast({ title: `已${detail.actionText || '参与'}成功！`, icon: 'success' });
            setTimeout(() => this.loadDetail(id), 1000);
          } catch (e) {
            console.error('[joinLfg]', e);
            const errMsg = (e && e.message) || '操作失败';
            wx.showToast({
              title: errMsg.length > 20 ? errMsg.substring(0, 20) + '…' : errMsg,
              icon: 'none',
              duration: 3000
            });
          }
        }
      }
    });
  },

  onQuitTap() {
    const id = this.data.detail?.id;
    if (!id) return;
    wx.showModal({
      title: '确认退出',
      content: '退出后将不再收到该组队的通知',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.quitLfg(id);
            wx.showToast({ title: '已退出组队', icon: 'success' });
            setTimeout(() => this.loadDetail(id), 1000);
          } catch (e) {
            console.error(e);
            wx.showToast({ title: e.message || '退出失败', icon: 'none' });
          }
        }
      }
    });
  },

  onShareAppMessage() {
    const d = this.data.detail;
    return {
      title: d ? `${d.teamName} ${d.typeLabel === '凑人' ? '缺人' : '约战'}，快来！` : '来足球搭子',
      path: `/pages/lfg/detail?id=${d ? d.id : ''}`
    };
  }
});
