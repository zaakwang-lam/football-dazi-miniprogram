// pages/lfg/detail.js
const api = require('../../utils/api.js');
const { dialPhone } = require('../../utils/util.js');

const TYPE_CONFIG = {
  sub: { icon: '🙋', cnName: '凑人', actionText: '我要加入', confirmTitle: '报名加入', confirmDesc: '请填写姓名和联系方式，提交后由发起方在小程序确认' },
  war: { icon: '⚔️', cnName: '约战', actionText: '接受挑战', confirmTitle: '报名应战', confirmDesc: '请填写参赛队伍和联系方式，提交后由发起方在小程序确认' }
};

const JOIN_STATUS = {
  pending: { label: '待确认', cls: 'pending' },
  confirmed: { label: '已确认', cls: 'success' },
  rejected: { label: '已拒绝', cls: 'canceled' }
};

Page({
  data: {
    detail: null,
    typeFromQuery: null,
    currentUserId: null,
    autoJoin: false,
    showJoinForm: false,
    joinFormTitle: '填写报名信息',
    myTeams: [],
    teamNames: [],
    joinForm: {
      contactName: '',
      contactPhone: '',
      teamName: '',
      teamId: null,
      teamIndex: 0
    }
  },

  onLoad(options) {
    this.setData({
      typeFromQuery: options.type || null,
      autoJoin: options.join === '1'
    });
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
      const userInfo = wx.getStorageSync('userInfo') || {};
      const currentUserId = userInfo.id;
      const myJoin = (detail.joins || []).find(j => Number(j.userId) === Number(currentUserId));
      const myJoinStatus = detail.myJoinStatus || myJoin?.status || '';
      const joined = !!(myJoin && myJoin.status !== 'rejected');
      const isPublisher = !!(detail.isPublisher || (currentUserId && Number(detail.publisher?.id || detail.userId) === Number(currentUserId)));
      const joinsDisplay = (detail.joins || []).map(j => {
        const st = JOIN_STATUS[j.status] || JOIN_STATUS.pending;
        return {
          ...j,
          displayName: j.displayName || j.teamName || j.contactName || j.nickname || '未命名',
          statusLabel: st.label,
          statusCls: st.cls
        };
      });
      this.setData({
        currentUserId,
        detail: {
          ...detail,
          typeKey,
          joined,
          myJoinStatus,
          isPublisher,
          joinsDisplay,
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
      if (this.data.autoJoin && !joined && !isPublisher) {
        this.setData({ autoJoin: false });
        this.onJoinTap();
      }
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
    dialPhone(this.data.detail?.contact);
  },

  onCallJoiner(e) {
    dialPhone(e.currentTarget.dataset.phone);
  },

  onConfirmJoin(e) {
    const joinId = e.currentTarget.dataset.id;
    const id = this.data.detail?.id;
    if (!id || !joinId) return;
    wx.showModal({
      title: '确认报名',
      content: '确认后对方将加入本场活动，人数计入已报名。',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.confirmLfgJoin(id, joinId);
          wx.showToast({ title: '已确认', icon: 'success' });
          this.loadDetail(id);
        } catch (err) {
          wx.showToast({ title: err.message || '确认失败', icon: 'none' });
        }
      }
    });
  },

  onRejectJoin(e) {
    const joinId = e.currentTarget.dataset.id;
    const id = this.data.detail?.id;
    if (!id || !joinId) return;
    wx.showModal({
      title: '拒绝报名',
      content: '确认拒绝该报名？对方可再次申请。',
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.rejectLfgJoin(id, joinId);
          wx.showToast({ title: '已拒绝', icon: 'success' });
          this.loadDetail(id);
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
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

  async onJoinTap() {
    const id = this.data.detail?.id;
    if (!id) return;
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 800);
      return;
    }
    const userInfo = wx.getStorageSync('userInfo') || {};
    const joinForm = {
      contactName: userInfo.nickname || '',
      contactPhone: userInfo.phone || '',
      teamName: '',
      teamId: null,
      teamIndex: 0
    };
    let myTeams = [];
    let teamNames = [];
    if (this.data.detail.typeKey === 'war') {
      try {
        const res = await api.getMyTeams();
        myTeams = res.data?.list || [];
        teamNames = myTeams.map(t => t.name);
        if (myTeams.length) {
          joinForm.teamName = myTeams[0].name;
          joinForm.teamId = myTeams[0].id;
        }
      } catch (e) {
        console.warn('加载我的球队失败', e);
      }
    }
    this.setData({
      showJoinForm: true,
      joinFormTitle: this.data.detail.confirmTitle || '填写报名信息',
      joinForm,
      myTeams,
      teamNames
    });
  },

  onCloseJoin() {
    this.setData({ showJoinForm: false });
  },

  noop() {},

  onJoinName(e) {
    this.setData({ 'joinForm.contactName': (e.detail.value || '').trim() });
  },

  onJoinPhone(e) {
    this.setData({ 'joinForm.contactPhone': (e.detail.value || '').trim() });
  },

  onJoinTeamName(e) {
    this.setData({ 'joinForm.teamName': (e.detail.value || '').trim() });
  },

  onJoinTeamChange(e) {
    const idx = Number(e.detail.value) || 0;
    const team = this.data.myTeams[idx];
    if (!team) return;
    this.setData({
      'joinForm.teamIndex': idx,
      'joinForm.teamName': team.name,
      'joinForm.teamId': team.id
    });
  },

  async onSubmitJoin() {
    const id = this.data.detail?.id;
    if (!id) return;
    const f = this.data.joinForm || {};
    const phone = String(f.contactPhone || '').trim();
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请填写11位手机号', icon: 'none' });
      return;
    }
    const isWar = this.data.detail.typeKey === 'war';
    if (isWar && !String(f.teamName || '').trim()) {
      wx.showToast({ title: '请填写参赛队伍', icon: 'none' });
      return;
    }
    if (!isWar && !String(f.contactName || '').trim()) {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    try {
      await api.joinLfg(id, {
        contactName: String(f.contactName || '').trim(),
        contactPhone: phone,
        teamName: String(f.teamName || '').trim(),
        teamId: f.teamId || null
      });
      this.setData({ showJoinForm: false });
      wx.showToast({ title: '已提交，待确认', icon: 'success' });
      setTimeout(() => this.loadDetail(id), 800);
    } catch (e) {
      console.error('[joinLfg]', e);
      const errMsg = (e && e.message) || '操作失败';
      wx.showToast({
        title: errMsg.length > 20 ? errMsg.substring(0, 20) + '…' : errMsg,
        icon: 'none',
        duration: 3000
      });
    }
  },

  onQuitTap() {
    const id = this.data.detail?.id;
    if (!id) return;
    wx.showModal({
      title: '确认退出',
      content: this.data.detail?.myJoinStatus === 'pending' ? '取消后需重新提交报名' : '退出后将不再参加该组队',
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
      title: d ? `${d.teamName} ${d.typeLabel === '凑人' ? '缺人' : '约战'}，快来！` : '来一起搭球',
      path: `/pages/lfg/detail?id=${d ? d.id : ''}`
    };
  }
});
