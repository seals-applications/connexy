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
  const [jobs, setJobs] = useState<any[]>([]);

  // 経費・手配用のState
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showArrangementModal, setShowArrangementModal] = useState(false);
  const [receiptCategory, setReceiptCategory] = useState<'transport' | 'accommodation'>('transport');
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [arrangementCategory, setArrangementCategory] = useState<'transport' | 'accommodation'>('transport');
  const [arrangementInfo, setArrangementInfo] = useState('');

  const handleSync = async () => {
    try {
      const tasks = await api.getContractTasks();
      setChatTasks(tasks);
      const fetchedJobs = await api.getJobs();
      setJobs(fetchedJobs);
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

      const fetchedJobs = await api.getJobs();
      setJobs(fetchedJobs);

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
        const fetchedJobs = await api.getJobs();
        setJobs(fetchedJobs);
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

  // チャットに関連する案件情報の解決
  const relatedJob = useMemo(() => {
    if (!activeChat || !chatTasks) return null;
    const task = chatTasks.find(t => t.id === activeChat.id);
    const jobIds = (task?.evaluations as any)?.appliedJobIds || [];
    if (jobIds.length === 0) return null;
    return jobs.find(j => j.id === jobIds[0]) || null;
  }, [activeChat, chatTasks, jobs]);

  const isClient = useMemo(() => {
    if (!currentUser) return false;
    if (relatedJob) {
      return currentUser.id === relatedJob.companyId;
    }
    return currentUser.id === 'sigma';
  }, [currentUser, relatedJob]);

  const transportPaySeparate = useMemo(() => {
    if (!relatedJob) return true;
    return relatedJob.expenses?.transportType === 'pay_separate' || relatedJob.expenses?.transportType === 'actual' || relatedJob.expenses?.transportType === 'flat';
  }, [relatedJob]);

  const accommodationPaySeparate = useMemo(() => {
    if (!relatedJob) return true;
    return relatedJob.expenses?.accommodationType === 'pay_separate' || relatedJob.expenses?.accommodationType === 'actual' || relatedJob.expenses?.accommodationType === 'flat';
  }, [relatedJob]);

  const transportArranged = useMemo(() => {
    if (!relatedJob) return true;
    return relatedJob.expenses?.transportType === 'arranged';
  }, [relatedJob]);

  const accommodationArranged = useMemo(() => {
    if (!relatedJob) return true;
    return relatedJob.expenses?.accommodationType === 'arranged';
  }, [relatedJob]);

  // 領収書の提出処理
  const handleSendReceipt = async () => {
    if (!activeChat || !currentUser || !receiptAmount) return;
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = currentUser.staffName 
      ? `${currentUser.name}_${currentUser.staffName}` 
      : `${currentUser.name}_代表`;

    const receiptMsg = {
      id: 'rc_' + Date.now(),
      type: 'sent',
      senderId: currentUser.id,
      senderName,
      text: `【領収書提出】${receiptCategory === 'transport' ? '交通費' : '宿泊費'}: ¥${receiptAmount.toLocaleString()} の精算申請`,
      time: timeStr,
      isReceipt: true,
      receiptDetails: {
        category: receiptCategory,
        amount: receiptAmount,
        notes: receiptNotes,
        status: 'pending'
      }
    };

    const systemLogMsg = {
      id: 'sys_rc_' + Date.now(),
      type: 'system',
      text: `${currentUser.name}が${receiptCategory === 'transport' ? '交通費' : '宿泊費'}の領収書を提出しました。(¥${receiptAmount.toLocaleString()})`,
      time: timeStr
    };

    try {
      const task = chatTasks.find(t => t.id === activeChat.id);
      const msgs = task?.evaluations?.messages || getDefaultMessages(activeChat.id);
      const updated = [...msgs, receiptMsg, systemLogMsg];
      
      const jobTitle = activeChat.title || '商談チャット';
      const clientName = activeChat.id.includes('sigma') ? '商談相手' : 'クライアント企業';
      const workerName = currentUser.name;
      
      await api.saveContractTaskChat(activeChat.id, updated, jobTitle, clientName, workerName);
      
      const updatedTasks = await api.getContractTasks();
      setChatTasks(updatedTasks);
      setShowReceiptModal(false);
    } catch (e) {
      console.error(e);
      alert('領収書の提出に失敗しました');
    }
  };

  // 手配情報の共有処理
  const handleSendArrangement = async () => {
    if (!activeChat || !currentUser || !arrangementInfo.trim()) return;
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = currentUser.staffName 
      ? `${currentUser.name}_${currentUser.staffName}` 
      : `${currentUser.name}_代表`;

    const arrangementMsg = {
      id: 'ar_' + Date.now(),
      type: 'sent',
      senderId: currentUser.id,
      senderName,
      text: `【手配情報共有】${arrangementCategory === 'transport' ? '交通手配' : '宿泊手配'}の情報共有`,
      time: timeStr,
      isArrangement: true,
      arrangementDetails: {
        category: arrangementCategory,
        info: arrangementInfo
      }
    };

    const systemLogMsg = {
      id: 'sys_ar_' + Date.now(),
      type: 'system',
      text: `${currentUser.name}が${arrangementCategory === 'transport' ? '交通手配' : '宿泊手配'}の情報を共有しました。`,
      time: timeStr
    };

    try {
      const task = chatTasks.find(t => t.id === activeChat.id);
      const msgs = task?.evaluations?.messages || getDefaultMessages(activeChat.id);
      const updated = [...msgs, arrangementMsg, systemLogMsg];
      
      const jobTitle = activeChat.title || '商談チャット';
      const clientName = currentUser.name;
      const workerName = activeChat.id.includes('alpha') ? '株式会社アルファ通信' : 
                         activeChat.id.includes('beta') ? 'ベータエージェンシー' : 'パートナー会社';
      
      await api.saveContractTaskChat(activeChat.id, updated, jobTitle, clientName, workerName);
      
      const updatedTasks = await api.getContractTasks();
      setChatTasks(updatedTasks);
      setShowArrangementModal(false);
    } catch (e) {
      console.error(e);
      alert('手配情報の共有に失敗しました');
    }
  };

  // 精算承認処理
  const handleApproveReceipt = async (msgId: string) => {
    if (!activeChat || !currentUser) return;
    
    try {
      const task = chatTasks.find(t => t.id === activeChat.id);
      const msgs = [...(task?.evaluations?.messages || [])];
      
      const targetIdx = msgs.findIndex(m => m.id === msgId);
      if (targetIdx === -1) return;
      
      const targetMsg = { ...msgs[targetIdx] };
      if (!targetMsg.receiptDetails) return;
      
      targetMsg.receiptDetails = {
        ...targetMsg.receiptDetails,
        status: 'approved'
      };
      
      // テキスト表記の変更
      targetMsg.text = `【領収書承認済】${targetMsg.receiptDetails.category === 'transport' ? '交通費' : '宿泊費'}: ¥${targetMsg.receiptDetails.amount?.toLocaleString()} の精算完了`;
      msgs[targetIdx] = targetMsg;
      
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const systemLogMsg = {
        id: 'sys_app_rc_' + Date.now(),
        type: 'system',
        text: `クライアントによって${targetMsg.receiptDetails.category === 'transport' ? '交通費' : '宿泊費'}の精算（¥${targetMsg.receiptDetails.amount?.toLocaleString()}）が承認されました。`,
        time: timeStr
      };
      
      const updated = [...msgs, systemLogMsg];
      
      const jobTitle = activeChat.title || '商談チャット';
      const clientName = currentUser.name;
      const workerName = activeChat.id.includes('alpha') ? '株式会社アルファ通信' : 
                         activeChat.id.includes('beta') ? 'ベータエージェンシー' : 'パートナー会社';
      
      await api.saveContractTaskChat(activeChat.id, updated, jobTitle, clientName, workerName);
      
      const updatedTasks = await api.getContractTasks();
      setChatTasks(updatedTasks);
    } catch (e) {
      console.error(e);
      alert('精算の承認に失敗しました');
    }
  };

  const renderReceiptCard = (msg: any) => {
    const isApproved = msg.receiptDetails?.status === 'approved';
    const categoryLabel = msg.receiptDetails?.category === 'transport' ? '交通費' : '宿泊費';
    const amount = msg.receiptDetails?.amount || 0;
    const notes = msg.receiptDetails?.notes || '';
    
    return (
      <div className="receipt-card" style={{ 
        background: '#FFFFFF', 
        border: isApproved ? '2px solid #10B981' : '2px dashed #F59E0B', 
        borderRadius: '12px', 
        padding: '14px', 
        width: '240px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        color: '#1F2937',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: isApproved ? '#047857' : '#B45309' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>receipt_long</span>
            <span style={{ fontSize: '13px' }}>領収書提出 ({categoryLabel})</span>
          </div>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 'bold', 
            padding: '2px 8px', 
            borderRadius: '12px',
            background: isApproved ? '#DEF7EC' : '#FEF3C7',
            color: isApproved ? '#03543F' : '#D97706',
            whiteSpace: 'nowrap'
          }}>
            {isApproved ? '精算完了' : '承認待ち'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', background: '#F9FAFB', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
            <span style={{ color: '#6B7280' }}>申請金額:</span>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>¥{amount.toLocaleString()}</span>
          </div>
          {notes && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ color: '#6B7280', fontSize: '11px', marginBottom: '2px' }}>備考:</div>
              <div style={{ color: '#374151', wordBreak: 'break-all', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{notes}</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '11px', marginTop: '4px', borderTop: '1px dashed #E5E7EB', paddingTop: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>image</span>
            <span>領収書画像 (添付あり)</span>
          </div>
        </div>
        
        {!isApproved && isClient ? (
          <button 
            onClick={() => handleApproveReceipt(msg.id)}
            style={{ 
              background: '#10B981', 
              color: '#FFFFFF', 
              border: 'none', 
              fontSize: '11px', 
              padding: '8px 12px', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
            精算を承認する
          </button>
        ) : !isApproved ? (
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#9CA3AF', padding: '4px 0' }}>
            ※承認されると精算が確定します
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: '#10B981', fontWeight: 'bold', padding: '4px 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>task_alt</span>
            精算が完了しています
          </div>
        )}
      </div>
    );
  };

  const renderArrangementCard = (msg: any) => {
    const categoryLabel = msg.arrangementDetails?.category === 'transport' ? '交通手配' : '宿泊手配';
    const info = msg.arrangementDetails?.info || '';
    const isTransport = msg.arrangementDetails?.category === 'transport';
    
    return (
      <div className="arrangement-card" style={{ 
        background: '#FFFFFF', 
        border: '2px solid #3B82F6', 
        borderRadius: '12px', 
        padding: '14px', 
        width: '240px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        color: '#1F2937',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#1D4ED8', marginBottom: '10px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {isTransport ? 'directions_transit' : 'hotel'}
          </span>
          <span style={{ fontSize: '13px' }}>手配情報共有 ({categoryLabel})</span>
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#1F2937', 
          background: '#EFF6FF', 
          padding: '10px', 
          borderRadius: '8px',
          border: '1px solid #BFDBFE'
        }}>
          <div style={{ fontWeight: 'bold', color: '#1E40AF', marginBottom: '6px', fontSize: '11px' }}>手配内容・予約情報:</div>
          <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#1E3A8A' }}>
            {info}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3B82F6', fontSize: '11px', marginTop: '10px', justifyContent: 'center', fontWeight: 'bold' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified</span>
          <span>手配完了</span>
        </div>
      </div>
    );
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
                    {msg.isReceipt || msg.isArrangement ? (
                      <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {msg.isReceipt ? renderReceiptCard(msg) : renderArrangementCard(msg)}
                        <span className="message-time" style={{ alignSelf: 'flex-start', margin: '4px 4px 0 4px' }}>{msg.time}</span>
                      </div>
                    ) : (
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
                    )}
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
                    {msg.isReceipt || msg.isArrangement ? (
                      <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        {msg.isReceipt ? renderReceiptCard(msg) : renderArrangementCard(msg)}
                        <span className="message-time" style={{ alignSelf: 'flex-end', margin: '4px 4px 0 4px' }}>{msg.time}</span>
                      </div>
                    ) : (
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
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </main>

        <footer className="chat-footer">
          {/* 諸経費アクション（交通費・宿泊費の対応） */}
          {activeChat && (
            <div style={{ display: 'flex', gap: '8px', padding: '0 8px 8px 8px', borderBottom: '1px dashed #E2E8F0', marginBottom: '8px' }}>
              {!isClient && (transportPaySeparate || accommodationPaySeparate) && (
                <button 
                  onClick={() => {
                    setReceiptCategory(transportPaySeparate ? 'transport' : 'accommodation');
                    setReceiptAmount(0);
                    setReceiptNotes('');
                    setShowReceiptModal(true);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.15)',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span>
                  領収書を提出する
                </button>
              )}
              {isClient && (transportArranged || accommodationArranged) && (
                <button 
                  onClick={() => {
                    setArrangementCategory(transportArranged ? 'transport' : 'accommodation');
                    setArrangementInfo('');
                    setShowArrangementModal(true);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.15)',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
                  手配情報を共有する
                </button>
              )}
            </div>
          )}
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

      {/* 領収書提出モーダル */}
      {showReceiptModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#10B981' }}>receipt_long</span>
              領収書を提出
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)' }}>経費種別 *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {transportPaySeparate && (
                    <button 
                      type="button" 
                      onClick={() => setReceiptCategory('transport')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: receiptCategory === 'transport' ? '2px solid #10B981' : '1px solid #E2E8F0',
                        background: receiptCategory === 'transport' ? '#DEF7EC' : 'white',
                        color: receiptCategory === 'transport' ? '#03543F' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      交通費
                    </button>
                  )}
                  {accommodationPaySeparate && (
                    <button 
                      type="button" 
                      onClick={() => setReceiptCategory('accommodation')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: receiptCategory === 'accommodation' ? '2px solid #10B981' : '1px solid #E2E8F0',
                        background: receiptCategory === 'accommodation' ? '#DEF7EC' : 'white',
                        color: receiptCategory === 'accommodation' ? '#03543F' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      宿泊費
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)' }}>金額（税込） *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '10px', fontSize: '14px', color: 'var(--text-sub)' }}>¥</span>
                  <input 
                    type="number"
                    value={receiptAmount || ''}
                    onChange={e => setReceiptAmount(Number(e.target.value))}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 8px 8px 24px',
                      borderRadius: '6px',
                      border: '1px solid #ccc',
                      fontSize: '14px'
                    }}
                  />
                </div>
                {relatedJob && (
                  <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                    {receiptCategory === 'transport' && relatedJob.expenses?.transportValue ? (
                      `※交通費上限額: ¥${relatedJob.expenses.transportValue.toLocaleString()} / 日`
                    ) : receiptCategory === 'accommodation' && relatedJob.expenses?.accommodationValue ? (
                      `※宿泊費上限額: ¥${relatedJob.expenses.accommodationValue.toLocaleString()} / 泊`
                    ) : (
                      '※上限設定はありません（実費支給）'
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)' }}>領収書画像 *</label>
                <div style={{
                  border: '1.5px dashed #10B981',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  background: '#F0FDF4',
                  cursor: 'pointer'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#10B981' }}>photo_camera</span>
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: 'bold', marginTop: '4px' }}>領収書ファイルをアップロード済</div>
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>mock_receipt.jpg (142 KB)</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)' }}>備考（任意）</label>
                <textarea 
                  value={receiptNotes}
                  onChange={e => setReceiptNotes(e.target.value)}
                  placeholder="利用区間、品目など"
                  rows={2}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    fontSize: '12px',
                    resize: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => setShowReceiptModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
              <button 
                type="button" 
                onClick={handleSendReceipt}
                disabled={!receiptAmount}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10B981',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: receiptAmount ? 'pointer' : 'not-allowed',
                  opacity: receiptAmount ? 1 : 0.6
                }}
              >
                提出する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手配情報共有モーダル */}
      {showArrangementModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>campaign</span>
              手配情報を共有
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)' }}>手配種別 *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {transportArranged && (
                    <button 
                      type="button" 
                      onClick={() => setArrangementCategory('transport')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: arrangementCategory === 'transport' ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                        background: arrangementCategory === 'transport' ? '#EFF6FF' : 'white',
                        color: arrangementCategory === 'transport' ? '#1E40AF' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      交通手配
                    </button>
                  )}
                  {accommodationArranged && (
                    <button 
                      type="button" 
                      onClick={() => setArrangementCategory('accommodation')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: arrangementCategory === 'accommodation' ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                        background: arrangementCategory === 'accommodation' ? '#EFF6FF' : 'white',
                        color: arrangementCategory === 'accommodation' ? '#1E40AF' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      宿泊手配
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)' }}>手配内容・予約情報 *</label>
                <textarea 
                  value={arrangementInfo}
                  onChange={e => setArrangementInfo(e.target.value)}
                  placeholder={
                    arrangementCategory === 'transport' 
                      ? '例：新幹線：東京 10:00発 → 名古屋 11:40着（のぞみ12号 3号車5D）' 
                      : '例：宿泊先：ホテルサンルート徳島、チェックイン：10/14 15:00、予約番号：9982-12'
                  }
                  rows={4}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    fontSize: '12px',
                    resize: 'none',
                    lineHeight: '1.4'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => setShowArrangementModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
              <button 
                type="button" 
                onClick={handleSendArrangement}
                disabled={!arrangementInfo.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#3B82F6',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: arrangementInfo.trim() ? 'pointer' : 'not-allowed',
                  opacity: arrangementInfo.trim() ? 1 : 0.6
                }}
              >
                共有する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

