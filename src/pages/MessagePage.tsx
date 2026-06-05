import { useState, useRef, useEffect } from 'react';

export function MessagePage() {
  const [activeChat, setActiveChat] = useState<{name: string, title: string, status: string} | null>(null);

  const maskContactInfo = (text: string) => {
    if (activeChat?.status === 'contracted') return text;
    let masked = text.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[連絡先はマッチング完了まで非公開です]');
    masked = masked.replace(/0\d{1,4}-\d{1,4}-\d{3,4}/g, '[連絡先はマッチング完了まで非公開です]');
    masked = masked.replace(/0[789]0\d{8}/g, '[連絡先はマッチング完了まで非公開です]');
    masked = masked.replace(/line\.me\/\S+/g, '[連絡先はマッチング完了まで非公開です]');
    return masked;
  };
  const [messages, setMessages] = useState<{type: 'system'|'sent'|'received', text: string, time: string, avatar?: string}[]>([
    { type: 'system', text: 'チャットを開始しました', time: '' },
    { type: 'received', text: 'お世話になっております。週末のキャンペーンスタッフ2名の件ですが、まだ募集されていますでしょうか？', time: '10:30', avatar: 'A' },
    { type: 'sent', text: 'お世話になっております！はい、まだ募集しております。\n単価15,000円でお願いしたいのですが、いかがでしょうか？', time: '10:35' },
    { type: 'received', text: '承知いたしました。明日の待ち合わせ時間は10時でお願いします。', time: '10:42', avatar: 'A' }
  ]);
  const [inputText, setInputText] = useState('');
  const chatTimelineRef = useRef<HTMLDivElement>(null);
  const [proposed, setProposed] = useState(false);

  useEffect(() => {
    if (chatTimelineRef.current) {
      chatTimelineRef.current.scrollTop = chatTimelineRef.current.scrollHeight;
    }
  }, [messages, activeChat]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMessages(prev => [...prev, { type: 'sent', text: inputText, time: timeStr }]);
    setInputText('');
  };

  const handlePropose = () => {
    setProposed(true);
    setMessages(prev => [
      ...prev,
      { type: 'system', text: 'あなたが電子発注書を発行しました', time: '' },
      { type: 'sent', text: '[CONTRACT_MOCK]', time: 'たった今' }
    ]);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { type: 'system', text: '相手が条件を承認し、Stripe決済（仮押さえ）が完了しました', time: '' },
        { type: 'received', text: '発注ありがとうございます！承認いたしました。当日はよろしくお願いいたします。', time: 'たった今', avatar: 'A' }
      ]);
    }, 3000);
  };

  return (
    <div className="view active" style={{ display: 'flex' }}>
      <header className="solid-header">
        <h1>メッセージ</h1>
        <div className="header-search chat-search">
          <div className="search-bar">
            <span className="material-symbols-outlined icon">search</span>
            <input type="text" placeholder="メッセージ・案件名で検索" />
          </div>
        </div>
      </header>
      <main className="list-area">
        <div className="chat-list">
          <div className="chat-item" onClick={() => setActiveChat({ name: '株式会社アルファ通信', title: '週末キャンペーンスタッフ2名', status: 'negotiating' })}>
            <div className="chat-avatar bg-blue">A</div>
            <div className="chat-content">
              <div className="chat-header">
                <span className="company-name">株式会社アルファ通信</span>
                <span className="chat-time">10:42</span>
              </div>
              <div className="chat-title">週末キャンペーンスタッフ2名</div>
              <p className="chat-preview">明日の待ち合わせ時間は10時でお願いします。</p>
            </div>
            <div className="status-badge badge-negotiating">商談中</div>
          </div>
          <div className="chat-item" onClick={() => setActiveChat({ name: 'ベータエージェンシー', title: '光回線クローザー募集', status: 'waiting' })}>
            <div className="chat-avatar bg-green">B</div>
            <div className="chat-content">
              <div className="chat-header">
                <span className="company-name">ベータエージェンシー</span>
                <span className="chat-time">昨日</span>
              </div>
              <div className="chat-title">光回線クローザー募集</div>
              <p className="chat-preview">発注書を発行しました。ご確認お願いします。</p>
            </div>
            <div className="status-badge badge-waiting">契約待ち</div>
          </div>
          <div className="chat-item" onClick={() => setActiveChat({ name: 'ガンマモバイル', title: 'ドコモショップ応援（3日間）', status: 'contracted' })}>
            <div className="chat-avatar bg-purple">G</div>
            <div className="chat-content">
              <div className="chat-header">
                <span className="company-name">ガンマモバイル</span>
                <span className="chat-time">月曜日</span>
              </div>
              <div className="chat-title">ドコモショップ応援（3日間）</div>
              <p className="chat-preview">よろしくお願いします。</p>
            </div>
            <div className="status-badge badge-contracted">契約成立</div>
          </div>
        </div>
      </main>

      {/* Chat Overlay */}
      <div className={`overlay-view ${activeChat ? 'show' : ''}`} style={{ display: activeChat ? 'flex' : 'none', transform: activeChat ? 'translateX(0)' : 'translateX(100%)' }}>
        <header className="solid-header overlay-header chat-header-fixed">
          <div className="chat-header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="icon-btn-dark" onClick={() => setActiveChat(null)}>
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <div className="chat-header-title" style={{ textAlign: 'center', flex: 1, overflow: 'hidden', padding: '0 8px' }}>
              <h1 style={{ fontSize: '15px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeChat?.name}
              </h1>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeChat?.title}
              </div>
            </div>
            <button className="icon-btn-dark" onClick={() => alert('運営に通報しました')} title="通報する">
              <span className="material-symbols-outlined" style={{ color: '#EF4444' }}>report</span>
            </button>
          </div>
          <div className="chat-conditions-pin" style={{ marginTop: '4px' }}>
            <div className="condition-summary">
              <span className="status-badge badge-negotiating">商談中</span>
              <div className="condition-details">
                <span className="text-gray text-small">単価: 15,000円 / 期間: 10/14 - 10/15</span>
              </div>
            </div>
            <button className="btn-secondary btn-small">条件を編集</button>
          </div>
        </header>

        <main className="list-area bg-gray p-16 chat-timeline" ref={chatTimelineRef}>
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.type === 'system' && (
                <div className="chat-system-message" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <span>{msg.text}</span>
                </div>
              )}
              {msg.type === 'received' && (
                <div className="message-row received" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div className="chat-avatar bg-blue">{msg.avatar}</div>
                  <div className="message-bubble">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{maskContactInfo(msg.text)}</p>
                    <span className="message-time">{msg.time}</span>
                  </div>
                </div>
              )}
              {msg.type === 'sent' && (
                <div className="message-row sent" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div className="message-bubble">
                    {msg.text === '[CONTRACT_MOCK]' ? (
                      <div className="contract-card">
                        <div className="contract-header">
                          <span className="material-symbols-outlined">description</span>
                          <span>電子発注書</span>
                        </div>
                        <div className="contract-body">
                          <div><strong>案件名:</strong> {activeChat?.title}</div>
                          <div><strong>単価:</strong> 15,000円 / 日</div>
                          <div><strong>期間:</strong> 10/14 - 10/15 (2日間)</div>
                        </div>
                        <button className="btn-primary btn-small w-full" style={{ background: 'var(--bg-gray)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                          相手の承認待ち...
                        </button>
                      </div>
                    ) : (
                      <p style={{ whiteSpace: 'pre-wrap' }}>{maskContactInfo(msg.text)}</p>
                    )}
                    <span className="message-time">{msg.time}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </main>

        <footer className="chat-footer">
          <div className="chat-actions-top">
            <button className="btn-primary btn-small w-full" onClick={handlePropose} disabled={proposed} style={{ opacity: proposed ? 0.7 : 1 }}>
              <span className="material-symbols-outlined icon-small">edit_document</span>
              {proposed ? '提案を発行しました' : 'この条件で発注（契約提案）'}
            </button>
          </div>
          <div className="chat-input-area">
            <button className="icon-btn-dark text-gray">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            <textarea
              className="form-control chat-textarea"
              placeholder="メッセージを入力..."
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              className="icon-btn-dark primary-text"
              disabled={!inputText.trim()}
              onClick={handleSend}
              style={{ opacity: inputText.trim() ? 1 : 0.5, cursor: inputText.trim() ? 'pointer' : 'not-allowed' }}
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
