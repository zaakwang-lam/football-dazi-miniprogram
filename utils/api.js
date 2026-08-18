// utils/api.js
const app = getApp();
const API_BASE = 'https://footballdazi.cn';

function extractBody(res) {
  if (!res) return null;
  const body = res.data;
  if (body && typeof body === 'object' && typeof body.code === 'number') return body;
  return null;
}

function request(url, method = 'GET', data = {}, options = {}) {
  const token = wx.getStorageSync('token');
  const showLoading = options.showLoading !== false;
  if (showLoading) wx.showLoading({ title: options.loadingText || '加载中...', mask: true });

  const payload = data == null ? {} : data;

  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + url,
      method,
      data: payload,
      timeout: 30000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (showLoading) wx.hideLoading();
        const body = extractBody(res);
        if (body) {
          if (body.code === 0) { resolve(body); return; }
          if (body.code === 401) {
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            app.globalData.token = '';
            app.globalData.userInfo = null;
            wx.showToast({ title: body.message || '请先登录', icon: 'none' });
            setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 1500);
            reject(body);
            return;
          }
          const msg = body.message || '操作失败';
          if (options.silent !== true) wx.showToast({ title: msg, icon: 'none', duration: 2500 });
          reject(body);
          return;
        }
        const status = res.statusCode || 0;
        let fallback = '网络错误';
        if (status === 502 || status === 503) fallback = '服务暂时不可用，请稍后重试';
        else if (status === 500) fallback = '服务器内部错误，请稍后重试';
        else if (status) fallback = `网络错误 ${status}`;
        if (options.silent !== true) wx.showToast({ title: fallback, icon: 'none' });
        reject({ code: status || -1, message: fallback, raw: res });
      },
      fail: (err) => {
        if (showLoading) wx.hideLoading();
        const msg = '网络连接失败，请检查网络';
        if (options.silent !== true) wx.showToast({ title: msg, icon: 'none', duration: 2000 });
        reject({ code: -1, message: msg, raw: err });
      }
    });
  });
}

function wxLogin(code, userInfo = null) {
  return request('/api/user/login', 'POST', { code, userInfo }, { loadingText: '登录中...' });
}
function loginTest(secret) {
  return request('/api/user/login-test', 'POST', { secret }, { loadingText: '测试登录...' });
}
function phoneLogin(code, phoneCode) {
  return request('/api/user/login-phone', 'POST', { code, phoneCode }, { loadingText: '登录中...' });
}
function getUserProfile() { return request('/api/user/profile', 'GET'); }
function updateUserProfile(data) { return request('/api/v1/user/profile', 'PUT', data); }
function registerRole(data) { return request('/api/user/register-role', 'POST', data); }
function hasRole(userInfo, roleName) {
  if (!userInfo || !Array.isArray(userInfo.roles)) return false;
  return userInfo.roles.includes(roleName);
}
function getMyCourts() { return request('/api/user/me/courts', 'GET', {}); }
function updateMyCourt(id, data) {
  return request(`/api/user/me/courts/${id}`, 'PUT', data, { loadingText: '保存中...' });
}
function uploadCourtImage(id, base64, mimeType = 'image/jpeg') {
  return request(`/api/user/me/courts/${id}/image`, 'POST', { base64, mimeType }, {
    loadingText: '上传中...',
    showLoading: false
  });
}
function getMyTeams() { return request('/api/user/me/teams', 'GET', {}); }
function getMyLfgPosts(type = 'all') { return request('/api/user/me/lfg-posts', 'GET', { type }); }
function publishFreeSlots(courtId, slots) {
  return request(`/api/v1/courts/${courtId}/free-slots`, 'POST', { slots });
}
function getFreeSlots(courtId, params = {}) {
  const qs = Object.keys(params).map(k => `${k}=${params[k]}`).join('&');
  return request(`/api/v1/courts/${courtId}/free-slots${qs ? '?' + qs : ''}`, 'GET');
}
function getNearbyCourts(params = {}) {
  const query = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  return request('/api/v1/courts/nearby' + (query ? `?${query}` : ''));
}
function getCourtDetail(id) { return request(`/api/v1/courts/${id}`); }
function getCourtSchedule(id) { return request(`/api/v1/courts/${id}/schedule`); }
function evaluateCourt(id, data) { return request(`/api/v1/courts/${id}/evaluate`, 'POST', data); }
function getBanners() {
  return request('/api/v1/banners', 'GET', {}, { showLoading: false, silent: true });
}
function createOrder(data) { return request('/api/v1/orders', 'POST', data, { loadingText: '下单中...' }); }
function payOrder(orderId, openid) {
  return request('/api/v1/payment/unified-order', 'POST', { orderId, openid }, { loadingText: '调起支付...' });
}
function applyRefund(data) { return request('/api/v1/payment/refund', 'POST', data, { loadingText: '提交退款...' }); }
function getOrderList(params = {}) {
  const query = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  return request('/api/v1/orders' + (query ? `?${query}` : ''));
}
function getOrderDetail(id) { return request(`/api/v1/orders/${id}`); }
function cancelOrder(id) { return request(`/api/v1/orders/${id}/cancel`, 'POST'); }

