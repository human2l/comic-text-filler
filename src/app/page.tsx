"use client";

import dynamic from 'next/dynamic';
import React, { useState } from 'react';

// Konva relies on window, which causes issues with SSR in Next.js.
// We import the canvas dynamically with { ssr: false } to only render on the client.
const ComicCanvas = dynamic(() => import('@/components/ComicCanvas'), { 
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center text-gray-400">Loading Drawing Canvas...</div>
});

const defaultJSON = `{
  "Yier": "但如果是你消失了，\\n我的世界会彻底停转的。",
  "Narration": "在浩瀚的宇宙里，我们或许渺小。"
}`;

interface ComicText {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
}

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState<string>(defaultJSON);
  const [globalFontSize, setGlobalFontSize] = useState<number>(44);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDraggingOverRenderer, setIsDraggingOverRenderer] = useState<boolean>(false);
  
  const [texts, setTexts] = useState<ComicText[]>(() => {
    try {
      const parsed = JSON.parse(defaultJSON);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed).map(([key, val], idx) => ({
           id: key,
           text: val as string,
           x: 100,
           y: 100 + Number(idx) * 150
        }));
      }
    } catch {}
    return [];
  });

  const handleRendererDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverRenderer(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const handleRendererDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverRenderer(true);
  };

  const handleRendererDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverRenderer(false);
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setJsonInput(newVal);
    
    try {
      const parsed = JSON.parse(newVal);
      if (Array.isArray(parsed)) {
        setTexts(prevTexts => parsed.map((item, index) => {
          const id = item.id || ('text-' + index);
          const existing = prevTexts.find(t => t.id === id);
          return {
            id,
            text: typeof item.text === 'string' ? item.text : JSON.stringify(item.text || ''),
            x: existing?.x ?? (item.x || 100),
            y: existing?.y ?? (item.y || 100 + Number(index) * 150),
            width: existing?.width ?? item.width,
            height: existing?.height ?? item.height,
            fontSize: existing?.fontSize ?? item.fontSize
          };
        }));
      } else if (typeof parsed === 'object' && parsed !== null) {
        setTexts(prevTexts => Object.entries(parsed).map(([key, val], idx) => {
           const existing = prevTexts.find(t => t.id === key);
           return {
             id: key,
             text: typeof val === 'string' ? val : JSON.stringify(val),
             x: existing?.x ?? 100,
             y: existing?.y ?? 100 + Number(idx) * 150,
             width: existing?.width,
             height: existing?.height,
             fontSize: existing?.fontSize
           };
        }));
      }
    } catch {
      // Silently fail if they are in the middle of typing invalid JSON syntax
    }
  };

  const prevTextsRef = React.useRef(texts);

  // Two-way binding sync from texts to jsonInput
  React.useEffect(() => {
    // Only process if the actual text objects changed
    if (prevTextsRef.current === texts) return;
    prevTextsRef.current = texts;

    try {
      const parsedInput = JSON.parse(jsonInput);
      
      let currentJsonRep: unknown;
      if (Array.isArray(parsedInput)) {
        currentJsonRep = texts.map(t => ({ id: t.id, text: t.text }));
      } else {
        currentJsonRep = texts.reduce((acc, t) => {
          acc[t.id] = t.text;
          return acc;
        }, {} as Record<string, string>);
      }

      // If the actual textual payload matches verbatim, don't clobber the user's manual JSON formatting
      if (JSON.stringify(parsedInput) === JSON.stringify(currentJsonRep)) {
        return;
      }
      
      setJsonInput(JSON.stringify(currentJsonRep, null, 2));
    } catch {
      // If json is currently invalid syntax, proceed to forcefully correct it using current valid texts state.
      const fallbackObj = texts.reduce((acc, t) => {
        acc[t.id] = t.text;
        return acc;
      }, {} as Record<string, string>);
      setJsonInput(JSON.stringify(fallbackObj, null, 2));
    }
  }, [texts, jsonInput]);

  return (
    <main className="h-screen overflow-hidden bg-neutral-50 flex flex-col items-center p-4 md:p-6 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-4 md:mb-6 text-center px-4 max-w-2xl mx-auto flex-none">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 mb-1">Comic Text Filler</h1>
        <p className="text-xs md:text-sm text-gray-500 font-medium">Auto-wraps, aligns and embeds structural LLM dialogue over your blank AI-generated comic panes.</p>
      </header>
      
      <div className="flex flex-col xl:flex-row gap-4 md:gap-6 w-full max-w-7xl px-2 md:px-4 flex-1 min-h-0">
        {/* Workspace: Control Panel */}
        <div className="w-full xl:w-1/3 flex flex-col gap-4 overflow-y-auto md:pr-2">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md flex-1 flex flex-col">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
              Inject Dialogue
            </h2>
            <p className="text-xs text-gray-500 mb-3 font-medium">Paste the JSON script directly from the language model</p>
            <textarea
              className="w-full flex-1 min-h-[150px] p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-gray-700 leading-relaxed shadow-inner"
              value={jsonInput}
              onChange={handleJsonChange}
              spellCheck={false}
            />
            <div className="mb-4">
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Global Font Size</span>
                <span className="text-blue-600 font-bold">{globalFontSize}px</span>
              </label>
              <input 
                type="range" 
                min="20" 
                max="80" 
                value={globalFontSize} 
                onChange={(e) => setGlobalFontSize(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>
          
        </div>

        {/* Workspace: Renderer */}
        <div 
          className={`w-full xl:w-2/3 flex flex-col items-center justify-center min-h-0 p-4 rounded-3xl flex-1 relative overflow-hidden transition-all duration-200 ${
            isDraggingOverRenderer 
              ? 'bg-blue-50/80 border-4 border-dashed border-blue-400' 
              : 'bg-gray-200/50 border border-gray-300/50'
          }`}
          onDrop={handleRendererDrop}
          onDragOver={handleRendererDragOver}
          onDragLeave={handleRendererDragLeave}
        >
           <div className="w-full h-full flex items-center justify-center overflow-auto pointer-events-auto">
             <ComicCanvas 
                imageSrc={imageSrc} 
                texts={texts} 
                setTexts={setTexts} 
                globalFontSize={globalFontSize} 
                selectedId={selectedId} 
                setSelectedId={setSelectedId} 
             />
           </div>
           
           {/* Drop Overlay visual feedback over the right side */}
           {isDraggingOverRenderer && (
             <div className="absolute inset-0 bg-blue-500/10 pointer-events-none flex items-center justify-center z-50 rounded-3xl">
               <div className="bg-white/95 backdrop-blur px-8 py-6 rounded-2xl shadow-2xl font-bold text-blue-600 flex flex-col items-center animate-bounce">
                 <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                 </svg>
                 <span className="text-xl">Release image to load into Canvas</span>
               </div>
             </div>
           )}
        </div>
      </div>
    </main>
  );
}
