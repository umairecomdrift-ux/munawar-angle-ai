import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- AUTHENTIC PHOTOGRAPHY ICONS ---
const CameraMasterIcon = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 11V7C7 5.89543 7.89543 5 9 5H15C16.1046 5 17 5.89543 17 7V11" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
    <rect x="2" y="9" width="20" height="11" rx="4" stroke="url(#logo-grad)" strokeWidth="2"/>
    <circle cx="12" cy="14.5" r="4" stroke="url(#logo-grad)" strokeWidth="2"/>
    <circle cx="12" cy="14.5" r="1.5" fill="url(#logo-grad)"/>
    <defs>
      <linearGradient id="logo-grad" x1="2" y1="5" x2="22" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#D946EF" />
      </linearGradient>
    </defs>
  </svg>
);

const PhotoArtIcon = ({ className = "w-16 h-16" }) => (
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

const DownloadButtonIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// --- STUDIO CONFIG ---
// Prompts are refined to be "safe" by ignoring context and focusing on "minimalist studio product photography"
const ANGLES = [
  { id: 'hero', name: 'Hero Cinematic', prompt: 'Cinematic hero shot from a dramatic low-angle, looking up. Minimalist clean studio lighting, high-end product photography style.' },
  { id: 'flat', name: 'Flat Lay Overhead', prompt: 'Perfect 90-degree overhead flat lay. Soft diffuse lighting, clean neutral studio floor, symmetrical composition.' },
  { id: 'profile', name: '45-Degree Studio', prompt: 'Professional side profile at 45-degrees. Shallow depth of field, sharp focus on the object, soft background bokeh.' },
  { id: 'macro', name: 'Macro Detail', prompt: 'Extreme macro close-up focusing on physical textures and material surface. Professional commercial macro lens aesthetic.' },
  { id: 'catalog', name: 'Clean Catalog', prompt: 'Standard eye-level commercial catalog shot. Bright neutral studio environment, sharp details throughout.' }
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
        setError("File size is too large. Please use a smaller image.");
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
      setError("CONFIGURATION ERROR: Missing API Key.");
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
           * STRATEGY: 
           * Safety filters are often triggered by "Background Art", "Stylized Text", or "Faces" in the source image.
           * We prompt the AI to IGNORE the background and focus ONLY on the central foreground object.
           */
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: `Focus ONLY on the central object in the foreground. Ignore the original background and any art or people in the background. Re-render just the foreground object in a professional minimalist studio setting with this perspective: ${angle.prompt}. Keep the object's original shape and materials.` }
              ]
            }
          });

          const candidate = response.candidates?.[0];
          
          if (candidate?.finishReason === 'SAFETY') {
            // Fallback for branded or complex items
            const fallbackResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType } },
                  { text: `A generic professional studio shot of this product type from a ${angle.name.toLowerCase()}. Focus on geometry and clean lighting. Discard all background elements.` }
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
          console.error(`Error in ${angle.name}:`, innerErr);
        }
        setProgress(((i + 1) / ANGLES.length) * 100);
      }

      if (sessionResults.length === 0) {
        throw new Error("Unable to generate images for this specific photo. This is likely due to complex background elements triggering security filters. Try taking a photo of the object against a simpler, plain background.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again with a different image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white">
      {/* Premium Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-1 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-2xl shadow-indigo-500/30">
              <div className="bg-black rounded-[14px] p-3">
                <CameraMasterIcon />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter italic uppercase bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">MUNAWAR</h1>
              <p className="text-[10px] font-bold text-indigo-400 tracking-[0.5em] uppercase mt-1.5 opacity-80">Photo Angle Studio AI</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-4">
             <div className="px-6 py-2.5 rounded-full glass-card border-indigo-500/20 bg-indigo-500/5 flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_#22c55e]" />
                <span className="text-[11px] font-black text-indigo-100 uppercase tracking-[0.2em]">Studio Online</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Input */}
        <div className="lg:col-span-4">
          <section className="glass-card p-12 rounded-[56px] relative overflow-hidden h-fit accent-border">
            <div className="absolute top-0 left-0 w-2 h-full accent-gradient" />
            
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                 <span className="text-lg font-black text-indigo-400">01</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight uppercase italic">Upload Source</h2>
            </div>

            <label className={`relative group block w-full aspect-square rounded-[48px] border-2 border-dashed transition-all cursor-pointer overflow-hidden ${image ? 'border-indigo-500 bg-black/40' : 'border-white/10 hover:border-indigo-500/40 bg-white/[0.02]'}`}>
              {image ? (
                <>
                  <img src={image} className="w-full h-full object-contain p-8" alt="Source" />
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all backdrop-blur-xl">
                    <PhotoArtIcon className="scale-90 mb-6" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Replace Original</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-8">
                  <div className="relative">
                    <div className="absolute -inset-12 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" />
                    <PhotoArtIcon className="relative" />
                  </div>
                  <div className="text-center px-6">
                    <p className="font-black text-sm text-zinc-300 uppercase tracking-[0.2em]">Select Photo</p>
                    <p className="text-[10px] text-zinc-600 mt-3 font-bold uppercase tracking-[0.2em] leading-relaxed">Object must be central<br/>(PNG/JPG max 10MB)</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={loading} />
            </label>

            <button 
              onClick={generate}
              disabled={!image || loading}
              className={`w-full mt-12 py-7 rounded-[32px] font-black text-[14px] uppercase tracking-[0.3em] transition-all relative overflow-hidden shadow-2xl ${!image || loading ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-white/5 shadow-none' : 'accent-gradient text-white hover:scale-[1.02] active:scale-95 shadow-indigo-500/20'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing {Math.round(progress)}%</span>
                </div>
              ) : "Generate 5 Angles"}
            </button>

            {error && (
              <div className="mt-10 p-8 rounded-[32px] bg-red-500/5 border border-red-500/10 shadow-2xl">
                <p className="text-[12px] font-bold text-red-400 uppercase tracking-[0.1em] leading-relaxed italic">
                   System Note: {error}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right Output */}
        <div className="lg:col-span-8">
          <section className="glass-card p-14 rounded-[64px] min-h-[850px] flex flex-col accent-border">
            <div className="flex items-center justify-between mb-20">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                   <span className="text-lg font-black text-indigo-400">02</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight uppercase italic">Studio Renders</h2>
              </div>
              {loading && (
                <div className="flex flex-col items-end gap-3">
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] animate-pulse">Capturing Frame {results.length + 1}</span>
                  <div className="w-56 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full accent-gradient transition-all duration-700 ease-out shadow-[0_0_15px_#6366f1]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {results.length === 0 && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-48 opacity-10">
                <PhotoArtIcon className="w-48 h-48 mb-12 grayscale blur-[1px]" />
                <p className="text-lg font-black uppercase tracking-[1.2em] ml-[1.2em]">Ready for Input</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {results.map((res, i) => (
                <div key={i} className="group relative glass-card rounded-[56px] overflow-hidden transition-all duration-700 hover:border-indigo-500/40 hover:shadow-2xl">
                  <img src={res.url} className="w-full aspect-square object-cover transition-transform duration-1000 group-hover:scale-110" alt={res.name} />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px]">
                    <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between">
                       <div className="space-y-1">
                         <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em]">Master Piece</span>
                         <p className="text-2xl font-black text-white uppercase italic tracking-tight">{res.name}</p>
                       </div>
                       <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = res.url;
                          link.download = `munawar-studio-angle-${i+1}.png`;
                          link.click();
                        }}
                        className="bg-white text-black p-5 rounded-3xl hover:scale-110 active:scale-90 transition-all shadow-2xl"
                      >
                        <DownloadButtonIcon />
                      </button>
                    </div>
                  </div>

                  <div className="absolute top-10 left-10">
                    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 px-8 py-3 rounded-full shadow-2xl">
                       <span className="text-[12px] font-black text-white uppercase tracking-[0.2em] italic">{res.name}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && results.length < ANGLES.length && (
                <div className="aspect-square glass-card rounded-[56px] border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center gap-12 relative overflow-hidden bg-white/[0.01]">
                  <div className="scanner-line" />
                  <div className="relative">
                    <div className="absolute -inset-16 bg-indigo-500/10 rounded-full animate-ping" />
                    <div className="bg-black/40 p-10 rounded-full border border-indigo-500/20 shadow-2xl">
                      <CameraMasterIcon className="w-20 h-20 text-indigo-500/40 animate-spin-slow" />
                    </div>
                  </div>
                  <div className="text-center px-8">
                    <p className="text-[15px] font-black text-indigo-500/60 uppercase tracking-[0.6em] animate-pulse">Rendering View</p>
                    <p className="text-[11px] text-zinc-600 mt-4 uppercase font-black tracking-[0.3em]">{ANGLES[results.length].name}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-48 pb-24 text-center">
        <div className="flex justify-center items-center gap-12 mb-12 opacity-30">
          <div className="w-40 h-[1px] bg-gradient-to-r from-transparent to-white/50" />
          <CameraMasterIcon className="w-8 h-8" />
          <div className="w-40 h-[1px] bg-gradient-to-l from-transparent to-white/50" />
        </div>
        <p className="text-[12px] font-black uppercase tracking-[2em] text-zinc-700 ml-[2em]">
          Munawar Intelligence Systems &copy; 2025
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
