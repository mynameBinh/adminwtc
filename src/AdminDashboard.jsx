import React, { useState, useEffect, useCallback } from 'react';
import waterLogo from '../assets/water.svg';
import './AdminDashboard.css';

const getLocalDateString = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

// Đọc thông báo lỗi từ backend (FastAPI trả {detail: "..."}), có fallback kèm mã HTTP
const readError = async (res, fallback) => {
  try {
    const d = await res.json();
    if (typeof d?.detail === 'string') return d.detail;
    if (typeof d?.detail?.message === 'string') return d.detail.message;
    if (typeof d?.message === 'string') return d.message;
  } catch (e) { /* phản hồi không phải JSON */ }
  return `${fallback} (HTTP ${res.status})`;
};

/* ── Icon SVG (nét mảnh, đồng bộ) ── */
const ICONS = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  check: <path d="M20 6 9 17l-5-5" />,
  droplet: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.4 1-3 0 1.4 1 2.5 2.5 2.5z" />,
  waves: <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  trash: <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></>,
  imageOff: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></>,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
};

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon">
      {ICONS[name]}
    </svg>
  );
}

const TABS = [
  { id: 'date',  label: 'Theo ngày',  icon: 'calendar' },
  { id: 'user',  label: 'Người dùng', icon: 'user' },
  { id: 'gifts', label: 'Quà tặng',   icon: 'gift' },
  { id: 'tasks', label: 'Mục tiêu',   icon: 'target' },
];

const PAGE_META = {
  date:  { title: 'Nhật ký check-in',  desc: 'Theo dõi lượng nước và ảnh check-in của mọi người theo từng ngày.' },
  user:  { title: 'Người dùng',        desc: 'Xem hồ sơ, chỉnh mục tiêu và gửi nhắc nhở cho từng người.' },
  gifts: { title: 'Quà tặng',          desc: 'Thiết lập phần quà khi người dùng đạt mốc streak.' },
  tasks: { title: 'Mục tiêu check-in', desc: 'Tạo mục tiêu và xem ảnh check-in được xác minh.' },
};

function DateField({ value, onChange }) {
  return (
    <label className="date-field">
      <Icon name="calendar" size={16} />
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="admin-date-input" />
    </label>
  );
}

function PhotoCard({ src, title, meta, time, tag, alt }) {
  return (
    <div className="admin-card">
      <div className="admin-image-box">
        {src ? (
          <a href={src} target="_blank" rel="noreferrer">
            <img src={src} alt={alt} loading="lazy" />
          </a>
        ) : (
          <div className="admin-no-img"><Icon name="imageOff" size={22} /><span>Không có ảnh</span></div>
        )}
        {tag && <span className="admin-volume-tag">{tag}</span>}
      </div>
      <div className="admin-card-body">
        {title && <span className="admin-user-name">{title}</span>}
        {meta && <span className="admin-card-meta">{meta}</span>}
        <span className="admin-card-time"><Icon name="clock" size={12} /> {time}</span>
      </div>
    </div>
  );
}

