import { PitchType, PitchConfig } from './types';
import { PITCH_CONFIGS } from './constants';

export function getPitchConfig(type: PitchType): PitchConfig {
  return PITCH_CONFIGS[type];
}

export function getAllPitchTypes(): PitchConfig[] {
  return Object.values(PITCH_CONFIGS);
}

export function getPitchByKey(key: string): PitchType | null {
  const upper = key.toUpperCase();
  for (const config of Object.values(PITCH_CONFIGS)) {
    if (config.key === upper) return config.type;
  }
  return null;
}
