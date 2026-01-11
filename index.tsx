import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- AUTHENTIC PHOTOGRAPHY ICONS ---
const ProfessionalCameraIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 11V7C7 5.89543 7.89543 5 9 5H15C16.1046 5 17 5.89543 17 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="2" y="9" width="20" height="11" rx="3" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="14.5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="14.5" r="1.5" fill="currentColor"/>
    <path d="M18 12H18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const LensApertureIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" opacity="0.2" />
    <path d="M12 3l7 7M21 12l-7 7M12 21l-7-7M3 12l7-7" />
  </svg>
);

const UploadCloudIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m8 16 4-4 4 4" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// --- CONFIG ---
const ANGLES = [
  { id: 'low', name: 'Cinematic Low Angle', prompt: 'Professional low-angle perspective, hero shot style, studio lighting, depth of field.' },
  { id: 'flat', name: 'Product Flat Lay', prompt: '90-degree overhead top-down flat lay, even lighting, minimalist background.' },
  { id: 'side', name: 'Studio Side Profile', prompt: 'Commercial side profile, 45-degree angle, sharp focus on branding, soft shadows.' },
  { id: 'macro', name: 'Macro Texture Shot', prompt: 'Extreme close-up macro photography, highlighting texture and material detail.' },
  { id: 'wide', name: 'Wide Commercial', prompt: 'Professional wide-angle commercial shot, eye-level perspective, clean studio environment.' }
];

const App = () => {
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<{url: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setResults([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generate = async () => {
    if (!image) return;
    
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError("CONFIGURATION ERROR: Please set the 'API_KEY' environment variable.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.split(',')[1];
      const mimeType = image.split(',')[0].split(':')[1].split(';')[0];

      const currentResults: {url: string, name: string}[] = [];

      // Generate angles sequentially to provide better visual feedback
      for (const angle of ANGLES) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: `Re-render this exact product/subject from a new camera angle: ${angle.prompt}. Keep the object 100% identical in shape, brand, and color.` }
              ]
            }
          });

          const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (imagePart?.inlineData) {
            const result = {
              url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
              name: angle.name
            };
            currentResults.push(result);
            setResults([...currentResults]); // Update the UI immediately for each result
          }
        } catch (innerErr: any) {
          console.error(`Failed to generate ${angle.name}:`, innerErr);
        }
      }

      if (currentResults.length === 0) {
        throw new Error("Generation failed. Please check your API key and connection.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected system error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 md:px-12">
      {/* Branding Header */}
      <header className="max-w-7xl mx-auto mb-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <ProfessionalCameraIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white">MUNAWAR</h1>
            <p className="text-[10px] font-bold text-indigo-400 tracking-[0.4em] uppercase">Photo Angle AI Studio</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Engine Ready</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Step 01: Upload */}
        <div className="lg:col-span-4 space-y-6">
          <section className="glass-panel p-8 rounded-[40px]">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <span className="text-xs font-black text-indigo-400">01</span>
              </div>
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Source Material</h2>
            </div>

            <label className={`relative group block w-full aspect-square rounded-[32px] border-2 border-dashed transition-all cursor-pointer overflow-hidden ${image ? 'border-indigo-500 bg-black/40' : 'border-white/10 hover:border-indigo-500/30 bg-white/[0.02]'}`}>
              {image ? (
                <>
                  <img src={image} className="w-full h-full object-contain p-8" alt="Upload" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white border border-white/20 px-6 py-2.5 rounded-full">Replace Image</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-5">
                  <div className="p-6 rounded-full bg-white/5 group-hover:bg-indigo-500/10 transition-colors">
                    <LensApertureIcon className="w-12 h-12 text-zinc-700 group-hover:text-indigo-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xs text-zinc-400 uppercase tracking-widest">Drop Photo Here</p>
                    <p className="text-[10px] text-zinc-600 mt-2">JPG or PNG formats</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={loading} />
            </label>

            <button 
              onClick={generate}
              disabled={!image || loading}
              className={`w-full mt-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all relative overflow-hidden ${!image || loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none' : 'btn-primary text-white active:scale-95'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing Angles...</span>
                </div>
              ) : "Generate 5 Angles"}
            </button>

            {error && (
              <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">
                  Error: {error}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Step 02: Results */}
        <div className="lg:col-span-8">
          <section className="glass-panel p-10 rounded-[48px] min-h-[600px]">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <span className="text-xs font-black text-indigo-400">02</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">AI Generated Perspectives</h2>
              </div>
              {loading && (
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-bold text-indigo-400 animate-pulse tracking-widest uppercase">Developing Layer {results.length + 1}</span>
                </div>
              )}
            </div>

            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-40 opacity-20">
                <ProfessionalCameraIcon className="w-24 h-24 mb-6" />
                <p className="text-xs font-black uppercase tracking-[0.6em]">System Standby</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {results.map((res, i) => (
                <div key={i} className="group relative glass-panel rounded-[32px] overflow-hidden">
                  <img src={res.url} className="w-full aspect-square object-cover transition-transform duration-1000 group-hover:scale-110" alt={res.name} />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between">
                       <div className="space-y-1">
                         <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-[0.3em]">ANGLE {i+1}</span>
                         <p className="text-sm font-black uppercase tracking-widest text-white">{res.name}</p>
                       </div>
                       <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = res.url;
                          link.download = `munawar-angle-${i+1}.png`;
                          link.click();
                        }}
                        className="bg-white text-black p-3.5 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-xl"
                      >
                        <DownloadIcon />
                      </button>
                    </div>
                  </div>

                  <div className="absolute top-6 left-6">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full">
                       <span className="text-[9px] font-black text-white/80 tracking-widest uppercase">{res.name}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && results.length < 5 && (
                <div className="aspect-square glass-panel rounded-[32px] border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center gap-6 relative overflow-hidden bg-white/[0.01]">
                  <div className="absolute inset-0 scan-line" />
                  <div className="relative">
                    <div className="absolute -inset-6 bg-indigo-500/10 rounded-full animate-ping" />
                    <LensApertureIcon className="w-12 h-12 text-indigo-500/40 animate-spin-slow" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.4em]">Capturing Perspective</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-20 py-10 text-center opacity-30">
        <p className="text-[9px] font-black uppercase tracking-[0.8em]">
          &copy; 2025 Munawar Creative Intelligence Studio
        </p>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
