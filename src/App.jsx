import React, { useState } from 'react';
import AuthPage from './AuthPage';
import AdminDashboard from './AdminDashboard';

const TOKEN_KEY = 'admin_token';

export default function App() {
  // Tự động kiểm tra token trong localStorage xem sếp đã đăng nhập trước đó chưa
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || null);

  // Xử lý khi đăng nhập thành công từ AuthPage
  const handleLogin = (newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  // Xử lý khi bấm Đăng xuất ở AdminDashboard
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  // Nếu chưa đăng nhập -> Khóa ở ngoài màn hình AuthPage
  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Nếu đã có token -> Cho phép vào quản trị AdminDashboard
  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
