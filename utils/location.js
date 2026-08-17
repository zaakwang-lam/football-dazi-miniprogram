// utils/location.js
// 定位与地图选点（需已开通 getLocation / chooseLocation 接口）

/**
 * 获取当前定位（GCJ-02）
 * @returns {Promise<{latitude:number, longitude:number}|null>}
 */
function getCurrentLocation() {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        });
      },
      fail: (err) => {
        console.warn('[location] getLocation fail:', err);
        // 尝试引导授权
        if (err && (err.errMsg || '').indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '需要位置权限',
            content: '开启位置权限后可按距离展示附近球场',
            confirmText: '去设置',
            success: (m) => {
              if (m.confirm) wx.openSetting({});
            }
          });
        }
        resolve(null);
      }
    });
  });
}

/**
 * 打开地图选点（wx.chooseLocation）
 * @returns {Promise<{name:string, address:string, latitude:number, longitude:number}|null>}
 */
function chooseLocationOnMap() {
  return new Promise((resolve) => {
    // 部分机型需先有定位权限，chooseLocation 才更稳定
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
              content: '请允许使用位置信息，以便在地图上选择球场地址',
              confirmText: '去设置',
              success: (m) => {
                if (m.confirm) wx.openSetting({});
              }
            });
          } else {
            wx.showToast({ title: '打开地图失败，请检查是否已开通位置接口', icon: 'none' });
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

module.exports = {
  getCurrentLocation,
  chooseLocationOnMap
};
