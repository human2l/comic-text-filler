"use client";

import Konva from 'konva';
import React, { useRef } from 'react';
import { Image as KonvaImage, Layer, Stage, Text } from 'react-konva';
import useImage from 'use-image';

interface ComicCanvasProps {
  imageSrc: string | null;
  texts: { id: string; text: string; x: number; y: number; fontSize?: number }[];
  setTexts: React.Dispatch<React.SetStateAction<{ id: string; text: string; x: number; y: number; fontSize?: number }[]>>;
  globalFontSize: number;
}

export default function ComicCanvas({ imageSrc, texts, setTexts, globalFontSize }: ComicCanvasProps) {
  // Use 'anonymous' string for Cross-Origin resource sharing if using external URLs 
  const [image] = useImage(imageSrc || '', 'anonymous');
  
  const stageRef = useRef<Konva.Stage>(null);
  
  // Keep track of the original image dimensions. Fallback to 600x800 if empty.
  const width = image?.width || 600;
  const height = image?.height || 800;
  const dimensions = { width, height };
  
  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    setTexts(texts.map(t => 
      t.id === id ? { ...t, x: e.target.x(), y: e.target.y() } : t
    ));
  };

  const handleExport = () => {
    if (!stageRef.current) return;
    
    // Create a data URI of the canvas
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    
    // Trigger download
    const link = document.createElement('a');
    link.download = `comic_final_${Date.now()}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // We limit the max rendered UI width & height so it fits perfectly on screen
  // But maintain intrinsic properties and scaling internally for export
  // Assuming the user viewport has a maximum height constraint (e.g., 600px available vertically)
  const availableWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.6, 800) : 800;
  const availableHeight = typeof window !== 'undefined' ? window.innerHeight * 0.75 : 600;

  const scale = Math.min(
    1, 
    availableWidth / dimensions.width,
    availableHeight / dimensions.height
  );

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="mb-4 flex-none">
        <button 
          onClick={handleExport} 
          className="px-6 py-2 bg-blue-600 font-bold text-white rounded-lg shadow-md hover:bg-blue-700 transition active:bg-blue-800"
        >
          Export High-Res Image
        </button>
      </div>

      {imageSrc ? (
         <div 
            className="border-2 border-dashed border-gray-400 shadow-xl bg-white overflow-hidden relative cursor-crosshair" 
            style={{ 
              width: dimensions.width * scale, 
              height: dimensions.height * scale
            }}
          >
            <Stage 
              width={dimensions.width * scale} 
              height={dimensions.height * scale} 
              scaleX={scale} 
              scaleY={scale}
              ref={stageRef}
            >
              <Layer>
                {/* 1. Underlying AI Comic Image */}
                {image && (
                  <KonvaImage image={image} width={dimensions.width} height={dimensions.height} />
                )}
                
                {/* 2. Iterable Dynamic Text Bubbles */}
                {texts.map((textItem) => (
                  <Text
                    key={textItem.id}
                    id={textItem.id}
                    text={textItem.text}
                    x={textItem.x}
                    y={textItem.y}
                    draggable
                    onDragEnd={(e) => handleDragEnd(textItem.id, e)}
                    fontSize={textItem.fontSize || globalFontSize}
                    fontFamily="'Microsoft YaHei', 'PingFang SC', sans-serif"
                    fontStyle="bold"
                    fill="#2c221b" // Dark brown/grey matching the comic tone
                    width={450} // Wider max-width to allow manual \n formatting without premature auto-wrap
                    align="left" // The reference image uses left alignment for multi-line bubbles
                    lineHeight={1.4}
                  />
                ))}
              </Layer>
            </Stage>
         </div>
      ) : (
        <div 
          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-gray-100 text-gray-400 rounded-xl"
          style={{ width: dimensions.width * scale, height: dimensions.height * scale }}
        >
          <svg className="w-16 h-16 mb-4 opacity-50 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xl font-semibold opacity-70">Upload an image to start framing texts</span>
        </div>
      )}
    </div>
  );
}
