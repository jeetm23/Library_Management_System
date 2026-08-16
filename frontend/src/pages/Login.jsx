import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineBookOpen } from 'react-icons/hi';
import libraryBg from '../assets/library-bg.png';

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
    <div className="min-h-screen flex bg-white">
      {/* Left — Library Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src={libraryBg}
          alt="Library"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary-900/40 flex flex-col items-center justify-center p-12">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
            <HiOutlineBookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-3">College Library</h2>
          <p className="text-white/80 text-center text-sm max-w-sm">
            Manage books, track issues, monitor returns, and streamline your library operations with ease.
          </p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo (mobile) */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto shadow-sm mb-4 lg:hidden">
              <HiOutlineBookOpen className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 mt-2 text-sm">
              College Library Management System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
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
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Demo Credentials</p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => { setEmail('admin@library.edu'); setPassword('admin123'); }}
                className="w-full text-left text-xs text-gray-600 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              >
                <span className="font-semibold text-primary-600">Admin:</span> admin@library.edu / admin123
              </button>
              <button
                type="button"
                onClick={() => { setEmail('librarian@library.edu'); setPassword('librarian123'); }}
                className="w-full text-left text-xs text-gray-600 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              >
                <span className="font-semibold text-primary-600">Librarian:</span> librarian@library.edu / librarian123
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs mt-6">
            &copy; {new Date().getFullYear()} College Library Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
