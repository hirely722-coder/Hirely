import React, { useState, useEffect } from 'react';
import { User, Key, Bell, Shield, Calendar, MapPin, Globe, Check, Laptop, Clock } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function ProfileView() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('Lead Tech Recruiter');
  const [phone, setPhone] = useState('+1 (555) 304-4422');
  const [location, setLocation] = useState('New York, NY');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '');
        setEmail(session.user.email || '');
      }
    });
  }, []);
  
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="profile-view">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight font-sans">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage personal account credentials, assigned regions, and active log-in records.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Avatar Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 text-center shadow-sm space-y-4">
            <div className="relative inline-block">
              <div className="h-20 w-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold mx-auto font-sans">
                SJ
              </div>
              <span className="absolute bottom-0 right-1 h-3.5 w-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950 font-sans">{name}</h2>
              <p className="text-xs text-slate-400 font-medium">{title}</p>
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-2 font-mono">
                <MapPin className="h-3 w-3" />
                {location}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-around text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-900 font-mono">24</p>
                <p className="text-[10px] text-slate-400">Total Placed</p>
              </div>
              <div className="h-6 w-[1px] bg-slate-100" />
              <div>
                <p className="font-semibold text-slate-900 font-mono">94%</p>
                <p className="text-[10px] text-slate-400">Match Accuracy</p>
              </div>
            </div>
          </div>

          {/* Login History */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Device Login Logs</h3>
            
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-1.5 hover:bg-slate-50 rounded-lg">
                <Laptop className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">MacBook Pro - Chrome</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">IP: 192.168.1.45 • Active Session</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-1.5 hover:bg-slate-50 rounded-lg">
                <Laptop className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">iPhone 15 Pro - Safari</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">IP: 172.56.21.90 • 2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Account Details Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Personal details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Professional Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Location Region</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {saved ? (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 animate-pulse">
                    <Check className="h-4 w-4" />
                    Details saved successfully!
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Security: Your credentials are encrypted natively.</span>
                )}
                
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Save Profile
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
