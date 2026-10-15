
import React, { useState } from 'react';
import { apiService } from '../services/api';
import { Icons } from './Icons';

interface LoginProps {
  onLogin: (user: any, token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiService.login({ username, password });
      if (res.success) {
        if (res.user?.role === 'cert') {
          setError('Access denied');
          return;
        }
        onLogin(res.user, res.accessToken);
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 bg-blue-600 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
            <Icons.Settings className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold">Minmini CRM</h1>
          <p className="text-blue-100 text-sm mt-1">Institutional Access Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{error}</div>}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase">Username</label>
            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Username" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
