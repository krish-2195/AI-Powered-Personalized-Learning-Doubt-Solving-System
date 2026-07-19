import React, { useState, useEffect } from 'react';
import { User as UserIcon, Save, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function InstructorProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    bio: 'Instructor at AI Learning Platform'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        bio: 'Instructor at AI Learning Platform'
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      // In a real app, this would be a PUT /api/users/profile endpoint
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="text-indigo-400" size={32} />
            Profile Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage your personal information and instructor preferences.</p>
        </div>

        <div className="bg-surface-800 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-white/[0.06] flex items-center gap-6">
            <div className="w-24 h-24 bg-surface-700 rounded-full flex items-center justify-center border-4 border-surface-900 shadow-xl">
              <UserIcon className="text-slate-400" size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{formData.full_name || 'Instructor'}</h2>
              <p className="text-slate-400">{formData.email}</p>
              <span className="mt-2 inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">
                INSTRUCTOR ACCOUNT
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full bg-surface-900 border border-white/[0.06] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full bg-surface-900/50 border border-white/[0.06] text-slate-500 cursor-not-allowed rounded-xl px-4 py-3"
                />
                <p className="text-xs text-slate-500">Email cannot be changed.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full bg-surface-900 border border-white/[0.06] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between">
              {success ? (
                <span className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                  Profile updated successfully!
                </span>
              ) : (
                <span /> // Spacer
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
