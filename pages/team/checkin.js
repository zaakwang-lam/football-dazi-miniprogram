// pages/team/checkin.js
const util = require('../../utils/util.js');

const MOCK_MEMBERS = [
  { id: 1, name: '老王', shortName: '王', checked: true },
  { id: 2, name: '阿强', shortName: '强', checked: true },
  { id: 3, name: '小林', shortName: '林', checked: true },
  { id: 4, name: '大壮', shortName: '壮', checked: false },
  { id: 5, name: '阿飞', shortName: '飞', checked: false },
  { id: 6, name: '阿杰', shortName: '杰', checked: true },
  { id: 7, name: '阿军', shortName: '军', checked: false },
  { id: 8, name: '阿辉', shortName: '辉', checked: false }
];

Page({
  data: {
    today: '',
    location: { name: '天河体育中心', distance: 0 },
    checked: false,
    members: []
  },

  onLoad() {
    this.setData({
      today: util.formatTime(new Date(), 'YYYY-MM-DD') + ' ' + ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()],
      members: MOCK_MEMBERS
    });
    this.getLocation();
  },

  getLocation() {
    // 模拟定位
    this.setData({
      location: { name: '天河体育中心', distance: 87 }
    });
  },

  onCheckin() {
    if (this.data.checked) {
      wx.showToast({ title: '已打卡', icon: 'none' });
      return;
    }
    // 模拟 GPS 验证
    if (this.data.location.distance > 200) {
      return wx.showToast({ title: '距离场地太远，无法打卡', icon: 'none' });
    }
    this.setData({ checked: true });
    wx.showToast({ title: '打卡成功！', icon: 'success' });
  }
});