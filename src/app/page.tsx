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
  { "id": "t1", "text": "但如果是你消失了，\\n我的世界会彻底停\\n转的。", "x": 160, "y": 120 }, 
  { "id": "t2", "text": "在浩瀚的宇宙里，我们或许渺小。", "x": 80, "y": 910 }
]`;

interface ComicText {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize?: number;
}

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState<string>(defaultJSON);
  const [globalFontSize, setGlobalFontSize] = useState<number>(44);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
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

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setJsonInput(newVal);
    
    try {
      const parsed = JSON.parse(newVal);
      if (Array.isArray(parsed)) {
        // Map to ensure properties but preserve others
        const enhancedTexts = parsed.map((item, index) => ({
          ...item,
          text: item.text,
          x: item.x || 100,
          y: item.y || 100 + (index * 150),
          id: item.id || ('text-' + index)
        }));
        setTexts(enhancedTexts);
      } else if (typeof parsed === 'object' && parsed !== null) {
        const keyVals = Object.entries(parsed).map(([key, val], idx) => ({
           id: key,
           text: val as string,
           x: 100,
           y: 100 + Number(idx) * 150
        }));
        setTexts(keyVals);
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
      // If the texts update was triggered by typing in the json box, their stringified
      // versions will match. We break early to completely avoid re-formatting the input 
      // box and ruining the user's cursor position or manual newline space formatting.
      if (JSON.stringify(parsedInput) === JSON.stringify(texts)) {
        return;
      }
    } catch {
      // If json is currently invalid syntax, proceed to forcefully correct it using current valid texts state.
    }

    // Since it didn't match the input box, this state change must have originated from 
    // the Canvas UI (dragging, resizing) or Toolbar sliding! Reflect back to string format.
    setJsonInput(JSON.stringify(texts, null, 2));
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

            {selectedId && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                <label className="flex justify-between text-sm font-medium text-orange-800 mb-2">
                  <span>Selected Text Size</span>
                  <span className="font-bold">{texts.find(t => t.id === selectedId)?.fontSize || globalFontSize}px</span>
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={texts.find(t => t.id === selectedId)?.fontSize || globalFontSize} 
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    setTexts(texts.map(t => t.id === selectedId ? { ...t, fontSize: newSize } : t));
                  }}
                  className="w-full accent-orange-600"
                />
              </div>
            )}
          </div>
          
        </div>

        {/* Workspace: Renderer */}
        <div className="w-full xl:w-2/3 flex flex-col items-center justify-center min-h-0 bg-gray-200/50 p-4 rounded-3xl border border-gray-300/50 flex-1 relative overflow-hidden">
           <div className="w-full h-full flex items-center justify-center overflow-auto">
             <ComicCanvas 
                imageSrc={imageSrc} 
                texts={texts} 
                setTexts={setTexts} 
                globalFontSize={globalFontSize} 
                selectedId={selectedId} 
                setSelectedId={setSelectedId} 
             />
           </div>
        </div>
      </div>
    </main>
  );
}
