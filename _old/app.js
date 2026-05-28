document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // タブナビゲーションの切り替えロジック
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // 1. すべてのタブから active クラスを外す
      navItems.forEach(nav => nav.classList.remove('active'));
      
      // 2. クリックされたタブに active クラスを追加
      item.classList.add('active');

      // 3. 表示領域の切り替え
      const targetId = item.getAttribute('data-target');
      views.forEach(view => {
        if (view.id === targetId) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    });
  });

  // ==========================================
  // ダッシュボード: ウォレット残高のマスキング切替
  // ==========================================
  const toggleBalanceBtn = document.getElementById('toggle-balance');
  const eyeIcon = document.getElementById('eye-icon');
  const balanceMasked = document.getElementById('balance-amount');
  const balanceReal = document.getElementById('balance-real');

  if (toggleBalanceBtn) {
    toggleBalanceBtn.addEventListener('click', () => {
      if (balanceMasked.style.display !== 'none') {
        // 残高を表示する
        balanceMasked.style.display = 'none';
        balanceReal.style.display = 'inline';
        eyeIcon.textContent = 'visibility';
      } else {
        // 残高を隠す（伏字）
        balanceMasked.style.display = 'inline';
        balanceReal.style.display = 'none';
        eyeIcon.textContent = 'visibility_off';
      }
    });
  }

  // ==========================================
  // 現場(GPS): 打刻ボタンのモックインタラクション
  // ==========================================
  const checkinBtn = document.querySelector('.btn-checkin');
  if (checkinBtn) {
    checkinBtn.addEventListener('click', () => {
      if (checkinBtn.classList.contains('active')) {
        // 出勤打刻処理モック
        checkinBtn.innerHTML = '<span class="material-symbols-outlined">logout</span> 退勤を打刻する';
        checkinBtn.style.backgroundColor = '#EF4444'; // Red for logout
        checkinBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
        
        // ステータス更新
        const statusEl = document.querySelector('.task-status');
        if(statusEl) {
          statusEl.textContent = '稼働中';
          statusEl.style.color = '#10B981'; // Green
        }
      }
    });
  }

  // ==========================================
  // 探す(マップ): マップの初期化と現在地取得
  // ==========================================
  const modeJob = document.getElementById('mode-job');
  const modeTalent = document.getElementById('mode-talent');
  
  let map = null;
  let userMarker = null;

  const initMap = () => {
    const mapArea = document.getElementById('map-area');
    if (!mapArea || typeof L === 'undefined') return;

    // デフォルト位置 (東京)
    const defaultLocation = [35.6812, 139.7671];

    map = L.map('map-area', {
      zoomControl: false // デフォルトの左上のズームコントロールを無効化
    }).setView(defaultLocation, 14);

    // OpenStreetMapタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // ズームコントロールの位置を右下に変更（FABの邪魔にならないように）
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // 現在地を取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const currentLocation = [lat, lng];

        // マップの視点を現在地に移動
        map.setView(currentLocation, 15);

        // 現在地にマーカーを追加 (カスタムアイコン)
        const customIcon = L.divIcon({
          className: 'current-location-marker',
          html: `<div style="
            width: 20px;
            height: 20px;
            background-color: var(--primary);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        userMarker = L.marker(currentLocation, { icon: customIcon }).addTo(map);
        userMarker.bindPopup('<b>現在地</b>').openPopup();

      }, (error) => {
        console.warn('位置情報の取得に失敗しました:', error.message);
      }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    }
  };

  initMap();

  // タブ切り替え時にマップのサイズを再計算
  const viewSearch = document.getElementById('view-search');
  if (viewSearch) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('active') && map) {
          setTimeout(() => {
            map.invalidateSize();
          }, 100);
        }
      });
    });
    observer.observe(viewSearch, { attributes: true, attributeFilter: ['class'] });
  }

  // ==========================================
  // 設定: 自社プロフィール編集オーバーレイの開閉
  // ==========================================
  const btnEditProfile = document.getElementById('btn-edit-profile');
  const btnCloseProfile = document.getElementById('btn-close-profile');
  const btnSaveProfile = document.getElementById('btn-save-profile');
  const overlayProfile = document.getElementById('overlay-profile');

  if (btnEditProfile && overlayProfile) {
    btnEditProfile.addEventListener('click', () => {
      overlayProfile.classList.add('show');
    });
  }

  if (btnCloseProfile && overlayProfile) {
    btnCloseProfile.addEventListener('click', () => {
      overlayProfile.classList.remove('show');
    });
  }

  if (btnSaveProfile && overlayProfile) {
    btnSaveProfile.addEventListener('click', () => {
      // モックの保存処理
      btnSaveProfile.textContent = '保存しました';
      setTimeout(() => {
        btnSaveProfile.textContent = '保存';
        overlayProfile.classList.remove('show');
      }, 1000);
    });
  }

  // ==========================================
  // 設定: スタッフ登録オーバーレイと複数追加ロジック
  // ==========================================
  const btnStaffRegister = document.getElementById('btn-staff-register');
  const overlayStaff = document.getElementById('overlay-staff');
  const btnCloseStaff = document.getElementById('btn-close-staff');
  const btnSaveStaff = document.getElementById('btn-save-staff');
  const btnAddNextStaff = document.getElementById('btn-add-next-staff');
  const staffFormsWrapper = document.getElementById('staff-forms-wrapper');
  const nextStaffText = document.getElementById('next-staff-text');

  let staffCount = 1;

  if (btnStaffRegister && overlayStaff) {
    btnStaffRegister.addEventListener('click', () => {
      overlayStaff.classList.add('show');
    });
  }

  if (btnCloseStaff && overlayStaff) {
    btnCloseStaff.addEventListener('click', () => {
      overlayStaff.classList.remove('show');
    });
  }

  if (btnSaveStaff && overlayStaff) {
    btnSaveStaff.addEventListener('click', () => {
      btnSaveStaff.textContent = '保存しました';
      setTimeout(() => {
        btnSaveStaff.textContent = '保存';
        overlayStaff.classList.remove('show');
      }, 1000);
    });
  }

  if (btnAddNextStaff && staffFormsWrapper) {
    btnAddNextStaff.addEventListener('click', () => {
      staffCount++;
      
      // 新しいフォームブロックを作成
      const newFormBlock = document.createElement('div');
      newFormBlock.className = 'form-section staff-form-block';
      newFormBlock.style.animation = 'fadeIn 0.3s ease';
      
      newFormBlock.innerHTML = `
        <div class="staff-block-header">
          <h3 class="staff-block-title">${staffCount}人目のスタッフ登録</h3>
          <button class="btn-delete-staff icon-btn-dark"><span class="material-symbols-outlined">delete</span></button>
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label>名前 <span class="required">必須</span></label>
            <input type="text" class="form-control" placeholder="例: 佐藤 健一">
          </div>
          <div class="form-group half">
            <label>フリガナ <span class="required">必須</span></label>
            <input type="text" class="form-control" placeholder="サトウ ケンイチ">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label>性別</label>
            <select class="form-control">
              <option>男性</option>
              <option>女性</option>
              <option>回答しない</option>
            </select>
          </div>
          <div class="form-group half">
            <label>生年月日</label>
            <input type="date" class="form-control">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label>住所（都道府県・市区町村）</label>
            <input type="text" class="form-control" placeholder="例: 東京都新宿区">
          </div>
          <div class="form-group half">
            <label>最寄り駅</label>
            <input type="text" class="form-control" placeholder="例: 新宿駅">
          </div>
        </div>
        <div class="form-group">
          <label>役割・ポジション</label>
          <select class="form-control">
            <option>ディレクター</option>
            <option>クローザー</option>
            <option>イベントスタッフ</option>
            <option>コールセンタースタッフ</option>
            <option>その他</option>
          </select>
        </div>
        <div class="form-group">
          <label>得意な業務・スキル</label>
          <input type="text" class="form-control" placeholder="例: モバイル回線獲得、光回線ご案内">
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label>電話番号</label>
            <input type="tel" class="form-control" placeholder="090-XXXX-XXXX">
          </div>
          <div class="form-group half">
            <label>自家用車（持込）</label>
            <div class="radio-group" style="flex-direction: row; gap: 16px; margin-top: 8px;">
              <label class="radio-label"><input type="radio" name="car_${staffCount}" checked> なし</label>
              <label class="radio-label"><input type="radio" name="car_${staffCount}"> あり</label>
            </div>
          </div>
        </div>
      `;
      
      staffFormsWrapper.appendChild(newFormBlock);
      
      // ボタンのテキストを更新
      if (nextStaffText) {
        nextStaffText.textContent = `${staffCount + 1}人目を追加する`;
      }
      
      // スクロールを下へ移動
      const container = document.querySelector('#overlay-staff .form-container');
      if (container) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      }
    });
  }

  // スタッフ削除機能
  if (staffFormsWrapper) {
    staffFormsWrapper.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete-staff');
      if (deleteBtn) {
        const block = deleteBtn.closest('.staff-form-block');
        if (block) {
          block.remove();
          // 残りのブロックの番号を振り直す
          const remainingBlocks = staffFormsWrapper.querySelectorAll('.staff-form-block');
          remainingBlocks.forEach((b, index) => {
            const title = b.querySelector('.staff-block-title');
            if (title) {
              title.textContent = `${index + 1}人目のスタッフ登録`;
            }
          });
          staffCount = remainingBlocks.length;
          if (nextStaffText) {
            nextStaffText.textContent = `${staffCount + 1}人目を追加する`;
          }
        }
      }
    });
  }

  // ==========================================
  // チャットルーム: 開閉およびメッセージ送信モック
  // ==========================================
  const chatItems = document.querySelectorAll('.chat-item');
  const overlayChat = document.getElementById('overlay-chat');
  const btnCloseChat = document.getElementById('btn-close-chat');
  const chatPartnerName = document.getElementById('chat-partner-name');
  
  const chatInput = document.getElementById('chat-input');
  const btnSendMessage = document.getElementById('btn-send-message');
  const chatTimeline = document.getElementById('chat-timeline');
  const btnProposeContract = document.getElementById('btn-propose-contract');
  const chatProjectTitle = document.getElementById('chat-project-title');
  
  let activeChatItem = null;

  // チャットリストクリックで開く
  chatItems.forEach(item => {
    item.addEventListener('click', () => {
      activeChatItem = item;
      const companyName = item.querySelector('.company-name').textContent;
      const projectTitle = item.querySelector('.chat-title').textContent;
      
      if (chatPartnerName) chatPartnerName.textContent = companyName;
      if (chatProjectTitle) chatProjectTitle.textContent = projectTitle;
      if (overlayChat) overlayChat.classList.add('show');
      
      // 一番下までスクロール
      if (chatTimeline) {
        setTimeout(() => {
          chatTimeline.scrollTop = chatTimeline.scrollHeight;
        }, 100);
      }
    });
  });

  // 戻るボタンで閉じる
  if (btnCloseChat && overlayChat) {
    btnCloseChat.addEventListener('click', () => {
      overlayChat.classList.remove('show');
    });
  }

  // テキスト入力時に送信ボタンを有効化
  if (chatInput && btnSendMessage) {
    chatInput.addEventListener('input', () => {
      if (chatInput.value.trim().length > 0) {
        btnSendMessage.disabled = false;
        btnSendMessage.style.opacity = '1';
        btnSendMessage.style.cursor = 'pointer';
      } else {
        btnSendMessage.disabled = true;
        btnSendMessage.style.opacity = '0.5';
        btnSendMessage.style.cursor = 'not-allowed';
      }
    });

    // 送信処理（モック）
    const sendMessage = () => {
      const text = chatInput.value.trim();
      if (text.length === 0) return;

      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

      // 自分（送信側）のメッセージHTMLを作成
      const msgHtml = `
        <div class="message-row sent" style="animation: fadeIn 0.3s ease;">
          <div class="message-bubble">
            <p>${text.replace(/\n/g, '<br>')}</p>
            <span class="message-time">${timeStr}</span>
          </div>
        </div>
      `;
      
      chatTimeline.insertAdjacentHTML('beforeend', msgHtml);
      
      // リストのプレビューを更新
      if (activeChatItem) {
        const previewEl = activeChatItem.querySelector('.chat-preview');
        const timeEl = activeChatItem.querySelector('.chat-time');
        if (previewEl) previewEl.textContent = text;
        if (timeEl) timeEl.textContent = timeStr;
      }
      
      // 入力欄をクリア
      chatInput.value = '';
      btnSendMessage.disabled = true;
      btnSendMessage.style.opacity = '0.5';
      
      // 下へスクロール
      chatTimeline.scrollTo({
        top: chatTimeline.scrollHeight,
        behavior: 'smooth'
      });
    };

    btnSendMessage.addEventListener('click', sendMessage);
    
    // Enterキーでも送信（Shift+Enterで改行）
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // 発注（契約提案）モック
  if (btnProposeContract && chatTimeline) {
    btnProposeContract.addEventListener('click', () => {
      btnProposeContract.textContent = '提案を発行しました';
      btnProposeContract.disabled = true;
      btnProposeContract.style.opacity = '0.7';

      // システムメッセージ
      chatTimeline.insertAdjacentHTML('beforeend', `
        <div class="chat-system-message" style="animation: fadeIn 0.3s ease;">
          <span>あなたが電子発注書を発行しました</span>
        </div>
      `);

      // 電子発注書コンポーネント
      const contractHtml = `
        <div class="message-row sent" style="animation: fadeIn 0.3s ease;">
          <div class="message-bubble">
            <div class="contract-card">
              <div class="contract-header">
                <span class="material-symbols-outlined">description</span>
                <span>電子発注書</span>
              </div>
              <div class="contract-body">
                <div><strong>案件名:</strong> 週末キャンペーンスタッフ2名</div>
                <div><strong>単価:</strong> 15,000円 / 日</div>
                <div><strong>期間:</strong> 10/14 - 10/15 (2日間)</div>
              </div>
              <button class="btn-primary btn-small w-full" style="background: var(--bg-gray); color: var(--text-main); border: 1px solid var(--border-color);">
                相手の承認待ち...
              </button>
            </div>
            <span class="message-time">たった今</span>
          </div>
        </div>
      `;
      
      chatTimeline.insertAdjacentHTML('beforeend', contractHtml);
      
      chatTimeline.scrollTo({
        top: chatTimeline.scrollHeight,
        behavior: 'smooth'
      });

      // 3秒後に相手が承認したモック
      setTimeout(() => {
        chatTimeline.insertAdjacentHTML('beforeend', `
          <div class="chat-system-message" style="animation: fadeIn 0.3s ease;">
            <span>相手が条件を承認し、Stripe決済（仮押さえ）が完了しました</span>
          </div>
        `);
        
        chatTimeline.insertAdjacentHTML('beforeend', `
          <div class="message-row received" style="animation: fadeIn 0.3s ease;">
            <div class="chat-avatar bg-blue">A</div>
            <div class="message-bubble">
              <p>発注ありがとうございます！承認いたしました。当日はよろしくお願いいたします。</p>
              <span class="message-time">たった今</span>
            </div>
          </div>
        `);
        
        // リストのプレビューとステータスを更新
        if (activeChatItem) {
          const previewEl = activeChatItem.querySelector('.chat-preview');
          const timeEl = activeChatItem.querySelector('.chat-time');
          const badgeEl = activeChatItem.querySelector('.status-badge');
          
          if (previewEl) previewEl.textContent = '発注ありがとうございます！承認いたしました...';
          if (timeEl) timeEl.textContent = 'たった今';
          if (badgeEl) {
            badgeEl.className = 'status-badge badge-contracted';
            badgeEl.textContent = '契約成立';
          }
        }
        
        chatTimeline.scrollTo({
          top: chatTimeline.scrollHeight,
          behavior: 'smooth'
        });
      }, 3000);
    });
  }

});
