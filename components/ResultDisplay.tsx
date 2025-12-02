import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { ArticleData, GenerationStatus } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ResultDisplayProps {
  status: GenerationStatus;
  imageUrl: string | null;
  generatedPrompt: string | null;
  articleData: ArticleData | null;
  onReset: () => void;
  onRefine: (instruction: string) => void;
}

interface CoverMetadata {
  journalName: string;
  date: string;
  volumeInfo: string;
  website: string;
  tag: string;
  title: string;
  authors: string;
  footer: string;
  doi: string;
}

interface Position {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
}

interface LayoutState {
    header: Position;
    meta: Position;
    tag: Position;
    content: Position;
}

const FONT_SIZES = [
  'text-[8px] md:text-[10px]',  // 0
  'text-[10px] md:text-xs',     // 1
  'text-xs md:text-sm',         // 2
  'text-sm md:text-base',       // 3
  'text-base md:text-lg',       // 4
  'text-lg md:text-xl',         // 5
  'text-xl md:text-2xl',        // 6
  'text-2xl md:text-3xl',       // 7
  'text-3xl md:text-4xl',       // 8
  'text-4xl md:text-5xl',       // 9
  'text-5xl md:text-6xl',       // 10
  'text-6xl md:text-7xl',       // 11
  'text-7xl md:text-8xl',       // 12
  'text-8xl md:text-9xl',       // 13
  'text-9xl md:text-[10rem]',   // 14
];

