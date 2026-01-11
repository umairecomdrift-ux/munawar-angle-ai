import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- AUTHENTIC VIBRANT ICONS ---
const AuthenticPhotoIcon = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="40" height="32" rx="6" fill="url(#photo-gradient)" />
    <circle cx="15" cy="18" r="4" fill="white" fillOpacity="0.8" />
    <path d="M4 34L14.5 23.5L25 34L33.5 25.5L44 36V38C44 41.3137 41.3137 44 38 44H10C6.68629 44 4 41.3137 4 38V34Z" fill="white" fillOpacity="0.3" />
    <defs>
      <linearGradient id="photo-gradient" x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

const CameraLensIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" strokeDasharray="2 2" />
    <path d="M12 7V5M12 19v-2M7 12H5M19 12h-2M8.5 8.5l-1.5-1.5M17 17l-1.5-1.5M15.5 8.5l1.5-1.5M7 17l1.5-1.5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// --- CONFIG ---
const ANGLES = [
  { id: 'hero', name: 'Hero Perspective', prompt: 'Cinematic low-angle hero shot, dramatic studio lighting, sharp focus, professional product photography.' },
  { id: 'top', name: 'Flat Lay Overhead', prompt: 'Top-down 90-degree flat lay, clean minimalist background, soft even lighting, symmetrical.' },
  { id: 'profile', name: 'Side Profile', prompt: '45-degree professional side profile, depth of field bokeh, sharp details on materials.' },
  { id: 'macro', name: 'Macro Close-Up', prompt: 'Extreme macro shot of textures and details, professional lens blur, high-end commercial style.' },
  { id: 'context', name: 'Studio Eye-Level', prompt: 'Standard eye-level commercial studio shot, balanced lighting, high-quality catalog appearance.' }
];

const App = () => {
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<{url: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File is too large. Please use an image under 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setResults([]);
        setError(null);
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const generate = async () => {
    if (!image) return;
    
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError("CONFIGURATION ERROR: Please check your API key settings in the project environment.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress(0);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const [header, base64Data] = image.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

      const currentResults: {url: string, name: string}[] = [];

      for (let i = 0; i < ANGLES.length; i++) {
        const angle = ANGLES[i];
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: `Re-create this exact item from a new camera angle: ${angle.prompt}. The item must remain perfectly consistent with the original branding and shape.` }
              ]
            }
          });

          const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (imagePart?.inlineData) {
            const newRes = {
              url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
              name: angle.name
            };
            currentResults.push(newRes);
            setResults([...currentResults]);
            setProgress(((i + 1) / ANGLES.length) * 100);
          } else if (response.candidates?.[0]?.finishReason === 'SAFETY') {
            console.warn(`Safety filter blocked ${angle.name}`);
          }
        } catch (innerErr: any) {
          console.error(`Error in ${angle.name}:`, innerErr);
        }
      }

      if (currentResults.length === 0) {
        throw new Error("No images were generated. This may be due to safety filters or connection issues. Try a different image.");
      }
    } catch (err: any) {
      setError(err.message || "A system error occurred during generation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Authentic Header */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-1 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500">
              <div className="bg-black rounded-[14px] p-2">
                <CameraLensIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">MUNAWAR</h1>
              <p className="text-[9px] font-extrabold text-zinc-500 tracking-[0.5em] uppercase">Angle Generator AI</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="px-4 py-2 rounded-full glass-card border-indigo-500/20 flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Studio Engine: Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Control Panel */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass-card p-10 rounded-[40px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full accent-gradient" />
            
            <div className="flex items-center gap-3 mb-10">
              <span className="text-2xl font-black text-indigo-500/30">01</span>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Source Image</h2>
            </div>

            <label className={`relative group block w-full aspect-square rounded-[32px] border-2 border-dashed transition-all cursor-pointer overflow-hidden ${image ? 'border-indigo-500/50 bg-black/40' : 'border-white/10 hover:border-indigo-500/30 bg-white/[0.02]'}`}>
              {image ? (
                <>
                  <img src={image} className="w-full h-full object-contain p-8" alt="Source" />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all backdrop-blur-sm">
                    <AuthenticPhotoIcon className="w-10 h-10 mb-4 scale-90" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Change Material</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <div className="relative">
                    <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-xl animate-pulse" />
                    <AuthenticPhotoIcon className="relative" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm text-zinc-300 uppercase tracking-widest">Select Image</p>
                    <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest">High Definition Recommended</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={loading} />
            </label>

            <button 
              onClick={generate}
              disabled={!image || loading}
              className={`w-full mt-10 py-6 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all relative overflow-hidden shadow-2xl ${!image || loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'accent-gradient text-white hover:scale-[1.02] active:scale-95'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Generating... {Math.round(progress)}%</span>
                </div>
              ) : "Generate Photo Angles"}
            </button>

            {error && (
              <div className="mt-8 p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
                <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Gallery Panel */}
        <div className="lg:col-span-8">
          <div className="glass-card p-12 rounded-[48px] min-h-[700px]">
            <div className="flex items-center justify-between mb-16">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black text-indigo-500/30">02</span>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Rendered Perspectives</h2>
              </div>
              {loading && (
                <div className="text-right">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Capturing Angle {results.length + 1}</p>
                  <div className="w-32 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                    <div className="h-full accent-gradient transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-40 opacity-10">
                <AuthenticPhotoIcon className="w-32 h-32 mb-8 grayscale opacity-50" />
                <p className="text-sm font-black uppercase tracking-[0.8em]">Awaiting Instruction</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {results.map((res, i) => (
                <div key={i} className="group relative glass-card rounded-[40px] overflow-hidden transition-all hover:border-indigo-500/30">
                  <img src={res.url} className="w-full aspect-square object-cover transition-transform duration-1000 group-hover:scale-110" alt={res.name} />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between">
                       <div className="space-y-1">
                         <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Master Render</span>
                         <p className="text-lg font-black text-white">{res.name}</p>
                       </div>
                       <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = res.url;
                          link.download = `munawar-render-${res.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                          link.click();
                        }}
                        className="bg-white text-black p-4 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-2xl"
                      >
                        <DownloadIcon />
                      </button>
                    </div>
                  </div>

                  <div className="absolute top-8 left-8">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full">
                       <span className="text-[11px] font-black text-white/90 tracking-[0.2em] uppercase">{res.name}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && results.length < ANGLES.length && (
                <div className="aspect-square glass-card rounded-[40px] border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
                  <div className="scanline" />
                  <div className="relative">
                    <div className="absolute -inset-10 bg-indigo-500/10 rounded-full animate-ping" />
                    <CameraLensIcon className="w-16 h-16 text-indigo-500/50 animate-spin-slow" />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black text-indigo-500/60 uppercase tracking-[0.5em] animate-pulse">Computing Angle</p>
                    <p className="text-[9px] text-zinc-700 mt-2 uppercase font-bold">{ANGLES[results.length].name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-40 pb-20 text-center">
        <div className="flex justify-center items-center gap-6 mb-8 opacity-20">
          <div className="w-20 h-[1px] bg-white" />
          <CameraLensIcon className="w-4 h-4" />
          <div className="w-20 h-[1px] bg-white" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[1em] text-zinc-700">
          Munawar Creative Systems &copy; 2025
        </p>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
