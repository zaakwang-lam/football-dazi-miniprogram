// pages/team/create.js
const api = require('../../utils/api.js');
const REGION = require('../../utils/region-data.js');

const PROVINCES = Object.keys(REGION);
function citiesOf(province) {
  return province && REGION[province] ? Object.keys(REGION[province]) : [];
}
function districtsOf(province, city) {
  return (province && city && REGION[province] && REGION[province][city]) ? REGION[province][city] : [];
}

Page({
  data: {
    provinces: PROVINCES,
    cities: citiesOf('广东省'),
    districts: districtsOf('广东省', '广州市'),
    provinceIndex: PROVINCES.indexOf('广东省') >= 0 ? PROVINCES.indexOf('广东省') : 0,
    cityIndex: 0,
    districtIndex: -1,
    logoLocal: '',
    form: {
      name: '',
      motto: '',
      province: '广东省',
      city: '广州市',
      district: '',
      regionText: '',
      description: '',
      recruitment: true
    }
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  onProvinceChange(e) {
    const idx = Number(e.detail.value);
    const province = this.data.provinces[idx] || '';
    const cities = citiesOf(province);
    const city = cities[0] || '';
    const districts = districtsOf(province, city);
    this.setData({
      provinceIndex: idx,
      cityIndex: 0,
      districtIndex: -1,
      cities,
      districts,
      'form.province': province,
      'form.city': city,
      'form.district': '',
      'form.regionText': province && city ? `${province} ${city}` : ''
    });
  },

  onCityChange(e) {
    const idx = Number(e.detail.value);
    const province = this.data.form.province || '';
    const city = (this.data.cities || [])[idx] || '';
    const districts = districtsOf(province, city);
    this.setData({
      cityIndex: idx,
      districtIndex: -1,
      districts,
      'form.city': city,
      'form.district': '',
      'form.regionText': province && city ? `${province} ${city}` : ''
    });
  },

  onDistrictChange(e) {
    const idx = Number(e.detail.value);
    const province = this.data.form.province || '';
    const city = this.data.form.city || '';
    const district = (this.data.districts || [])[idx] || '';
    this.setData({
      districtIndex: idx,
      'form.district': district,
      'form.regionText': [province, city, district].filter(Boolean).join(' ')
    });
  },

  onSwitchChange(e) {
    this.setData({ 'form.recruitment': e.detail.value });
  },

  onChooseLogo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (path) this.setData({ logoLocal: path });
      }
    });
  },

  onClearLogo() { this.setData({ logoLocal: '' }); },

  async onSubmit() {
    const f = this.data.form;
    if (!f.name) return wx.showToast({ title: '请输入球队名称', icon: 'none' });
    if (!f.province || !f.city || !f.district) {
      return wx.showToast({ title: '请选择省 / 市 / 区', icon: 'none' });
    }
    const regionText = f.regionText || [f.province, f.city, f.district].filter(Boolean).join(' ');
    try {
      const res = await api.createTeam({
        name: f.name,
        motto: f.motto,
        province: f.province,
        city: f.city,
        district: regionText,
        description: f.description || f.desc || '',
        recruitment: f.recruitment
      });
      if (res.code === 0) {
        const teamId = res.data.id;
        wx.setStorageSync('myTeamId', teamId);
        if (this.data.logoLocal) {
          await this._uploadLogo(teamId, this.data.logoLocal);
        }
        wx.showToast({ title: '创建成功！', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/team/team' }), 1500);
      }
    } catch (e) {
      console.error('创建球队失败:', e);
    }
  },

  _uploadLogo(teamId, localPath) {
    return new Promise((resolve) => {
      wx.getFileSystemManager().readFile({
        filePath: localPath,
        encoding: 'base64',
        success: async (fileRes) => {
          try {
            await api.uploadTeamLogo(teamId, fileRes.data, 'image/jpeg');
          } catch (e) {
            console.warn('[create-team] logo upload fail', e);
          }
          resolve();
        },
        fail: () => resolve()
      });
    });
  }
});
