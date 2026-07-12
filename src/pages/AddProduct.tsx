import React, { useState, useRef, useEffect } from 'react';
import { PackagePlus, Camera, CameraOff, CheckCircle, AlertCircle, Barcode, Lock, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { getPlanLimits } from '../lib/planLimits';
import UpgradeAlert from '../components/UpgradeAlert';
import { Page } from '../types';

const CATEGORIES = ['Food', 'Beverages', 'Personal Care', 'Electronics', 'Clothing', 'Household', 'General'];
const UNITS = ['ခု', 'ဗူး', 'ထုပ်', 'ပုလင်း', 'လုံး', 'ဖြတ်', 'ကီလို', 'ဂရမ်', 'မီတာ', 'ကတ်'];

interface FormState {
  name: string;
  name_mm: string;
  barcode: string;
  category: string;
  selling_price: string;
  cost_price: string;
  current_stock: string;
  unit: string;
  image_url: string;
}

const EMPTY: FormState = {
  name: '', name_mm: '', barcode: '', category: 'General',
  selling_price: '', cost_price: '', current_stock: '0', unit: 'ခု', image_url: '',
};

export default function AddProduct({ onNavigate }: { onNavigate?: (p: Page) => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const plan = profile?.subscription_plan ?? 'free';
  const limits = getPlanLimits(plan);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [productCount, setProductCount] = useState(0);
  const [countLoading, setCountLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageStreamRef = useRef<MediaStream | null>(null);
  const imageVideoRef = useRef<HTMLVideoElement>(null);
  const [imageCameraMode, setImageCameraMode] = useState(false);
  const [imageCameraError, setImageCameraError] = useState('');

  const limitReached = !countLoading && productCount >= limits.maxProducts;

  useEffect(() => {
    return () => {
      stopScanner();
      stopImageCamera();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(({ count }) => {
        setProductCount(count ?? 0);
        setCountLoading(false);
      });
  }, [user, success]);

  const setField = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const startScanner = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);

      // Attempt barcode detection if BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] });
        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                setForm(prev => ({ ...prev, barcode: barcodes[0].rawValue }));
                stopScanner();
              }
            } catch {}
          }
        }, 500);
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied. Please allow camera permission.');
    }
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  const uploadProductImage = async (file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `products/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleImageFile = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageUploading(true);
    try {
      const publicUrl = await uploadProductImage(file);
      setForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      setError('Image upload failed: ' + (err.message || 'Unknown error'));
      setImagePreview('');
      setForm(prev => ({ ...prev, image_url: '' }));
    } finally {
      setImageUploading(false);
    }
  };

  const startImageCamera = async () => {
    setImageCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } }
      });
      imageStreamRef.current = stream;
      if (imageVideoRef.current) {
        imageVideoRef.current.srcObject = stream;
        imageVideoRef.current.play();
      }
      setImageCameraMode(true);
    } catch (err: any) {
      setImageCameraError(err.message || 'Camera access denied. Please allow camera permission.');
    }
  };

  const captureImageFromCamera = () => {
    const video = imageVideoRef.current;
    if (!video || !imageStreamRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) handleImageFile(new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' }));
      stopImageCamera();
    }, 'image/jpeg', 0.85);
  };

  const stopImageCamera = () => {
    if (imageStreamRef.current) {
      imageStreamRef.current.getTracks().forEach(t => t.stop());
      imageStreamRef.current = null;
    }
    if (imageVideoRef.current) imageVideoRef.current.srcObject = null;
    setImageCameraMode(false);
  };

  const clearImage = () => {
    setImagePreview('');
    setForm(prev => ({ ...prev, image_url: '' }));
    stopImageCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Product name is required'); return; }
    if (!form.selling_price || Number(form.selling_price) <= 0) { setError('Selling price is required'); return; }
    if (limitReached) { setError(`Product limit reached (${limits.maxProducts === Infinity ? 'unlimited' : limits.maxProducts} max on your plan). Upgrade to add more.`); return; }
    setLoading(true);

    const { error: err } = await supabase.from('products').insert({
      name: form.name.trim(),
      name_mm: form.name_mm.trim(),
      barcode: form.barcode.trim(),
      category: form.category,
      selling_price: Number(form.selling_price),
      cost_price: Number(form.cost_price) || 0,
      current_stock: Number(form.current_stock) || 0,
      unit: form.unit,
      image_url: form.image_url.trim(),
    });

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setForm(EMPTY);
      setImagePreview('');
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Add Product</h1>
        <p className="text-slate-400 font-myanmar text-sm mt-0.5">ကုန်ပစ္စည်းအသစ် ထည့်သွင်းပါ</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-accent-500/10 border border-accent-500/30 rounded-xl mb-4 animate-fade-in">
          <CheckCircle size={18} className="text-accent-400" />
          <div>
            <p className="text-accent-400 font-medium text-sm">Product added successfully!</p>
            <p className="text-accent-400/70 text-xs font-myanmar">ကုန်ပစ္စည်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger-600/10 border border-danger-600/30 rounded-xl mb-4">
          <AlertCircle size={16} className="text-danger-400" />
          <p className="text-danger-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Product limit banner */}
        {limitReached && (
          <UpgradeAlert
            message={`Product limit reached — your ${plan === 'free' ? 'Free' : 'Basic'} plan allows ${limits.maxProducts} products.`}
            messageMm="ကုန်ပစ္စည်း အရေအတွက် အမြင့်ဆုံး ရောက်နေပါသည်။ အဆင့်မြှင့်တင်ပါ။"
            onNavigate={onNavigate}
          />
        )}

        {/* Barcode Row */}
        <div>
          <label className="label">Barcode (optional)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.barcode}
              onChange={setField('barcode')}
              placeholder={limits.barcodeScanning ? 'Scan or type barcode...' : 'Type barcode...'}
              className="input-field flex-1"
            />
            {limits.barcodeScanning ? (
              <button
                type="button"
                onClick={scanning ? stopScanner : startScanner}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border transition-all ${
                  scanning
                    ? 'bg-danger-600/20 border-danger-600/30 text-danger-400 hover:bg-danger-600/30'
                    : 'bg-primary-600/20 border-primary-600/30 text-primary-400 hover:bg-primary-600/30'
                }`}
              >
                {scanning ? <CameraOff size={16} /> : <Camera size={16} />}
                {scanning ? 'Stop' : 'Scan'}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border bg-surface-200 border-slate-700 text-slate-500 cursor-not-allowed"
                title="Barcode scanning requires Premium plan"
              >
                <Lock size={16} />
                Scan
              </button>
            )}
          </div>
          {!limits.barcodeScanning && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Lock size={11} /> Barcode scanning is a Premium feature
            </p>
          )}
        </div>

        {/* Camera View */}
        {scanning && (
          <div className="rounded-xl overflow-hidden border border-primary-500/30 bg-black relative">
            <video ref={videoRef} className="w-full aspect-video object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-24 border-2 border-primary-400 rounded-lg opacity-70" />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-black/60 py-2 text-center">
              <p className="text-primary-300 text-xs flex items-center justify-center gap-1">
                <Barcode size={14} />
                Point camera at barcode to scan
              </p>
            </div>
          </div>
        )}

        {cameraError && (
          <p className="text-danger-400 text-xs">{cameraError}</p>
        )}

        {/* Product Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Product Name *</label>
            <input type="text" value={form.name} onChange={setField('name')} placeholder="e.g. Coca-Cola 330ml" className="input-field" required />
          </div>
          <div>
            <label className="label">Myanmar Name / မြန်မာနာမည်</label>
            <input type="text" value={form.name_mm} onChange={setField('name_mm')} placeholder="e.g. ကိုကာကိုလာ" className="input-field font-myanmar" />
          </div>
        </div>

        {/* Category + Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select value={form.category} onChange={setField('category')} className="input-field">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unit / ယူနစ်</label>
            <select value={form.unit} onChange={setField('unit')} className="input-field font-myanmar">
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Selling Price (MMK) *</label>
            <input type="number" value={form.selling_price} onChange={setField('selling_price')} placeholder="0" className="input-field" min="0" required />
          </div>
          <div>
            <label className="label">Cost Price (MMK)</label>
            <input type="number" value={form.cost_price} onChange={setField('cost_price')} placeholder="0" className="input-field" min="0" />
          </div>
        </div>

        {/* Opening Stock */}
        <div>
          <label className="label">Opening Stock</label>
          <input type="number" value={form.current_stock} onChange={setField('current_stock')} placeholder="0" className="input-field w-48" min="0" />
        </div>

        {/* Product Image Upload */}
        <div>
          <label className="label">Product Image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
          />

          {imageCameraMode ? (
            <div className="rounded-xl overflow-hidden border border-primary-500/30 bg-black relative">
              <video ref={imageVideoRef} className="w-full aspect-square object-cover" playsInline muted />
              <div className="flex gap-2 p-3 bg-black/60">
                <button type="button" onClick={captureImageFromCamera} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 transition-colors">
                  <Camera size={16} /> Capture Photo
                </button>
                <button type="button" onClick={stopImageCamera} className="px-4 py-2.5 rounded-lg bg-surface-300 text-slate-300 text-sm font-medium hover:bg-surface-400 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Product preview" className="h-32 w-32 rounded-xl object-cover border border-slate-600" />
              {imageUploading && (
                <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              )}
              {!imageUploading && (
                <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 w-6 h-6 bg-danger-600 rounded-full flex items-center justify-center text-white hover:bg-danger-500 transition-colors shadow-lg">
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-600 hover:border-primary-500/50 hover:bg-primary-500/5 text-slate-400 hover:text-primary-400 text-sm font-medium transition-all">
                <Upload size={18} /> Upload from Device
              </button>
              <button type="button" onClick={startImageCamera} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-600 hover:border-accent-500/50 hover:bg-accent-500/5 text-slate-400 hover:text-accent-400 text-sm font-medium transition-all">
                <Camera size={18} /> Take Photo
              </button>
            </div>
          )}
          {imageCameraError && <p className="text-danger-400 text-xs mt-1">{imageCameraError}</p>}
          {imageUploading && <p className="text-slate-500 text-xs mt-1">Uploading image...</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-6">
            {loading ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>
            ) : (
              <><PackagePlus size={16} />Add Product</>
            )}
          </button>
          <button type="button" onClick={() => setForm(EMPTY)} className="btn-secondary">Reset</button>
        </div>
      </form>
    </div>
  );
}