function getAdminOrders(params = {}) {
  const query = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  return request('/api/admin/orders' + (query ? `?${query}` : ''));
}
function getAdminOrderDetail(id) { return request(`/api/admin/orders/${id}`); }
function acceptAdminOrder(id) { return request(`/api/admin/orders/${id}/accept`, 'POST'); }
function cancelAdminOrder(id, reason = '') {
  return request(`/api/admin/orders/${id}/cancel`, 'POST', { reason });
}

function getLfgList(params = {}) {
  const query = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  return request('/api/v1/lfg/list' + (query ? `?${query}` : ''));
}
function publishLfg(data) { return request('/api/v1/lfg', 'POST', data, { loadingText: '发布中...' }); }
function getLfgDetail(id) { return request(`/api/v1/lfg/${id}`); }
function joinLfg(id) { return request(`/api/v1/lfg/${id}/join`, 'POST', {}, { loadingText: '报名中...' }); }
function quitLfg(id) { return request(`/api/v1/lfg/${id}/quit`, 'POST', {}, { loadingText: '退出中...' }); }
function deleteLfg(id) { return request(`/api/v1/lfg/${id}`, 'DELETE', {}, { loadingText: '删除中...' }); }
function closeLfg(id) { return request(`/api/v1/lfg/${id}/close`, 'POST', {}); }
function getTeamList(params = {}) {
  const query = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  return request('/api/v1/teams' + (query ? `?${query}` : ''));
}
function getTeamDetail(id) { return request(`/api/v1/teams/${id}`); }
function createTeam(data) { return request('/api/v1/teams', 'POST', data, { loadingText: '创建中...' }); }
function joinTeam(id) {
  return request(`/api/v1/teams/${id}/join`, 'POST', {}, { loadingText: '加入中...' });
}
function updateTeamAnnouncement(id, announcement) {
  return request(`/api/v1/teams/${id}/announcement`, 'PUT', { announcement }, { loadingText: '保存中...' });
}
function checkin(data) {
  return request(`/api/v1/teams/${data.teamId}/checkin`, 'POST', {
    longitude: data.longitude, latitude: data.latitude
  }, { loadingText: '打卡中...' });
}
function createAa(data) { return request(`/api/v1/teams/${data.teamId}/aa`, 'POST', data, { loadingText: '发起收款...' }); }
function getTeamStats(id) { return request(`/api/v1/teams/${id}/stats`); }

module.exports = {
  API_BASE, request, wxLogin, loginTest, phoneLogin, getUserProfile, updateUserProfile, registerRole, hasRole,
  getMyCourts, updateMyCourt, uploadCourtImage, getMyTeams, getMyLfgPosts,
  getNearbyCourts, getCourtDetail, getCourtSchedule, evaluateCourt, getFreeSlots, publishFreeSlots,
  getBanners,
  createOrder, payOrder, applyRefund, getOrderList, getOrderDetail, cancelOrder,
  getAdminOrders, getAdminOrderDetail, acceptAdminOrder, cancelAdminOrder,
  getLfgList, publishLfg, getLfgDetail, joinLfg, quitLfg, deleteLfg, closeLfg,
  getTeamList, getTeamDetail, createTeam, joinTeam, updateTeamAnnouncement, checkin, createAa, getTeamStats
};
