
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// --- ICONS ---
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

// --- CONFIG ---
const ANGLES = [
  { id: 'hero', name: 'Hero Cinematic', prompt: 'Cinematic hero shot from a dramatic low-angle looking up. Professional studio lighting.' },
  { id: 'flat', name: 'Flat Lay Overhead', prompt: 'Perfect 90-degree overhead flat lay. Soft diffuse professional lighting.' },
  { id: 'profile', name: '45-Degree Studio', prompt: 'Professional side profile at 45-degrees. Sharp focus, soft studio bokeh.' },
  { id: 'macro', name: 'Macro Detail', prompt: 'Extreme macro close-up focusing on physical textures and surface details.' },
  { id: 'catalog', name: 'Clean Catalog', prompt: 'Standard eye-level commercial catalog shot. Bright neutral studio environment.' }
];

const App = () => {
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<{url: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      setError("API Key Missing");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress(0);
    setStatusText("Analyzing Image...");

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
    ];

    try {
      const ai = new GoogleGenAI({ apiKey });
      const [header, base64Data] = image.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

      // --- STEP 1: VISUAL INTELLIGENCE RESCUE ---
      // We first describe the object to have a "text-only" backup if the image-to-image fails safety checks.
      setStatusText("Capturing Object Geometry...");
      // Fix: safetySettings moved into the config object as required by the @google/genai SDK
      const visionResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: "Briefly describe only the central physical object in this image. Focus on shape, color, and material. Ignore all background text, logos, or surrounding environment. Provide a short description for a 3D artist." }
            ]
          }
        ],
        config: { safetySettings }
      });
      const objectDescription = visionResponse.text || "A physical product";
      console.log("Vision Rescue Description:", objectDescription);

      const sessionResults: {url: string, name: string}[] = [];

      for (let i = 0; i < ANGLES.length; i++) {
        const angle = ANGLES[i];
        setStatusText(`Rendering ${angle.name}...`);
        
        try {
          // Attempt 1: Direct Image-to-Image (Best Quality)
          // Fix: safetySettings moved into the config object
          const directResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: `Re-render this exact object in a professional studio. PERSPECTIVE: ${angle.prompt}. Keep the core object identical but remove original background.` }
              ]
            },
            config: { safetySettings }
          });

          const candidate = directResponse.candidates?.[0];
          let finalPart = candidate?.content?.parts?.find(p => p.inlineData);

          // Attempt 2: Smart Rescue (If Attempt 1 was blocked)
          if (candidate?.finishReason === 'SAFETY' || !finalPart) {
            console.warn(`Safety block for ${angle.name}. Activating Smart Rescue Mode...`);
            setStatusText(`Rescuing ${angle.name}...`);
            
            // Fix: safetySettings moved into the config object
            const rescueResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [
                  { text: `A highly detailed, professional studio photograph of ${objectDescription}. PERSPECTIVE: ${angle.prompt}. No background, clean lighting, masterpiece quality.` }
                ]
              },
              config: { safetySettings }
            });
            finalPart = rescueResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          }

          if (finalPart?.inlineData) {
            sessionResults.push({
              url: `data:${finalPart.inlineData.mimeType};base64,${finalPart.inlineData.data}`,
              name: angle.name
            });
            setResults([...sessionResults]);
          }
        } catch (innerErr) {
          console.error("Angle Generation Failed:", innerErr);
        }
        setProgress(((i + 1) / ANGLES.length) * 100);
      }

      if (sessionResults.length === 0) {
        throw new Error("Extreme safety violation: The image and its description are both being blocked. This usually happens with currency, official IDs, or sensitive medical items.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  return (
    <div className="min-h-screen text-white bg-[#020203]">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-1 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500">
              <div className="bg-black rounded-[14px] p-3">
                <CameraMasterIcon />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">MUNAWAR</h1>
              <p className="text-[10px] font-bold text-indigo-400 tracking-[0.5em] uppercase mt-1 opacity-80">Photo Angle Studio AI</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-5 py-2 rounded-full border border-green-500/20 bg-green-500/5 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-green-100 uppercase tracking-widest">Rescue Mode Active</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Upload Column */}
        <div className="lg:col-span-4">
          <div className="glass-card p-10 rounded-[48px] accent-border sticky top-40">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-lg font-black text-indigo-400">01</span>
              <h2 className="text-xl font-black uppercase italic">Source Image</h2>
            </div>

            <label className={`relative block w-full aspect-square rounded-[36px] border-2 border-dashed transition-all cursor-pointer overflow-hidden ${image ? 'border-indigo-500' : 'border-white/10 hover:border-indigo-500/40 bg-white/[0.02]'}`}>
              {image ? (
                <img src={image} className="w-full h-full object-contain p-6" alt="Source" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                  <PhotoArtIcon />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Select Photo</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={loading} />
            </label>

            <button 
              onClick={generate}
              disabled={!image || loading}
              className={`w-full mt-10 py-6 rounded-3xl font-black text-[13px] uppercase tracking-[0.3em] transition-all relative overflow-hidden ${!image || loading ? 'bg-zinc-900 text-zinc-700' : 'accent-gradient text-white hover:scale-[1.02] active:scale-95 shadow-2xl shadow-indigo-500/20'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>{Math.round(progress)}%</span>
                </div>
              ) : "Render All Angles"}
            </button>

            {error && (
              <div className="mt-8 p-6 rounded-3xl bg-red-500/10 border border-red-500/20">
                <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider leading-relaxed italic">
                   System Note: {error}
                </p>
                <p className="text-[10px] text-zinc-500 mt-4 uppercase font-bold tracking-widest leading-relaxed">
                  Tip: If the medal text is being blocked, try a photo from further away.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-8">
          <div className="glass-card p-12 rounded-[56px] min-h-[700px] accent-border">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <span className="text-lg font-black text-indigo-400">02</span>
                <h2 className="text-2xl font-black uppercase italic">Output Frames</h2>
              </div>
              {loading && <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] animate-pulse">{statusText}</p>}
            </div>

            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-40 opacity-10">
                <PhotoArtIcon className="w-32 h-32 mb-8 grayscale" />
                <p className="text-[12px] font-black uppercase tracking-[1em]">Studio Empty</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {results.map((res, i) => (
                <div key={i} className="group relative glass-card rounded-[40px] overflow-hidden transition-all duration-500 hover:border-indigo-500/40">
                  <img src={res.url} className="w-full aspect-square object-cover" alt={res.name} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-sm">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = res.url;
                        link.download = `munawar-${res.name}.png`;
                        link.click();
                      }}
                      className="bg-white text-black p-4 rounded-2xl hover:scale-110 active:scale-95 transition-all"
                    >
                      <DownloadButtonIcon />
                    </button>
                    <p className="mt-4 text-[11px] font-black uppercase tracking-widest">{res.name}</p>
                  </div>
                  <div className="absolute top-6 left-6">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full">
                       <span className="text-[10px] font-black uppercase tracking-widest">{res.name}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && results.length < ANGLES.length && (
                <div className="aspect-square glass-card rounded-[40px] border-2 border-dashed border-indigo-500/10 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                  <div className="scanner-line" />
                  <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">{ANGLES[results.length].name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-20 text-center opacity-20">
        <p className="text-[10px] font-black uppercase tracking-[1.5em] ml-[1.5em]">Munawar AI Systems &copy; 2025</p>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
