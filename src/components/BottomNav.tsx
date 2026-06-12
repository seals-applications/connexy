import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../data/mockDb';

export function BottomNav() {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const checkNotificationCounts = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        if (!currentUser) {
          setPendingCount(0);
          setUnreadChatCount(0);
          return;
        }

        const tasks = await api.getContractTasks();
        const users = await api.getUsers();
        const fetchedJobs = await api.getJobs();

        // 1. タスクの報告待ちカウント
        const count = tasks.filter(t => t.status === 'report_pending').length;
        setPendingCount(count);

        // 2. 未読チャット数のカウント
        const isStaffUser = !!currentUser.staffId;
        let unreadCount = 0;

        // 2.1 固定グループチャット 'chat_au_group'
        const groupTask = tasks.find(t => t.id === 'chat_au_group');
        const groupMessages = (groupTask?.evaluations as any)?.messages || [
          { id: 'def_1', type: 'system', text: '現場グループチャットが開設されました', time: '昨日' },
          { id: 'def_2', type: 'received', senderId: 'alpha', senderName: '株式会社アルファ通信_担当者', text: 'お疲れ様です。明日のauショップ新宿西口店イベント、メンバー確定しましたのでグループ作成しました。集合時間は9:30、店舗裏口です。よろしくお願いいたします！', time: '昨日 18:00', avatar: 'ア' },
          { id: 'def_3', type: 'received', senderId: 'beta', senderName: 'ベータエージェンシー_佐藤さん', text: '佐藤です。承知いたしました。明日はよろしくお願いいたします！', time: '昨日 18:10', avatar: '佐' },
          { id: 'def_4', type: 'received', senderId: 'beta', senderName: 'ベータエージェンシー_田中さん', text: '田中です。承知いたしました。よろしくお願いいたします！', time: '昨日 18:15', avatar: '田' }
        ];
        
        const lastGroupMsg = groupMessages[groupMessages.length - 1];
        if (lastGroupMsg) {
          const isSystem = lastGroupMsg.type === 'system';
          const isNotMe = lastGroupMsg.senderId !== currentUser.id;
          if (isSystem || isNotMe) {
            const lastReadId = localStorage.getItem('connexy_last_read_msg_chat_au_group');
            if (lastReadId !== lastGroupMsg.id) {
              unreadCount++;
            }
          }
        }

        // 2.2 動的グループチャット
        const dynamicGroupTasks = tasks.filter(t => t.id.startsWith('chat_group_'));
        for (const task of dynamicGroupTasks) {
          const evaluations = (task.evaluations || {}) as any;
          const assignedStaffIds = evaluations.assignedStaffIds || [];

          // アクセス制限チェック
          if (isStaffUser && !assignedStaffIds.includes(currentUser.staffId)) continue;
          
          const parsedParts = task.id.split('_'); // ['chat', 'group', jobId, companyId]
          const jobId = parsedParts[2];
          const companyId = parsedParts[3];
          const job = fetchedJobs.find(j => j.id === jobId);
          const isClient = currentUser.id === job?.authorId;
          const isAgency = currentUser.id === companyId;
          
          if (!isStaffUser && !isClient && !isAgency) continue;

          const taskMessages = evaluations.messages || [];
          if (taskMessages.length > 0) {
            const lastMsg = taskMessages[taskMessages.length - 1];
            if (lastMsg) {
              const isSystem = lastMsg.type === 'system';
              const isNotMe = lastMsg.senderId !== currentUser.id;
              if (isSystem || isNotMe) {
                const lastReadId = localStorage.getItem('connexy_last_read_msg_' + task.id);
                if (lastReadId !== lastMsg.id) {
                  unreadCount++;
                }
              }
            }
          } else {
            // メッセージが無い場合、初期状態を未読とする
            const lastReadId = localStorage.getItem('connexy_last_read_msg_' + task.id);
            if (lastReadId !== 'created') {
              unreadCount++;
            }
          }
        }

        // 2.3 ダイレクトチャット（管理者のみ）
        if (!isStaffUser) {
          const directCompanies = users.filter(c => c.id !== currentUser.id);
          for (const c of directCompanies) {
            const sortedIds = [currentUser.id, c.id].sort();
            const channelId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
            
            const task = tasks.find(t => t.id === channelId);
            const taskMessages = (task?.evaluations as any)?.messages;
            
            let msgs = [];
            if (taskMessages && taskMessages.length > 0) {
              msgs = taskMessages;
            } else {
              // デフォルトメッセージ
              if (channelId === 'chat_alpha_sigma') {
                msgs = [
                  { id: 'def_11', type: 'system', text: 'チャットを開始しました', time: '' },
                  { id: 'def_12', type: 'received', senderId: 'alpha', senderName: '株式会社アルファ通信', text: 'お世話になっております。', time: '10:30', avatar: 'A' },
                  { id: 'def_13', type: 'sent', senderId: currentUser.id === 'alpha' ? 'sigma' : 'alpha', text: 'お世話になっております！', time: '10:35' },
                  { id: 'def_14', type: 'received', senderId: 'alpha', senderName: '株式会社アルファ通信', text: '明日の待ち合わせ時間は10時でお願いします。', time: '10:42', avatar: 'A' }
                ];
              } else if (channelId === 'chat_beta_sigma') {
                msgs = [
                  { id: 'def_21', type: 'system', text: 'チャットを開始しました', time: '' },
                  { id: 'def_22', type: 'received', senderId: 'beta', senderName: 'ベータエージェンシー', text: '発注書を発行しました。ご確認お願いします。', time: '昨日', avatar: 'B' }
                ];
              } else if (channelId === 'chat_gamma_sigma') {
                msgs = [
                  { id: 'def_31', type: 'system', text: 'チャットを開始しました', time: '' },
                  { id: 'def_32', type: 'received', senderId: 'gamma', senderName: 'ガンマモバイル', text: 'よろしくお願いします。', time: '月曜日', avatar: 'G' }
                ];
              } else {
                msgs = [{ id: 'def_41', type: 'system', text: 'チャットを開始しました', time: '' }];
              }
            }

            const isDefaultMockRoom = channelId === 'chat_alpha_sigma' || channelId === 'chat_beta_sigma' || channelId === 'chat_gamma_sigma';
            if (isDefaultMockRoom || task) {
              const lastMsg = msgs[msgs.length - 1];
              if (lastMsg) {
                const isSystem = lastMsg.type === 'system';
                const isNotMe = lastMsg.senderId !== currentUser.id;
                if (isSystem || isNotMe) {
                  const lastReadId = localStorage.getItem('connexy_last_read_msg_' + channelId);
                  if (lastReadId !== lastMsg.id) {
                    unreadCount++;
                  }
                }
              }
            }
          }
        }

        setUnreadChatCount(unreadCount);
      } catch (e) {
        console.error(e);
      }
    };

    checkNotificationCounts();
    const interval = setInterval(checkNotificationCounts, 2000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">location_on</span>
        </div>
        <span className="nav-label">探す</span>
      </Link>
      <Link to="/message" className={`nav-item ${location.pathname === '/message' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">chat</span>
          {unreadChatCount > 0 && <span className="badge">{unreadChatCount}</span>}
        </div>
        <span className="nav-label">メッセージ</span>
      </Link>
      <Link to="/task" className={`nav-item ${location.pathname === '/task' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">task_alt</span>
          {pendingCount > 0 && <span className="badge" style={{ backgroundColor: '#EF4444' }}>{pendingCount}</span>}
        </div>
        <span className="nav-label">タスク</span>
      </Link>
      <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">bar_chart</span>
        </div>
        <span className="nav-label">ダッシュボード</span>
      </Link>
      <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">settings</span>
        </div>
        <span className="nav-label">設定</span>
      </Link>
    </nav>
  );
}
