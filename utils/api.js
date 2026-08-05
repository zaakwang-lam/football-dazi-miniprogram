// utils/api.js
// 真实后端 API 客户端
// 调用后端地址：灰度期用云服务器 IP（Cloudflare Tunnel 临时 HTTPS），正式上线改为生产域名

const app = getApp();

// 后端 API 基础地址
// 2026-08-03 备案 + SSL 已完成，正式切到 https://footballdazi.cn
// Cloudflare Tunnel 临时域名保留作为容灾，但不再作为主入口
const API_BASE = 'https://footballdazi.cn';

/**
 * 通用请求方法
 * 自动注入 Authorization Header
 */
function request(url, method = 'GET', data = {}, options = {}) {
  const token = wx.getStorageSync('token');
  const showLoading = options.showLoading !== false;

  if (showLoading) {
    wx.showLoading({ title: options.loadingText || '加载中...', mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + url,
      method,
      data,
      timeout: 15000,  // 2026-07-30: Cloudflare Tunnel 首次连接 ~7s，原默认 6s 超时
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (showLoading) wx.hideLoading();
        if (res.statusCode === 200) {
          if (res.data.code === 0) {
            resolve(res.data);
          } else if (res.data.code === 401) {
            // Token 失效
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            app.globalData.token = '';
            app.globalData.userInfo = null;
            wx.showToast({ title: '请先登录', icon: 'none' });
            setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 1500);
            reject(res.data);
          } else {
            wx.showToast({ title: res.data.message || '操作失败', icon: 'none' });
            reject(res.data);
          }
        } else {
          wx.showToast({ title: `网络错误 ${res.statusCode}`, icon: 'none' });
          reject(res);
        }
      },
      fail: (err) => {
        if (showLoading) wx.hideLoading();
        console.error('API 请求失败:', url, err);
        wx.showToast({
          title: '网络连接失败，请检查后端是否启动',
          icon: 'none',
          duration: 2000
        });
        reject(err);
      }
    });
  });
}

// ===== 用户模块 =====

/**
 * 小程序用户登录（通过 wx.login 的 code）
 */
function wxLogin(code, userInfo = null) {
  return request('/api/user/login', 'POST', { code, userInfo }, {
    loadingText: '登录中...'
  });
}

/**
 * 获取用户个人资料
 */
function getUserProfile() {
  return request('/api/user/profile', 'GET');
}

/**
 * 更新用户个人资料
 */
function updateUserProfile(data) {
  return request('/api/v1/user/profile', 'PUT', data);
}

/**
 * 选择注册类型（个人/球场方）
 */
function registerRole(data) {
  return request('/api/user/register-role', 'POST', data);
}

/**
 * 检查用户是否拥有某身份
 * 兼容旧 role 字段 + 新 roles 数组
 * 【2026-08-03 新增】多身份支持
 */
function hasRole(userInfo, roleName) {
  if (!userInfo) return false;
  // 优先读 roles 数组（多身份）
  if (Array.isArray(userInfo.roles) && userInfo.roles.length > 0) {
    return userInfo.roles.includes(roleName);
  }
  // 兑底：读旧 role 字段
  return userInfo.role === roleName;
}

/**
 * 获取我的球场列表（仅已审核通过的，按 createdAt DESC）
 * 后端: GET /api/user/me/courts (2026-07-28 新增)
 */
function getMyCourts() {
  return request('/api/user/me/courts', 'GET', {});
}

/**
 * 获取我的球队列表（已加入的球队，按 joinedAt DESC）
 * 后端: GET /api/user/me/teams (2026-07-28 新增)
 */
function getMyTeams() {
  return request('/api/user/me/teams', 'GET', {});
}

/**
 * 获取我的组队列表（2026-07-28 新增）
 * type: 'created' | 'joined' | 'all'
 * 后端: GET /api/user/me/lfg-posts?type=...
 */
function getMyLfgPosts(type = 'all') {
  return request('/api/user/me/lfg-posts', 'GET', { type });
}

/**
 * 球场方发布空闲时段
 */
function publishFreeSlots(courtId, slots) {
  return request(`/api/v1/courts/${courtId}/free-slots`, 'POST', { slots });
}

/**
 * 获取场地空闲时段
 */
function getFreeSlots(courtId, params = {}) {
  const qs = Object.keys(params).map(k => `${k}=${params[k]}`).join('&');
  return request(`/api/v1/courts/${courtId}/free-slots${qs ? '?' + qs : ''}`, 'GET');
}

// ===== 场地模块 =====

/**
 * 附近场地
 */
function getNearbyCourts(params = {}) {
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return request('/api/v1/courts/nearby' + (query ? `?${query}` : ''));
}

/**
 * 场地详情
 */
function getCourtDetail(id) {
  return request(`/api/v1/courts/${id}`);
}

/**
 * 场地排期
 */
function getCourtSchedule(id) {
  return request(`/api/v1/courts/${id}/schedule`);
}

/**
 * 评价场地
 */
