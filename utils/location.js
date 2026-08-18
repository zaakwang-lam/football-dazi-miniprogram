// utils/location.js
// 仅使用已开通的 wx.chooseLocation（不要调用 wx.getLocation，公众平台未开通会无法提审）

/** 广州市区默认中心（无选点时兜底，仅广州业务） */
const DEFAULT_GUANGZHOU = {
  latitude: 23.1291,
  longitude: 113.2644,
  name: '广州市'
};

/**
 * 打开地图选点（wx.chooseLocation）
 * @returns {Promise<{name:string, address:string, latitude:number, longitude:number}|null>}
 */
function chooseLocationOnMap() {
  return new Promise((resolve) => {
    const openPicker = () => {
      wx.chooseLocation({
        success: (res) => {
          resolve({
            name: res.name || '',
            address: res.address || res.name || '',
            latitude: res.latitude,
            longitude: res.longitude
          });
        },
        fail: (err) => {
          console.warn('[location] chooseLocation fail:', err);
          const msg = (err && err.errMsg) || '';
          if (msg.indexOf('cancel') >= 0) {
            resolve(null);
            return;
          }
          if (msg.indexOf('auth deny') >= 0 || msg.indexOf('authorize') >= 0) {
            wx.showModal({
              title: '需要位置权限',
              content: '请允许使用位置信息，以便在地图上选择位置',
              confirmText: '去设置',
              success: (m) => {
                if (m.confirm) wx.openSetting({});
              }
            });
          } else {
            wx.showToast({ title: '打开地图失败', icon: 'none' });
          }
          resolve(null);
        }
      });
    };

    wx.getSetting({
      success: (setting) => {
        const authed = setting.authSetting && setting.authSetting['scope.userLocation'];
        if (authed === false) {
          wx.showModal({
            title: '需要位置权限',
            content: '请允许使用位置信息后重试',
            confirmText: '去设置',
            success: (m) => {
              if (m.confirm) {
                wx.openSetting({
                  success: (s) => {
                    if (s.authSetting && s.authSetting['scope.userLocation']) openPicker();
                    else resolve(null);
                  }
                });
              } else resolve(null);
            }
          });
          return;
        }
        openPicker();
      },
      fail: () => openPicker()
    });
  });
}

/**
 * 兼容旧调用名：不再使用 getLocation，改为地图选点或返回 null
 * 业务页请优先调用 chooseLocationOnMap
 */
async function getCurrentLocation() {
  // 故意不调用 wx.getLocation，避免提审「接口无权限」
  return null;
}

module.exports = {
  DEFAULT_GUANGZHOU,
  getCurrentLocation,
  chooseLocationOnMap
};
