export function generateMaskedLocation(address: string, exactStoreName: string, channel: string, carrier: string): string {
  // 住所から市区町村を抽出（例：東京都新宿区西新宿 -> 新宿区）
  const cityMatch = address.match(/([^都道府県\s]+?[市区町村])/);
  const area = cityMatch ? cityMatch[1] : '非公開エリア';

  if (channel === 'ショップ') {
    // キャリアはすでに選択されているものを使う
    return `${area}の${carrier}ショップ`;
  } else if (channel === '量販店') {
    let storeInit = '大手量販店';
    const store = exactStoreName.normalize('NFKC').toLowerCase();
    
    if (store.includes('ヤマダ')) storeInit = 'Yデンキ';
    else if (store.includes('ビック')) storeInit = 'Bカメラ';
    else if (store.includes('ヨドバシ')) storeInit = 'Yカメラ';
    else if (store.includes('エディオン') || store.includes('edion')) storeInit = 'E社';
    else if (store.includes('ケーズ')) storeInit = 'Kデンキ';
    else if (store.includes('ノジマ') || store.includes('nojima')) storeInit = 'N社';
    else if (store.includes('上新') || store.includes('joshin') || store.includes('ジョーシン')) storeInit = 'J社';
    else if (store.includes('コジマ')) storeInit = 'K社';
    else if (store.includes('ソフマップ') || store.includes('sofmap')) storeInit = 'S社';
    else if (store.includes('ベスト電器') || store.includes('ベストデンキ')) storeInit = 'B電器';
    else if (store.includes('マツヤ')) storeInit = 'Mデンキ';
    else if (store.includes('100満') || store.includes('１００満')) storeInit = '100満';
    else if (store.includes('pcデポ') || store.includes('pc depot')) storeInit = 'P社';
    else if (store.includes('ラオックス') || store.includes('laox')) storeInit = 'L社';

    return `${area}の${storeInit}`;
  }
  
  return `${area}の店舗`;
}
