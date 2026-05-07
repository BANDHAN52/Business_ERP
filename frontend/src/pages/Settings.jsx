import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { PageHeader, Toast } from '../components/ui';

const ACCENTS = [
  { id: 'blue',   label: 'Ocean Blue',  light: '#185FA5', dark: '#63b3ed' },
  { id: 'teal',   label: 'Teal Green',  light: '#1D9E75', dark: '#5DCAA5' },
  { id: 'purple', label: 'Purple',      light: '#534AB7', dark: '#AFA9EC' },
  { id: 'coral',  label: 'Coral Red',   light: '#993C1D', dark: '#F0997B' },
  { id: 'amber',  label: 'Amber',       light: '#BA7517', dark: '#EF9F27' },
];

export default function Settings() {
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return showToast('Passwords do not match', 'error');
    if (pwForm.newPassword.length < 6)
      return showToast('Password must be at least 6 characters', 'error');
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}/password`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Customize your BizERP experience" />

      {/* Appearance */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Appearance</h2>

        {/* Theme toggle */}
        <div className="mb-5">
          <label className="label">Theme</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {['light', 'dark'].map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className={`relative flex flex-col gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer
                  ${theme === t
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                {/* Mini preview */}
                <div className={`rounded-lg overflow-hidden h-14 flex ${t === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                  <div className="w-8 bg-gray-800" />
                  <div className="flex-1 p-1.5 space-y-1">
                    <div className={`h-2 rounded ${t === 'dark' ? 'bg-gray-700' : 'bg-white'}`} />
                    <div className="grid grid-cols-2 gap-1">
                      <div className={`h-4 rounded ${t === 'dark' ? 'bg-gray-700' : 'bg-white'}`} />
                      <div className={`h-4 rounded ${t === 'dark' ? 'bg-gray-700' : 'bg-white'}`} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{t} Mode</span>
                  {theme === t && (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <label className="label">Accent Color</label>
          <div className="flex gap-3 mt-2 flex-wrap">
            {ACCENTS.map(a => (
              <button key={a.id} onClick={() => setAccent(a.id)} title={a.label}
                className={`group flex flex-col items-center gap-1.5 cursor-pointer`}>
                <div className={`w-8 h-8 rounded-full border-2 transition-all
                  ${accent === a.id ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ background: theme === 'dark' ? a.dark : a.light }} />
                <span className="text-[10px] text-gray-400">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Account Information</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold text-white">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-block mt-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={pwForm.currentPassword}
              onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={pwForm.newPassword}
              onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={pwForm.confirmPassword}
              onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* About */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">About</h2>
        <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
          <p><span className="font-medium text-gray-700 dark:text-gray-300">BizERP</span> — Small Business Suite v1.0.0</p>
          <p>React.js + Node.js + PostgreSQL</p>
          {/* <p className="pt-2 text-xs">© 2025 RH BANDHAN. All rights reserved.</p> */}
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
