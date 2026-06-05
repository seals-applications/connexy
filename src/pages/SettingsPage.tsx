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
  
  const [profileSaving, setProfileSaving] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);

  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '', maskedName: '', baseLocation: '', nearestStation: '',
    locationName: '', price: 15000,
    skills: [] as string[], carriers: [] as string[], experience: '', prText: '',
    hasCertificate: false
  });

  const availableSkills = ['キャンペーンクルー', 'クローザー', 'ディレクター'];
  const availableCarriers = ['docomo', 'au/UQmobile', 'SoftBank/Y!mobile', 'BB'];

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

  const handleProfileSave = () => {
    setProfileSaving(true);
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
      hasCertificate: formData.hasCertificate
    };

    const savedStaff = await api.addStaff(newStaff);
    setStaffs(prev => [...prev, savedStaff]);

    setFormData({
      name: '', maskedName: '', baseLocation: '', nearestStation: '',
      locationName: '', price: 15000,
      skills: [], carriers: [], experience: '', prText: '',
      hasCertificate: false
    });

    setStaffSaving(false);
    setShowStaffOverlay(false);
    alert('スタッフを登録しました');
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
            <h2>{currentUser?.name || '会社名読み込み中...'}</h2>
            <div className="premium-badge">
              <span className="material-symbols-outlined">stars</span>
              プレミアムプラン
            </div>
          </div>
        </div>

        <div className="settings-list">
          <div className="settings-group">
            <div className="settings-item" onClick={() => setShowProfileOverlay(true)}>
              <span className="material-symbols-outlined item-icon">business</span>
              <span>自社プロフィール編集</span>
              <span className="material-symbols-outlined item-arrow">chevron_right</span>
            </div>
            <div className="settings-item">
              <span className="material-symbols-outlined item-icon">payments</span>
              <span>決済連携 (Stripe)</span>
              <span className="material-symbols-outlined item-arrow">chevron_right</span>
            </div>
          </div>
          
          <div className="settings-group">
            <div className="settings-item" onClick={() => setShowStaffOverlay(true)}>
              <span className="material-symbols-outlined item-icon">groups</span>
              <span>スタッフ登録 ({staffs.length}名)</span>
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
              <input type="text" className="form-control" defaultValue="山田 太郎" />
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

      {/* Staff Register Overlay */}
      <div className={`overlay-view ${showStaffOverlay ? 'show' : ''}`} style={{ display: showStaffOverlay ? 'flex' : 'none', transform: showStaffOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setShowStaffOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>スタッフ登録</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          
          {staffs.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-sub)' }}>登録済みスタッフ</h3>
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
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>{s.baseLocation} / {s.skills.join(', ')}</div>
                    </div>
                    <button className="icon-btn-dark"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-sub)' }}>新しいスタッフを登録</h3>
          <form onSubmit={handleStaffSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            
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
              <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>※案件応募時等の基準地になります</span>
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
              <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>※ファイルをアップロードすると、プロフィールに「運営確認済」マークが付与されます</span>
            </div>

            <button type="submit" disabled={staffSaving} style={{ padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: staffSaving ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
              {staffSaving ? '登録中...' : '登録する'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
