import React, { useState, useRef } from 'react';
import { ArticleData, CoverStyle, AspectRatio, GenModel, GenerationConfig } from '../types';
import { Icons } from '../constants';
import { fetchDoiMetadata, extractPdfMetadata } from '../services/geminiService';

interface InputSectionProps {
  onGenerate: (data: ArticleData, config: GenerationConfig) => void;
  isGenerating: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onGenerate, isGenerating }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'doi' | 'file'>('text');
  
  // Article Data State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authors, setAuthors] = useState('');
  const [journalName, setJournalName] = useState('NATURE');
  const [doi, setDoi] = useState('');
  
  // Loading States
  const [doiLoading, setDoiLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration States
  const [selectedStyle, setSelectedStyle] = useState<CoverStyle>(CoverStyle.REALISTIC);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [model, setModel] = useState<GenModel>(GenModel.FLASH_IMAGE);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDoiFetch = async () => {
    if (!doi) return;
    setDoiLoading(true);
    setError(null);
    try {
      const data = await fetchDoiMetadata(doi);
      setTitle(data.title);
      // Clean up XML tags often found in CrossRef abstracts
      const cleanAbstract = data.content.replace(/<[^>]*>?/gm, '');
      setContent(cleanAbstract);
      if (data.authors) setAuthors(data.authors);
      if (data.journalName) setJournalName(data.journalName.toUpperCase());
      setActiveTab('text'); 
    } catch (err) {
      setError("Failed to fetch DOI. Please enter details manually.");
    } finally {
      setDoiLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileLoading(true);

    try {
      if (file.type === 'application/pdf') {
         // Convert to Base64
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = async () => {
           const base64 = reader.result as string;
           try {
             const data = await extractPdfMetadata(base64);
             setTitle(data.title);
             setContent(data.content);
             if (data.authors) setAuthors(data.authors);
             if (data.journalName) setJournalName(data.journalName.toUpperCase());
             setActiveTab('text');
           } catch (err) {
             console.error(err);
             setError("Failed to analyze PDF with AI. Please try pasting text.");
           } finally {
             setFileLoading(false);
           }
         };
         reader.onerror = () => {
           setError("Failed to read file.");
           setFileLoading(false);
         };
      } else {
        // Simple text file reader
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setContent(event.target.result as string);
            setTitle(file.name.split('.')[0]);
            setActiveTab('text');
            setFileLoading(false);
          }
        };
        reader.readAsText(file);
      }
    } catch (e) {
      setError("Error processing file.");
      setFileLoading(false);
    }
  };

  const handleGenerateClick = () => {
    if (!title || !content) {
      setError("Please provide a title and content/abstract.");
      return;
    }
    setError(null);
    onGenerate(
      { title, content, doi, authors, journalName },
      { model, style: selectedStyle, aspectRatio }
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            activeTab === 'text' ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icons.FileText /> Text
        </button>
        <button
          onClick={() => setActiveTab('doi')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            activeTab === 'doi' ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icons.Search /> DOI
        </button>
        <button
           onClick={() => setActiveTab('file')}
           className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
             activeTab === 'file' ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
           }`}
        >
           <Icons.Image /> PDF Upload
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
            <Icons.AlertCircle /> {error}
          </div>
        )}

        {/* Input Areas */}
        {activeTab === 'text' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Journal Name</label>
              <input
                type="text"
                value={journalName}
                onChange={(e) => setJournalName(e.target.value)}
                placeholder="NATURE, SCIENCE, etc."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-serif font-bold tracking-widest text-lg uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Article Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Quantum Entanglement in Macroscopic Systems"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-serif text-lg"
              />
            </div>
             
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Authors</label>
              <input
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="J. Smith, A. Doe, et al."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Abstract / Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your article abstract or key findings here..."
                className="w-full p-3 h-32 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === 'doi' && (
          <div className="space-y-4 animate-fadeIn py-8">
            <p className="text-sm text-slate-600 mb-2">Enter an article DOI to auto-fill title, authors, and abstract.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="10.1038/s41586-023-06000-z"
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleDoiFetch}
                disabled={doiLoading}
                className="bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {doiLoading ? <Icons.Loader /> : 'Fetch'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'file' && (
           <div className="space-y-4 animate-fadeIn py-8 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center p-8 bg-slate-50">
              {fileLoading ? (
                  <div className="flex flex-col items-center text-indigo-600">
                     <Icons.Loader />
                     <p className="mt-2 text-sm font-medium">Analyzing PDF with Gemini...</p>
                  </div>
              ) : (
                <>
                  <Icons.FileText />
                  <div className="text-sm text-slate-600 mt-2">
                    <p>Upload a PDF or Text file</p>
                    <p className="text-xs text-slate-400 mt-1">We use AI to extract metadata from PDFs automatically.</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".txt,.md,.pdf" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 text-indigo-600 font-medium hover:underline"
                  >
                    Browse Files
                  </button>
                </>
              )}
           </div>
        )}

        {/* Configuration */}
        <div className="border-t border-slate-200 pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Cover Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as GenModel)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                <option value={GenModel.FLASH_IMAGE}>Gemini 2.5 Flash (Fast)</option>
                <option value={GenModel.PRO_IMAGE}>Gemini 3 Pro (High Quality)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                <option value={AspectRatio.PORTRAIT}>3:4 (Journal Cover)</option>
                <option value={AspectRatio.SQUARE}>1:1 (Square)</option>
                <option value={AspectRatio.LANDSCAPE}>4:3 (Presentation)</option>
                <option value={AspectRatio.WIDE}>16:9 (Header)</option>
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs text-slate-500 mb-2">Art Style</label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
               {Object.entries(CoverStyle).map(([key, value]) => (
                 <button
                   key={key}
                   onClick={() => setSelectedStyle(value)}
                   className={`text-xs p-2 rounded-md border text-left transition-all ${
                     selectedStyle === value 
                       ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium' 
                       : 'border-slate-200 hover:border-slate-300 text-slate-600'
                   }`}
                 >
                   {key.replace('_', ' ')}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-200 bg-slate-50">
        <button
          onClick={handleGenerateClick}
          disabled={isGenerating || fileLoading}
          className="w-full py-4 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 font-medium text-lg"
        >
          {isGenerating ? (
            <>
              <Icons.Loader /> {isGenerating && 'Generating Cover...'}
            </>
          ) : (
            <>
              <Icons.Sparkles /> Generate Cover Art
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InputSection;