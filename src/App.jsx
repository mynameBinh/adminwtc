import React, { useState } from 'react';
import AuthPage from './AuthPage.jsx';
import AdminDashboard from './AdminDashboard';

export default function App() {
  // Tự động kiểm tra token trong localStorage xem sếp đã đăng nhập trước đó chưa
  const [token, setToken] = useState(localStorage.getItem('admin_token') || null);

  // Xử lý khi đăng nhập thành công từ AuthPage
  const handleLogin = (newToken) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  // Xử lý khi bấm Đăng xuất ở AdminDashboard
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  // Nếu chưa đăng nhập -> Khóa ở ngoài màn hình AuthPage
  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Nếu đã có token -> Cho phép vào quản trị AdminDashboard
  return <AdminDashboard token={token} onLogout={handleLogout} />;
}