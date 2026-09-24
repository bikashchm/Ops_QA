import { ConfigManager } from '../config/ConfigManager';

export const URLS = {
  get baseUrl() {
    return ConfigManager.getBaseUrl();
  },
  get authUrl() {
    return ConfigManager.getAuthUrl();
  },
} as const;
