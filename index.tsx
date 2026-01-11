import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- AUTHENTIC PHOTOGRAPHY ICONS ---
const DSLRLogoIcon = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 11V7C7 5.89543 7.89543 5 9 5H15C16.1046 5 17 5.89543 17 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="2" y="9" width="20" height="11" rx="4" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="14.5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 13V16M10.5 14.5H13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <circle cx="18" cy="12" r="0.75" fill="currentColor"/>
  </svg>
);

const PhotoFrameIcon = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 8H40V40H8V8Z" fill="#1A1A1E" />
    <path d="M8 32L16 24L28 36M24 28L32 20L40 28" stroke="url(#icon-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16" cy="16" r="4" fill="url(#icon-grad)" fillOpacity="0.8" />
    <path d="M4 12C4 7.58172 7.58172 4 12 4H36C40.4183 4 44 7.58172 44 12V36C44 40.4183 40.4183 44 36 44H12C7.58172 44 4 40.4183 4 36V12Z" stroke="url(#icon-grad)" strokeWidth="2" />
    <defs>
      <linearGradient id="icon-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#D946EF" />
      </linearGradient>
    </defs>
  </svg>
);

const DownloadButtonIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// --- CONFIGURATION ---
const ANGLES = [
  { id: 'hero', name: 'Hero Cinematic', prompt: 'Cinematic low-angle hero shot, studio photography, dramatic lighting, sharp focus on subject, depth of field.' },
  { id: 'flat', name: 'Premium Flat Lay', prompt: 'Top-down 90-degree flat lay perspective, clean studio background, balanced even lighting.' },
  { id: 'side', name: 'Commercial Side', prompt: 'Side profile commercial shot, 45-degree angle, sharp material details, high-end studio aesthetic.' },
  { id: 'macro', name: 'Macro Detail', prompt: 'Extreme macro close-up of textures and surface details, professional macro lens blur.' },
  { id: 'eye', name: 'Standard Eye-Level', prompt: 'Professional eye-level catalog photo, neutral studio environment, sharp across the frame.' }
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
      if (file.size > 8 * 1024 * 1024) {
        setError("Image size exceeds 8MB. Please use a smaller file.");
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
      setError("SYSTEM ERROR: API Key is missing. Please contact the administrator.");
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

      const finalResults: {url: string, name: string}[] = [];

      for (let i = 0; i < ANGLES.length; i++) {
        const angle = ANGLES[i];
        try {
          // Optimized prompt to avoid safety triggers with brand names (like Apple logo on MacBooks)
          // Focusing on physical form and material rather than "branding".
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: `Create a professional photograph of the exact object from this image, but from a new camera perspective: ${angle.prompt}. Maintain the exact physical shape, materials, and colors of the object. Do not include any human hands or faces.` }
              ]
            }
          });

          if (response.candidates?.[0]?.finishReason === 'SAFETY') {
             console.warn(`Safety filter triggered for angle: ${angle.name}`);
             continue;
          }

          const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (imagePart?.inlineData) {
            const resData = {
              url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
              name: angle.name
            };
            finalResults.push(resData);
            setResults([...finalResults]);
            setProgress(((i + 1) / ANGLES.length) * 100);
          }
        } catch (innerErr: any) {
          console.error(`Error generating ${angle.name}:`, innerErr);
        }
      }

      if (finalResults.length === 0) {
        throw new Error("The AI was unable to generate images. This often happens with branded products or copyrighted logos. Please try an image with fewer visible logos.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
              <div className="bg-black rounded-[14px] p-2.5">
                <DSLRLogoIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white italic leading-none">MUNAWAR</h1>
              <p className="text-[10px] font-bold text-indigo-400 tracking-[0.4em] uppercase mt-1.5 opacity-80">Photo Angle Studio AI</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <div className="flex items-center gap-3 px-5 py-2 rounded-full glass-card border-indigo-500/20">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
               <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Active Studio Session</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Input */}
        <div className="lg:col-span-4 space-y-8">
          <section className="glass-card p-10 rounded-[48px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full accent-gradient" />
            
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                 <span className="text-sm font-black text-indigo-400">01</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Source Material</h2>
            </div>

            <label className={`relative group block w-full aspect-square rounded-[40px] border-2 border-dashed transition-all cursor-pointer overflow-hidden ${image ? 'border-indigo-500/40 bg-black/40' : 'border-white/10 hover:border-indigo-500/30 bg-white/[0.02]'}`}>
              {image ? (
                <>
                  <img src={image} className="w-full h-full object-contain p-8" alt="Source" />
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all backdrop-blur-md">
                    <PhotoFrameIcon className="scale-75 mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Replace Original</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <div className="relative">
                    <div className="absolute -inset-6 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                    <PhotoFrameIcon className="relative" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm text-zinc-300 uppercase tracking-[0.1em]">Upload Subject</p>
                    <p className="text-[10px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">Single Object Preferred</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={loading} />
            </label>

            <button 
              onClick={generate}
              disabled={!image || loading}
              className={`w-full mt-10 py-6 rounded-3xl font-black text-[13px] uppercase tracking-[0.2em] transition-all relative overflow-hidden shadow-2xl ${!image || loading ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5' : 'accent-gradient text-white hover:scale-[1.02] active:scale-95 shadow-indigo-500/20'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing {Math.round(progress)}%</span>
                </div>
              ) : "Generate Photo Angles"}
            </button>

            {error && (
              <div className="mt-8 p-6 rounded-3xl bg-red-500/5 border border-red-500/10">
                <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">
                  {error}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right: Output */}
        <div className="lg:col-span-8">
          <section className="glass-card p-12 rounded-[56px] min-h-[750px]">
            <div className="flex items-center justify-between mb-16">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                   <span className="text-sm font-black text-indigo-400">02</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">AI Generated Outputs</h2>
              </div>
              {loading && (
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Rendering Frames...</span>
                  <div className="w-40 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full accent-gradient transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-48 opacity-10">
                <PhotoFrameIcon className="w-40 h-40 mb-10 grayscale" />
                <p className="text-sm font-black uppercase tracking-[1em] ml-[1em]">System Standby</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {results.map((res, i) => (
                <div key={i} className="group relative glass-card rounded-[48px] overflow-hidden transition-all duration-500 hover:border-indigo-500/30">
                  <img src={res.url} className="w-full aspect-square object-cover transition-transform duration-1000 group-hover:scale-110" alt={res.name} />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between">
                       <div className="space-y-1">
                         <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Master View</span>
                         <p className="text-xl font-black text-white uppercase italic">{res.name}</p>
                       </div>
                       <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = res.url;
                          link.download = `munawar-angle-${res.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                          link.click();
                        }}
                        className="bg-white text-black p-4.5 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                      >
                        <DownloadButtonIcon />
                      </button>
                    </div>
                  </div>

                  <div className="absolute top-8 left-8">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-2.5 rounded-full">
                       <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{res.name}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && results.length < ANGLES.length && (
                <div className="aspect-square glass-card rounded-[48px] border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center gap-8 relative overflow-hidden bg-white/[0.01]">
                  <div className="scanner-line" />
                  <div className="relative">
                    <div className="absolute -inset-12 bg-indigo-500/10 rounded-full animate-ping" />
                    <div className="bg-black/40 p-6 rounded-full border border-indigo-500/20">
                      <DSLRLogoIcon className="w-16 h-16 text-indigo-500/40 animate-spin-slow" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-black text-indigo-500/60 uppercase tracking-[0.5em] animate-pulse">Computing Angle</p>
                    <p className="text-[10px] text-zinc-700 mt-2 uppercase font-black tracking-widest">{ANGLES[results.length].name}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-40 pb-20 text-center opacity-30">
        <div className="flex justify-center items-center gap-8 mb-10">
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent to-white/50" />
          <DSLRLogoIcon className="w-6 h-6" />
          <div className="w-24 h-[1px] bg-gradient-to-l from-transparent to-white/50" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[1.5em] text-zinc-600 ml-[1.5em]">
          Munawar Intelligence &copy; 2025
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
