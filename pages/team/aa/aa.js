// pages/team/aa/aa.js — 队费 AA：队长填总额并勾选队员，直接微信支付
const api = require('../../../utils/api.js');
const app = getApp();

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

Page({
  data: {
    teamId: null,
    userId: null,
    isCaptain: false,
    loaded: false,
    mode: 'list',
    aaList: [],
    current: null,
    members: [],
    totalInput: '',
    perText: '0.00',
    selectedCount: 0,
    paying: false
  },

  onLoad(options) {
    const user = (app.globalData && app.globalData.userInfo) || wx.getStorageSync('userInfo') || {};
    this.setData({
      teamId: options.teamId,
      userId: user.id || null
    });
    this.bootstrap();
  },

  async bootstrap() {
    await Promise.all([this.loadTeam(), this.loadList()]);
    this.setData({ loaded: true });
  },

  async loadTeam() {
    try {
      const res = await api.getTeamDetail(this.data.teamId);
      const team = res.data || {};
      const members = (team.memberList || []).map((m) => ({
        userId: m.id,
        displayName: m.nickname || '队员',
        initial: String(m.nickname || '队').slice(0, 1),
        included: true
      }));
      this.setData({
        isCaptain: !!team.isCaptain,
        members,
        selectedCount: members.length,
        userId: this.data.userId || (app.globalData.userInfo && app.globalData.userInfo.id) || null
      });
      this.refreshPer();
    } catch (e) {
      wx.showToast({ title: e.message || '加载队员失败', icon: 'none' });
    }
  },

  async loadList() {
    try {
      const res = await api.listAa(this.data.teamId);
      if (res.code !== 0) throw new Error(res.message || '加载失败');
      const list = (res.data.list || []).map((a) => ({
        ...a,
        statusText: a.status === 'collecting' ? '收款中' : a.status === 'done' ? '已完成' : '草稿'
      }));
      this.setData({ aaList: list });
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  refreshPer() {
    const n = (this.data.members || []).filter((m) => m.included).length;
    const total = Number(this.data.totalInput);
    const per = n > 0 && total > 0 ? (total / n).toFixed(2) : '0.00';
    this.setData({ selectedCount: n, perText: per });
  },

  onStart() {
    if (!this.data.isCaptain) return wx.showToast({ title: '仅队长可发起', icon: 'none' });
    if (!this.data.members.length) return wx.showToast({ title: '球队暂无成员', icon: 'none' });
    this.setData({ mode: 'create' });
  },

  onBackList() {
    this.setData({ mode: 'list', current: null });
    this.loadList();
  },

  onToggleMember(e) {
    const id = Number(e.currentTarget.dataset.id);
    const members = (this.data.members || []).map((m) => (
      Number(m.userId) === id ? { ...m, included: !m.included } : m
    ));
    this.setData({ members });
    this.refreshPer();
  },

  onTotalInput(e) {
    const raw = String(e.detail.value || '').replace(/[^\d.]/g, '');
    this.setData({ totalInput: raw });
    this.refreshPer();
  },

  async onSubmit() {
    const ids = (this.data.members || []).filter((m) => m.included).map((m) => m.userId);
    const total = round2(this.data.totalInput);
    if (!ids.length) return wx.showToast({ title: '请至少勾选一人', icon: 'none' });
    if (!(total > 0)) return wx.showToast({ title: '请填写总金额', icon: 'none' });
    try {
      const r = await api.createAa({
        teamId: this.data.teamId,
        title: `队费 AA ${new Date().toLocaleDateString()}`,
        totalAmount: total,
        userIds: ids
      });
      if (r.code !== 0) throw new Error(r.message || '发起失败');
      wx.showToast({ title: '已发起，请队员支付', icon: 'success' });
      await this.openDetail(r.data.id);
    } catch (e) {
      wx.showToast({ title: e.message || '发起失败', icon: 'none' });
    }
  },

  async onOpenHistory(e) {
    await this.openDetail(e.currentTarget.dataset.id);
  },

  async openDetail(aaId) {
    try {
      const res = await api.getAa(this.data.teamId, aaId);
      if (res.code !== 0) throw new Error(res.message || '加载失败');
      const current = res.data;
      const myId = Number(this.data.userId);
      const items = (current.items || []).map((it) => ({
        ...it,
        initial: String(it.displayName || '队').slice(0, 1),
        mine: Number(it.userId) === myId
      }));
      const mine = items.find((it) => it.mine && it.included);
      this.setData({
        mode: 'detail',
        current: { ...current, items },
        myUnpaid: !!(mine && mine.payStatus !== 'paid' && current.status === 'collecting')
      });
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onPay() {
    if (this.data.paying) return;
    const current = this.data.current;
    if (!current) return;
    this.setData({ paying: true });
    api.payAa(this.data.teamId, current.id, {}).then((r) => {
      const p = (r.data && r.data.payParams) || {};
      wx.requestPayment({
        timeStamp: String(p.timeStamp || ''),
        nonceStr: p.nonceStr,
        package: p.package,
        signType: p.signType || 'MD5',
        paySign: p.paySign,
        success: () => {
          wx.showToast({ title: '支付成功', icon: 'success' });
          setTimeout(() => this.openDetail(current.id), 600);
        },
        fail: (err) => {
          const msg = (err && err.errMsg) || '';
          if (/cancel/.test(msg)) wx.showToast({ title: '已取消支付', icon: 'none' });
          else wx.showToast({ title: '支付未完成', icon: 'none' });
        },
        complete: () => this.setData({ paying: false })
      });
    }).catch((e) => {
      this.setData({ paying: false });
      wx.showToast({ title: e.message || '无法发起支付', icon: 'none' });
    });
  }
});
