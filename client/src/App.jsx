import { useState, useEffect } from 'react';
import axios from 'axios';

// Configuration
// We use an empty string because the backend serves this file
axios.defaults.withCredentials = true;
const API_URL = ''; 

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if the user is already logged in when the app starts
  useEffect(() => {
    axios.get(`${API_URL}/api/current_user`)
      .then(res => setUser(res.data || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <span className="text-xl font-bold text-indigo-600">SalesCast</span>
          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{user.display_name} ({user.role})</span>
                <a href={`${API_URL}/api/logout`} className="text-sm text-slate-500 hover:text-red-500 transition">Logout</a>
              </div>
            ) : (
              <a href={`${API_URL}/auth/google`} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition shadow-sm">
                Login with Google
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {!user ? (
          <div className="text-center mt-20">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Forecasting Simplified.</h1>
            <p className="mt-4 text-lg text-slate-600">Please log in to manage your forecast.</p>
            <div className="mt-8">
                <a href={`${API_URL}/auth/google`} className="inline-block bg-white border border-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-50 transition shadow-sm">
                    Sign in with Google Workspace
                </a>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Individual Forecast Form */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="border-b border-slate-100 pb-4 mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">My Forecast Submission</h2>
                  <p className="text-sm text-slate-500">Update your numbers for the current month.</p>
              </div>
              <ForecastForm user={user} />
            </div>

            {/* 2. Manager Rollup View */}
            {(user.role === 'Manager' || user.role === 'Admin') && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Team Rollup</h2>
                        <p className="text-sm text-slate-500">Aggregated view of your direct reports.</p>
                    </div>
                    <button 
                      onClick={() => window.open(`${API_URL}/api/export`, '_blank')}
                      className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition shadow-sm flex items-center gap-2">
                      <span>Download CSV</span>
                    </button>
                 </div>
                 <ManagerRollup />
              </div>
            )}

            {/* 3. Admin Panel */}
            {user.role === 'Admin' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold mb-4 text-slate-800">Admin: Whitelist Management</h2>
                <AdminPanel />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// --- Component: Forecast Form ---
function ForecastForm({ user }) {
  // Default to current month first day
  const getCurrentMonth = () => {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [formData, setFormData] = useState({ 
      quota: 0, 
      commit: 0, 
      best_case: 0, 
      period: getCurrentMonth() 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await axios.post(`${API_URL}/api/forecast`, formData);
        alert('Forecast Saved Successfully!');
    } catch (err) {
        alert('Error saving forecast.');
        console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
       <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Period</label>
        <input type="date" required className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
          value={formData.period}
          onChange={e => setFormData({...formData, period: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Quota ($)</label>
        <input type="number" required className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
          value={formData.quota}
          onChange={e => setFormData({...formData, quota: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Commit ($)</label>
        <input type="number" required className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
          value={formData.commit}
          onChange={e => setFormData({...formData, commit: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Best Case ($)</label>
        <input type="number" required className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
          value={formData.best_case}
          onChange={e => setFormData({...formData, best_case: e.target.value})} />
      </div>
      <div className="md:col-span-4 flex justify-end">
        <button type="submit" className="bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700 font-medium shadow-sm transition">
            Save Forecast
        </button>
      </div>
    </form>
  );
}

// --- Component: Manager Rollup ---
function ManagerRollup() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    axios.get(`${API_URL}/api/rollup`)
        .then(res => setData(res.data))
        .catch(err => console.error(err));
  }, []);

  const totalQuota = data.reduce((acc, curr) => acc + parseFloat(curr.quota || 0), 0);
  const totalCommit = data.reduce((acc, curr) => acc + parseFloat(curr.commit_amount || 0), 0);
  const totalBestCase = data.reduce((acc, curr) => acc + parseFloat(curr.best_case || 0), 0);

  if (data.length === 0) return <div className="text-slate-500 italic text-sm">No direct reports found or no data submitted yet.</div>;

  return (
    <div className="overflow-x-auto border rounded-lg border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rep Name</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Quota</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Commit</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Best Case</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{row.display_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">${parseFloat(row.quota).toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-600 font-bold">${parseFloat(row.commit_amount).toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">${parseFloat(row.best_case).toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-bold">
            <td className="px-6 py-4 text-slate-800">Total Team</td>
            <td className="px-6 py-4 text-right text-slate-800">${totalQuota.toLocaleString()}</td>
            <td className="px-6 py-4 text-right text-emerald-700">${totalCommit.toLocaleString()}</td>
            <td className="px-6 py-4 text-right text-blue-700">${totalBestCase.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// --- Component: Admin Panel ---
function AdminPanel() {
  const [email, setEmail] = useState('');
  
  const handleWhitelist = async (e) => {
    e.preventDefault();
    if(!email) return;
    try {
        await axios.post(`${API_URL}/api/admin/whitelist`, { email });
        setEmail('');
        alert(`${email} has been whitelisted!`);
    } catch (err) {
        alert('Error adding user. Ensure you are an Admin.');
    }
  };
  
  return (
    <form onSubmit={handleWhitelist} className="flex gap-3 max-w-lg">
      <input type="email" placeholder="colleague@company.com" required 
        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
        value={email} onChange={e => setEmail(e.target.value)} />
      <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-900 transition font-medium whitespace-nowrap shadow-sm">
        Add to Whitelist
      </button>
    </form>
  );
}

export default App;