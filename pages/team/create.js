// pages/team/create.js
const api = require('../../utils/api.js');

Page({
  data: {
    districts: ['天河区', '越秀区', '海珠区', '白云区', '番禺区', '黄埔区', '南沙区', '花都区'],
    form: {
      name: '',
      motto: '',
      district: '天河区',
      description: '',
      recruitment: true
    }
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  onDistrictSelect(e) {
    const d = e.currentTarget.dataset.d;
    this.setData({ 'form.district': d });
  },

  onSwitchChange(e) {
    this.setData({ 'form.recruitment': e.detail.value });
  },

  async onSubmit() {
    if (!this.data.form.name) {
      return wx.showToast({ title: '请输入球队名称', icon: 'none' });
    }
    try {
      const res = await api.createTeam(this.data.form);
      if (res.code === 0) {
        wx.setStorageSync('myTeamId', res.data.id);
        wx.showToast({ title: '创建成功！', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/team/team' }), 1500);
      }
    } catch (e) {
      console.error('创建球队失败:', e);
    }
  }
});