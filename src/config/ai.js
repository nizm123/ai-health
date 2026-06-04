// AI服务配置 - 硅基流动 SiliconFlow
// 官网：https://www.siliconflow.cn/
//
// Key 来源优先级：
// 1) EXPO_PUBLIC_SILICONFLOW_API_KEY（.env，由 app.config.js 注入）
// 2) expo.extra.SILICONFLOW_API_KEY（app.config.js / app.json）
// 3) Web 端可走 proxy-server，由服务端 .env 提供 Key（客户端 Key 可为空）

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import appConfig from '../../app.json';

const extraKey =
  Constants.expoConfig?.extra?.SILICONFLOW_API_KEY ||
  appConfig?.expo?.extra?.SILICONFLOW_API_KEY ||
  '';
const envKey = process.env.EXPO_PUBLIC_SILICONFLOW_API_KEY || '';
const siliconFlowKey = envKey || extraKey;

export const AI_CONFIG = {
  SILICONFLOW: {
    BASE_URL: 'https://api.siliconflow.cn/v1',
    API_KEY: siliconFlowKey,
    MODEL: 'Qwen/Qwen2.5-7B-Instruct',
    ENABLED: true,
    MAX_TOKENS: 1000,
  },
};

// 当前启用的AI服务
export const getEnabledAIServices = () => {
  const service = AI_CONFIG.SILICONFLOW;
  if (!service.ENABLED) return [];
  // Web 走本地代理时，Key 可由 proxy-server 从 .env 注入
  if (Platform.OS === 'web') return [service];
  return [service].filter((s) => s.API_KEY);
};

// 默认使用的AI服务
export const DEFAULT_AI_SERVICE = getEnabledAIServices()[0] || null;
