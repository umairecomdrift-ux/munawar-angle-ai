import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- AUTHENTIC ICONS ---
const AuthenticCameraIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 11V7C7 5.89543 7.89543 5 9 5H15C16.1046 5 17 5.89543 17 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="2" y="9" width="20" height="11" rx="3" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="14.5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="14.5" r="1.5" fill="currentColor"/>
    <path d="M18 12H18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PhotoStackIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17L12 22L22 17" />
    <path d="M2 12L12 17L22 12" />
    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

// --- CONFIG ---
const ANGLES = [
  { id: 'low', name: 'Low Angle Hero', prompt: 'Professional low-angle hero shot, wide lens, dramatic studio lighting, 8k sharp detail.' },
  { id: 'flat', name: 'Studio Flat Lay', prompt: 'Top-down 90-degree flat lay photography, clean shadows, minimalist studio background.' },
  { id: 'side', name: 'Side Perspective', prompt: '45-degree professional side profile, depth of field bokeh, sharp subject focus.' },
  { id: 'macro', name: 'Texture Macro', prompt: 'Extreme close-up macro photography, emphasizing texture and material quality, professional macro lens.' },
  { id: 'three-quarter', name: '3/4 Commercial', prompt: 'Standard 3/4 commercial angle, balanced lighting, high-end e-commerce style.' }
];

// --- APP ---
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
      setError("API Key Missing: Please add 'API_KEY' to your Vercel Environment Variables.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image format");
      const mimeType = match[1];
      const data = match[2];

      const newResults: {url: string, name: string}[] = [];
      
      for (const angle of ANGLES) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data, mimeType } },
                { text: `Re-render this exact product or subject from this camera angle: ${angle.prompt}. The subject must remain 100% identical in brand and form to the source image.` }
              ]
            }
          });

          const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (imagePart?.inlineData) {
            const result = {
              url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
              name: angle.name
            };
            newResults.push(result);
            setResults([...newResults]); 
          }
        } catch (innerErr) {
          console.error(`Error generating angle ${angle.name}:`, innerErr);
        }
      }

      if (newResults.length === 0) {
        throw new Error("Failed to generate any angles. Please check your API key quota.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during generation.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-xl shadow-slate-200">
            <AuthenticCameraIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none">MUNAWAR</h1>
            <p className="text-[10px] font-bold text-indigo-600 tracking-[0.3em] uppercase mt-1">Photo Angle AI</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Input Column */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">01</span>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Source Image</h2>
            </div>
            
            <label className={`relative group block w-full aspect-square rounded-[32px] border-2 border-dashed transition-all cursor-pointer overflow-hidden ${image ? 'border-indigo-500 bg-white' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'}`}>
              {image ? (
                <>
                  <img src={image} className="w-full h-full object-contain p-6" alt="Upload Preview" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-sm">
                    <span className="text-white font-black text-xs uppercase tracking-widest">Replace Photo</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-5 text-slate-300 group-hover:text-indigo-500 transition-colors">
                  <div className="p-5 rounded-full bg-white shadow-inner group-hover:scale-110 transition-transform">
                    <PhotoStackIcon className="w-12 h-12" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-xs uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">Click to Upload</p>
                    <p className="text-[10px] font-bold mt-1 text-slate-300">JPG or PNG formats</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={loading} />
            </label>

            <button 
              onClick={generate}
              disabled={!image || loading}
              className={`w-full mt-10 py-5 rounded-2xl font-black text-white text-xs uppercase tracking-[0.2em] shadow-2xl transition-all relative overflow-hidden ${!image || loading ? 'bg-slate-200 cursor-not-allowed text-slate-400 shadow-none' : 'bg-slate-900 hover:bg-indigo-600 hover:-translate-y-1 active:scale-95 shadow-indigo-200'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : "Generate 5 Angles"}
            </button>

            {error && (
              <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex gap-3 items-start">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] shrink-0">!</div>
                <p className="text-[11px] font-bold text-red-600 leading-relaxed">{error}</p>
              </div>
            )}
          </section>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-8">
          <section className="bg-white p-8 md:p-12 rounded-[48px] shadow-sm border border-slate-100 min-h-[700px]">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">02</span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Generated Perspectives</h2>
              </div>
              {results.length > 0 && (
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < results.length ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                  ))}
                </div>
              )}
            </div>

            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-40">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <AuthenticCameraIcon className="w-10 h-10 text-slate-200" />
                </div>
                <p className="font-black text-[11px] text-slate-300 uppercase tracking-[0.3em]">Awaiting Generation</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {results.map((res, i) => (
                <div key={i} className="group relative bg-slate-50 rounded-[32px] overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500">
                  <img src={res.url} className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-105" alt={res.name} />
                  
                  <div className="absolute top-6 left-6">
                    <span className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm border border-white/20">{res.name}</span>
                  </div>

                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = res.url;
                        link.download = `munawar-${res.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                        link.click();
                      }}
                      className="bg-white text-slate-900 font-black px-8 py-3.5 rounded-2xl flex items-center gap-3 text-[11px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                      <DownloadIcon /> Save Photo
                    </button>
                  </div>
                </div>
              ))}
              
              {loading && results.length < 5 && (
                <div className="aspect-[4/5] bg-slate-50 rounded-[32px] border-2 border-dashed border-indigo-100 flex flex-col items-center justify-center gap-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-indigo-50/20 scan-line" />
                  <div className="relative">
                    <div className="absolute -inset-4 bg-indigo-500/10 rounded-full animate-ping" />
                    <AuthenticCameraIcon className="w-12 h-12 text-indigo-300" />
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em]">Developing...</span>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">Angle {results.length + 1} of 5</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="py-20 text-center">
        <div className="inline-flex items-center gap-2 px-6 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Operational</span>
        </div>
        <p className="mt-8 opacity-20 text-[9px] font-black uppercase tracking-[0.4em]">Munawar Creative Intelligence Studio &copy; 2025</p>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
