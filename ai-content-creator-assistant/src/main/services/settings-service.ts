import Store from 'electron-store';
import log from 'electron-log';
import { AppSettings } from '../../common/types';

const DEFAULT_SETTINGS: AppSettings = {
  general: {
    theme: 'dark',
    language: 'en',
    autoSave: true,
    autoSaveInterval: 1,
  },
  video: {
    defaultQuality: 'high',
    hardwareAcceleration: true,
    maxCacheSize: 1024,
  },
  ai: {
    speechToTextProvider: 'whisper',
    speechToTextLanguage: 'en',
    audioCraftModel: 'musicgen-small',
    apiKeys: {},
  },
  export: {
    defaultFormat: 'mp4',
    defaultQuality: 'high',
    defaultOutputDir: '',
  },
};

export class SettingsService {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'settings',
      defaults: DEFAULT_SETTINGS,
    });
  }

  async initialize(): Promise<void> {
    log.info('Settings service initialized');
  }

  async getSettings(): Promise<AppSettings> {
    return this.store.store;
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    this.store.set(settings as any);
    return this.store.store;
  }

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }
}
