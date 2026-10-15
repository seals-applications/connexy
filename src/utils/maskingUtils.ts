import { MAJOR_AREAS } from '../data/maskingMasters';

export function extractArea(address: string): string {
  // 1. Match from start up to City/Ward/Town/Village, optionally followed by Ward
  const cityMatch = address.match(/^(.+?[市区町村](?:.+?区)?)/);
  if (cityMatch) return cityMatch[1];

  // 2. Fallback: Check for major Tokyo districts/wards or popular areas
  for (const area of MAJOR_AREAS) {
    if (address.includes(area)) {
      return area.endsWith('区') || area.endsWith('市') ? area : `${area}エリア`;
    }
  }

  // 3. Fallback: Extract prefix before '店' if present
  const shopIndex = address.indexOf('店');
  if (shopIndex > 0) {
    const beforeShop = address.substring(0, shopIndex);
    const words = beforeShop.split(/[\s　]+/);
    const lastWord = words[words.length - 1];
    if (lastWord.length >= 2) {
      return lastWord;
    }
  }

  return '非公開エリア';
}

export function getCommonAreaName(locations: string[]): string {
  if (!locations || locations.length === 0) return 'このエリア';
  if (locations.length === 1) return extractArea(locations[0] || '');

  const parsed = locations.map(loc => {
    const match = loc.match(/^(.+?[都道府県])?(.+?[市区町村])(?:(.+?区))?/);
    return match ? [match[1] || '', match[2] || '', match[3] || ''] : ['', '', ''];
  });
  
  let common = parsed[0];
  for (let i = 1; i < parsed.length; i++) {
    const current = parsed[i];
    if (common[0] !== current[0]) return '複数エリア';
    if (common[1] !== current[1]) common = [common[0], '', ''];
    else if (common[2] !== current[2]) common = [common[0], common[1], ''];
  }
  const result = common.join('');
  return result === '' ? '複数エリア' : result;
}
