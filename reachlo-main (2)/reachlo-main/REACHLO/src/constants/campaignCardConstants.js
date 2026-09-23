import { Dimensions } from 'react-native';

export const CAMPAIGN_CARD_HORIZONTAL_PADDING = 40;
export const CAMPAIGN_CARD_WIDTH = Dimensions.get('window').width - CAMPAIGN_CARD_HORIZONTAL_PADDING;
export const CAMPAIGN_CARD_IMAGE_HEIGHT = Math.round(CAMPAIGN_CARD_WIDTH * 9 / 16);
export const CAMPAIGN_CARD_ASPECT = CAMPAIGN_CARD_WIDTH / CAMPAIGN_CARD_IMAGE_HEIGHT || (16 / 9);

export function truncateChipLabel(text, maxWords = 4) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

export function fitCircleLabel(text, maxLen = 14) {
  if (!text || text.length <= maxLen) return text;
  const words = text.split(' ');
  if (words.length > 1 && words[0].length + 2 <= maxLen) {
    return `${words[0]}…`;
  }
  return `${text.slice(0, maxLen - 1)}…`;
}
