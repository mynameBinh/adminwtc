import React, { useState, useEffect, useCallback } from 'react';
import waterLogo from './assets/water.svg';
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

  // States Push Notification (Gửi thông báo về app user)
  const [pushMessage, setPushMessage] = useState('');
  const [isSendingPush, setIsSendingPush] = useState(false);

  const [gifts, setGifts] = useState([]);
  const [newGiftStreak, setNewGiftStreak] = useState('');
  const [newGiftText, setNewGiftText] = useState('');

  const [lastSyncedUser, setLastSyncedUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const BACKEND_URL = "https://binhhn21-water-check-in-backend.hf.space";

  const fetchByDate = useCallback((dateStr, isBackground = false) => {
    if (!isBackground) { setLoading(true); setError(''); }
    fetch(`${BACKEND_URL}/api/admin/checkins?date_str=${dateStr}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Không thể tải dữ liệu'); return res.json(); })
      .then(data => { setDateData(data); if (!isBackground) setLoading(false); })
      .catch(err => { if (!isBackground) { setError(err.message); setLoading(false); } });
  }, [token]);

  const fetchUserList = useCallback(() => {
    fetch(`${BACKEND_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setUserList(data.filter(u => u.role !== 'admin')); })
      .catch(err => console.error(err));
  }, [token]);

  const fetchUserDetails = useCallback((username, isBackground = false) => {
    if (!isBackground) { setLoading(true); setError(''); }
    fetch(`${BACKEND_URL}/api/admin/user-details?username=${username}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Không thể tải dữ liệu user'); return res.json(); })
      .then(data => {
        setUserData(data); setEditingGoal(data.daily_goal.toString()); setEditingTier(data.tier || '');
        setLastSyncedUser(new Date().toLocaleTimeString('vi-VN'));
        if (!isBackground) setLoading(false);
      })
      .catch(err => { if (!isBackground) { setError(err.message); setLoading(false); } });
  }, [token]);

  const fetchGifts = useCallback(() => {
    fetch(`${BACKEND_URL}/api/gifts`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setGifts(data); })
      .catch(e => console.error(e));
  }, [token]);

  useEffect(() => {
    if (viewMode === 'date') fetchByDate(selectedDate);
    else if (viewMode === 'user') {
      fetchUserList();
      // Backend không có endpoint trả check-in riêng theo user, nên ta vẫn cần
      // gọi /api/admin/checkins?date_str=... rồi lọc theo username ở dưới.
      fetchByDate(selectedDate);
      if (selectedUser) fetchUserDetails(selectedUser);
    }
    else if (viewMode === 'gifts') fetchGifts();
  }, [viewMode, selectedDate, selectedUser, fetchByDate, fetchUserList, fetchUserDetails, fetchGifts]);

  const handleUpdateGoal = async () => {
    if (!selectedUser || !editingGoal) return;
    setIsUpdatingGoal(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${selectedUser}/goal`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ daily_goal: parseInt(editingGoal) })
      });
      if (res.ok) { alert(`Đã cập nhật mục tiêu của ${selectedUser} thành ${editingGoal}ml`); fetchUserDetails(selectedUser, true); }
      else { alert('Lỗi: không thể cập nhật mục tiêu.'); }
    } catch (err) { alert('Lỗi: ' + err.message); }
    setIsUpdatingGoal(false);
  };

  const handleUpdateTier = async () => {
    if (!selectedUser || !editingTier) return;
    setIsUpdatingTier(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${selectedUser}/tier`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tier: editingTier })
      });
      if (res.ok) { alert(`Đã cập nhật danh hiệu của ${selectedUser} thành "${editingTier}"`); fetchUserDetails(selectedUser, true); }
      else { alert('Lỗi: không thể cập nhật danh hiệu.'); }
    } catch (err) { alert('Lỗi: ' + err.message); }
    setIsUpdatingTier(false);
  };

  // Tính năng Push Notification
  const handleSendPushNotification = async () => {
    if (!selectedUser || !pushMessage.trim()) return alert("Sếp vui lòng nhập nội dung thông báo nhé!");
    setIsSendingPush(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/push-notification/${selectedUser}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: pushMessage.trim() })
      });
      if (res.ok) {
        alert(`Gửi thông báo thành công đến máy của ${selectedUser}!`);
        setPushMessage('');
      } else {
        alert("Lỗi! Không thể gửi thông báo.");
      }
    } catch (err) { alert('Lỗi: ' + err.message); }
    setIsSendingPush(false);
  };

  const handleAddGift = async () => {
    if (!newGiftStreak || !newGiftText) return alert("Vui lòng nhập đủ thông tin!");
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/gifts`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ streak_required: parseInt(newGiftStreak), gift_text: newGiftText })
      });
      if (res.ok) { setNewGiftStreak(''); setNewGiftText(''); fetchGifts(); }
      else { alert("Lỗi khi thêm quà!"); }
    } catch (e) { alert("Lỗi khi thêm quà: " + e.message); }
  };

  const handleDeleteGift = async (id) => {
    if (window.confirm("Sếp chắc chắn muốn xóa mốc quà này?")) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/gifts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Xóa thất bại');
        fetchGifts();
      } catch (e) {
        alert('Lỗi khi xóa quà: ' + e.message);
      }
    }
  };

  const userLogsOnDate = dateData ? dateData.data : [];
  const totalVolumeOnDate = userLogsOnDate.reduce((sum, item) => sum + item.volume_ml, 0);
  const filteredUsers = userList.filter(u => u.username.toLowerCase().includes(searchUserQuery.toLowerCase()));
  // Backend (/api/admin/user-details) không trả danh sách check-in, chỉ trả thống kê tổng.
  // Nên check-in + ảnh của user đang xem được lọc ra từ /api/admin/checkins?date_str=selectedDate
  // (đã fetch ở trên), khớp đúng theo username đang chọn.
  const selectedUserLogsOnDate = selectedUser
    ? userLogsOnDate.filter(item => item.username === selectedUser)
    : [];

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <header className="admin-header">
          <div className="admin-header-left">
            <img src={waterLogo} alt="Logo" className="admin-logo" />
            <div>
              <h1 className="admin-title">Admin Dashboard</h1>
              <p className="admin-subtitle">Giám sát &amp; Quản lý</p>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={onLogout}>Đăng xuất</button>
        </header>

        <main className="admin-inner">
          <div className="admin-tabs">
            <button className={`admin-tab-btn ${viewMode === 'date' ? 'active' : ''}`} onClick={() => setViewMode('date')}>📅 Xem theo ngày</button>
            <button className={`admin-tab-btn ${viewMode === 'user' ? 'active' : ''}`} onClick={() => setViewMode('user')}>👥 Thông tin cá nhân</button>
            <button className={`admin-tab-btn ${viewMode === 'gifts' ? 'active' : ''}`} onClick={() => setViewMode('gifts')}>🎁 Quản lý Quà</button>
          </div>

          {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
          {error && <div className="admin-error">{error}</div>}

          {!loading && !error && viewMode === 'date' && (
            <div className="admin-section fade-in">
              <div className="admin-control-bar">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="admin-date-picker" />
              </div>
              {dateData && (
                <div className="admin-date-summary">
                  <div className="admin-stats-row">
                    <div className="admin-stat-box"><span className="stat-label">Tổng lượt Check-in</span><span className="stat-value">{dateData.total_checkins}</span></div>
                    <div className="admin-stat-box highlight"><span className="stat-label">Tổng lượng nước (ML)</span><span className="stat-value">{totalVolumeOnDate}</span></div>
                  </div>
                  <h4 className="section-label">Chi tiết Check-in:</h4>
                  {userLogsOnDate.length === 0 ? <div className="admin-empty">Không có dữ liệu uống nước nào trong ngày này.</div> : (
                    <div className="admin-grid-cards">
                      {userLogsOnDate.map((item) => (
                        <div key={item.checkin_id} className="admin-card">
                          <div className="admin-card-header"><span className="admin-card-user">@{item.username}</span><span className="admin-volume-tag">+{item.volume_ml}ml</span></div>
                          <div className="admin-card-time">🕒 Lúc: {item.time}</div>
                          <div className="admin-image-box">
                            {item.image_link_click_here !== "Không có ảnh" ? <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer"><img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" loading="lazy" /></a> : <div className="admin-no-img">🚫 Không ảnh</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!loading && !error && viewMode === 'gifts' && (
            <div className="admin-section fade-in">
              <h3 className="gift-section-title">🎀 Quản lý mốc quà tặng</h3>
              <div className="gift-add-form">
                <input type="number" placeholder="Mốc Streak..." value={newGiftStreak} onChange={e => setNewGiftStreak(e.target.value)} className="admin-search-input gift-input-streak" />
                <input type="text" placeholder="Lời nhắn phần quà..." value={newGiftText} onChange={e => setNewGiftText(e.target.value)} className="admin-search-input gift-input-text" />
                <button onClick={handleAddGift} className="updateBtn">Thêm Quà</button>
              </div>
              <div className="gift-list">
                {gifts.length === 0 ? <div className="admin-empty">Chưa có mốc quà tặng nào.</div> : gifts.map(g => (
                  <div key={g.id} className="admin-card gift-item">
                    <div>
                      <span className="gift-item-streak">🔥 Streak {g.streak_required}:</span>
                      <span className="gift-item-text">{g.gift_text}</span>
                    </div>
                    <button onClick={() => handleDeleteGift(g.id)} className="gift-delete-btn">Xóa</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && viewMode === 'user' && (
            <div className="admin-section fade-in">
              {!selectedUser ? (
                <>
                  <input type="text" placeholder="🔍 Tìm kiếm user..." value={searchUserQuery} onChange={(e) => setSearchUserQuery(e.target.value)} className="admin-search-input" />
                  <div className="admin-user-grid">
                    {filteredUsers.length === 0 ? <div className="admin-empty">Không tìm thấy user nào</div> : filteredUsers.map(u => (
                      <div key={u.username} className="admin-user-select-card" onClick={() => setSelectedUser(u.username)}><div className="user-icon">👤</div><div className="user-name">{u.username}</div></div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button className="admin-back-btn" onClick={() => { setSelectedUser(null); setUserData(null); }} style={{ marginBottom: 20 }}>⬅ Quay lại danh sách</button>
                  {userData && (
                    <>
                      <div className="admin-user-profile-card">
                        <div className="profile-header">
                          <div className="profile-avatar">👤</div>
                          <div><h2 className="profile-name">{userData.username}</h2><p className="profile-tier">{userData.tier}</p></div>
                        </div>
                        <div className="profile-stats">
                          <div className="p-stat"><span className="p-val">{userData.streak}</span><span className="p-lbl">Streak 🔥</span></div>
                          <div className="p-stat"><span className="p-val">{userData.total_checkins}</span><span className="p-lbl">Lần uống 💧</span></div>
                          <div className="p-stat"><span className="p-val">{userData.total_volume}</span><span className="p-lbl">Tổng ml 🌊</span></div>
                        </div>

                        <div className="profile-update-section">
                          <div className="update-row">
                            <div className="update-field">
                              <label className="update-field-label">🎯 Danh hiệu:</label>
                              <div className="update-field-row">
                                <input type="text" value={editingTier} onChange={(e) => setEditingTier(e.target.value)} className="admin-search-input" />
                                <button className="updateBtn" onClick={handleUpdateTier} disabled={isUpdatingTier}>{isUpdatingTier ? '...' : 'Đổi'}</button>
                              </div>
                            </div>
                            <div className="update-field">
                              <label className="update-field-label">🎯 KPI Nước (ml):</label>
                              <div className="update-field-row">
                                <input type="number" value={editingGoal} onChange={(e) => setEditingGoal(e.target.value)} className="admin-search-input" />
                                <button className="updateBtn" onClick={handleUpdateGoal} disabled={isUpdatingGoal}>{isUpdatingGoal ? '...' : 'Đổi'}</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* FORM ĐẨY THÔNG BÁO CHO USER */}
                        <div className="admin-push-panel">
                          <label className="admin-push-label">Gửi thông báo nhắc nhở trực tiếp:</label>
                          <textarea
                            rows="2"
                            placeholder="Gửi lời nhắn"
                            value={pushMessage}
                            onChange={(e) => setPushMessage(e.target.value)}
                            className="admin-push-textarea"
                          />
                          <button className="admin-push-btn-submit" onClick={handleSendPushNotification} disabled={isSendingPush}>
                            {isSendingPush ? 'Đang gửi...' : 'Gửi đi'}
                          </button>
                        </div>
                      </div>

                      <div className="admin-date-summary">
                        <div className="user-checkin-header">
                          <h4 className="user-checkin-title">
                            Chi tiết Check-in {lastSyncedUser && <span className="user-checkin-synced">· cập nhật {lastSyncedUser}</span>}
                          </h4>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="admin-date-picker user-checkin-date"
                          />
                        </div>
                        {selectedUserLogsOnDate.length === 0 ? <div className="admin-empty">{userData.username} chưa uống nước trong ngày {selectedDate}.</div> : (
                          <div className="admin-grid-cards">
                            {selectedUserLogsOnDate.map((item) => (
                              <div key={item.checkin_id} className="admin-card">
                                <div className="admin-card-header"><span className="admin-card-time" style={{ margin: 0 }}>🕒 {item.time}</span><span className="admin-volume-tag">+{item.volume_ml}ml</span></div>
                                <div className="admin-image-box" style={{ marginTop: '10px' }}>
                                  {item.image_link_click_here !== "Không có ảnh" ? <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer"><img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" loading="lazy" /></a> : <div className="admin-no-img">🚫 Không ảnh</div>}
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
        </main>
      </div>
    </div>
  );
}
