import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckSquare, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    console.log("🚀 SUBMIT CLICKED");
    console.log("📦 FORM DATA:", form);

    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      console.log("📡 CALLING SIGNUP API...");

      const res = await signUp(
        form.email,
        form.password,
        form.name,
        form.role
      );

      console.log("✅ SIGNUP SUCCESS:", res);

      navigate('/dashboard');

    } catch (err) {
      console.error("❌ SIGNUP ERROR:", err);

      // Show real backend error if available
      if (err?.message) {
        setError(err.message);
      } else {
        setError('Registration failed');
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <CheckSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">TaskFlow</h1>
          <p className="text-slate-400 text-sm">Team Task Manager</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="text"
              required
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Full Name"
              className="w-full px-4 py-2.5 border rounded-lg"
            />

            <input
              type="email"
              required
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-2.5 border rounded-lg"
            />

            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => update('password', e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 border rounded-lg"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-2.5"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <select
              value={form.role}
              onChange={e => update('role', e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin w-4 h-4" />}
              Create Account
            </button>

          </form>

          <p className="mt-5 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}