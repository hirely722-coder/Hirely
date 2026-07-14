import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { useApp } from '@/context/AdminAppContext';
import { 
  Star, MessageSquare, AlertCircle, RefreshCw, CheckCircle2, 
  X, Trash2, ShieldAlert, Award, ThumbsUp, EyeOff, Edit, 
  Search, Filter, ChevronLeft, ChevronRight, BarChart3, TrendingUp
} from 'lucide-react';

export default function AdminTestimonials() {
  const { showToast } = useApp();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  
  // Data states
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Query states
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected testimonials for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Note edit state
  const [editingNotesTestimonial, setEditingNotesTestimonial] = useState<any>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // View details modal state
  const [viewingTestimonial, setViewingTestimonial] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Testimonials list
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) queryParams.append('search', search);
      if (filterStatus) queryParams.append('status', filterStatus);
      if (filterRating) queryParams.append('rating', filterRating);

      const listData = await fetchAdminApi(`/api/superadmin/testimonials?${queryParams.toString()}`);
      setTestimonials(listData.testimonials || []);
      setTotalReviews(listData.total || 0);

      // 2. Fetch Analytics
      const analData = await fetchAdminApi('/api/superadmin/testimonials/analytics');
      setAnalytics(analData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load testimonials', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, filterStatus, filterRating]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleAction = async (id: string, updates: any, successMsg: string) => {
    try {
      const updated = await fetchAdminApi(`/api/superadmin/testimonials/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      
      // Update local state list
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      showToast(`✓ ${successMsg}`);
      
      // Reload analytics in background
      fetchAdminApi('/api/superadmin/testimonials/analytics').then(setAnalytics).catch(() => {});
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial permanently?')) return;
    try {
      await fetchAdminApi(`/api/superadmin/testimonials/${id}`, {
        method: 'DELETE'
      });
      setTestimonials(prev => prev.filter(t => t.id !== id));
      showToast('✓ Testimonial deleted permanently.');
      
      // Reload list and analytics
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'Approve' | 'Rejected' | 'Hidden' | 'Delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'Delete' && !confirm(`Are you sure you want to delete ${selectedIds.length} testimonials permanently?`)) return;

    let successCount = 0;
    for (const id of selectedIds) {
      try {
        if (action === 'Delete') {
          await fetchAdminApi(`/api/superadmin/testimonials/${id}`, { method: 'DELETE' });
        } else {
          await fetchAdminApi(`/api/superadmin/testimonials/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: action })
          });
        }
        successCount++;
      } catch (e) {}
    }

    showToast(`✓ Bulk action completed: ${successCount} reviews updated.`);
    setSelectedIds([]);
    loadData();
  };

  const openNotesModal = (t: any) => {
    setEditingNotesTestimonial(t);
    setNotesText(t.adminNotes || '');
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotesTestimonial) return;
    setSavingNotes(true);

    try {
      await handleAction(editingNotesTestimonial.id, { adminNotes: notesText }, 'Admin notes updated.');
      setEditingNotesTestimonial(null);
    } catch (e) {
    } finally {
      setSavingNotes(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === testimonials.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(testimonials.map(t => t.id));
    }
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">Testimonials & Feedback Control</h1>
          <p className="text-xs text-slate-500 font-medium">Verify early adopter reviews, approve feedback for public showcase, and audit live CSAT ratings.</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Analytics KPI Widgets */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Reviews</p>
            <h3 className="text-xl font-extrabold text-slate-900 font-display mt-1">{analytics.total}</h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pending Approval</p>
            <h3 className="text-xl font-extrabold text-amber-600 font-display mt-1">{analytics.pending}</h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Approved & Published</p>
            <h3 className="text-xl font-extrabold text-emerald-600 font-display mt-1">{analytics.approved}</h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Average Rating</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
              <h3 className="text-xl font-extrabold text-slate-900 font-display">{analytics.avgRating} / 5.0</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs col-span-2 lg:col-span-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Approval Rate</p>
            <h3 className="text-xl font-extrabold text-indigo-600 font-display mt-1">{analytics.conversionRate}%</h3>
          </div>

        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-xs font-semibold">
        <button 
          onClick={() => setActiveTab('list')}
          className={`pb-3 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === 'list' 
              ? 'text-indigo-600 border-b-2 border-indigo-600' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Reviews Management</span>
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === 'analytics' 
              ? 'text-indigo-600 border-b-2 border-indigo-600' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Feedback Analytics</span>
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-4">
          
          {/* Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
                Search
              </button>
            </form>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Hidden">Hidden</option>
              </select>

              <select
                value={filterRating}
                onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
                className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
              >
                <option value="">All Ratings</option>
                <option value="5">⭐⭐⭐⭐⭐</option>
                <option value="4">⭐⭐⭐⭐</option>
                <option value="3">⭐⭐⭐</option>
                <option value="2">⭐⭐</option>
                <option value="1">⭐</option>
              </select>

              {/* Bulk Actions */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 animate-scale-up">
                  <span className="text-[10px] font-bold text-indigo-700 font-mono">{selectedIds.length} Selected</span>
                  <button onClick={() => handleBulkAction('Approve')} className="text-[10px] font-bold text-emerald-700 hover:underline">Approve</button>
                  <button onClick={() => handleBulkAction('Rejected')} className="text-[10px] font-bold text-amber-700 hover:underline">Reject</button>
                  <button onClick={() => handleBulkAction('Hidden')} className="text-[10px] font-bold text-slate-600 hover:underline">Hide</button>
                  <button onClick={() => handleBulkAction('Delete')} className="text-[10px] font-bold text-rose-700 hover:underline">Delete</button>
                </div>
              )}
            </div>

          </div>

          {/* Table list */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-xs font-mono">Loading testimonials database...</div>
              ) : testimonials.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-mono">No testimonials found matching your criteria.</div>
              ) : (
                <table className="w-full border-collapse text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
                    <tr>
                      <th className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === testimonials.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                      </th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Designation & Company</th>
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4">Review</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {testimonials.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t.id)}
                            onChange={() => handleCheckboxChange(t.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {t.profilePhoto ? (
                              <img src={t.profilePhoto} alt="Customer" className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                                {t.customerName.substring(0,2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900">{t.customerName}</p>
                              <p className="text-[10px] text-slate-400">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{t.designation || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400">{t.companyName || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={`h-3 w-3 ${
                                  idx < t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                }`} 
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate" title={t.review}>
                          {t.review}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : t.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : t.status === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-slate-50 text-slate-700 border border-slate-100'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-slate-400 font-mono">
                          {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {/* View details */}
                            <button onClick={() => setViewingTestimonial(t)} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer" title="View Detail">
                              <AlertCircle className="h-4 w-4" />
                            </button>

                            {/* Approve */}
                            {t.status !== 'Approved' && (
                              <button onClick={() => handleAction(t.id, { status: 'Approved' }, 'Testimonial approved!')} className="p-1 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg cursor-pointer" title="Approve">
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Feature */}
                            {t.status === 'Approved' && (
                              <button 
                                onClick={() => handleAction(t.id, { featured: !t.featured }, t.featured ? 'Removed from featured list.' : 'Marked as featured!')} 
                                className={`p-1 rounded-lg cursor-pointer ${
                                  t.featured ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'
                                }`} 
                                title={t.featured ? 'Unfeature' : 'Feature'}
                              >
                                <Award className="h-4 w-4" />
                              </button>
                            )}

                            {/* Reject / Hide */}
                            {t.status === 'Approved' ? (
                              <button onClick={() => handleAction(t.id, { status: 'Hidden' }, 'Testimonial hidden.')} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer" title="Hide">
                                <EyeOff className="h-4 w-4" />
                              </button>
                            ) : t.status !== 'Rejected' ? (
                              <button onClick={() => handleAction(t.id, { status: 'Rejected' }, 'Testimonial rejected.')} className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer" title="Reject">
                                <ShieldAlert className="h-4 w-4" />
                              </button>
                            ) : null}

                            {/* Notes */}
                            <button onClick={() => openNotesModal(t)} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer" title="Notes">
                              <Edit className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalReviews > limit && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                <p>Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, totalReviews)} of {totalReviews} reviews</p>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button 
                    disabled={page * limit >= totalReviews}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* Analytics Tab */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {analytics ? (
            <>
              {/* Distribution Chart */}
              <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">Rating Distribution</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider font-mono">Overview of ratings left by early adopters</p>
                </div>
                
                <div className="space-y-4">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = analytics.distribution[stars] || 0;
                    const percent = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                    return (
                      <div key={stars} className="flex items-center gap-4 text-xs font-medium">
                        <span className="w-12 font-bold flex items-center gap-1">{stars} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 inline" /></span>
                        <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                          <div style={{ width: `${percent}%` }} className="h-full bg-indigo-500 rounded-full" />
                        </div>
                        <span className="w-12 text-right text-slate-400 font-mono">{count} ({percent}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mentioned Features & Common Suggestions */}
              <div className="md:col-span-4 space-y-6">
                
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-display">Most Mentioned Features</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider font-mono">Key aspects highlighted in reviews</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {analytics.mostMentionedFeatures.map((feat: string) => (
                      <span key={feat} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-display">Common Suggestions</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider font-mono">Requested features & pain points</p>
                  </div>
                  <ul className="space-y-2 text-xs font-medium text-slate-600">
                    {analytics.mostCommonSuggestions.map((sug: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </>
          ) : (
            <div className="col-span-12 p-12 text-center text-slate-400 text-xs font-mono">No analytics payload available.</div>
          )}
        </div>
      )}

      {/* Edit Notes Modal */}
      {editingNotesTestimonial && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 font-display">Edit Admin Notes</h3>
              <button onClick={() => setEditingNotesTestimonial(null)} className="p-1 hover:bg-slate-100 rounded-full"><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSaveNotes} className="space-y-4">
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Write internal admin audit notes here..."
                rows={4}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-4">
                <button type="submit" disabled={savingNotes} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
                <button type="button" onClick={() => setEditingNotesTestimonial(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewingTestimonial && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden p-8 space-y-6 animate-scale-up relative">
            <button 
              onClick={() => setViewingTestimonial(null)}
              className="absolute top-6 right-6 p-1.5 hover:bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="h-4.5 w-4.5 text-slate-500" />
            </button>

            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 font-display">Testimonial Details</h3>
              <p className="text-[10px] text-slate-400 font-mono">ID: {viewingTestimonial.id}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/50 rounded-2xl p-4">
              {viewingTestimonial.profilePhoto ? (
                <img src={viewingTestimonial.profilePhoto} alt="Customer" className="h-12 w-12 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm">
                  {viewingTestimonial.customerName.substring(0,2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-extrabold text-slate-900 font-display text-sm leading-none">{viewingTestimonial.customerName}</p>
                <p className="text-xs text-slate-500 mt-1">{viewingTestimonial.designation || 'Partner'} &middot; {viewingTestimonial.companyName || 'Agency'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{viewingTestimonial.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Review Content</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star 
                      key={idx} 
                      className={`h-3 w-3 ${
                        idx < viewingTestimonial.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-4 leading-relaxed font-medium">
                "{viewingTestimonial.review}"
              </p>
            </div>

            {viewingTestimonial.website && (
              <div className="text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Website URL</span>
                <a href={viewingTestimonial.website} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:underline mt-0.5">{viewingTestimonial.website}</a>
              </div>
            )}

            {viewingTestimonial.adminNotes && (
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Admin Notes</span>
                <p className="text-xs text-slate-600 bg-amber-50/50 border border-amber-100 rounded-xl p-3 leading-relaxed">
                  {viewingTestimonial.adminNotes}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              {viewingTestimonial.status !== 'Approved' && (
                <button 
                  onClick={() => {
                    handleAction(viewingTestimonial.id, { status: 'Approved' }, 'Testimonial approved!');
                    setViewingTestimonial(null);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Approve Testimonial
                </button>
              )}
              <button 
                onClick={() => setViewingTestimonial(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
