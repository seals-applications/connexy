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
  const [showRoleOverlay, setShowRoleOverlay] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [staffRoles, setStaffRoles] = useState<Record<string, 'admin' | 'staff'>>({});
  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(false);
  const [changedRolesList, setChangedRolesList] = useState<Array<{ id: string, name: string, from: 'admin' | 'staff', to: 'admin' | 'staff' }>>([]);
  
  const [profileSaving, setProfileSaving] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);

  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [repNameInput, setRepNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [websiteInput, setWebsiteInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [prInput, setPrInput] = useState('');

  const [formData, setFormData] = useState({
    name: '', maskedName: '', baseLocation: '', nearestStation: '',
    locationName: '', price: 15000,
    skills: [] as string[], carriers: [] as string[], experience: '', prText: '',
    hasCertificate: false,
    role: 'staff' as 'admin' | 'staff',
    loginId: '',
    password: '',
    furigana: '',
    commuteMethod: '公共交通機関' as '公共交通機関' | '自家用車',
    gender: '男性' as '男性' | '女性',
    birthday: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '', maskedName: '', baseLocation: '', nearestStation: '',
    locationName: '', price: 15000,
    skills: [] as string[], carriers: [] as string[], experience: '', prText: '',
    hasCertificate: false,
    role: 'staff' as 'admin' | 'staff',
    loginId: '',
    password: '',
    furigana: '',
    commuteMethod: '公共交通機関' as '公共交通機関' | '自家用車',
    gender: '男性' as '男性' | '女性',
    birthday: ''
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
        setEmailInput(user.email || '');
        setWebsiteInput(user.website || '');
        setAddressInput(user.address || '');
        setPrInput(user.prText || '');
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
      localStorage.setItem('company_email_' + currentUser.id, emailInput);
      localStorage.setItem('company_website_' + currentUser.id, websiteInput);
      localStorage.setItem('company_address_' + currentUser.id, addressInput);
      localStorage.setItem('company_pr_' + currentUser.id, prInput);

      currentUser.representativeName = repNameInput;
      currentUser.email = emailInput;
      currentUser.website = websiteInput;
      currentUser.address = addressInput;
      currentUser.prText = prInput;

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
      price: 15000,
      skills: formData.skills,
      carriers: formData.carriers,
      experience: formData.experience,
      prText: formData.prText,
      hasCertificate: formData.hasCertificate,
      role: 'staff',
      loginId: formData.loginId,
      password: formData.password,
      furigana: formData.furigana,
      commuteMethod: formData.commuteMethod,
      gender: formData.gender,
      birthday: formData.birthday
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
      password: '',
      furigana: '',
      commuteMethod: '公共交通機関',
      gender: '男性',
      birthday: ''
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
      password: staff.password || '',
      furigana: staff.furigana || '',
      commuteMethod: staff.commuteMethod || '公共交通機関',
      gender: staff.gender || '男性',
      birthday: staff.birthday || ''
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
      price: 15000,
      skills: editFormData.skills,
      carriers: editFormData.carriers,
      experience: editFormData.experience,
      prText: editFormData.prText,
      hasCertificate: editFormData.hasCertificate,
      loginId: editFormData.loginId,
      password: editFormData.password,
      furigana: editFormData.furigana,
      commuteMethod: editFormData.commuteMethod,
      gender: editFormData.gender,
      birthday: editFormData.birthday
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

  const handleRoleSaveClick = () => {
    const changes: Array<{ id: string, name: string, from: 'admin' | 'staff', to: 'admin' | 'staff' }> = [];
    for (const [staffId, role] of Object.entries(staffRoles)) {
      const staff = staffs.find(s => s.id === staffId);
      const currentRole = staff?.role || 'staff';
      if (staff && currentRole !== role) {
        changes.push({
          id: staffId,
          name: staff.name,
          from: currentRole,
          to: role
        });
      }
    }

    if (changes.length === 0) {
      alert('変更された権限はありません。');
      return;
    }

    setChangedRolesList(changes);
    setShowRoleConfirmModal(true);
  };

  const handleRolesSaveConfirm = async () => {
    setRoleSaving(true);
    try {
      for (const change of changedRolesList) {
        await api.updateStaffRole(change.id, change.to);
      }
      const user = await api.getCurrentUser();
      if (user) {
        const fetchedStaffs = await api.getStaffsByUserId(user.id);
        setStaffs(fetchedStaffs);
      }
      setShowRoleConfirmModal(false);
      setShowRoleOverlay(false);
      alert('スタッフ権限を更新しました');
    } catch (e) {
      console.error(e);
      alert('権限の更新中にエラーが発生しました。');
    } finally {
      setRoleSaving(false);
    }
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
              <label>インボイス登録番号</label>
              <input type="text" className="form-control" key={currentUser?.invoiceNumber} defaultValue={currentUser?.invoiceNumber || ''} placeholder="T + 13桁の半角数字" />
            </div>
            <div className="form-group">
              <label>会社のメールアドレス</label>
              <input 
                type="email" 
                className="form-control" 
                value={emailInput} 
                onChange={e => setEmailInput(e.target.value)} 
                placeholder="info@company.com" 
              />
            </div>
            <div className="form-group">
              <label>公式ホームページURL</label>
              <input 
                type="url" 
                className="form-control" 
                value={websiteInput} 
                onChange={e => setWebsiteInput(e.target.value)} 
                placeholder="https://company.com" 
              />
            </div>
            <div className="form-group">
              <label>本社所在地 (住所)</label>
              <input 
                type="text" 
                className="form-control" 
                value={addressInput} 
                onChange={e => setAddressInput(e.target.value)} 
                placeholder="東京都千代田区1-1" 
              />
            </div>
            <div className="form-group">
              <label>会社PR・得意分野</label>
              <textarea 
                className="form-control" 
                rows={4}
                value={prInput} 
                onChange={e => setPrInput(e.target.value)} 
                placeholder="自社の強みや稼働実績を記入してください" 
              />
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
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowAddStaffOverlay(true)} 
                className="btn-primary" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px', justifyContent: 'center', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                スタッフを追加
              </button>
              <button 
                onClick={() => {
                  setStaffRoles(Object.fromEntries(staffs.map(s => [s.id, s.role || 'staff'])));
                  setShowRoleOverlay(true);
                }}
                className="btn-secondary" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px', justifyContent: 'center', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>admin_panel_settings</span>
                権限を一括管理
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
                  {(s.furigana || s.gender || s.birthday || s.commuteMethod) && (
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {s.furigana && <span>フリガナ: {s.furigana}</span>}
                      {s.gender && <span>性別: {s.gender}</span>}
                      {s.birthday && <span>生年月日: {s.birthday}</span>}
                      {s.commuteMethod && <span>通勤: {s.commuteMethod}</span>}
                    </div>
                  )}
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
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>氏名（フルネーム） *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 鈴木 一郎" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>フリガナ *</label>
              <input type="text" required value={formData.furigana} onChange={e => setFormData({...formData, furigana: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: スズキ イチロウ" />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>性別 *</label>
                <select 
                  value={formData.gender} 
                  onChange={e => setFormData({...formData, gender: e.target.value as '男性' | '女性'})} 
                  disabled={staffSaving} 
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', fontSize: '14px' }}
                >
                  <option value="男性">男性</option>
                  <option value="女性">女性</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>生年月日 *</label>
                <input 
                  type="date" 
                  required 
                  value={formData.birthday} 
                  onChange={e => setFormData({...formData, birthday: e.target.value})} 
                  disabled={staffSaving} 
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>通勤方法 *</label>
              <select 
                value={formData.commuteMethod} 
                onChange={e => setFormData({...formData, commuteMethod: e.target.value as '公共交通機関' | '自家用車'})} 
                disabled={staffSaving} 
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', fontSize: '14px' }}
              >
                <option value="公共交通機関">公共交通機関</option>
                <option value="自家用車">自家用車</option>
              </select>
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
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>氏名（フルネーム） *</label>
              <input type="text" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: 鈴木 一郎" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>フリガナ *</label>
              <input type="text" required value={editFormData.furigana} onChange={e => setEditFormData({...editFormData, furigana: e.target.value})} disabled={staffSaving} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: スズキ イチロウ" />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>性別 *</label>
                <select 
                  value={editFormData.gender} 
                  onChange={e => setEditFormData({...editFormData, gender: e.target.value as '男性' | '女性'})} 
                  disabled={staffSaving} 
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', fontSize: '14px' }}
                >
                  <option value="男性">男性</option>
                  <option value="女性">女性</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>生年月日 *</label>
                <input 
                  type="date" 
                  required 
                  value={editFormData.birthday} 
                  onChange={e => setEditFormData({...editFormData, birthday: e.target.value})} 
                  disabled={staffSaving} 
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>通勤方法 *</label>
              <select 
                value={editFormData.commuteMethod} 
                onChange={e => setEditFormData({...editFormData, commuteMethod: e.target.value as '公共交通機関' | '自家用車'})} 
                disabled={staffSaving} 
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', fontSize: '14px' }}
              >
                <option value="公共交通機関">公共交通機関</option>
                <option value="自家用車">自家用車</option>
              </select>
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

      {/* Role Management Overlay */}
      <div className={`overlay-view ${showRoleOverlay ? 'show' : ''}`} style={{ display: showRoleOverlay ? 'flex' : 'none', transform: showRoleOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setShowRoleOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>スタッフ権限一括管理</h1>
          <button className="text-btn primary-text" onClick={handleRoleSaveClick} disabled={roleSaving}>
            保存
          </button>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            スタッフのログイン権限（管理者または一般スタッフ）を一括で管理できます。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {staffs.map(s => (
              <div key={s.id} style={{ background: 'white', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-main)' }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>{s.maskedName} / {s.baseLocation}</div>
                </div>
                <div>
                  <select
                    value={staffRoles[s.id] || 'staff'}
                    onChange={e => setStaffRoles(prev => ({ ...prev, [s.id]: e.target.value as 'admin' | 'staff' }))}
                    disabled={roleSaving}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#F8FAFC',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: 'var(--text-main)',
                      outline: 'none'
                    }}
                  >
                    <option value="staff">一般スタッフ</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
              </div>
            ))}
            {staffs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: 'white', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '13px', border: '1px dashed var(--border-color)' }}>
                登録されているスタッフはいません。
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Role Change Confirmation Modal */}
      {showRoleConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>security</span>
              スタッフ権限変更の確認
            </h3>
            
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sub)', lineHeight: '1.5' }}>
              以下のスタッフの権限を変更します。よろしいですか？
            </p>

            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', background: '#F8FAFC' }}>
              {changedRolesList.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{c.name}</span>
                  <span style={{ color: 'var(--text-sub)' }}>
                    {c.from === 'admin' ? '管理者' : '一般スタッフ'} ➔ <strong style={{ color: c.to === 'admin' ? '#0369A1' : '#475569' }}>{c.to === 'admin' ? '管理者' : '一般スタッフ'}</strong>
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1, margin: 0, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }} 
                onClick={() => setShowRoleConfirmModal(false)}
              >
                キャンセル
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1, margin: 0, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                onClick={handleRolesSaveConfirm}
                disabled={roleSaving}
              >
                {roleSaving ? '保存中...' : '変更を適用する'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
