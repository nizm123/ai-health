// 将 .env 中的 EXPO_PUBLIC_* 注入 expo.extra，供 Web/原生构建时读取
require('dotenv').config();

const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      CLOUD_API_BASE_URL:
        process.env.EXPO_PUBLIC_CLOUD_API_BASE_URL ||
        appJson.expo.extra?.CLOUD_API_BASE_URL,
      SILICONFLOW_API_KEY:
        process.env.EXPO_PUBLIC_SILICONFLOW_API_KEY ||
        process.env.SILICONFLOW_API_KEY ||
        appJson.expo.extra?.SILICONFLOW_API_KEY ||
        '',
    },
  },
};
