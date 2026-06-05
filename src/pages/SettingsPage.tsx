import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../data/mockDb';
import type { Staff, User } from '../data/mockDb';

interface SettingsPageProps {
  onLogoutSuccess: () => void;
}

export function SettingsPage({ onLogoutSuccess }: SettingsPageProps) {
  const location = useLocation();
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [showStaffOverlay, setShowStaffOverlay] = useState(false);
  const [showAddStaffOverlay, setShowAddStaffOverlay] = useState(false);
  const [showEditStaffOverlay, setShowEditStaffOverlay] = useState(false);
  
  const [profileSaving, setProfileSaving] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);

  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [repNameInput, setRepNameInput] = useState('');

  const [formData, setFormData] = useState({
    name: '', maskedName: '', baseLocation: '', nearestStation: '',
    locationName: '', price: 15000,
    skills: [] as string[], carriers: [] as string[], experience: '', prText: '',
    hasCertificate: false,
    role: 'staff' as 'admin' | 'staff',
    loginId: '',
    password: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '', maskedName: '', baseLocation: '', nearestStation: '',
    locationName: '', price: 15000,
    skills: [] as string[], carriers: [] as string[], experience: '', prText: '',
    hasCertificate: false,
    role: 'staff' as 'admin' | 'staff',
    loginId: '',
    password: ''
  });

  const availableSkills = ['キャンペーンクルー', 'クローザー', 'ディレクター'];
  const availableCarriers = ['docomo', 'au/UQmobile', 'SoftBank/Y!mobile', 'BB'];

  // Identify if logged-in user is admin
  const isUserAdmin = !currentUser?.staffId || currentUser.staffRole === 'admin';

  useEffect(() => {
    if (location.state?.openStaffOverlay) {
      setShowStaffOverlay(true);
    }
  }, [location.state]);

  useEffect(() => {
    const loadData = async () => {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        setRepNameInput(user.representativeName || '');
        const fetchedStaffs = await api.getStaffsByUserId(user.id);
        setStaffs(fetchedStaffs);
      }
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      await api.logout();
      onLogoutSuccess();
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
    }));
  };

  const toggleCarrier = (carrier: string) => {
    setFormData(prev => ({
      ...prev,
      carriers: prev.carriers.includes(carrier) ? prev.carriers.filter(c => c !== carrier) : [...prev.carriers, carrier]
    }));
  };

  const toggleEditSkill = (skill: string) => {
    setEditFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
    }));
  };

  const toggleEditCarrier = (carrier: string) => {
    setEditFormData(prev => ({
      ...prev,
      carriers: prev.carriers.includes(carrier) ? prev.carriers.filter(c => c !== carrier) : [...prev.carriers, carrier]
    }));
  };

  const handleProfileSave = () => {
    setProfileSaving(true);
    if (currentUser) {
      localStorage.setItem('company_rep_' + currentUser.id, repNameInput);
      currentUser.representativeName = repNameInput;
      if (!currentUser.staffId) {
        currentUser.staffName = repNameInput;
      }
    }
    setTimeout(() => {
      setProfileSaving(false);
      setShowProfileOverlay(false);
    }, 1000);
  };

  const handleStaffSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffSaving(true);

    const user = await api.getCurrentUser();
    if (!user) return;
    
    const newStaff: Omit<Staff, 'id'> = {
      userId: user.id,
      name: formData.name,
      maskedName: formData.maskedName,
      baseLocation: formData.baseLocation,
      nearestStation: formData.nearestStation,
      preferredArea: formData.locationName,
      price: Number(formData.price),
      skills: formData.skills,
      carriers: formData.carriers,
      experience: formData.experience,
      prText: formData.prText,
      hasCertificate: formData.hasCertificate,
      role: formData.role,
      loginId: formData.loginId,
      password: formData.password
    };

    const savedStaff = await api.addStaff(newStaff);
    setStaffs(prev => [...prev, savedStaff]);

    setFormData({
      name: '', maskedName: '', baseLocation: '', nearestStation: '',
      locationName: '', price: 15000,
      skills: [], carriers: [], experience: '', prText: '',
      hasCertificate: false,
      role: 'staff',
      loginId: '',
      password: ''
    });

    setStaffSaving(false);
    setShowAddStaffOverlay(false);
    alert('スタッフを登録しました');
  };

  const handleEditClick = (staff: Staff) => {
    setEditingStaff(staff);
    setEditFormData({
      name: staff.name,
      maskedName: staff.maskedName,
      baseLocation: staff.baseLocation,
      nearestStation: staff.nearestStation || '',
      locationName: staff.preferredArea || '',
      price: staff.price,
      skills: staff.skills || [],
      carriers: staff.carriers || [],
      experience: staff.experience || '',
      prText: staff.prText || '',
      hasCertificate: staff.hasCertificate || false,
      role: staff.role || 'staff',
      loginId: staff.loginId || '',
      password: staff.password || ''
    });
    setShowEditStaffOverlay(true);
  };

  const handleStaffUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setStaffSaving(true);

    const updatedFields: Partial<Staff> = {
      name: editFormData.name,
      maskedName: editFormData.maskedName,
      baseLocation: editFormData.baseLocation,
      nearestStation: editFormData.nearestStation,
      preferredArea: editFormData.locationName,
      price: Number(editFormData.price),
      skills: editFormData.skills,
      carriers: editFormData.carriers,
      experience: editFormData.experience,
      prText: editFormData.prText,
      hasCertificate: editFormData.hasCertificate,
      role: editFormData.role,
      loginId: editFormData.loginId,
      password: editFormData.password
    };

    await api.updateStaff(editingStaff.id, updatedFields);

    const user = await api.getCurrentUser();
    if (user) {
      const fetchedStaffs = await api.getStaffsByUserId(user.id);
      setStaffs(fetchedStaffs);
    }

    setStaffSaving(false);
    setShowEditStaffOverlay(false);
    setEditingStaff(null);
    alert('スタッフ情報を更新しました');
  };

  return (
    <div className="view active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="solid-header">
        <h1>設定</h1>
      </header>
      <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
        <div className="profile-section">
          <div className="profile-avatar">{currentUser?.name.charAt(0) || '株'}</div>
          <div className="profile-info">
            <h2>
              {currentUser?.name || '会社名読み込み中...'}
              {currentUser?.staffName && (
                <span style={{ fontSize: '14px', color: 'var(--text-sub)', display: 'block', fontWeight: 'normal', marginTop: '4px' }}>
                  ログイン中: {currentUser.staffName} ({currentUser.staffRole === 'admin' ? '管理者' : '一般メンバー'})
                </span>
              )}
            </h2>
            <div className="premium-badge">
              <span className="material-symbols-outlined">stars</span>
              プレミアムプラン
            </div>
          </div>
        </div>

        <div className="settings-list">
          <div className="settings-group">
            <div className="settings-item" onClick={() => { if (isUserAdmin) setShowProfileOverlay(true); else alert('管理者権限が必要です。'); }} style={{ opacity: isUserAdmin ? 1 : 0.6 }}>
              <span className="material-symbols-outlined item-icon">business</span>
              <span>自社プロフィール編集 {!isUserAdmin && ' (制限中)'}</span>
              <span className="material-symbols-outlined item-arrow">chevron_right</span>
            </div>
            <div className="settings-item" style={{ opacity: isUserAdmin ? 1 : 0.6 }} onClick={() => { if (!isUserAdmin) alert('管理者権限が必要です。'); }}>
              <span className="material-symbols-outlined item-icon">payments</span>
              <span>決済連携 (Stripe) {!isUserAdmin && ' (制限中)'}</span>
              <span className="material-symbols-outlined item-arrow">chevron_right</span>
            </div>
          </div>
          
          <div className="settings-group">
            <div className="settings-item" onClick={() => setShowStaffOverlay(true)}>
              <span className="material-symbols-outlined item-icon">groups</span>
              <span>スタッフ管理 ({staffs.length}名)</span>
              <span className="material-symbols-outlined item-arrow">chevron_right</span>
            </div>
            <div className="settings-item">
              <span className="material-symbols-outlined item-icon">file_copy</span>
              <span>案件テンプレート管理</span>
              <span className="material-symbols-outlined item-arrow">chevron_right</span>
            </div>
            <div className="settings-item">
              <span className="material-symbols-outlined item-icon">badge</span>
              <span>スタッフへの「現場権限」付与</span>
              <span className="material-symbols-outlined item-arrow">chevron_right</span>
            </div>
          </div>

          <div className="settings-group" style={{ marginTop: '24px' }}>
            <div className="settings-item" onClick={handleLogout} style={{ color: '#EF4444' }}>
              <span className="material-symbols-outlined item-icon" style={{ color: '#EF4444' }}>logout</span>
              <span style={{ fontWeight: 'bold' }}>ログアウト</span>
              <span className="material-symbols-outlined item-arrow" style={{ color: '#EF4444' }}>chevron_right</span>
            </div>
          </div>
        </div>
      </main>

      {/* Profile Overlay */}
      <div className={`overlay-view ${showProfileOverlay ? 'show' : ''}`} style={{ display: showProfileOverlay ? 'flex' : 'none', transform: showProfileOverlay ? 'translateX(0)' : 'translateX(100%)' }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setShowProfileOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>自社プロフィール編集</h1>
          <button className="text-btn primary-text" onClick={handleProfileSave}>
            {profileSaving ? '保存しました' : '保存'}
          </button>
        </header>
        <main className="list-area bg-gray p-16 pb-80 form-container">
          <div className="form-section">
            <div className="form-avatar-edit">
              <div className="profile-avatar large">{currentUser?.name.charAt(0) || '株'}</div>
              <button className="btn-secondary mt-8">画像を変更</button>
            </div>
          </div>
          <div className="form-section">
            <h3>基本情報</h3>
            <div className="form-group">
              <label>法人名（屋号） <span className="required">必須</span></label>
              <input type="text" className="form-control" key={currentUser?.id} defaultValue={currentUser?.name || ''} />
            </div>
             <div className="form-group">
               <label>代表者名</label>
               <input 
                 type="text" 
                 className="form-control" 
                 value={repNameInput} 
                 onChange={e => setRepNameInput(e.target.value)} 
                 placeholder="代表者名を入力"
               />
             </div>
            <div className="form-group">
              <label>担当者名 <span className="required">必須</span></label>
              <input type="text" className="form-control" defaultValue="佐藤 健一" />
            </div>
            <div className="form-group">
              <label>インボイス登録番号</label>
              <input type="text" className="form-control" key={currentUser?.invoiceNumber} defaultValue={currentUser?.invoiceNumber || ''} placeholder="T + 13桁の半角数字" />
            </div>
          </div>
        </main>
      </div>

      {/* Staff Registry Manager Overlay */}
      <div className={`overlay-view ${showStaffOverlay ? 'show' : ''}`} style={{ display: showStaffOverlay ? 'flex' : 'none', transform: showStaffOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setShowStaffOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>スタッフ管理</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          
          {isUserAdmin && (
            <div style={{ marginBottom: '20px' }}>
              <button 
                onClick={() => setShowAddStaffOverlay(true)} 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', width: '100%', justifyContent: 'center', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
                スタッフを追加
              </button>
            </div>
          )}

          <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-sub)' }}>登録済みスタッフ一覧 ({staffs.length}名) {!isUserAdmin && ' (閲覧のみ)'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {staffs.map(s => (
              <div key={s.id} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {s.name} 
                    <span style={{ fontSize: '12px', color: 'var(--text-sub)', fontWeight: 'normal' }}>({s.maskedName})</span>
                    {s.hasCertificate && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#D1FAE5', color: '#065F46', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>verified</span>
                        運営確認済
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', background: s.role === 'admin' ? '#E0F2FE' : '#F1F5F9', color: s.role === 'admin' ? '#0369A1' : '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {s.role === 'admin' ? '管理者' : '一般スタッフ'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>{s.baseLocation} / {s.skills.join(', ')}</div>
                  {s.loginId && isUserAdmin && (
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                      ID: <strong>{s.loginId}</strong> / PW: <strong>{s.password}</strong>
                    </div>
                  )}
                </div>
                {isUserAdmin && (
                  <button 
                    onClick={() => handleEditClick(s)}
                    className="icon-btn-dark"
                    style={{ display: 'flex', padding: '6px', borderRadius: '6px', border: 'none', background: '#F1F5F9', cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#475569' }}>edit</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Add Staff Overlay */}
      <div className={`overlay-view ${showAddStaffOverlay ? 'show' : ''}`} style={{ display: showAddStaffOverlay ? 'flex' : 'none', transform: showAddStaffOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 4000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setShowAddStaffOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>新しいスタッフを登録</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          <form onSubmit={handleStaffSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>権限区分 *</label>
              <select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value as 'admin' | 'staff'})} 
                disabled={staffSaving} 
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', fontSize: '14px' }}
              >
                <option value="staff">一般スタッフ (Staff)</option>
                <option value="admin">管理者 (Admin)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>ログイン用ID *</label>
                <input type="text" required value={formData.loginId} onChange={e => setFormData({...formData, loginId: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: suzuki_alpha" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>パスワード *</label>
                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="設定するパスワード" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>実名 *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 鈴木 一郎" />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>表示名（イニシャル等） *</label>
              <input type="text" required value={formData.maskedName} onChange={e => setFormData({...formData, maskedName: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: Sさん" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>拠点（〇〇県〇〇市など） *</label>
              <input type="text" required value={formData.baseLocation} onChange={e => setFormData({...formData, baseLocation: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 東京都品川区" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>最寄り駅</label>
              <input type="text" value={formData.nearestStation} onChange={e => setFormData({...formData, nearestStation: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 品川駅" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>希望勤務エリア *</label>
              <input type="text" required value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 電車で30分以内、渋谷から10km以内" />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>希望単価 (円) *</label>
                <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>スキル (複数選択可)</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {availableSkills.map(skill => (
                  <label key={skill} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.skills.includes(skill)} onChange={() => toggleSkill(skill)} disabled={staffSaving} style={{ width: '16px', height: '16px' }} />
                    {skill}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>キャリア (複数選択可)</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {availableCarriers.map(carrier => (
                  <label key={carrier} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.carriers.includes(carrier)} onChange={() => toggleCarrier(carrier)} disabled={staffSaving} style={{ width: '16px', height: '16px' }} />
                    {carrier}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>自己PR・経歴</label>
              <textarea rows={4} value={formData.prText} onChange={e => setFormData({...formData, prText: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="過去の経験やアピールポイントを記載してください"></textarea>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>資格証明書・研修受講証 (画像・PDF)</label>
              <input type="file" accept="image/*,application/pdf" disabled={staffSaving} onChange={e => { if (e.target.files && e.target.files.length > 0) setFormData(prev => ({ ...prev, hasCertificate: true })) }} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }} />
            </div>

            <button type="submit" disabled={staffSaving} style={{ padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: staffSaving ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
              {staffSaving ? '登録中...' : '登録する'}
            </button>
          </form>
        </main>
      </div>

      {/* Edit Staff Overlay */}
      <div className={`overlay-view ${showEditStaffOverlay ? 'show' : ''}`} style={{ display: showEditStaffOverlay ? 'flex' : 'none', transform: showEditStaffOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 4000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => { setShowEditStaffOverlay(false); setEditingStaff(null); }}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>スタッフ情報を編集</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          <form onSubmit={handleStaffUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>権限区分 *</label>
              <select 
                value={editFormData.role} 
                onChange={e => setEditFormData({...editFormData, role: e.target.value as 'admin' | 'staff'})} 
                disabled={staffSaving} 
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', fontSize: '14px' }}
              >
                <option value="staff">一般スタッフ (Staff)</option>
                <option value="admin">管理者 (Admin)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>ログイン用ID *</label>
                <input type="text" required value={editFormData.loginId} onChange={e => setEditFormData({...editFormData, loginId: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: suzuki_alpha" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>パスワード *</label>
                <input type="password" required value={editFormData.password} onChange={e => setEditFormData({...editFormData, password: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="設定するパスワード" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>実名 *</label>
              <input type="text" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 鈴木 一郎" />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>表示名（イニシャル等） *</label>
              <input type="text" required value={editFormData.maskedName} onChange={e => setEditFormData({...editFormData, maskedName: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: Sさん" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>拠点（〇〇県〇〇市など） *</label>
              <input type="text" required value={editFormData.baseLocation} onChange={e => setEditFormData({...editFormData, baseLocation: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 東京都品川区" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>最寄り駅</label>
              <input type="text" value={editFormData.nearestStation} onChange={e => setEditFormData({...editFormData, nearestStation: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 品川駅" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>希望勤務エリア *</label>
              <input type="text" required value={editFormData.locationName} onChange={e => setEditFormData({...editFormData, locationName: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 電車で30分以内、渋谷から10km以内" />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>希望単価 (円) *</label>
                <input type="number" required value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>スキル (複数選択可)</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {availableSkills.map(skill => (
                  <label key={skill} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editFormData.skills.includes(skill)} onChange={() => toggleEditSkill(skill)} disabled={staffSaving} style={{ width: '16px', height: '16px' }} />
                    {skill}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>キャリア (複数選択可)</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {availableCarriers.map(carrier => (
                  <label key={carrier} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editFormData.carriers.includes(carrier)} onChange={() => toggleEditCarrier(carrier)} disabled={staffSaving} style={{ width: '16px', height: '16px' }} />
                    {carrier}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>自己PR・経歴</label>
              <textarea rows={4} value={editFormData.prText} onChange={e => setEditFormData({...editFormData, prText: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="過去の経験やアピールポイントを記載してください"></textarea>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>資格証明書・研修受講証 (画像・PDF)</label>
              <input type="file" accept="image/*,application/pdf" disabled={staffSaving} onChange={e => { if (e.target.files && e.target.files.length > 0) setEditFormData(prev => ({ ...prev, hasCertificate: true })) }} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }} />
            </div>

            <button type="submit" disabled={staffSaving} style={{ padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: staffSaving ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
              {staffSaving ? '更新中...' : '更新を保存する'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
