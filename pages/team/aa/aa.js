// pages/team/aa/aa.js
const api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    teamId: null,
    userId: null,
    loaded: false,
    aaList: [],
    current: null,
    status: '',
    itemIncludedCount: 0
  },

  onLoad(options) {
    this.setData({
      teamId: options.teamId,
      userId: (app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || null
    });
    this.loadList();
  },

  async loadList() {
    try {
      const res = await api.listAa(this.data.teamId);
      if (res.code !== 0) throw new Error(res.message || '加载失败');
      const list = res.data.list || [];
      const draft = list.find(a => a.status === 'draft');
      const collecting = list.find(a => a.status === 'collecting');
      const current = draft || collecting || list[0] || null;
      this.setData({
        aaList: list,
        current,
        status: current ? current.status : '',
        loaded: true,
        itemIncludedCount: current ? (current.items || []).filter(i => i.included).length : 0
      });
    } catch (e) {
      console.error(e);
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
      this.setData({ loaded: true });
    }
  },

  async onOpenHistory(e) {
    const aaId = e.currentTarget.dataset.id;
    try {
      const res = await api.getAa(this.data.teamId, aaId);
      if (res.code !== 0) throw new Error(res.message || '加载失败');
      const current = res.data;
      this.setData({
        current,
        status: current.status,
        itemIncludedCount: (current.items || []).filter(i => i.included).length
      });
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onBack() {
    this.setData({ current: null, status: '' });
    this.loadList();
  },

  async onCreateDraft() {
    // 默认勾选球队所有成员，先拉一次成员列表
    try {
      const res = await api.getTeamDetail(this.data.teamId);
      const team = res.data;
      const members = (team.memberList || []).map(m => ({
        userId: m.id,
        displayName: m.nickname || '队员',
        amount: 0,
        included: true
      }));
      if (members.length === 0) {
        return wx.showToast({ title: '球队暂无成员', icon: 'none' });
      }
      const totalAmount = 0;
      const r = await api.createAa({
        teamId: this.data.teamId,
        title: `队费 AA ${new Date().toLocaleDateString()}`,
        remark: '',
        items: members,
        totalAmount
      });
      if (r.code !== 0) throw new Error(r.message || '创建失败');
      wx.showToast({ title: '草稿已创建', icon: 'success' });
      this.loadList();
    } catch (e) {
      wx.showToast({ title: e.message || '创建失败', icon: 'none' });
    }
  },

  onToggleItem(e) {
    const idx = e.currentTarget.dataset.idx;
    const items = (this.data.current.items || []).map((it, i) =>
      i === idx ? { ...it, included: !it.included } : it
    );
    this.setData({
      'current.items': items,
      itemIncludedCount: items.filter(i => i.included).length
    });
  },

  onAmountInput(e) {
    const idx = e.currentTarget.dataset.idx;
    const value = Number(e.detail.value) || 0;
    const items = (this.data.current.items || []).map((it, i) =>
      i === idx ? { ...it, amount: value } : it
    );
    const totalAmount = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    this.setData({
      'current.items': items,
      'current.totalAmount': totalAmount,
      'current.perAmount': items.filter(i => i.included).length > 0
        ? totalAmount / items.filter(i => i.included).length
        : 0
    });
  },

  onEvenSplit() {
    const items = (this.data.current.items || []).filter(i => i.included);
    if (items.length === 0) {
      return wx.showToast({ title: '至少勾选一人', icon: 'none' });
    }
    const totalAmount = Number(this.data.current.totalAmount) || 0;
    const perAmount = Math.round((totalAmount / items.length) * 100) / 100;
    const newItems = this.data.current.items.map(it =>
      it.included ? { ...it, amount: perAmount } : { ...it, amount: 0 }
    );
    this.setData({
      'current.items': newItems
    });
    wx.showToast({ title: `已按 ¥${perAmount}/人 平摊`, icon: 'success' });
  },

  async onSaveDraft() {
    const items = (this.data.current.items || []).filter(i => i.included);
    if (items.length === 0) {
      return wx.showToast({ title: '至少勾选一人', icon: 'none' });
    }
    try {
      const totalAmount = this.data.current.totalAmount;
      const r = await api.updateAa(this.data.teamId, this.data.current.id, {
        title: this.data.current.title,
        remark: this.data.current.remark,
        items,
        totalAmount
      });
      if (r.code !== 0) throw new Error(r.message || '保存失败');
      wx.showToast({ title: '草稿已保存', icon: 'success' });
      this.loadList();
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    }
  },

  async onInitiate() {
    const items = (this.data.current.items || []).filter(i => i.included);
    if (items.length === 0) {
      return wx.showToast({ title: '至少勾选一人', icon: 'none' });
    }
    wx.showModal({
      title: '发起收款',
      content: '发起前请确认比赛已结束。确认发起后，明细将锁定无法修改。',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const r = await api.initiateAa(this.data.teamId, this.data.current.id, { matchEnded: true });
          if (r.code !== 0) throw new Error(r.message || '发起失败');
          wx.showToast({ title: '已发起收款', icon: 'success' });
          this.loadList();
        } catch (e) {
          wx.showToast({ title: e.message || '发起失败', icon: 'none' });
        }
      }
    });
  },

  async onMarkPaid(e) {
    const itemId = e.currentTarget.dataset.id;
    try {
      const r = await api.markAaPaid(this.data.teamId, this.data.current.id, itemId);
      if (r.code !== 0) throw new Error(r.message || '标记失败');
      wx.showToast({ title: '已标记已付', icon: 'success' });
      // 刷新当前 AA
      const res = await api.getAa(this.data.teamId, this.data.current.id);
      if (res.code === 0) {
        this.setData({
          current: res.data,
          itemIncludedCount: (res.data.items || []).filter(i => i.included).length
        });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '标记失败', icon: 'none' });
    }
  }
});