function Loading({ children }) {
  return <div className="admin-status-text"><span className="spinner" />{children}</div>;
}

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

  // ── Mục tiêu check-in ──
  const [tasks, setTasks] = useState([]);
  const [taskCheckins, setTaskCheckins] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskTarget, setNewTaskTarget] = useState(1);
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskListError, setTaskListError] = useState('');
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [deletingTaskIds, setDeletingTaskIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isCleaningTasks, setIsCleaningTasks] = useState(false);

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

  // ── Mục tiêu check-in: API ──
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // isBackground = true: tải ngầm (polling), không bật trạng thái "đang tải"
  const fetchTasks = useCallback((isBackground = false) => {
    if (!isBackground) setIsLoadingTasks(true);
    return fetch(`${BACKEND_URL}/api/admin/tasks`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(async res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error(await readError(res, 'Không tải được danh sách mục tiêu!'));
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu mục tiêu không hợp lệ!');
        setTasks(data);
        setTaskListError('');
        // Bỏ chọn những mục không còn tồn tại trên server
        setSelectedTaskIds(prev => prev.filter(id => data.some(x => x.id === id)));
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        console.error('Lỗi tải mục tiêu:', err);
        // Báo lỗi thay vì im lặng giữ danh sách cũ (nguyên nhân hiện "mục tiêu ma")
        setTaskListError(err.message || 'Không tải được danh sách mục tiêu!');
      })
      .finally(() => { if (!isBackground) setIsLoadingTasks(false); });
  }, [token, handleUnauthorized]);

  const fetchTaskCheckins = useCallback((dateStr) => {
    fetch(`${BACKEND_URL}/api/admin/task-checkins?date_str=${dateStr}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        return res.json();
      })
      .then(data => setTaskCheckins(data))
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        console.error('Lỗi tải check-in mục tiêu:', err);
      });
  }, [token, handleUnauthorized]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !newTaskDesc.trim()) {
      alert('Vui lòng nhập Tên mục tiêu và Mô tả thứ cần thấy trong ảnh!');
      return;
    }
    setIsAddingTask(true);
    fetch(`${BACKEND_URL}/api/admin/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        verify_description: newTaskDesc.trim(),
        target_per_day: parseInt(newTaskTarget, 10) || 1,
        assigned_to: newTaskAssignee || null,
      })
    })
      .then(async res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error(await readError(res, 'Không thể tạo mục tiêu!'));
        return res.json();
      })
      .then(() => {
        setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskTarget(1); setNewTaskAssignee('');
        setIsAddingTask(false);
        fetchTasks();
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
        setIsAddingTask(false);
      });
  };

  const handleDeleteTask = (task) => {
    const n = task.checkin_count || 0;
    const extra = n > 0 ? ` ${n} lượt check-in (kèm ảnh) của mục tiêu này cũng sẽ bị xóa.` : '';
    if (!window.confirm(`Xóa mục tiêu "${task.title}"?${extra}`)) return;
    setDeletingTaskIds(prev => [...prev, task.id]);
    fetch(`${BACKEND_URL}/api/admin/tasks/${task.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        // 404 = mục tiêu đã không còn trên server -> coi như đã xóa để dọn mục "ma" khỏi danh sách
        if (!res.ok && res.status !== 404) throw new Error(await readError(res, 'Xóa thất bại!'));
        setTasks(prev => prev.filter(x => x.id !== task.id));
        setSelectedTaskIds(prev => prev.filter(id => id !== task.id));
        fetchTasks(true);
        fetchTaskCheckins(selectedDate);
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
        fetchTasks(true); // đồng bộ lại danh sách với server
      })
      .finally(() => setDeletingTaskIds(prev => prev.filter(id => id !== task.id)));
  };

  const toggleTaskSelect = (id) =>
    setSelectedTaskIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const allTasksSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;
  const toggleSelectAllTasks = () => setSelectedTaskIds(allTasksSelected ? [] : tasks.map(x => x.id));

  const handleBulkDeleteTasks = () => {
    if (selectedTaskIds.length === 0) return;
    const totalCheckins = tasks
      .filter(x => selectedTaskIds.includes(x.id))
      .reduce((sum, x) => sum + (x.checkin_count || 0), 0);
    const extra = totalCheckins > 0 ? ` Cùng ${totalCheckins} lượt check-in (kèm ảnh) sẽ bị xóa.` : '';
    if (!window.confirm(`Xóa ${selectedTaskIds.length} mục tiêu đã chọn?${extra}`)) return;
    setIsBulkDeleting(true);
    fetch(`${BACKEND_URL}/api/admin/tasks/bulk-delete`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ids: selectedTaskIds })
    })
      .then(async res => {
        if (handleUnauthorized(res)) throw new Error('__unauthorized__');
        if (!res.ok) throw new Error(await readError(res, 'Xóa hàng loạt thất bại!'));
        return res.json();
      })
      .then(data => {
        alert(`✅ ${data.message || 'Đã xóa các mục tiêu đã chọn.'}`);
        setSelectedTaskIds([]);
        fetchTasks(true);
        fetchTaskCheckins(selectedDate);
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
        fetchTasks(true);
      })
      .finally(() => setIsBulkDeleting(false));
  };

  // Dọn mục tiêu "chỉ hôm nay" đã hết hạn, mục tiêu đã tắt và check-in mồ côi (xem trước rồi mới xóa)
  const runTaskCleanup = (dryRun) =>
    fetch(`${BACKEND_URL}/api/admin/tasks/cleanup`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ expired: true, inactive: true, orphan_checkins: true, dry_run: dryRun })
    }).then(async res => {
      if (handleUnauthorized(res)) throw new Error('__unauthorized__');
      if (!res.ok) throw new Error(await readError(res, 'Dọn dẹp thất bại!'));
      return res.json();
    });

  const handleCleanupTasks = () => {
    setIsCleaningTasks(true);
    runTaskCleanup(true)
      .then(preview => {
        if ((preview.tasks || 0) + (preview.orphan_checkins || 0) === 0) {
          alert('✨ Không có mục tiêu hết hạn / đã tắt / check-in mồ côi nào cần dọn.');
          return null;
        }
        const ok = window.confirm(
          `Sẽ xóa ${preview.tasks || 0} mục tiêu (hết hạn hoặc đã tắt, kèm ${preview.task_checkins || 0} lượt check-in) ` +
          `và ${preview.orphan_checkins || 0} check-in mồ côi. Tiếp tục?`
        );
        return ok ? runTaskCleanup(false) : null;
      })
      .then(done => {
        if (!done) return;
        alert(`✅ Đã dọn ${done.deleted_tasks || 0} mục tiêu và ${done.orphan_checkins || 0} check-in mồ côi.`);
        setSelectedTaskIds([]);
        fetchTasks(true);
        fetchTaskCheckins(selectedDate);
      })
      .catch(err => {
        if (err.message === '__unauthorized__') return;
        alert(`❌ Thất bại: ${err.message}`);
      })
      .finally(() => setIsCleaningTasks(false));
  };

  useEffect(() => {
    if (viewMode !== 'tasks') return;
    fetchTasks();
    if (userList.length === 0) fetchAllUsers();
    fetchTaskCheckins(selectedDate);
    const intervalTask = setInterval(() => { fetchTaskCheckins(selectedDate); fetchTasks(true); }, 10000);
    return () => clearInterval(intervalTask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedDate, fetchTasks, fetchTaskCheckins, fetchAllUsers]);

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


  const meta = PAGE_META[viewMode];
  const imgUrl = (path) => `${BACKEND_URL}${path}`;
  const filteredUsers = userList.filter(u => u.username.toLowerCase().includes(searchUserQuery.toLowerCase()));
  const dateLogs = dateData?.data || [];

  return (
    <div className="dashboard">
      {/* Top bar: chỉ hiện trên mobile */}
      <header className="top-bar">
        <img src={waterLogo} alt="" className="top-bar-logo" />
        <span className="top-bar-title">Quản trị hệ thống</span>
        <button type="button" onClick={onLogout} className="logout-button" aria-label="Đăng xuất">
          <Icon name="logout" size={16} />
        </button>
      </header>

      {/* Sidebar (desktop) / thanh điều hướng dưới (mobile) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={waterLogo} alt="" className="sidebar-logo" />
          <div>
            <span className="sidebar-brand-title">Water Check-in</span>
            <span className="sidebar-brand-sub">Quản trị hệ thống</span>
          </div>
        </div>

        <nav className="admin-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`admin-tab-btn ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => handleTabChange(t.id)}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <button type="button" onClick={onLogout} className="logout-button sidebar-logout">
          <Icon name="logout" size={16} />
          <span>Đăng xuất</span>
        </button>
      </aside>

      <div className="dashboard-inner admin-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">{meta.title}</h1>
            <p className="page-desc">{meta.desc}</p>
          </div>
          {viewMode === 'date' && <DateField value={selectedDate} onChange={setSelectedDate} />}
        </div>

        <main className="dashboard-main">
          {/* ═════════ THEO NGÀY ═════════ */}
          {viewMode === 'date' && (
            <div className="admin-section">
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <span className="stat-icon blue"><Icon name="check" size={20} /></span>
                  <div>
                    <p className="admin-stat-label">Lượt check-in</p>
                    <p className="admin-stat-value">{dateData?.total_checkins || 0}</p>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-icon green"><Icon name="droplet" size={20} /></span>
                  <div>
                    <p className="admin-stat-label">Tổng nước uống</p>
                    <p className="admin-stat-value">{totalWaterInDay.toLocaleString('vi-VN')} <small>ml</small></p>
                  </div>
                </div>
              </div>

              {loading && <Loading>Đang tải dữ liệu...</Loading>}
              {error && <div className="admin-status-text error">{error}</div>}

              {!loading && !error && dateData && (
                <div className="admin-log-container">
                  <div className="card-head">
                    <div>
                      <h2 className="admin-section-title">Nhật ký ngày {selectedDate}</h2>
                    </div>
                    <span className="count-pill">{dateLogs.length} lượt</span>
                  </div>
                  {dateLogs.length === 0 ? (
                    <div className="admin-empty-state">
                      <Icon name="imageOff" size={28} />
                      <p>Không có ai check-in vào ngày này.</p>
                    </div>
                  ) : (
                    <div className="admin-grid-cards">
                      {dateLogs.map((item) => (
                        <PhotoCard
                          key={item.checkin_id}
                          src={item.image_link_click_here !== 'Không có ảnh' ? imgUrl(item.image_link_click_here) : null}
                          title={`@${item.username}`}
                          time={item.time}
                          tag={`+${item.volume_ml}ml`}
                          alt="Check-in"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═════════ NGƯỜI DÙNG ═════════ */}
          {viewMode === 'user' && (
            <div className="admin-section">
              {!selectedUser && (
                <>
                  <label className="search-field">
                    <Icon name="search" size={16} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm người dùng..."
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                    />
                  </label>

                  {userList.length === 0 ? (
                    <Loading>Đang tải danh sách...</Loading>
                  ) : filteredUsers.length === 0 ? (
                    <div className="admin-empty-state">
                      <Icon name="search" size={28} />
                      <p>Không tìm thấy người dùng phù hợp.</p>
                    </div>
                  ) : (
                    <div className="admin-user-list-grid">
                      {filteredUsers.map(u => (
                        <button
                          type="button"
                          key={u.username}
                          className="admin-user-select-card"
                          onClick={() => { setSelectedUser(u.username); fetchUserRecord(u.username); setShowInteract(false); setPushMessage(''); }}
                        >
                          <span className="user-avatar">{u.username.charAt(0).toUpperCase()}</span>
                          <span className="user-name">@{u.username}</span>
                          {u.role === 'admin' && <span className="role-pill">Admin</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedUser && (
                <>
                  <button
                    type="button"
                    className="admin-back-btn"
                    onClick={() => {
                      setSelectedUser(null); setUserData(null); setError(''); setLastSyncedUser(''); setShowInteract(false); setPushMessage('');
                    }}
                  >
                    <Icon name="back" size={16} /> Danh sách người dùng
                  </button>

                  {error && <div className="admin-status-text error">{error}</div>}
                  {!userData && !error && <Loading>Đang tải dữ liệu của @{selectedUser}...</Loading>}

                  {userData && (
                    <>
                      <div className="admin-profile-card">
                        <div className="profile-banner" />
                        <div className="profile-body">
                          <div className="profile-header">
                            <div className="profile-avatar">{(userData.username || '?').charAt(0).toUpperCase()}</div>
                            <div className="profile-meta">
                              <h2 className="admin-profile-name">{userData.tier || userData.username}</h2>
                              <p className="profile-tagline">@{userData.username}</p>
                            </div>
                            <button
                              type="button"
                              className="updateBtn"
                              aria-expanded={showInteract}
                              onClick={() => setShowInteract(prev => !prev)}
                            >
                              <Icon name="sliders" size={15} /> {showInteract ? 'Thu gọn' : 'Quản lý'}
                            </button>
                          </div>

                          <div className="profile-stats-row">
                            <div className="profile-stat-box">
                              <span className="profile-stat-label"><Icon name="flame" size={14} /> Streak</span>
                              <span className="profile-stat-value">{userData.streak}</span>
                            </div>
                            <div className="profile-stat-box">
                              <span className="profile-stat-label"><Icon name="droplet" size={14} /> Lần uống</span>
                              <span className="profile-stat-value">{userData.total_checkins ?? '—'}</span>
                            </div>
                            <div className="profile-stat-box">
                              <span className="profile-stat-label"><Icon name="waves" size={14} /> Tổng ml</span>
                              <span className="profile-stat-value">{userData.total_volume}</span>
                            </div>
                          </div>

                          {showInteract && (
                            <div className="profile-interact-panel fade-in">
                              <div className="interact-row">
                                <div className="interact-field">
                                  <label className="interact-label">Danh hiệu</label>
                                  <div className="interact-field-row">
                                    <input type="text" value={editingTier} onChange={(e) => setEditingTier(e.target.value)} className="updateInput" />
                                    <button type="button" onClick={handleUpdateTier} disabled={isUpdatingTier} className="updateBtn primary">
                                      {isUpdatingTier ? '...' : 'Đổi'}
                                    </button>
                                  </div>
                                </div>
                                <div className="interact-field">
                                  <label className="interact-label">KPI nước (ml)</label>
                                  <div className="interact-field-row">
                                    <input type="number" value={editingGoal} onChange={(e) => setEditingGoal(e.target.value)} className="updateInput" />
                                    <button type="button" onClick={handleUpdateGoal} disabled={isUpdatingGoal} className="updateBtn primary">
                                      {isUpdatingGoal ? '...' : 'Đổi'}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="push-panel">
                                <label className="interact-label">Gửi thông báo nhắc nhở trực tiếp</label>
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
                      </div>

                      <div className="admin-log-container">
                        <div className="card-head">
                          <div>
                            <h2 className="admin-section-title">Ảnh check-in</h2>
                            <p className="card-sub">Đã uống <strong className="text-green">{userWaterOnDate} ml</strong> trong ngày {selectedDate}</p>
                          </div>
                          <DateField value={selectedDate} onChange={setSelectedDate} />
                        </div>

                        {userLogsOnDate.length === 0 ? (
                          <div className="admin-empty-state">
                            <Icon name="droplet" size={28} />
                            <p>User này chưa uống nước trong ngày đã chọn.</p>
                          </div>
                        ) : (
                          <div className="admin-grid-cards">
                            {userLogsOnDate.map((item) => (
                              <PhotoCard
                                key={item.checkin_id}
                                src={item.image_link_click_here !== 'Không có ảnh' ? imgUrl(item.image_link_click_here) : null}
                                time={item.time}
                                tag={`+${item.volume_ml}ml`}
                                alt="Check-in"
                              />
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

          {/* ═════════ QUÀ TẶNG ═════════ */}
          {viewMode === 'gifts' && (
            <div className="admin-section">
              <div className="admin-log-container">
                <div className="card-head">
                  <div>
                    <h2 className="admin-section-title">Thêm mốc quà</h2>
                    <p className="card-sub">Người dùng đạt đủ số ngày streak sẽ nhận lời nhắn quà này.</p>
                  </div>
                </div>
                <div className="form-grid gift-form">
                  <div className="form-field">
                    <label className="interact-label">Mốc streak</label>
                    <input type="number" placeholder="Ví dụ: 7" value={newGiftStreak} onChange={(e) => setNewGiftStreak(e.target.value)} className="updateInput" />
                  </div>
                  <div className="form-field">
                    <label className="interact-label">Lời nhắn phần quà</label>
                    <input type="text" placeholder="Lời nhắn phần quà..." value={newGiftText} onChange={(e) => setNewGiftText(e.target.value)} className="updateInput" />
                  </div>
                  <button type="button" onClick={handleAddGift} disabled={isAddingGift} className="updateBtn primary form-submit">
                    {isAddingGift ? 'Đang lưu...' : 'Thêm quà'}
                  </button>
                </div>
              </div>

              <div className="admin-log-container">
                <div className="card-head">
                  <h2 className="admin-section-title">Danh sách mốc quà</h2>
                  <span className="count-pill">{gifts.length} mốc</span>
                </div>
                {gifts.length === 0 ? (
                  <div className="admin-empty-state">
                    <Icon name="gift" size={28} />
                    <p>Chưa có mốc quà tặng nào.</p>
                  </div>
                ) : (
                  <div className="list-stack">
                    {gifts.slice().sort((a, b) => a.streak_required - b.streak_required).map((g) => (
                      <div key={g.id} className="list-row">
                        <span className="streak-badge"><Icon name="flame" size={14} /> {g.streak_required}</span>
                        <span className="list-row-main">{g.gift_text}</span>
                        <button type="button" onClick={() => handleDeleteGift(g.id)} className="updateBtn danger">
                          <Icon name="trash" size={14} /> Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════ MỤC TIÊU ═════════ */}
          {viewMode === 'tasks' && (
            <div className="admin-section">
              <div className="admin-log-container">
                <div className="card-head">
                  <div>
                    <h2 className="admin-section-title">Tạo mục tiêu mới</h2>
                    <p className="card-sub">Claude dựa vào mô tả để kiểm tra ảnh check-in.</p>
                  </div>
                </div>
                <div className="form-grid task-form">
                  <div className="form-field span-2">
                    <label className="interact-label">Tên mục tiêu</label>
                    <input type="text" placeholder="Ví dụ: Tập thể dục" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="updateInput" maxLength={100} />
                  </div>
                  <div className="form-field span-2">
                    <label className="interact-label">Thứ phải thấy trong ảnh</label>
                    <textarea
                      rows="3"
                      placeholder="Mô tả thứ nhìn thấy được trong ảnh. Ví dụ: người đang tập gym, chạy bộ hoặc dụng cụ thể thao đang được sử dụng"
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      className="admin-push-textarea"
                      maxLength={300}
                    />
                  </div>
                  <div className="form-field">
                    <label className="interact-label">Số lần / ngày</label>
                    <input type="number" min="1" max="20" value={newTaskTarget} onChange={(e) => setNewTaskTarget(e.target.value)} className="updateInput" />
                  </div>
                  <div className="form-field">
                    <label className="interact-label">Giao cho</label>
                    <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className="updateInput">
                      <option value="">Tất cả mọi người</option>
                      {userList.filter(u => u.role !== 'admin').map(u => (
                        <option key={u.username} value={u.username}>@{u.username}</option>
                      ))}
                    </select>
                  </div>
                  <div className="span-2 form-actions">
                    <button type="button" className="admin-push-btn-submit" onClick={handleAddTask} disabled={isAddingTask}>
                      {isAddingTask ? 'Đang lưu...' : 'Tạo mục tiêu'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-log-container">
                <div className="card-head">
                  <h2 className="admin-section-title">Danh sách mục tiêu</h2>
                  <span className="count-pill">{tasks.length} mục tiêu</span>
                </div>

                {taskListError && (
                  <div
                    role="alert"
                    style={{
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
                      margin: '4px 0 12px', padding: '10px 12px', borderRadius: 10,
                      background: 'rgba(220, 38, 38, 0.1)', color: '#b91c1c', fontSize: 14,
                    }}
                  >
                    <span>⚠️ {taskListError}. Danh sách bên dưới có thể đã cũ.</span>
                    <button type="button" className="updateBtn" onClick={() => fetchTasks(false)} disabled={isLoadingTasks}>
                      Thử lại
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={allTasksSelected}
                      onChange={toggleSelectAllTasks}
                      disabled={tasks.length === 0}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    Chọn tất cả
                  </label>
                  <button
                    type="button"
                    className="updateBtn danger"
                    onClick={handleBulkDeleteTasks}
                    disabled={selectedTaskIds.length === 0 || isBulkDeleting}
                  >
                    {isBulkDeleting ? 'Đang xóa...' : `Xóa đã chọn (${selectedTaskIds.length})`}
                  </button>
                  <button type="button" className="updateBtn" onClick={handleCleanupTasks} disabled={isCleaningTasks}>
                    {isCleaningTasks ? 'Đang dọn...' : 'Dọn hết hạn / đã tắt'}
                  </button>
                  <button type="button" className="updateBtn" onClick={() => fetchTasks(false)} disabled={isLoadingTasks}>
                    {isLoadingTasks ? 'Đang tải...' : 'Làm mới'}
                  </button>
                </div>

                {tasks.length === 0 ? (
                  isLoadingTasks ? (
                    <Loading>Đang tải mục tiêu...</Loading>
                  ) : (
                    <div className="admin-empty-state">
                      <Icon name="target" size={28} />
                      <p>Chưa có mục tiêu nào.</p>
                    </div>
                  )
                ) : (
                  <div className="list-stack">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className="list-row task-row"
                        style={{ opacity: deletingTaskIds.includes(t.id) ? 0.5 : 1 }}
                      >
                        <div className="list-row-main">
                          <div className="task-title">
                            <input
                              type="checkbox"
                              checked={selectedTaskIds.includes(t.id)}
                              onChange={() => toggleTaskSelect(t.id)}
                              aria-label={`Chọn mục tiêu ${t.title}`}
                              style={{ width: 16, height: 16, marginRight: 8, verticalAlign: 'middle', cursor: 'pointer' }}
                            />
                            {t.title}
                          </div>
                          <div className="task-meta">
                            <span className="pill">{t.target_per_day} lần/ngày</span>
                            <span className="pill">{t.assigned_to ? `@${t.assigned_to}` : 'Tất cả'}</span>
                            {t.created_by && <span className="pill">Tự tạo bởi @{t.created_by}</span>}
                            {t.is_expired && <span className="pill">Hết hạn</span>}
                            {t.is_active === false && <span className="pill">Đã tắt</span>}
                            {typeof t.checkin_count === 'number' && <span className="pill">{t.checkin_count} check-in</span>}
                          </div>
                          <div className="task-desc"><Icon name="camera" size={13} /> {t.verify_description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t)}
                          disabled={deletingTaskIds.includes(t.id)}
                          className="updateBtn danger icon-only"
                          aria-label="Xóa mục tiêu"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-log-container">
                <div className="card-head">
                  <div>
                    <h2 className="admin-section-title">Check-in mục tiêu</h2>
                    <p className="card-sub">Ngày {selectedDate}</p>
                  </div>
                  <DateField value={selectedDate} onChange={setSelectedDate} />
                </div>
                {!taskCheckins ? (
                  <Loading>Đang tải...</Loading>
                ) : (taskCheckins.data || []).length === 0 ? (
                  <div className="admin-empty-state">
                    <Icon name="camera" size={28} />
                    <p>Chưa có ai check-in mục tiêu vào ngày này.</p>
                  </div>
                ) : (
                  <div className="admin-grid-cards">
                    {taskCheckins.data.map((item) => (
                      <PhotoCard
                        key={item.checkin_id}
                        src={item.image_url ? imgUrl(item.image_url) : null}
                        title={`@${item.username}`}
                        meta={item.task_title}
                        time={item.time}
                        alt="Check-in mục tiêu"
                      />
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