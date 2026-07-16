export function extractArea(address: string): string {
  // 1. Match from start up to City/Ward/Town/Village, optionally followed by Ward
  const cityMatch = address.match(/^(.+?[市区町村](?:.+?区)?)/);
  if (cityMatch) return cityMatch[1];

  // 2. Fallback: Check for major Tokyo districts/wards or popular areas
  const majorAreas = [
    '新宿', '渋谷', '池袋', '秋葉原', '有楽町', '銀座', '新橋', '品川', 
    '上野', '豊島', '葛飾', '足立', '江戸川', '大田', '世田谷', '練馬', 
    '杉並', '中野', '北区', '荒川', '台東', '墨田', '江東', '中央区', '港区', 
    '千代田', '文京', '板橋', '目黒', '大崎', '五反田', '恵比寿', '原宿',
    '代々木', '大宮', '浦和', '川口', '横浜', '川崎', '吉祥寺', '八王子',
    '立川', '町田', '調布', '府中'
  ];
  for (const area of majorAreas) {
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

export function generateMaskedLocation(address: string, exactStoreName: string, channel: string, carrier: string, workLocation?: string): string {
  const area = extractArea(address);
  const store = (exactStoreName + ' ' + address).normalize('NFKC').toLowerCase();

  // 1. Work location overrides (outdoor events)
  if (workLocation === '外販（スーパーなど）') return `${area}のスーパーマーケット`;
  if (workLocation === '外販（複合施設など）') return `${area}の大型ショッピングモール`;
  if (workLocation === '外販（その他）') return `${area}のイベント会場`;

  // 2. Auto-detect store brand from name (works even when channel is not yet set)
  const quantityStorePatterns: [RegExp, string][] = [
    [/ヤマダ|yamada/i, 'Yデンキ'],
    [/ビック|bic/i, 'Bカメラ'],
    [/ヨドバシ|yodobashi/i, 'Yカメラ'],
    [/エディオン|edion/i, 'E社'],
    [/ケーズ|k'?s/i, 'Kデンキ'],
    [/ノジマ|nojima/i, 'N社'],
    [/上新|joshin|ジョーシン/i, 'J社'],
    [/コジマ|kojima/i, 'K社'],
    [/ソフマップ|sofmap/i, 'S社'],
    [/ベスト電器|ベストデンキ/i, 'B電器'],
    [/マツヤ/i, 'Mデンキ'],
    [/100満|１００満/i, '100満'],
    [/pcデポ|pc depot/i, 'P社'],
    [/ラオックス|laox/i, 'L社'],
  ];

  // Check if it's a known electronics/quantity store
  for (const [pattern, abbr] of quantityStorePatterns) {
    if (pattern.test(store)) {
      return `${area}の${abbr}`;
    }
  }

  // 3. Auto-detect carrier shop from name
  const carrierPatterns: [RegExp, string][] = [
    [/ドコモ|docomo/i, 'docomoショップ'],
    [/au |auショップ|au\s|^au$/i, 'auショップ'],
    [/uqモバイル|uqmobile|uq mobile/i, 'UQモバイルショップ'],
    [/ソフトバンク|softbank/i, 'SoftBankショップ'],
    [/ワイモバイル|y!mobile|ymobile/i, 'Y!mobileショップ'],
    [/楽天モバイル|rakuten mobile/i, '楽天モバイルショップ'],
  ];

  for (const [pattern, shopName] of carrierPatterns) {
    if (pattern.test(store)) {
      return `${area}の${shopName}`;
    }
  }

  // 4. Use explicitly selected channel/carrier
  if (channel === 'ショップ') {
    if (carrier) {
      return `${area}の${carrier}ショップ`;
    }
    return `${area}のキャリアショップ`;
  } else if (channel === '量販店') {
    return `${area}の大手量販店`;
  }

  // 5. Final fallback
  return `${area}の店舗`;
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
