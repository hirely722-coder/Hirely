import React, { useState, useEffect } from 'react';
import { Star, X, Sparkles, Upload, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user, token } = useApp();
  
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [website, setWebsite] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [consentGiven, setConsentGiven] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pre-fill user profile fields
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setCompanyName(user.companyName || '');
      setDesignation(user.role || '');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setField: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file size must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setField(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          review,
          customerName,
          companyName,
          designation,
          website,
          profilePhoto,
          companyLogo,
          consentGiven
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSuccessMessage(data.message || '🎉 Thank you! Your feedback has been received.');
      localStorage.setItem('hirely_feedback_submitted', 'true');
      
      // Close after 3 seconds
      setTimeout(() => {
        onClose();
        // Reset states
        setReview('');
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Record dismissal time in localStorage (wait 30 days)
    localStorage.setItem('hirely_feedback_dismissed_at', Date.now().toString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl relative overflow-hidden animate-scale-up text-white flex flex-col max-h-[90vh]">
        
        {/* Soft Ambient Light Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-full transition-colors cursor-pointer z-10"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {successMessage ? (
          <div className="p-8 text-center space-y-4 py-16 flex-1 flex flex-col items-center justify-center">
            <div className="mx-auto h-16 w-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold font-display">Feedback Submitted!</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              {successMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            
            {/* Fixed Header */}
            <div className="p-6 md:p-8 pb-4 border-b border-slate-800/60 relative z-10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  <Sparkles className="h-3 w-3" /> Early Adopter Feedback
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold font-display leading-tight">
                  💬 How's your experience with Hirely?
                </h2>
                <p className="text-slate-450 text-xs leading-relaxed">
                  We're continuously improving Hirely based on feedback from our early customers. Your review helps us build a better recruitment platform.
                </p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-400">
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
              
              {/* Rating Stars */}
              <div className="flex flex-col items-center gap-2 bg-slate-800/20 border border-slate-800/60 rounded-2xl p-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Your Rating</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star 
                        className={`h-7 w-7 ${
                          star <= (hoverRating ?? rating) 
                            ? 'fill-amber-400 text-amber-400' 
                            : 'text-slate-650'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Review</label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Tell us what you liked, what could be improved, and how Hirely helped your recruitment process."
                  required
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl p-3.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 resize-none min-h-[100px]"
                />
              </div>

              {/* Grid Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. HR Manager"
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website URL</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Pre-filled Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email (Linked)</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-slate-950/50 border border-slate-805/50 rounded-xl p-2.5 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Photo & Logo Uploads */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile Photo</label>
                  <div className="relative flex items-center justify-center border border-dashed border-slate-800 rounded-xl p-2 hover:border-slate-700 bg-slate-950/30 overflow-hidden min-h-[50px]">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                        <Upload className="h-3.5 w-3.5" /> Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, setProfilePhoto)}
                          className="hidden"
                        />
                      </label>
                    )}
                    {profilePhoto && (
                      <button type="button" onClick={() => setProfilePhoto('')} className="absolute top-1 right-1 text-slate-500 hover:text-white text-[9px]">✕</button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Logo</label>
                  <div className="relative flex items-center justify-center border border-dashed border-slate-800 rounded-xl p-2 hover:border-slate-700 bg-slate-950/30 overflow-hidden min-h-[50px]">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Logo" className="h-8 object-contain" />
                    ) : (
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                        <Upload className="h-3.5 w-3.5" /> Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, setCompanyLogo)}
                          className="hidden"
                        />
                      </label>
                    )}
                    {companyLogo && (
                      <button type="button" onClick={() => setCompanyLogo('')} className="absolute top-1 right-1 text-slate-500 hover:text-white text-[9px]">✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Consent Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none pb-2">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded border-slate-800 bg-slate-950 text-indigo-650 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] text-slate-400 leading-normal">
                  I allow Hirely to display my review publicly on its website.
                </span>
              </label>

            </div>

            {/* Fixed Footer */}
            <div className="p-6 md:p-8 pt-4 border-t border-slate-800/60 bg-slate-900/90 relative z-10 flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? 'Submitting Review...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 py-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-300"
              >
                Maybe Later
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
