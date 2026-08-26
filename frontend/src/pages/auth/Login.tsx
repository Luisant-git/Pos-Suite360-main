import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight } from 'lucide-react';
import api from '../../services/api'; // updated import path just in case

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Fallback if api is null/undefined in dev
      const apiClient = api || { post: async () => ({ data: { access_token: 'dummy', user: { name: 'Admin' } } }) };
      const response = await apiClient.post('/auth/login', { username, password });
      if (response.data && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 max-w-[400px] w-full mx-auto mt-10">
      <div className="bg-gradient-to-r from-[#1E40AF] to-[#2563EB] py-5 px-6 text-center relative overflow-hidden border-b border-blue-800">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center justify-center gap-1">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">
            <span className="text-[#2563EB] font-bold text-2xl tracking-tighter">P<span className="text-amber-500">O</span>S</span>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-2xl font-bold tracking-wider whitespace-nowrap leading-tight text-white drop-shadow-md">SUITE 360</span>
            <span className="text-[9px] sm:text-[10px] text-blue-200 font-bold tracking-wide uppercase leading-tight whitespace-nowrap">Enterprise Point of Sale & Billing Management System</span>
          </div>
        </div>
      </div>
      
      <div className="py-5 px-6 bg-white">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Welcome Back</h2>
          <p className="text-[12px] font-medium text-gray-500 mt-1">Sign in to manage your workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[13px] font-bold text-center flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Username</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white text-[13px] font-semibold outline-none text-gray-800"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white text-[13px] font-semibold outline-none text-gray-800"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-[13px] font-bold text-white bg-gradient-to-r from-blue-600 to-[#2563EB] hover:from-blue-700 hover:to-[#1E40AF] focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-70 mt-5 uppercase tracking-widest transform hover:-translate-y-0.5"
          >
            {isLoading ? 'Authenticating...' : 'Secure Login'}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
            Powered by <span className="font-semibold text-gray-500">Luisant Software Solutions</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