function evaluateCourt(id, data) {
  return request(`/api/v1/courts/${id}/evaluate`, 'POST', data);
}

// ===== 订单模块 =====

/**
 * 创建订单
 */
function createOrder(data) {
  return request('/api/v1/orders', 'POST', data, { loadingText: '下单中...' });
}

/**
 * 调起微信支付（统一下单）
 */
function payOrder(orderId, openid) {
  return request('/api/v1/payment/unified-order', 'POST', { orderId, openid }, {
    loadingText: '调起支付...'
  });
}

/**
 * 申请退款
 */
function applyRefund(data) {
  return request('/api/v1/payment/refund', 'POST', data, { loadingText: '提交退款...' });
}

/**
 * 订单列表
 */
function getOrderList(params = {}) {
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return request('/api/v1/orders' + (query ? `?${query}` : ''));
}

/**
 * 订单详情
 */
function getOrderDetail(id) {
  return request(`/api/v1/orders/${id}`);
}

/**
 * 取消订单
 */
function cancelOrder(id) {
  return request(`/api/v1/orders/${id}/cancel`, 'POST');
}

// ===== 球场方订单模块（2026-07-29 新增）=====

/**
 * 球场方订单列表（按法院场过滤）
 * @param {Object} params - { status, page, pageSize }
 */
function getAdminOrders(params = {}) {
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return request('/admin/orders' + (query ? `?${query}` : ''));
}

/**
 * 球场方订单详情
 */
function getAdminOrderDetail(id) {
  return request(`/admin/orders/${id}`);
}

/**
 * 球场方接单
 */
function acceptAdminOrder(id) {
  return request(`/admin/orders/${id}/accept`, 'POST');
}

/**
 * 球场方拒绝订单
 */
function cancelAdminOrder(id, reason = '') {
  return request(`/admin/orders/${id}/cancel`, 'POST', { reason });
}

// ===== 凑人模块 =====

/**
 * 凑人列表
 */
function getLfgList(params = {}) {
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return request('/api/v1/lfg/list' + (query ? `?${query}` : ''));
}

/**
 * 发布凑人
 */
function publishLfg(data) {
  return request('/api/v1/lfg', 'POST', data, { loadingText: '发布中...' });
}

/**
 * 凑人详情
 */
function getLfgDetail(id) {
  return request(`/api/v1/lfg/${id}`);
}

/**
 * 报名加入
 */
function joinLfg(id) {
  return request(`/api/v1/lfg/${id}/join`, 'POST', null, { loadingText: '报名中...' });
}

/**
 * 退出组队（2026-07-28 新增）
 */
function quitLfg(id) {
  return request(`/api/v1/lfg/${id}/quit`, 'POST', null, { loadingText: '退出中...' });
}

/**
 * 关闭凑人
 */
function closeLfg(id) {
  return request(`/api/v1/lfg/${id}/close`, 'POST');
}

// ===== 球队模块 =====

/**
 * 球队列表
 */
function getTeamList(params = {}) {
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return request('/api/v1/teams' + (query ? `?${query}` : ''));
}

/**
 * 球队详情
 */
function getTeamDetail(id) {
  return request(`/api/v1/teams/${id}`);
}

/**
 * 创建球队
 */
function createTeam(data) {
  return request('/api/v1/teams', 'POST', data, { loadingText: '创建中...' });
}

/**
 * 考勤打卡
 */
function checkin(data) {
  return request(`/api/v1/teams/${data.teamId}/checkin`, 'POST', {
    longitude: data.longitude,
    latitude: data.latitude
  }, { loadingText: '打卡中...' });
}

/**
 * 发起 AA 收款
 */
function createAa(data) {
  return request(`/api/v1/teams/${data.teamId}/aa`, 'POST', data, { loadingText: '发起收款...' });
}

/**
 * 球队统计
 */
function getTeamStats(id) {
  return request(`/api/v1/teams/${id}/stats`);
}

module.exports = {
  // 基础
  API_BASE,
  request,

  // 用户
  wxLogin,
  getUserProfile,
  updateUserProfile,
  registerRole,
  hasRole,  // 【2026-08-03 新增】多身份判断
  getMyCourts,
  getMyTeams,
  getMyLfgPosts,

  // 场地
  getNearbyCourts,
  getCourtDetail,
  getCourtSchedule,
  evaluateCourt,
  getFreeSlots,
  publishFreeSlots,

  // 订单
  createOrder,
  payOrder,
  applyRefund,
  getOrderList,
  getOrderDetail,
  cancelOrder,

  // 球场方订单（2026-07-29 新增）
  getAdminOrders,
  getAdminOrderDetail,
  acceptAdminOrder,
  cancelAdminOrder,

  // 凑人
  getLfgList,
  publishLfg,
  getLfgDetail,
  joinLfg,
  quitLfg,
  closeLfg,

  // 球队
  getTeamList,
  getTeamDetail,
  createTeam,
  checkin,
  createAa,
  getTeamStats
};