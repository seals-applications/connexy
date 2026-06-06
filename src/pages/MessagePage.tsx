import { useState, useRef, useEffect, useMemo } from 'react';
import { api } from '../data/mockDb';

interface ChatChannel {
  id: string;
  name: string;
  title: string;
  status: 'negotiating' | 'waiting' | 'contracted' | 'group';
  avatar: string;
  avatarBg: string;
  preview: string;
  time: string;
  members?: string[];
}

export function MessagePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const chatTimelineRef = useRef<HTMLDivElement>(null);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [chatTasks, setChatTasks] = useState<any[]>([]);

  const handleSync = async () => {
    try {
      const tasks = await api.getContractTasks();
      setChatTasks(tasks);
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      const u = await api.getCurrentUser();
      setCurrentUser(u);

      const users = await api.getUsers();
      setAllCompanies(users);

      const tasks = await api.getContractTasks();
      setChatTasks(tasks);

      // Check if there is an active chat room saved in local storage to open
      const savedActiveId = localStorage.getItem('connexy_active_chat_id');
      if (savedActiveId) {
        setActiveChatId(savedActiveId);
        localStorage.removeItem('connexy_active_chat_id');
      }
    };
    initData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const tasks = await api.getContractTasks();
        setChatTasks(tasks);
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const maskContactInfo = (text: string) => {
    if (activeChat?.status === 'contracted' || activeChat?.status === 'group') return text;
    let masked = text.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[連絡先はマッチング完了まで非公開です]');
    masked = masked.replace(/0\d{1,4}-\d{1,4}-\d{3,4}/g, '[連絡先はマッチング完了まで非公開です]');
    masked = masked.replace(/0[789]0\d{8}/g, '[連絡先はマッチング完了まで非公開です]');
    masked = masked.replace(/line\.me\/\S+/g, '[連絡先はマッチング完了まで非公開です]');
    return masked;
  };

  const getDefaultMessages = (chatId: string) => {
    if (chatId === 'chat_au_group') {
      return [
        { id: 'def_1', type: 'system', text: '現場グループチャットが開設されました', time: '昨日' },
        { id: 'def_2', type: 'received', senderId: 'alpha', senderName: '株式会社アルファ通信_担当者', text: 'お疲れ様です。明日のauショップ新宿西口店イベント、メンバー確定しましたのでグループ作成しました。集合時間は9:30、店舗裏口です。よろしくお願いいたします！', time: '昨日 18:00', avatar: 'ア' },
        { id: 'def_3', type: 'received', senderId: 'beta', senderName: 'ベータエージェンシー_佐藤さん', text: '佐藤です。承知いたしました。明日はよろしくお願いいたします！', time: '昨日 18:10', avatar: '佐' },
        { id: 'def_4', type: 'received', senderId: 'beta', senderName: 'ベータエージェンシー_田中さん', text: '田中です。承知いたしました。よろしくお願いいたします！', time: '昨日 18:15', avatar: '田' }
      ];
    }
    if (chatId === 'chat_alpha_sigma') {
      return [
        { id: 'def_11', type: 'system', text: 'チャットを開始しました', time: '' },
        { id: 'def_12', type: 'received', senderId: 'alpha', senderName: '株式会社アルファ通信', text: 'お世話になっております。週末のキャンペーンスタッフ2名の件ですが、まだ募集されていますでしょうか？', time: '10:30', avatar: 'A' },
        { id: 'def_13', type: 'sent', senderId: currentUser?.id === 'alpha' ? 'sigma' : 'alpha', text: 'お世話になっております！はい、まだ募集しております。\n単価15,000円でお願いしたいのですが、いかがでしょうか？', time: '10:35' },
        { id: 'def_14', type: 'received', senderId: 'alpha', senderName: '株式会社アルファ通信', text: '明日の待ち合わせ時間は10時でお願いします。', time: '10:42', avatar: 'A' }
      ];
    }
    if (chatId === 'chat_beta_sigma') {
      return [
        { id: 'def_21', type: 'system', text: 'チャットを開始しました', time: '' },
        { id: 'def_22', type: 'received', senderId: 'beta', senderName: 'ベータエージェンシー', text: '発注書を発行しました。ご確認お願いします。', time: '昨日', avatar: 'B' }
      ];
    }
    if (chatId === 'chat_gamma_sigma') {
      return [
        { id: 'def_31', type: 'system', text: 'チャットを開始しました', time: '' },
        { id: 'def_32', type: 'received', senderId: 'gamma', senderName: 'ガンマモバイル', text: 'よろしくお願いします。', time: '月曜日', avatar: 'G' }
      ];
    }
    return [
      { id: 'def_41', type: 'system', text: 'チャットを開始しました', time: '' }
    ];
  };

  const channels = useMemo(() => {
    if (!currentUser) return [];

    // 1. Group chat channel
    const groupChannel: ChatChannel = {
      id: 'chat_au_group',
      name: '【グループ】auショップ新宿西口店 現場連絡',
      title: 'auショップ新宿西口店 イベント',
      status: 'group',
      avatar: '協',
      avatarBg: 'bg-orange',
      preview: '明日はよろしくお願いします！',
      time: '18:15',
      members: [
        '株式会社アルファ通信_担当者',
        'ベータエージェンシー_鈴木さん',
        'ベータエージェンシー_佐藤さん',
        'ベータエージェンシー_田中さん'
      ]
    };

    const groupTask = chatTasks.find(t => t.id === 'chat_au_group');
    const groupMessages = (groupTask?.evaluations as any)?.messages || getDefaultMessages('chat_au_group');
    if (groupMessages.length > 0) {
      const lastGroupMsg = groupMessages[groupMessages.length - 1];
      if (lastGroupMsg) {
        groupChannel.preview = lastGroupMsg.type === 'system' ? lastGroupMsg.text : lastGroupMsg.text;
        groupChannel.time = lastGroupMsg.time || '';
      }
    }

    // 2. Direct channels with all other companies
    const directChannels = allCompanies
      .filter(c => c.id !== currentUser.id)
      .map(c => {
        const sortedIds = [currentUser.id, c.id].sort();
        const channelId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
        
        // Find existing contract task for this chat
        const task = chatTasks.find(t => t.id === channelId);
        const taskMessages = (task?.evaluations as any)?.messages || [];
        
        // Find default messages if database has none
        const msgs = taskMessages.length > 0 ? taskMessages : getDefaultMessages(channelId);
        
        // Last message info
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        let preview = 'チャットを開始しました';
        let time = '';
        if (lastMsg) {
          if (lastMsg.type === 'system') {
            preview = lastMsg.text;
          } else if (lastMsg.isProposal) {
            preview = '電子発注書が発行されました';
          } else {
            preview = lastMsg.text;
          }
          time = lastMsg.time || '';
        }

        // Determine status dynamically
        let status: 'negotiating' | 'waiting' | 'contracted' = 'negotiating';
        const proposal = msgs.find((m: any) => m.isProposal);
        if (proposal) {
          status = proposal.proposalStatus === 'approved' ? 'contracted' : 'waiting';
        }

        // Predefined avatar mapping
        let avatar = c.name.substring(0, 1);
        let avatarBg = 'bg-blue';
        if (c.id === 'alpha') { avatar = 'A'; avatarBg = 'bg-blue'; }
        else if (c.id === 'beta') { avatar = 'B'; avatarBg = 'bg-green'; }
        else if (c.id === 'gamma') { avatar = 'G'; avatarBg = 'bg-purple'; }
        else if (c.id === 'delta') { avatar = 'D'; avatarBg = 'bg-red'; }
        else if (c.id === 'sigma') { avatar = 'S'; avatarBg = 'bg-teal'; }

        // Find a title or make default
        const title = task?.jobTitle || (
          c.id === 'alpha' ? '週末キャンペーンスタッフ2名' :
          c.id === 'beta' ? '光回線クローザー募集' :
          c.id === 'gamma' ? 'ドコモショップ応援（3日間）' :
          '直接契約・商談チャット'
        );

        return {
          id: channelId,
          name: c.name,
          title,
          status,
          avatar,
          avatarBg,
          preview,
          time
        } as ChatChannel;
      })
      .filter(channel => {
        const isDefaultMockRoom = 
          channel.id === 'chat_alpha_sigma' || 
          channel.id === 'chat_beta_sigma' || 
          channel.id === 'chat_gamma_sigma';
        const existsInDb = chatTasks.some(t => t.id === channel.id);
        return isDefaultMockRoom || existsInDb;
      });

    return [groupChannel, ...directChannels];
  }, [currentUser, allCompanies, chatTasks]);

  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return channels.find(c => c.id === activeChatId) || null;
  }, [activeChatId, channels]);

  const messages = useMemo(() => {
    if (!activeChat) return [];
    const task = chatTasks.find(t => t.id === activeChat.id);
    const taskMessages = (task?.evaluations as any)?.messages;
    if (taskMessages && Array.isArray(taskMessages) && taskMessages.length > 0) {
      return taskMessages;
    }
    return getDefaultMessages(activeChat.id);
  }, [activeChat, chatTasks, currentUser]);

  const mappedMessages = useMemo(() => {
    return messages.map((msg: any) => {
      if (msg.type === 'system') return msg;
      let type = msg.type;
      if (msg.senderId) {
        type = (currentUser && msg.senderId === currentUser.id) ? 'sent' : 'received';
      }
      return {
        ...msg,
        type
      };
    });
  }, [messages, currentUser]);

  const proposed = useMemo(() => {
    return messages.some((m: any) => m.isProposal);
  }, [messages]);

  useEffect(() => {
    if (chatTimelineRef.current) {
      chatTimelineRef.current.scrollTop = chatTimelineRef.current.scrollHeight;
    }
  }, [mappedMessages, activeChat]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat || !currentUser) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const senderName = currentUser.staffName 
      ? `${currentUser.name}_${currentUser.staffName}` 
      : `${currentUser.name}_代表`;

    const newMsg = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      senderName,
      text: inputText,
      time: timeStr
    };

    const updated = [...messages, newMsg];
    setInputText('');

    try {
      const otherUser = allCompanies.find(c => {
        const sortedIds = [currentUser.id, c.id].sort();
        const generatedId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
        return generatedId === activeChat.id;
      });
      const clientName = currentUser.name;
      const workerName = otherUser ? otherUser.name : '相手';
      const jobTitle = activeChat.title || '商談チャット';

      await api.saveContractTaskChat(activeChat.id, updated, jobTitle, clientName, workerName);

      const updatedTasks = await api.getContractTasks();
      setChatTasks(updatedTasks);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handlePropose = async () => {
    if (!activeChat || !currentUser) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const senderName = currentUser.staffName 
      ? `${currentUser.name}_${currentUser.staffName}` 
      : `${currentUser.name}_代表`;

    const newMsg1 = {
      id: 'sys_' + Date.now(),
      type: 'system',
      text: `${currentUser.name}が電子発注書を発行しました`,
      time: timeStr
    };

    const newMsg2 = {
      id: 'prop_' + Date.now(),
      senderId: currentUser.id,
      senderName,
      text: '[CONTRACT_MOCK]',
      time: timeStr,
      isProposal: true,
      proposalStatus: 'pending',
      proposalDetails: {
        title: activeChat.title || '契約提案',
        price: '15,000円 / 日',
        duration: '10/14 - 10/15 (2日間)'
      }
    };

    const updated = [...messages, newMsg1, newMsg2];

    try {
      const otherUser = allCompanies.find(c => {
        const sortedIds = [currentUser.id, c.id].sort();
        const generatedId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
        return generatedId === activeChat.id;
      });
      const clientName = currentUser.name;
      const workerName = otherUser ? otherUser.name : '相手';
      const jobTitle = activeChat.title || '商談チャット';

      await api.saveContractTaskChat(activeChat.id, updated, jobTitle, clientName, workerName);

      const updatedTasks = await api.getContractTasks();
      setChatTasks(updatedTasks);
    } catch (err) {
      console.error('Failed to send proposal:', err);
    }
  };

  const handleApproveProposal = async (proposalMsgId: string) => {
    if (!activeChat || !currentUser) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const senderName = currentUser.staffName 
      ? `${currentUser.name}_${currentUser.staffName}` 
      : `${currentUser.name}_代表`;

    const updatedMessages = messages.map((m: any) => {
      if (m.id === proposalMsgId) {
        return { ...m, proposalStatus: 'approved' };
      }
      return m;
    });

    const systemConfirm = {
      id: 'sys_' + Date.now(),
      type: 'system',
      text: `${currentUser.name}が条件を承認し、Stripe決済（仮押さえ）が完了しました`,
      time: timeStr
    };

    const replyMsg = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      senderName,
      text: '発注ありがとうございます！承認いたしました。当日はよろしくお願いいたします。',
      time: timeStr
    };

    const finalMessages = [...updatedMessages, systemConfirm, replyMsg];

    try {
      const otherUser = allCompanies.find(c => {
        const sortedIds = [currentUser.id, c.id].sort();
        const generatedId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
        return generatedId === activeChat.id;
      });
      const clientName = currentUser.name;
      const workerName = otherUser ? otherUser.name : '相手';
      const jobTitle = activeChat.title || '商談チャット';

      await api.saveContractTaskChat(activeChat.id, finalMessages, jobTitle, clientName, workerName);

      const updatedTasks = await api.getContractTasks();
      setChatTasks(updatedTasks);
    } catch (err) {
      console.error('Failed to approve proposal:', err);
    }
  };

  return (
    <div className="view active" style={{ display: 'flex' }}>
      <header className="solid-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>メッセージ</h1>
          <button className="icon-btn-dark" onClick={handleSync} title="同期" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-color)' }}>refresh</span>
          </button>
        </div>
        <div className="header-search chat-search">
          <div className="search-bar">
            <span className="material-symbols-outlined icon">search</span>
            <input type="text" placeholder="メッセージ・案件名で検索" />
          </div>
        </div>
      </header>
      <main className="list-area">
        <div className="chat-list">
          {channels.map((channel) => (
            <div key={channel.id} className="chat-item" onClick={() => setActiveChatId(channel.id)}>
              <div className={`chat-avatar ${channel.avatarBg}`}>{channel.avatar}</div>
              <div className="chat-content">
                <div className="chat-header">
                  <span className="company-name">{channel.name}</span>
                  <span className="chat-time">{channel.time}</span>
                </div>
                <div className="chat-title">{channel.title}</div>
                <p className="chat-preview">{channel.preview}</p>
              </div>
              <span className={`status-badge ${
                channel.status === 'negotiating' ? 'badge-negotiating' : 
                channel.status === 'waiting' ? 'badge-waiting' : 
                channel.status === 'contracted' ? 'badge-contracted' : 'badge-contracted'
              }`} style={channel.status === 'group' ? { backgroundColor: '#FDBA74', color: '#7C2D12' } : {}}>
                {channel.status === 'negotiating' ? '商談中' : 
                 channel.status === 'waiting' ? '契約待ち' : 
                 channel.status === 'contracted' ? '契約成立' : '現場グループ'}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* Chat Overlay */}
      <div className={`overlay-view ${activeChat ? 'show' : ''}`} style={{ display: activeChat ? 'flex' : 'none', transform: activeChat ? 'translateX(0)' : 'translateX(100%)' }}>
        <header className="solid-header overlay-header chat-header-fixed" style={{ height: activeChat?.status === 'group' ? '125px' : 'auto' }}>
          <div className="chat-header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="icon-btn-dark" onClick={() => setActiveChatId(null)}>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="icon-btn-dark" onClick={handleSync} title="同期" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary-color)' }}>refresh</span>
              </button>
              <button className="icon-btn-dark" onClick={() => alert('運営に通報しました')} title="通報する">
                <span className="material-symbols-outlined" style={{ color: '#EF4444' }}>report</span>
              </button>
            </div>
          </div>
          
          {activeChat?.status === 'group' ? (
            <div className="chat-conditions-pin" style={{ marginTop: '4px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', display: 'block' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 'bold', marginBottom: '4px', textAlign: 'left' }}>参加メンバー:</div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--text-main)', width: '100%' }}>
                {activeChat.members?.map((m, idx) => (
                  <span key={idx} style={{ background: '#E2E8F0', padding: '2px 8px', borderRadius: '12px', flexShrink: 0 }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-conditions-pin" style={{ marginTop: '4px' }}>
              <div className="condition-summary">
                <span className={`status-badge ${
                  activeChat?.status === 'negotiating' ? 'badge-negotiating' : 
                  activeChat?.status === 'waiting' ? 'badge-waiting' : 'badge-contracted'
                }`}>
                  {activeChat?.status === 'negotiating' ? '商談中' : 
                   activeChat?.status === 'waiting' ? '契約待ち' : '契約成立'}
                </span>
                <div className="condition-details">
                  <span className="text-gray text-small">単価: 15,000円 / 期間: 10/14 - 10/15</span>
                </div>
              </div>
              <button className="btn-secondary btn-small">条件を編集</button>
            </div>
          )}
        </header>

        <main className="list-area bg-gray p-16 chat-timeline" ref={chatTimelineRef} style={{ paddingTop: activeChat?.status === 'group' ? '140px' : '96px' }}>
          {mappedMessages.map((msg, i) => (
            <div key={i}>
              {msg.type === 'system' && (
                <div className="chat-system-message" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <span>{msg.text}</span>
                </div>
              )}
              {msg.type === 'received' && (
                <div className="message-row received" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div className="chat-avatar bg-blue" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {msg.avatar || activeChat?.avatar}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                    {activeChat?.status === 'group' && (
                      <div style={{ fontSize: '10px', color: 'var(--text-sub)', marginLeft: '4px', marginBottom: '2px' }}>
                        {msg.senderName}
                      </div>
                    )}
                    <div className="message-bubble">
                      {msg.isProposal ? (
                        <div className="contract-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', width: '220px' }}>
                          <div className="contract-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
                            <span style={{ fontSize: '13px' }}>電子発注書</span>
                          </div>
                          <div className="contract-body" style={{ fontSize: '11px', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div><strong>案件名:</strong> {msg.proposalDetails?.title || activeChat?.title}</div>
                            <div><strong>単価:</strong> {msg.proposalDetails?.price || '15,000円 / 日'}</div>
                            <div><strong>期間:</strong> {msg.proposalDetails?.duration || '10/14 - 10/15 (2日間)'}</div>
                          </div>
                          {msg.proposalStatus === 'pending' ? (
                            <button className="btn-primary btn-small w-full" onClick={() => handleApproveProposal(msg.id)} style={{ background: 'var(--primary-color)', color: '#FFFFFF', border: 'none', fontSize: '11px', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                              承認する
                            </button>
                          ) : (
                            <button className="btn-primary btn-small w-full" disabled style={{ background: '#DEF7EC', color: '#03543F', border: 'none', fontSize: '11px', padding: '6px', borderRadius: '4px', cursor: 'not-allowed', fontWeight: 'bold', width: '100%' }}>
                              契約成立済み
                            </button>
                          )}
                        </div>
                      ) : (
                        <p style={{ whiteSpace: 'pre-wrap' }}>{maskContactInfo(msg.text)}</p>
                      )}
                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                </div>
              )}
              {msg.type === 'sent' && (
                <div className="message-row sent" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 1, minWidth: 0 }}>
                    {activeChat?.status === 'group' && (
                      <div style={{ fontSize: '10px', color: 'var(--text-sub)', marginRight: '4px', marginBottom: '2px', textAlign: 'right' }}>
                        {msg.senderName || '自分'}
                      </div>
                    )}
                    <div className="message-bubble">
                      {msg.isProposal ? (
                        <div className="contract-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', width: '220px' }}>
                          <div className="contract-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
                            <span style={{ fontSize: '13px' }}>電子発注書</span>
                          </div>
                          <div className="contract-body" style={{ fontSize: '11px', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div><strong>案件名:</strong> {msg.proposalDetails?.title || activeChat?.title}</div>
                            <div><strong>単価:</strong> {msg.proposalDetails?.price || '15,000円 / 日'}</div>
                            <div><strong>期間:</strong> {msg.proposalDetails?.duration || '10/14 - 10/15 (2日間)'}</div>
                          </div>
                          {msg.proposalStatus === 'pending' ? (
                            <button className="btn-primary btn-small w-full" disabled style={{ background: 'var(--bg-gray)', color: 'var(--text-sub)', border: '1px solid var(--border-color)', fontSize: '11px', padding: '6px', borderRadius: '4px', cursor: 'not-allowed', width: '100%' }}>
                              相手の承認待ち...
                            </button>
                          ) : (
                            <button className="btn-primary btn-small w-full" disabled style={{ background: '#DEF7EC', color: '#03543F', border: 'none', fontSize: '11px', padding: '6px', borderRadius: '4px', cursor: 'not-allowed', fontWeight: 'bold', width: '100%' }}>
                              契約成立済み
                            </button>
                          )}
                        </div>
                      ) : (
                        <p style={{ whiteSpace: 'pre-wrap' }}>{maskContactInfo(msg.text)}</p>
                      )}
                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </main>

        <footer className="chat-footer">
          {activeChat?.status !== 'group' && (
            <div className="chat-actions-top">
              <button className="btn-primary btn-small w-full" onClick={handlePropose} disabled={proposed} style={{ opacity: proposed ? 0.7 : 1 }}>
                <span className="material-symbols-outlined icon-small">edit_document</span>
                {activeChat?.status === 'contracted' ? '契約成立済み' : (proposed ? '提案を発行しました' : 'この条件で発注（契約提案）')}
              </button>
            </div>
          )}
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

