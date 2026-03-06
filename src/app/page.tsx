"use client";

import dynamic from 'next/dynamic';
import React, { useState } from 'react';

// Konva relies on window, which causes issues with SSR in Next.js.
// We import the canvas dynamically with { ssr: false } to only render on the client.
const ComicCanvas = dynamic(() => import('@/components/ComicCanvas'), { 
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center text-gray-400">Loading Drawing Canvas...</div>
});

const defaultJSON = `[
  { "id": "t1", "text": "布布：今天好累啊...", "x": 100, "y": 150 }, 
  { "id": "t2", "text": "一二：吃口草莓蛋糕吧！", "x": 250, "y": 300 }
]`;

interface ComicText {
  id: string;
  text: string;
  x: number;
  y: number;
}

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState<string>(defaultJSON);
  
  // Initially we parse default json to texts 
  const [texts, setTexts] = useState<ComicText[]>(JSON.parse(defaultJSON) as ComicText[]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Local URL for previewing, perfectly fine for single session web apps
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const parseJsonTexts = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        // We set new text states with auto generated X / Y coordinates if they don't have them
        const enhancedTexts = parsed.map((item, index) => ({
          ...item,
          text: item.text,
          x: item.x || 100,
          y: item.y || 100 + (index * 150), // Auto cascade down gracefully
          id: item.id || ('text-' + Date.now() + '-' + Math.random()) // ensure ID
        }));
        setTexts(enhancedTexts);
      } else {
        // If they just provide a raw object of texts
        if (typeof parsed === 'object') {
             const keyVals = Object.entries(parsed).map(([key, val], idx) => ({
                id: key,
                text: val as string,
                x: 100,
                y: 100 + Number(idx) * 150
             }));
             setTexts(keyVals);
        } else {
             alert("JSON format not understood. Expected Array or Key-Value Map.");
        }
      }
    } catch {
      alert("Invalid JSON format. Please ensure it's valid JSON syntax.");
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-neutral-50 flex flex-col items-center p-4 md:p-6 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-4 md:mb-6 text-center px-4 max-w-2xl mx-auto flex-none">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 mb-1">Comic Text Filler</h1>
        <p className="text-xs md:text-sm text-gray-500 font-medium">Auto-wraps, aligns and embeds structural LLM dialogue over your blank AI-generated comic panes.</p>
      </header>
      
      <div className="flex flex-col xl:flex-row gap-4 md:gap-6 w-full max-w-7xl px-2 md:px-4 flex-1 min-h-0">
        {/* Workspace: Control Panel */}
        <div className="w-full xl:w-1/3 flex flex-col gap-4 overflow-y-auto md:pr-2">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm">1</span> 
              Load Background
            </h2>
            <div className="relative border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-6 flex justify-center hover:bg-gray-100 hover:border-blue-400 transition cursor-pointer">
               <input 
                 type="file" 
                 accept="image/*" 
                 onChange={handleImageUpload}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
               <span className="text-sm font-medium text-gray-500 text-center pointer-events-none">
                 Drag & Drop your blank comic pane here <br/> <span className="text-xs font-normal">.png / .webp / .jpeg</span>
               </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md flex-1 flex flex-col">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm">2</span> 
              Inject Dialogue
            </h2>
            <p className="text-xs text-gray-500 mb-3 font-medium">Paste the JSON script directly from the language model</p>
            <textarea
              className="w-full flex-1 min-h-[150px] p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-gray-700 leading-relaxed shadow-inner"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              spellCheck={false}
            />
            <button 
              onClick={parseJsonTexts}
              className="w-full px-4 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition active:scale-[98%]"
            >
              Parse Script & Refresh Canvas
            </button>
          </div>
          
        </div>

        {/* Workspace: Renderer */}
        <div className="w-full xl:w-2/3 flex flex-col items-center justify-center min-h-0 bg-gray-200/50 p-4 rounded-3xl border border-gray-300/50 flex-1 relative overflow-hidden">
           <div className="w-full h-full flex items-center justify-center overflow-auto">
             <ComicCanvas imageSrc={imageSrc} texts={texts} setTexts={setTexts} />
           </div>
        </div>
      </div>
    </main>
  );
}
