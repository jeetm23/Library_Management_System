import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="glass-card p-8 shadow-2xl shadow-primary-500/5">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-primary-500/30 mb-4">
              <span className="text-3xl">📚</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <p className="text-dark-400 mt-2 text-sm">
              College Library Management System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email Address</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@library.edu"
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                >
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-dark-900/50 rounded-xl border border-dark-700/50">
            <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider mb-2">Demo Credentials</p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => { setEmail('admin@library.edu'); setPassword('admin123'); }}
                className="w-full text-left text-xs text-dark-300 hover:text-primary-400 transition-colors p-1.5 rounded-lg hover:bg-dark-800/50"
              >
                <span className="font-semibold text-primary-400">Admin:</span> admin@library.edu / admin123
              </button>
              <button
                type="button"
                onClick={() => { setEmail('librarian@library.edu'); setPassword('librarian123'); }}
                className="w-full text-left text-xs text-dark-300 hover:text-primary-400 transition-colors p-1.5 rounded-lg hover:bg-dark-800/50"
              >
                <span className="font-semibold text-primary-400">Librarian:</span> librarian@library.edu / librarian123
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-dark-500 text-xs mt-6">
          &copy; {new Date().getFullYear()} College Library Management System
        </p>
      </div>
    </div>
  );
};

export default Login;
