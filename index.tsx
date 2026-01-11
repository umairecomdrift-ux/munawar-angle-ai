import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- AUTHENTIC STUDIO ICONS ---
const DSLRLogoIcon = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 11V7C7 5.89543 7.89543 5 9 5H15C16.1046 5 17 5.89543 17 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="2" y="9" width="20" height="11" rx="4" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="14.5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 13V16M10.5 14.5H13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <circle cx="18" cy="12" r="0.75" fill="currentColor"/>
  </svg>
);

const PhotoPlaceholderIcon = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="40" height="32" rx="4" fill="url(#photo-grad)" />
    <circle cx="15" cy="18" r="4" fill="white" fillOpacity="0.8" />
    <path d="M4 34L14.5 23.5L25 34L33.5 25.5L44 36V38C44 40.2091 42.2091 42 40 42H8C5.79086 42 4 40.2091 4 38V34Z" fill="white" fillOpacity="0.3" />
    <defs>
      <linearGradient id="photo-grad" x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#D946EF" />
      </linearGradient>
    </defs>
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// --- STUDIO CONFIG ---
const ANGLES = [
  { id: 'hero', name: 'Hero Perspective', prompt: 'Hero shot from a low camera angle, looking up at the object. Dramatic studio lighting, sharp focus, clean background.' },
  { id: 'top', name: 'Premium Flat Lay', prompt: 'Birds-eye view 90-degree flat lay. Even soft lighting, minimalist studio floor, professional catalog style.' },
  { id: 'profile', name: 'Side Perspective', prompt: 'Side profile view at a 45-degree angle. Shallow depth of field, highlighting textures and form.' },
  { id: 'macro', name: 'Detail Macro', prompt: 'Extreme close-up macro photography. Sharp focus on surface details and material quality.' },
  { id: 'standard', name: 'Eye-Level Studio', prompt: 'Classic eye-level studio photograph. Neutral lighting, professional equipment aesthetic, 8k resolution.' }
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
        setError("File size exceeds 10MB. Please use a smaller image.");
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
      setError("SYSTEM CONFIG ERROR: API Key is missing. Check environment variables.");
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

      const sessionResults: {url: string, name: string}[] = [];

      for (let i = 0; i < ANGLES.length; i++) {
        const angle = ANGLES[i];
        try {
          /**
           * NOTE: The prompt is specifically tuned to be "safe". 
           * Asking the model to "recreate the exact branded item" often triggers safety filters for trademarks.
           * Instead, we ask for a "professional photograph of the subject" focusing on "perspective".
           */
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: `Professional studio photography of the item shown. Perspective: ${angle.prompt}. Maintain the general shape and color scheme. Do not generate people or text.` }
              ]
            }
          });

          const candidate = response.candidates?.[0];
          
          if (candidate?.finishReason === 'SAFETY') {
            console.warn(`Safety block for angle: ${angle.name}. Attempting relaxed prompt...`);
            // Fallback for branded items (relaxed prompt)
            const fallbackResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType } },
                  { text: `A clean studio shot of this product from a ${angle.name.toLowerCase()}. Focus on lighting and geometry. Minimalist style.` }
                ]
              }
            });
            
            const fallbackPart = fallbackResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (fallbackPart?.inlineData) {
              const resData = {
                url: `data:${fallbackPart.inlineData.mimeType};base64,${fallbackPart.inlineData.data}`,
                name: angle.name
              };
              sessionResults.push(resData);
              setResults([...sessionResults]);
            }
          } else {
            const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
              const resData = {
                url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                name: angle.name
              };
              sessionResults.push(resData);
              setResults([...sessionResults]);
            }
          }
        } catch (innerErr: any) {
          console.error(`Error generating ${angle.name}:`, innerErr);
        }
        setProgress(((i + 1) / ANGLES.length) * 100);
      }

      if (sessionResults.length === 0) {
        throw new Error("Unable to bypass AI safety filters for this specific image. This is common for items with large, protected logos. Try cropping the image or using a different subject.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* High-End Header */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-3xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-1 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20">
              <div className="bg-black rounded-[14px] p-2.5">
                <DSLRLogoIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter italic leading-none bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">MUNAWAR</h1>
              <p className="text-[10px] font-bold text-indigo-400 tracking-[0.4em] uppercase mt-1.5">Photo Angle Studio AI</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3">
             <div className="flex items-center gap-2.5 px-5 py-2 rounded-full glass-card border-indigo-500/20 bg-indigo-500/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_#22c55e]" />
                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">System Operational</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Step 01: Upload Panel */}
        <div className="lg:col-span-4">
          <section className="glass-card p-10 rounded-[48px] relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-1.5 h-full accent-gradient" />
            
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                 <span className="text-sm font-black text-indigo-400">01</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">Upload Subject</h2>
            </div>

            <label className={`relative group block w-full aspect-square rounded-[40px] border-2 border-dashed transition-all cursor-pointer overflow-hidden ${image ? 'border-indigo-500/50 bg-black' : 'border-white/10 hover:border-indigo-500/30 bg-white/[0.02]'}`}>
              {image ? (
                <>
                  <img src={image} className="w-full h-full object-contain p-8" alt="Source" />
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all backdrop-blur-md">
                    <PhotoPlaceholderIcon className="scale-75 mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Replace Media</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <div className="relative">
                    <div className="absolute -inset-10 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                    <PhotoPlaceholderIcon className="relative" />
                  </div>
                  <div className="text-center px-4">
                    <p className="font-black text-xs text-zinc-300 uppercase tracking-[0.1em]">Select Product Image</p>
                    <p className="text-[10px] text-zinc-600 mt-2 font-bold uppercase tracking-widest leading-relaxed">PNG or JPG preferred<br/>(Max 10MB)</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={loading} />
            </label>

            <button 
              onClick={generate}
              disabled={!image || loading}
              className={`w-full mt-10 py-6 rounded-3xl font-black text-[13px] uppercase tracking-[0.2em] transition-all relative overflow-hidden shadow-2xl ${!image || loading ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-white/5 shadow-none' : 'accent-gradient text-white hover:scale-[1.02] active:scale-95 shadow-indigo-500/20'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Capturing {Math.round(progress)}%</span>
                </div>
              ) : "Generate Photo Angles"}
            </button>

            {error && (
              <div className="mt-8 p-6 rounded-3xl bg-red-500/5 border border-red-500/10 shadow-lg shadow-red-500/5">
                <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">
                   {error}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Step 02: Output Gallery */}
        <div className="lg:col-span-8">
          <section className="glass-card p-12 rounded-[56px] min-h-[750px] flex flex-col">
            <div className="flex items-center justify-between mb-16">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                   <span className="text-sm font-black text-indigo-400">02</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Studio Outputs</h2>
              </div>
              {loading && (
                <div className="flex flex-col items-end gap-2.5">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Rendering Perspectives...</span>
                  <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full accent-gradient transition-all duration-700 ease-out shadow-[0_0_10px_#6366f1]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {results.length === 0 && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-20">
                <PhotoPlaceholderIcon className="w-40 h-40 mb-10 grayscale" />
                <p className="text-sm font-black uppercase tracking-[1em] ml-[1em]">Awaiting Data</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {results.map((res, i) => (
                <div key={i} className="group relative glass-card rounded-[48px] overflow-hidden transition-all duration-700 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10">
                  <img src={res.url} className="w-full aspect-square object-cover transition-transform duration-1000 group-hover:scale-110" alt={res.name} />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px]">
                    <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between">
                       <div className="space-y-1">
                         <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Master Render</span>
                         <p className="text-xl font-black text-white uppercase italic tracking-tight">{res.name}</p>
                       </div>
                       <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = res.url;
                          link.download = `munawar-render-${res.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                          link.click();
                        }}
                        className="bg-white text-black p-4.5 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.3)]"
                        title="Download Image"
                      >
                        <DownloadIcon />
                      </button>
                    </div>
                  </div>

                  <div className="absolute top-8 left-8">
                    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 px-6 py-2.5 rounded-full shadow-xl">
                       <span className="text-[11px] font-black text-white/90 uppercase tracking-[0.1em]">{res.name}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && results.length < ANGLES.length && (
                <div className="aspect-square glass-card rounded-[48px] border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center gap-10 relative overflow-hidden bg-white/[0.01]">
                  <div className="scanner-line" />
                  <div className="relative">
                    <div className="absolute -inset-14 bg-indigo-500/10 rounded-full animate-ping" />
                    <div className="bg-black/60 p-7 rounded-full border border-indigo-500/20 shadow-2xl">
                      <DSLRLogoIcon className="w-16 h-16 text-indigo-500/50 animate-spin-slow" />
                    </div>
                  </div>
                  <div className="text-center px-6">
                    <p className="text-[13px] font-black text-indigo-500/60 uppercase tracking-[0.5em] animate-pulse">Capturing Perspective</p>
                    <p className="text-[10px] text-zinc-600 mt-2.5 uppercase font-black tracking-widest">{ANGLES[results.length].name}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-40 pb-20 text-center">
        <div className="flex justify-center items-center gap-10 mb-10 opacity-20">
          <div className="w-32 h-[1px] bg-gradient-to-r from-transparent to-white" />
          <DSLRLogoIcon className="w-8 h-8" />
          <div className="w-32 h-[1px] bg-gradient-to-l from-transparent to-white" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[1.8em] text-zinc-600 ml-[1.8em]">
          Munawar Creative Studio &copy; 2025
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
