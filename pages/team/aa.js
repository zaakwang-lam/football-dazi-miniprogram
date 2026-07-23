// pages/team/aa.js
const MOCK_MEMBERS = [
  { id: 1, name: '老王', shortName: '王', paid: true },
  { id: 2, name: '阿强', shortName: '强', paid: true },
  { id: 3, name: '小林', shortName: '林', paid: true },
  { id: 4, name: '大壮', shortName: '壮', paid: false },
  { id: 5, name: '阿飞', shortName: '飞', paid: false },
  { id: 6, name: '阿杰', shortName: '杰', paid: true },
  { id: 7, name: '阿军', shortName: '军', paid: false },
  { id: 8, name: '阿辉', shortName: '辉', paid: false }
];

Page({
  data: {
    form: {
      amount: 100,
      desc: '本周场地费 AA',
      paidCount: 4
    },
    members: MOCK_MEMBERS,
    totalAmount: 0
  },

  onLoad() {
    this.calcTotal();
  },

  calcTotal() {
    const total = this.data.members.length * this.data.form.amount;
    this.setData({ totalAmount: total });
  },

  onAmountChange(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const newAmount = Math.max(10, Math.min(1000, this.data.form.amount + delta));
    this.setData({ 'form.amount': newAmount });
    this.calcTotal();
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  onSubmit() {
    wx.showModal({
      title: '确认发起 AA',
      content: `将向 ${this.data.members.length - this.data.form.paidCount} 位队员发送收款通知`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已发送收款通知', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      }
    });
  }
});