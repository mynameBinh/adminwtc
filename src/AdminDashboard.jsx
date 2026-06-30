import React, { useState, useEffect, useCallback } from 'react';
import waterLogo from '../assets/water.svg';
import './AdminDashboard.css';

const getLocalDateString = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

export default function AdminDashboard({ token, onLogout }) {
  const todayStr = getLocalDateString();
  const [viewMode, setViewMode] = useState('date');

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateData, setDateData] = useState(null);

  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userList, setUserList] = useState([]); 
  const [selectedUser, setSelectedUser] = useState(null); 
  const [userData, setUserData] = useState(null); 

  const [editingGoal, setEditingGoal] = useState('');
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);

  const [editingTier, setEditingTier] = useState('');
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);

  const [gifts, setGifts] = useState([]);
  const [newGiftStreak, setNewGiftStreak] = useState('');
  const [newGiftText, setNewGiftText] = useState('');
  const [isAddingGift, setIsAddingGift] = useState(false);

  const [lastSyncedUser, setLastSyncedUser] = useState('');
  const [showInteract, setShowInteract] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const BACKEND_URL = "https://binhhn21-water-check-in-backend.hf.space";

  // Nếu backend trả 401 (token hết hạn/không hợp lệ) => tự động đăng xuất
  const handleUnauthorized = useCallback((res) => {
    if (res.status === 401) {
      onLogout();
      return true;
    }
    return false;
  }, [onLogout]);

  const fetchByDate = useCallback((dateStr, isBackground = false) => {
    if (!isBackground) { setLoading(true); setError(''); }
    fetch(`${BACKEND_URL}/api/admin/checkins?date_str=${dateStr}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        return res.json();
      })
      .then(data => { setDateData(data); if (!isBackground) setLoading(false); })
      .catch(err => { 
        if (err.message === '__unauthorized__') return;
        if (!isBackground) setError("Lỗi khi tải dữ liệu ngày!"); 
        if (!isBackground) setLoading(false); 
      });
  }, [token, handleUnauthorized]);

  const fetchAllUsers = useCallback(() => {
    fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        return res.json();
      })
      .then(data => setUserList(data))
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        console.error("Lỗi tải danh sách User:", err);
      });
  }, [token, handleUnauthorized]);

  const fetchUserRecord = useCallback((targetUsername, isBackground = false) => {
    if (!isBackground) { setLoading(true); setError(''); }
    fetch(`${BACKEND_URL}/api/admin/user-details?username=${targetUsername}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error('Không tìm thấy User này!');
        return res.json();
      })
      .then(data => { setUserData(data); if (!isBackground) setLoading(false); })
      .catch(err => { 
        if (err.message === '__unauthorized__') return;
        if (!isBackground) setError(err.message); 
        if (!isBackground) setLoading(false); 
      });
  }, [token, handleUnauthorized]);

  const fetchGifts = useCallback(() => {
    fetch(`${BACKEND_URL}/api/gifts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        return res.json();
      })
      .then(data => { if (Array.isArray(data)) setGifts(data); })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        console.error("Lỗi tải danh sách quà:", err);
      });
  }, [token, handleUnauthorized]);

  useEffect(() => {
    if (userData && userData.username !== lastSyncedUser) {
      const currentGoal = userData.daily_goal !== undefined ? userData.daily_goal : 1000;
      setEditingGoal(currentGoal);
      setEditingTier(userData.tier || 'Thành viên'); 
      setLastSyncedUser(userData.username);
    }
  }, [userData, lastSyncedUser]);

  const handleUpdateGoal = () => {
    if (!userData) return;
    setIsUpdatingGoal(true);
    fetch(`${BACKEND_URL}/api/admin/users/${userData.username}/goal`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ daily_goal: parseInt(editingGoal, 10) || 1000 })
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error('Không thể cập nhật mục tiêu uống nước!');
        return res.json();
      })
      .then(() => {
        setUserData(prev => ({ ...prev, daily_goal: parseInt(editingGoal, 10) }));
        setIsUpdatingGoal(false);
        alert(`✅ Đã đổi mục tiêu của @${userData.username} thành ${editingGoal}ml thành công!`);
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
        setIsUpdatingGoal(false);
      });
  };

  const handleUpdateTier = () => {
    if (!userData) return;
    setIsUpdatingTier(true);
    fetch(`${BACKEND_URL}/api/admin/users/${userData.username}/tier`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tier: editingTier })
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error('Không thể cập nhật danh hiệu!');
        return res.json();
      })
      .then(() => {
        setUserData(prev => ({ ...prev, tier: editingTier }));
        setIsUpdatingTier(false);
        alert(`✅ Đã phong tước hiệu "${editingTier}" cho @${userData.username} thành công!`);
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
        setIsUpdatingTier(false);
      });
  };

  const handleSendPushNotification = () => {
    if (!userData || !pushMessage.trim()) {
      alert("Sếp vui lòng nhập nội dung thông báo nhé!");
      return;
    }
    setIsSendingPush(true);
    fetch(`${BACKEND_URL}/api/admin/push-notification/${userData.username}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: pushMessage.trim() })
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error('Không thể gửi thông báo!');
        return res.json();
      })
      .then(() => {
        alert(`✅ Gửi thông báo thành công đến máy của @${userData.username}!`);
        setPushMessage('');
        setIsSendingPush(false);
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
        setIsSendingPush(false);
      });
  };

  const handleAddGift = () => {
    if (!newGiftStreak || !newGiftText.trim()) {
      alert('Vui lòng nhập đủ Mốc Streak và Lời nhắn!');
      return;
    }
    setIsAddingGift(true);
    fetch(`${BACKEND_URL}/api/admin/gifts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ streak_required: parseInt(newGiftStreak, 10), gift_text: newGiftText.trim() })
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error('Không thể thêm quà!');
        return res.json();
      })
      .then(() => {
        setNewGiftStreak('');
        setNewGiftText('');
        setIsAddingGift(false);
        fetchGifts();
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
        setIsAddingGift(false);
      });
  };

  const handleDeleteGift = (id) => {
    if (!window.confirm('Sếp chắc chắn muốn xóa mốc quà này?')) return;
    fetch(`${BACKEND_URL}/api/admin/gifts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error('Xóa thất bại!');
        fetchGifts();
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
      });
  };

  useEffect(() => {
    fetchByDate(selectedDate, false); 
    const intervalDate = setInterval(() => { fetchByDate(selectedDate, true); }, 10000);
    return () => clearInterval(intervalDate);
  }, [selectedDate, fetchByDate]);

  useEffect(() => {
    if (!selectedUser) return;
    const intervalUser = setInterval(() => { fetchUserRecord(selectedUser, true); }, 10000);
    return () => clearInterval(intervalUser);
  }, [selectedUser, fetchUserRecord]);

  useEffect(() => {
    if (viewMode === 'user' && userList.length === 0) fetchAllUsers();
  }, [viewMode, userList.length, fetchAllUsers]);

  useEffect(() => {
    if (viewMode === 'gifts') fetchGifts();
  }, [viewMode, fetchGifts]);

  const handleTabChange = (mode) => {
    setViewMode(mode);
    setError(''); 
    if (mode === 'user') {
      setSelectedUser(null);
      setUserData(null);
      setSearchUserQuery('');
      setLastSyncedUser('');
    }
  };

  const totalWaterInDay = dateData?.data?.reduce((sum, item) => sum + item.volume_ml, 0) || 0;
  const userLogsOnDate = dateData?.data?.filter(item => item.username === selectedUser) || [];
  const userWaterOnDate = userLogsOnDate.reduce((sum, item) => sum + item.volume_ml, 0);

  return (
    <div className="dashboard">
      <header className="top-bar">
        <img src={waterLogo} alt="Water logo" className="top-bar-logo" />
        <span className="top-bar-title">Quản trị Hệ thống</span>
        <button onClick={onLogout} className="logout-button">Đăng xuất</button>
      </header>

      <div className="dashboard-inner admin-inner">
        <div className="admin-tabs">
          <button className={`admin-tab-btn ${viewMode === 'date' ? 'active' : ''}`} onClick={() => handleTabChange('date')}>🗓️ Theo ngày</button>
          <button className={`admin-tab-btn ${viewMode === 'user' ? 'active' : ''}`} onClick={() => handleTabChange('user')}>👤 User</button>
          <button className={`admin-tab-btn ${viewMode === 'gifts' ? 'active' : ''}`} onClick={() => handleTabChange('gifts')}>🎁 Quà</button>
        </div>

        <main className="dashboard-main">
          {viewMode === 'date' && (
            <div className="admin-section">
              <div className="admin-filter-bar">
                <span className="admin-filter-label">Chọn ngày:</span>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="admin-date-input"/>
              </div>

              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <p className="admin-stat-label">LƯỢT CHECK-IN</p>
                  <p className="admin-stat-value text-blue">{dateData?.total_checkins || 0}</p>
                </div>
                <div className="admin-stat-card">
                  <p className="admin-stat-label">TỔNG NƯỚC UỐNG</p>
                  <p className="admin-stat-value text-green">{totalWaterInDay} ml</p>
                </div>
              </div>

              {loading && <div className="admin-status-text">🔄 Đang tải dữ liệu...</div>}
              {error && <div className="admin-status-text error">❌ {error}</div>}

              {!loading && !error && dateData && (
                <div className="admin-log-container">
                  <h2 className="admin-section-title">Nhật ký hệ thống ngày {selectedDate}</h2>
                  {(dateData.data || []).length === 0 ? (
                    <div className="admin-empty-state">Không có ai check-in vào ngày này.</div>
                  ) : (
                    <div className="admin-grid-cards">
                      {(dateData.data || []).map((item) => (
                        <div key={item.checkin_id} className="admin-card">
                          <div className="admin-card-header">
                            <span className="admin-user-name">@{item.username}</span>
                            <span className="admin-volume-tag">+{item.volume_ml}ml</span>
                          </div>
                          <div className="admin-card-time">🕒 {item.time}</div>
                          <div className="admin-image-box">
                            {item.image_link_click_here !== "Không có ảnh" ? (
                              <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer">
                                <img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" loading="lazy" />
                              </a>
                            ) : (<div className="admin-no-img">🚫 Không có ảnh</div>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {viewMode === 'user' && (
            <div className="admin-section">
              {!selectedUser && (
                <>
                  <div className="admin-filter-bar">
                    <span className="admin-filter-label">🔍</span>
                    <input 
                      type="text" placeholder="Tìm kiếm User..." 
                      value={searchUserQuery} onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>

                  {userList.length === 0 ? (
                    <div className="admin-status-text">🔄 Đang tải danh sách...</div>
                  ) : (
                    <div className="admin-user-list-grid">
                      {userList
                        .filter(u => u.username.toLowerCase().includes(searchUserQuery.toLowerCase()))
                        .map(u => (
                          <div 
                            key={u.username} className="admin-user-select-card"
                            onClick={() => { setSelectedUser(u.username); fetchUserRecord(u.username); setShowInteract(false); setPushMessage(''); }}
                          >
                            <div className="user-icon">{u.role === 'admin' ? '👑' : '👤'}</div>
                            <div className="user-name">@{u.username}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}

              {selectedUser && (
                <>
                  <button className="admin-back-btn" onClick={() => {
                    setSelectedUser(null); setUserData(null); setError(''); setLastSyncedUser(''); setShowInteract(false); setPushMessage('');
                  }}>
                    ⬅ Quay lại danh sách User
                  </button>

                  {error && <div className="admin-status-text error">❌ {error}</div>}
                  {!userData && !error && <div className="admin-status-text">🔄 Đang tải dữ liệu của @{selectedUser}...</div>}

                  {userData && (
                    <>
                      <div className="admin-profile-card">
                        <div className="profile-header">
                          <div className="profile-avatar">👤</div>
                          <div>
                            <button
                              type="button"
                              className="profile-name-btn"
                              onClick={() => setShowInteract(prev => !prev)}
                            >
                              <h2 className="admin-profile-name">{userData.tier || userData.username}</h2>
                            </button>
                            <p className="profile-tagline">@{userData.username}</p>
                          </div>
                        </div>

                        <div className="profile-stats-row">
                          <div className="profile-stat-box">
                            <span className="profile-stat-value">{userData.streak}</span>
                            <span className="profile-stat-label">Streak 🔥</span>
                          </div>
                          <div className="profile-stat-box">
                            <span className="profile-stat-value">{userData.total_checkins ?? '—'}</span>
                            <span className="profile-stat-label">Lần uống 💧</span>
                          </div>
                          <div className="profile-stat-box">
                            <span className="profile-stat-value">{userData.total_volume}</span>
                            <span className="profile-stat-label">Tổng ml 🌊</span>
                          </div>
                        </div>

                        {showInteract && (
                          <div className="profile-interact-panel fade-in">
                            <div className="interact-row">
                              <div className="interact-field">
                                <label className="interact-label">🎖️ Danh hiệu:</label>
                                <div className="interact-field-row">
                                  <input type="text" value={editingTier} onChange={(e) => setEditingTier(e.target.value)} className="admin-search-input" />
                                  <button type="button" onClick={handleUpdateTier} disabled={isUpdatingTier} className="updateBtn">
                                    {isUpdatingTier ? '...' : 'Đổi'}
                                  </button>
                                </div>
                              </div>
                              <div className="interact-field">
                                <label className="interact-label">🎯 KPI Nước (ml):</label>
                                <div className="interact-field-row">
                                  <input type="number" value={editingGoal} onChange={(e) => setEditingGoal(e.target.value)} className="admin-search-input" />
                                  <button type="button" onClick={handleUpdateGoal} disabled={isUpdatingGoal} className="updateBtn">
                                    {isUpdatingGoal ? '...' : 'Đổi'}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="push-panel">
                              <label className="interact-label">Gửi thông báo nhắc nhở trực tiếp:</label>
                              <textarea
                                rows="2"
                                placeholder="Gửi lời nhắn"
                                value={pushMessage}
                                onChange={(e) => setPushMessage(e.target.value)}
                                className="admin-push-textarea"
                              />
                              <button type="button" className="admin-push-btn-submit" onClick={handleSendPushNotification} disabled={isSendingPush}>
                                {isSendingPush ? 'Đang gửi...' : 'Gửi đi'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="admin-filter-bar" style={{ marginTop: '16px' }}>
                        <span className="admin-filter-label">Theo dõi ảnh ngày:</span>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="admin-date-input" />
                      </div>

                      <div className="admin-log-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h2 className="admin-section-title" style={{ margin: 0 }}>Nhật ký ngày {selectedDate}</h2>
                          <span className="text-green" style={{ fontWeight: 'bold' }}>Đã uống: {userWaterOnDate}ml</span>
                        </div>

                        {userLogsOnDate.length === 0 ? (
                          <div className="admin-empty-state">User này chưa uống nước hôm nay.</div>
                        ) : (
                          <div className="admin-grid-cards">
                            {userLogsOnDate.map((item) => (
                              <div key={item.checkin_id} className="admin-card">
                                <div className="admin-card-header">
                                  <span className="admin-card-time" style={{margin:0}}>🕒 {item.time}</span>
                                  <span className="admin-volume-tag">+{item.volume_ml}ml</span>
                                </div>
                                <div className="admin-image-box" style={{ marginTop: '10px' }}>
                                  {item.image_link_click_here !== "Không có ảnh" ? (
                                    <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer">
                                      <img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" loading="lazy" />
                                    </a>
                                  ) : (<div className="admin-no-img">🚫 Không ảnh</div>)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {viewMode === 'gifts' && (
            <div className="admin-section">
              <h2 className="admin-section-title">🎁 Quản lý mốc quà tặng</h2>

              <div className="admin-filter-bar" style={{ flexWrap: 'wrap' }}>
                <input
                  type="number"
                  placeholder="Mốc Streak..."
                  value={newGiftStreak}
                  onChange={(e) => setNewGiftStreak(e.target.value)}
                  className="admin-search-input"
                  style={{ flex: '0 0 110px' }}
                />
                <input
                  type="text"
                  placeholder="Lời nhắn phần quà..."
                  value={newGiftText}
                  onChange={(e) => setNewGiftText(e.target.value)}
                  className="admin-search-input"
                  style={{ flex: '1 1 160px' }}
                />
                <button type="button" onClick={handleAddGift} disabled={isAddingGift} className="updateBtn">
                  {isAddingGift ? 'Đang lưu...' : 'Thêm Quà'}
                </button>
              </div>

              <div className="admin-log-container">
                {gifts.length === 0 ? (
                  <div className="admin-empty-state">Chưa có mốc quà tặng nào.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {gifts
                      .slice()
                      .sort((a, b) => a.streak_required - b.streak_required)
                      .map((g) => (
                        <div key={g.id} className="admin-p-stat" style={{ alignItems: 'center' }}>
                          <span>
                            🔥 Streak <strong>{g.streak_required}</strong>: {g.gift_text}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteGift(g.id)}
                            className="updateBtn"
                            style={{ background: '#fee2e2', color: '#991b1b' }}
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}