const ResultDisplay: React.FC<ResultDisplayProps> = ({ status, imageUrl, generatedPrompt, articleData, onReset, onRefine }) => {
  const [refineText, setRefineText] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [textColor, setTextColor] = useState<'white' | 'black'>('white');
  const [mode, setMode] = useState<'edit' | 'layout'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  
  // Layout State (Positions in %)
  const [layout, setLayout] = useState<LayoutState>({
      header: { x: 5, y: 5 },
      meta: { x: 5, y: 13 },
      tag: { x: 70, y: 5 },
      content: { x: 5, y: 70 }
  });

  // Font Size State
  const [fontOffsets, setFontOffsets] = useState<Record<string, number>>({});
  const [activeField, setActiveField] = useState<string | null>(null);

  // Dragging State
  const [draggingKey, setDraggingKey] = useState<keyof LayoutState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Editable Metadata State
  const [metadata, setMetadata] = useState<CoverMetadata>({
    journalName: 'ADVANCED SCIENCE',
    date: 'DECEMBER 2025',
    volumeInfo: 'VOL. 420 • NO. 69',
    website: 'WWW.ADVANCEDSCIENCE.COM',
    tag: 'RESEARCH ARTICLE',
    title: 'Bioinspired Brush Reinforced Solid Slippery Coatings for Marine Photovoltaic Protection',
    authors: 'Ling Yin, Runxiang Tan, Junyi Han, Jianing Wang, Jianjun Cheng, Daheng Wu, Tao Zhang, Liping Wang',
    footer: 'FEATURED IN THIS ISSUE',
    doi: '10.1002/advs.202500123'
  });

  // Sync article data when available
  useEffect(() => {
    if (articleData) {
      setMetadata(prev => ({
        ...prev,
        journalName: articleData.journalName?.toUpperCase() || prev.journalName,
        title: articleData.title || prev.title,
        authors: articleData.authors || prev.authors,
        doi: articleData.doi || prev.doi,
      }));
    }
  }, [articleData]);

  // --- Dynamic Font Sizing Helpers ---
  const getResponsiveSize = (baseIndex: number, field: string | null) => {
    if (!field) return FONT_SIZES[baseIndex];
    const offset = fontOffsets[field] || 0;
    const index = Math.max(0, Math.min(FONT_SIZES.length - 1, baseIndex + offset));
    return FONT_SIZES[index];
  };

  const getJournalBaseIndex = (len: number) => {
    if (len < 10) return 12; 
    if (len < 20) return 11;
    if (len < 30) return 10;
    return 9;
  };

  const getTitleBaseIndex = (len: number) => {
    if (len < 30) return 8;
    if (len < 60) return 7;
    if (len < 100) return 6;
    return 5;
  };

  const getAuthorsBaseIndex = (len: number) => {
    if (len < 50) return 4;
    if (len < 100) return 2;
    return 1;
  };

  const handleFontSizeChange = (delta: number) => {
    if (!activeField) return;
    setFontOffsets(prev => ({
      ...prev,
      [activeField]: (prev[activeField] || 0) + delta
    }));
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent, key: keyof LayoutState) => {
      if (mode !== 'layout') return;
      e.preventDefault();
      setDraggingKey(key);
      dragStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          startX: layout[key].x,
          startY: layout[key].y
      };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!draggingKey || !dragStartRef.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;
      
      const deltaXPercent = (deltaX / containerRect.width) * 100;
      const deltaYPercent = (deltaY / containerRect.height) * 100;

      let newX = dragStartRef.current.startX + deltaXPercent;
      let newY = dragStartRef.current.startY + deltaYPercent;

      newX = Math.max(-10, Math.min(100, newX));
      newY = Math.max(-10, Math.min(100, newY));

      setLayout(prev => ({
          ...prev,
          [draggingKey]: { x: newX, y: newY }
      }));
  };

  const handleMouseUp = () => {
      setDraggingKey(null);
      dragStartRef.current = null;
  };

  useEffect(() => {
      if (draggingKey) {
          window.addEventListener('mouseup', handleMouseUp);
          const handleWindowMouseMove = (e: MouseEvent) => {
              if (!draggingKey || !dragStartRef.current || !containerRef.current) return;
      
              const containerRect = containerRef.current.getBoundingClientRect();
              const deltaX = e.clientX - dragStartRef.current.mouseX;
              const deltaY = e.clientY - dragStartRef.current.mouseY;
              
              const deltaXPercent = (deltaX / containerRect.width) * 100;
              const deltaYPercent = (deltaY / containerRect.height) * 100;

              let newX = dragStartRef.current.startX + deltaXPercent;
              let newY = dragStartRef.current.startY + deltaYPercent;
              
              setLayout(prev => ({
                  ...prev,
                  [draggingKey]: { x: newX, y: newY }
              }));
          };
          
          window.addEventListener('mousemove', handleWindowMouseMove);
          return () => {
              window.removeEventListener('mouseup', handleMouseUp);
              window.removeEventListener('mousemove', handleWindowMouseMove);
          };
      }
  }, [draggingKey]);

  const handleMetadataChange = (field: keyof CoverMetadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleDownloadPdf = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);

    // Save current mode and switch to edit (clean view without drag handles)
    const prevMode = mode;
    setMode('edit');
    setActiveField(null); // Clear focus highlight
    
    // Allow UI to update before capture
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const canvas = await html2canvas(containerRef.current, {
            scale: 3, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // A4 dimensions
        const pdfW = 210;
        const pdfH = 297;
        
        doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
        doc.save(`${metadata.journalName.replace(/[^a-z0-9]/gi, '_')}_Cover.pdf`);

    } catch (error) {
        console.error("Export failed", error);
        alert("Could not generate PDF. Please try again.");
    } finally {
        setMode(prevMode);
        setIsExporting(false);
    }
  };

  if (status === 'idle') {
    return (
      <div className="h-full min-h-[600px] bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-8">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
            <Icons.Image />
        </div>
        <p className="font-medium">Your cover art will appear here</p>
        <p className="text-sm mt-2 max-w-xs text-center">Fill in the details on the left to start generating your journal cover.</p>
      </div>
    );
  }

  if (status === 'analyzing' || status === 'generating' || status === 'refining') {
    return (
      <div className="h-full min-h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 to-pink-50 opacity-50 animate-pulse"></div>
        <div className="z-10 flex flex-col items-center text-center">
          <div className="mb-6 scale-150 text-indigo-600">
            <Icons.Loader />
          </div>
          <h3 className="text-xl font-serif font-bold text-slate-800 mb-2">
            {status === 'analyzing' ? 'Analyzing Content...' : status === 'refining' ? 'Refining Image...' : 'Painting Cover Art...'}
          </h3>
          <p className="text-slate-500 max-w-sm">
            {status === 'analyzing' 
              ? 'Structuring metadata and visual concepts.' 
              : 'Our AI artist is rendering high-resolution scientific art.'}
          </p>
        </div>
      </div>
    );
  }

  const txtClass = textColor === 'white' ? 'text-white placeholder-white/50' : 'text-slate-900 placeholder-slate-500/50';
  const dragClass = mode === 'layout' ? 'cursor-move ring-2 ring-indigo-500 ring-dashed bg-black/10' : '';
  const inputPointerClass = mode === 'layout' ? 'pointer-events-none select-none' : '';

  return (
    <div className="h-full flex flex-col animate-fadeIn gap-6">
      
      {/* EDITOR TOOLBAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-4 flex-wrap">
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                    onClick={() => setMode('edit')}
                    disabled={isExporting}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'edit' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Edit Text
                </button>
                <button
                    onClick={() => setMode('layout')}
                    disabled={isExporting}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${mode === 'layout' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className="scale-75"><Icons.Move /></span> Adjust Layout
                </button>
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            {/* Font Size Controls */}
            <div className="flex items-center gap-2">
                 <span className={`text-xs font-semibold uppercase ${activeField ? 'text-indigo-600' : 'text-slate-300'}`}>
                    Text Size
                 </span>
                 <div className="flex gap-1">
                    <button 
                        onClick={() => handleFontSizeChange(-1)}
                        disabled={!activeField || isExporting}
                        className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Decrease Font Size"
                    >
                        <span className="scale-75 block"><Icons.Minus /></span>
                    </button>
                    <button 
                        onClick={() => handleFontSizeChange(1)}
                        disabled={!activeField || isExporting}
                        className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Increase Font Size"
                    >
                        <span className="scale-75 block"><Icons.Plus /></span>
                    </button>
                 </div>
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <button 
                    onClick={() => setTextColor('white')}
                    className={`w-6 h-6 rounded-full border border-slate-300 bg-white ${textColor === 'white' ? 'ring-2 ring-indigo-500' : ''}`}
                    title="White Text"
                />
                <button 
                    onClick={() => setTextColor('black')}
                    className={`w-6 h-6 rounded-full border border-slate-300 bg-slate-900 ${textColor === 'black' ? 'ring-2 ring-indigo-500' : ''}`}
                    title="Black Text"
                />
            </div>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={onReset}
             disabled={isExporting}
             className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm flex items-center gap-2 transition-colors"
           >
             <Icons.Refresh /> New
           </button>
           <button 
             onClick={handleDownloadPdf}
             disabled={isExporting}
             className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
           >
             {isExporting ? <Icons.Loader /> : <Icons.Download />}
             {isExporting ? 'Exporting...' : 'Export PDF'}
           </button>
        </div>
      </div>

      {/* COVER PREVIEW */}
      <div className="w-full flex justify-center bg-slate-200 p-4 rounded-lg overflow-auto">
        <div 
            ref={containerRef}
            // Use specific A4 aspect ratio 210/297 ~ 0.707
            style={{ aspectRatio: '210/297' }}
            className="relative w-full max-w-[500px] bg-slate-900 shadow-2xl overflow-hidden group select-none shrink-0"
            onMouseMove={handleMouseMove}
        >
            {imageUrl && (
                <img 
                    src={imageUrl} 
                    alt="Generated Journal Cover" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
                />
            )}
            
            {/* --- HEADER GROUP --- */}
            <div 
                style={{ left: `${layout.header.x}%`, top: `${layout.header.y}%` }}
                className={`absolute w-[90%] z-20 transition-colors ${dragClass}`}
                onMouseDown={(e) => handleMouseDown(e, 'header')}
            >
                <input 
                    value={metadata.journalName}
                    onChange={(e) => handleMetadataChange('journalName', e.target.value)}
                    onFocus={() => setActiveField('journalName')}
                    className={`bg-transparent font-bold journal-font uppercase tracking-tight w-full outline-none ${txtClass} drop-shadow-lg ${inputPointerClass} ${getResponsiveSize(getJournalBaseIndex(metadata.journalName.length), 'journalName')}`}
                />
                <div className="w-full h-1 bg-yellow-500 shadow-sm mt-1"></div>
            </div>

            {/* --- META GROUP --- */}
            <div 
                style={{ left: `${layout.meta.x}%`, top: `${layout.meta.y}%` }}
                className={`absolute w-[90%] z-20 flex justify-between items-center tracking-wider ${txtClass} drop-shadow-md ${dragClass}`}
                onMouseDown={(e) => handleMouseDown(e, 'meta')}
            >
                <div className="flex gap-4">
                    <input 
                        value={metadata.date} 
                        onChange={(e) => handleMetadataChange('date', e.target.value)}
                        onFocus={() => setActiveField('date')}
                        className={`bg-transparent w-32 outline-none uppercase font-bold ${inputPointerClass} ${getResponsiveSize(2, 'date')}`}
                    />
                    <input 
                        value={metadata.volumeInfo}
                        onChange={(e) => handleMetadataChange('volumeInfo', e.target.value)}
                        onFocus={() => setActiveField('volumeInfo')}
                        className={`bg-transparent w-40 outline-none uppercase font-bold ${inputPointerClass} ${getResponsiveSize(2, 'volumeInfo')}`}
                    />
                </div>
                <input 
                    value={metadata.website}
                    onChange={(e) => handleMetadataChange('website', e.target.value)}
                    onFocus={() => setActiveField('website')}
                    className={`bg-transparent text-right w-64 outline-none uppercase font-bold ${inputPointerClass} ${getResponsiveSize(2, 'website')}`}
                />
            </div>

            {/* --- TAG GROUP --- */}
            <div 
                style={{ left: `${layout.tag.x}%`, top: `${layout.tag.y}%` }}
                className={`absolute z-30 ${dragClass}`}
                onMouseDown={(e) => handleMouseDown(e, 'tag')}
            >
                <div className="bg-yellow-500 text-slate-900 font-bold px-3 py-1 shadow-md uppercase tracking-wider">
                    <input 
                        value={metadata.tag}
                        onChange={(e) => handleMetadataChange('tag', e.target.value)}
                        onFocus={() => setActiveField('tag')}
                        className={`bg-transparent outline-none w-32 text-center placeholder-slate-800 ${inputPointerClass} ${getResponsiveSize(2, 'tag')}`}
                    />
                </div>
            </div>

            {/* --- CONTENT GROUP (Bottom) --- */}
            <div 
                style={{ left: `${layout.content.x}%`, top: `${layout.content.y}%` }}
                className={`absolute w-[90%] z-20 pl-4 md:pl-6 border-l-4 border-yellow-500 bg-gradient-to-r from-black/20 to-transparent p-4 rounded-r-lg backdrop-blur-[1px] ${dragClass}`}
                onMouseDown={(e) => handleMouseDown(e, 'content')}
            >
                <textarea 
                    value={metadata.title}
                    onChange={(e) => handleMetadataChange('title', e.target.value)}
                    onFocus={() => setActiveField('title')}
                    className={`bg-transparent font-serif font-bold leading-tight w-full outline-none resize-none overflow-hidden ${txtClass} drop-shadow-lg ${inputPointerClass} ${getResponsiveSize(getTitleBaseIndex(metadata.title.length), 'title')}`}
                    rows={3}
                />
                
                <textarea 
                    value={metadata.authors}
                    onChange={(e) => handleMetadataChange('authors', e.target.value)}
                    onFocus={() => setActiveField('authors')}
                    className={`bg-transparent mt-2 font-medium w-full outline-none resize-none overflow-hidden ${txtClass} drop-shadow-md opacity-90 ${inputPointerClass} ${getResponsiveSize(getAuthorsBaseIndex(metadata.authors.length), 'authors')}`}
                    rows={2}
                />

                <div className="flex flex-col gap-1 mt-3">
                    <div className="flex items-center gap-3">
                        <div className="h-1 w-8 bg-slate-400/80"></div>
                        <input 
                            value={metadata.footer}
                            onChange={(e) => handleMetadataChange('footer', e.target.value)}
                            onFocus={() => setActiveField('footer')}
                            className={`bg-transparent font-bold tracking-widest uppercase outline-none w-full ${txtClass} ${inputPointerClass} ${getResponsiveSize(1, 'footer')}`}
                        />
                    </div>
                    <input 
                        value={metadata.doi}
                        onChange={(e) => handleMetadataChange('doi', e.target.value)}
                        onFocus={() => setActiveField('doi')}
                        placeholder="DOI: 10.1000/xyz..."
                        className={`bg-transparent pl-11 outline-none w-full opacity-80 ${txtClass} ${inputPointerClass} ${getResponsiveSize(1, 'doi')}`}
                    />
                </div>
            </div>
        </div>
      </div>

      {/* REFINEMENT TOOLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
             <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                 <Icons.Sparkles /> AI Refinement
             </label>
             <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    placeholder="e.g. Make the background darker..."
                    className="flex-1 text-sm p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && refineText && onRefine(refineText)}
                 />
                 <button 
                    onClick={() => onRefine(refineText)}
                    disabled={!refineText || isExporting}
                    className="bg-slate-800 text-white text-xs px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                 >
                    Apply
                 </button>
             </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Hidden Prompt</h4>
                <button 
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="text-xs text-indigo-600 hover:underline"
                >
                    {showPrompt ? 'Hide' : 'Show'}
                </button>
              </div>
              {showPrompt ? (
                  <p className="text-xs text-slate-700 leading-relaxed italic h-10 overflow-y-auto">
                      "{generatedPrompt}"
                  </p>
              ) : (
                  <p className="text-xs text-slate-400 italic">Generate an image to see the prompt.</p>
              )}
          </div>
      </div>
    </div>
  );
};

export default ResultDisplay;