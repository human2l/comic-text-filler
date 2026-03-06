"use client";

import Konva from 'konva';
import React, { useRef } from 'react';
import { Image as KonvaImage, Layer, Stage, Text, Transformer } from 'react-konva';
import useImage from 'use-image';

interface ComicText {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
}

interface ComicCanvasProps {
  imageSrc: string | null;
  texts: ComicText[];
  setTexts: React.Dispatch<React.SetStateAction<ComicText[]>>;
  globalFontSize: number;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function ComicCanvas({ imageSrc, texts, setTexts, globalFontSize, selectedId, setSelectedId }: ComicCanvasProps) {
  // Use 'anonymous' string for Cross-Origin resource sharing if using external URLs 
  const [image] = useImage(imageSrc || '', 'anonymous');
  
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Keep track of the original image dimensions. Fallback to 600x800 if empty.
  const width = image?.width || 600;
  const height = image?.height || 800;
  const dimensions = { width, height };
  
  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    setTexts(texts.map(t => 
      t.id === id ? { ...t, x: e.target.x(), y: e.target.y() } : t
    ));
  };

  const handleTransform = (e: Konva.KonvaEventObject<Event>) => {
    // This runs continuously DURING the drag.
    // Transfomer changes scale, we need to convert it back to width/height natively
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const newWidth = Math.max(30, node.width() * scaleX);
    const newHeight = Math.max(20, node.height() * scaleY);
    
    // reset scale to 1 and update width/height natively for pure Konva Text reflow
    node.scaleX(1);
    node.scaleY(1);
    node.width(newWidth);
    node.height(newHeight);
    
    updatePopoverPos(); // Live sync UI during drag resize
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    // Save the final transformed state back to React state so it persists
    const node = e.target;
    setTexts(texts.map(t => 
      t.id === node.id() ? { 
        ...t, 
        x: node.x(), 
        y: node.y(),
        width: node.width(), // At this point, node.width() & height() are already the real new bounds because of handleTransform
        height: node.height()
      } : t
    ));
  };

  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // deselect when clicked on empty area or image
    const clickedOnEmpty = e.target === e.target.getStage();
    const clickedOnImage = e.target.attrs.image;
    if (clickedOnEmpty || clickedOnImage) {
      setSelectedId(null);
    }
  };

  // Attach Transformer lazily
  React.useEffect(() => {
    if (selectedId && transformerRef.current && stageRef.current) {
      const selectedNode = stageRef.current.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId, texts]);

  const handleExport = () => {
    if (!stageRef.current) return;
    
    // Hide transformer to prevent it from being rendered in the final image
    if (transformerRef.current) {
      transformerRef.current.hide();
      transformerRef.current.getLayer()?.draw(); // Process hide synchronously
    }
    
    // Create a data URI of the canvas
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    
    // Restore transformer visibility
    if (transformerRef.current) {
      transformerRef.current.show();
      transformerRef.current.getLayer()?.batchDraw();
    }
    
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
  
  const updatePopoverPos = React.useCallback(() => {
    if (!selectedId || !popoverRef.current || !stageRef.current) return;
    const node = stageRef.current.findOne(`#${selectedId}`);
    if (!node) return;

    // getClientRect gets perfectly computed absolute physical pixel bounds (accounting for auto-wrapped text)
    const box = node.getClientRect();
    
    let top = box.y - 55;
    // If popover goes past top boundary, intelligently flip it below the text block using true height
    if (top < 10) {
      top = box.y + box.height + 15;
    }
    
    let left = box.x;
    const stageWidth = stageRef.current.width();
    left = Math.max(10, Math.min(left, stageWidth - 180)); // 180 is approximate popover bounding width

    popoverRef.current.style.left = `${left}px`;
    popoverRef.current.style.top = `${top}px`;
  }, [selectedId]);

  React.useLayoutEffect(() => {
    // Synchronize popover on text changes, selections, and window scaling
    updatePopoverPos();
  }, [selectedId, texts, scale, updatePopoverPos]);

  const selectedTextObj = texts.find(t => t.id === selectedId);

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
              onMouseDown={checkDeselect}
              onTouchStart={checkDeselect}
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
                    onClick={() => setSelectedId(textItem.id)}
                    onTap={() => setSelectedId(textItem.id)}
                    onDragStart={() => setSelectedId(textItem.id)}
                    onDragMove={updatePopoverPos}
                    onDragEnd={(e) => handleDragEnd(textItem.id, e)}
                    onTransform={handleTransform}
                    onTransformEnd={handleTransformEnd}
                    fontSize={textItem.fontSize || globalFontSize}
                    fontFamily="'Microsoft YaHei', 'PingFang SC', sans-serif"
                    fontStyle="bold"
                    fill="#2c221b" // Dark brown/grey matching the comic tone
                    width={textItem.width || 450} // Defaults to 450 unless transformed
                    height={textItem.height} // Auto-height if undefined
                    align="center" // Change default alignment to center
                    verticalAlign="top"
                    lineHeight={1.4}
                  />
                ))}
                
                {selectedId && (
                  <Transformer
                    ref={transformerRef}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    boundBoxFunc={(oldBox: any, newBox: any) => {
                      // Since we only use bottom-right anchor, top-left (x, y) must be strictly pinned.
                      // Any mutation of x or y means the user has dragged past the top/left boundary 
                      // and the Transformer is attempting to slide or flip the node.
                      if (Math.abs(newBox.x - oldBox.x) > 0.5 || Math.abs(newBox.y - oldBox.y) > 0.5) {
                        return oldBox;
                      }
                      
                      // limit shrink
                      if (newBox.width < 30 || newBox.height < 20) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                    enabledAnchors={['bottom-right']} // Only allow bottom right resize
                    keepRatio={false} // Let the user resize width and height independently
                    rotateEnabled={false} // Disable rotation for cleaner typography bounds
                  />
                )}
              </Layer>
            </Stage>
            
            {/* Inline floating toolbar for selected text */}
            {selectedTextObj && (
              <div 
                ref={popoverRef}
                className="absolute bg-white/95 backdrop-blur-md shadow-xl border border-gray-200 rounded-xl p-2.5 flex items-center gap-2 z-10"
                style={{
                   // initial visually hidden state to prevent flash before first layout effect
                   top: '-999px',
                   left: '-999px'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col text-[10px] leading-none text-gray-500 font-bold uppercase tracking-wider justify-center">
                   <span>Size</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={selectedTextObj.fontSize || globalFontSize} 
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    setTexts(texts.map(t => t.id === selectedId ? { ...t, fontSize: newSize } : t));
                  }}
                  className="w-24 accent-orange-500 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-gray-800 w-6 text-right">
                  {selectedTextObj.fontSize || globalFontSize}
                </span>
              </div>
            )}
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
