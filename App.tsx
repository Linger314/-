import React, { useState } from 'react';
import { ArticleData, GenerationConfig, GenerationStatus } from './types';
import { generateVisualDescription, generateCoverImage, refineCoverImage } from './services/geminiService';
import InputSection from './components/InputSection';
import ResultDisplay from './components/ResultDisplay';

const App: React.FC = () => {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  
  // Data State
  const [currentData, setCurrentData] = useState<ArticleData | null>(null);
  const [currentConfig, setCurrentConfig] = useState<GenerationConfig | null>(null);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async (data: ArticleData, config: GenerationConfig) => {
    try {
      setStatus('analyzing');
      setErrorMessage(null);
      setGeneratedImage(null);
      setGeneratedPrompt(null);
      setCurrentData(data);
      setCurrentConfig(config);

      // Step 1: Text to Image Prompt
      const visualPrompt = await generateVisualDescription(data, config.style);
      setGeneratedPrompt(visualPrompt);

      setStatus('generating');

      // Step 2: Generate Image
      const imageUrl = await generateCoverImage(visualPrompt, config);
      setGeneratedImage(imageUrl);
      setStatus('completed');

    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message || "An unexpected error occurred during generation.");
    }
  };

  const handleRefine = async (instruction: string) => {
      if (!generatedImage || !currentConfig) return;

      try {
          setStatus('refining');
          setErrorMessage(null);
          
          const refinedImageUrl = await refineCoverImage(generatedImage, instruction, currentConfig);
          setGeneratedImage(refinedImageUrl);
          setStatus('completed');
      } catch (error: any) {
          console.error(error);
          setStatus('error');
          setErrorMessage("Failed to refine image. " + (error.message || ""));
      }
  };

  const handleReset = () => {
      setStatus('idle');
      setGeneratedImage(null);
      setGeneratedPrompt(null);
      setCurrentData(null);
      setCurrentConfig(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight">Journal Cover AI</h1>
                <p className="text-slate-400 text-sm">Scientific illustration generator powered by Gemini</p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
               <span>Gemini 2.5 Flash</span>
               <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
               <span>Gemini 3 Pro</span>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        {status === 'error' && errorMessage && (
            <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r shadow-sm" role="alert">
                <p className="font-bold">Error</p>
                <p>{errorMessage}</p>
                <button onClick={() => setStatus('idle')} className="text-sm underline mt-2">Try Again</button>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-160px)] min-h-[800px]">
          
          {/* Left Panel: Inputs */}
          <div className="lg:col-span-4 h-full">
            <InputSection 
                onGenerate={handleGenerate} 
                isGenerating={status === 'analyzing' || status === 'generating' || status === 'refining'} 
            />
          </div>

          {/* Right Panel: Display */}
          <div className="lg:col-span-8 h-full">
            <ResultDisplay 
                status={status} 
                imageUrl={generatedImage} 
                generatedPrompt={generatedPrompt}
                articleData={currentData}
                onReset={handleReset}
                onRefine={handleRefine}
            />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;