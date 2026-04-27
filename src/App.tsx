/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Sparkles, 
  Image as ImageIcon, 
  Settings2, 
  CheckCircle2, 
  Loader2, 
  ChevronRight,
  Info,
  RefreshCw,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GenerationStatus, 
  ImagePrompt, 
  MasterStyle, 
  DEFAULT_STYLES,
  RefinementModel 
} from './types';
import { refinePrompt, generateImage } from './services/geminiService';

export default function App() {
  const [prompts, setPrompts] = useState<ImagePrompt[]>([
    { id: crypto.randomUUID(), rawInput: '', status: GenerationStatus.IDLE }
  ]);
  const [selectedStyle, setSelectedStyle] = useState<MasterStyle>(DEFAULT_STYLES[0]);
  const [refinementModel, setRefinementModel] = useState<RefinementModel>(RefinementModel.FLASH);
  const [customStyleDesc, setCustomStyleDesc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ... (activeStyle useMemo stays the same)
  const activeStyle = useMemo(() => {
    if (selectedStyle.name === 'Custom') {
      return { ...selectedStyle, description: customStyleDesc };
    }
    return selectedStyle;
  }, [selectedStyle, customStyleDesc]);

  const addPrompt = () => {
    setPrompts([...prompts, { id: crypto.randomUUID(), rawInput: '', status: GenerationStatus.IDLE }]);
  };

  const removePrompt = (id: string) => {
    setPrompts(prompts.filter(p => p.id !== id));
  };

  const updatePromptInput = (id: string, value: string) => {
    setPrompts(prompts.map(p => p.id === id ? { ...p, rawInput: value } : p));
  };

  const processOne = async (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt || !prompt.rawInput.trim()) return;

    try {
      // 1. Refining
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: GenerationStatus.REFINING, error: undefined } : p));
      const refined = await refinePrompt(prompt.rawInput, activeStyle, refinementModel);
      
      // 2. Generating
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, refinedPrompt: refined, status: GenerationStatus.GENERATING } : p));
      const url = await generateImage(refined);

      // 3. Completed
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, imageUrl: url, status: GenerationStatus.COMPLETED } : p));
    } catch (err) {
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: GenerationStatus.ERROR, error: err instanceof Error ? err.message : 'Unknown error' } : p));
    }
  };

  const runAll = async () => {
    setIsProcessing(true);
    for (const prompt of prompts) {
      if (prompt.status !== GenerationStatus.COMPLETED && prompt.rawInput.trim()) {
        await processOne(prompt.id);
      }
    }
    setIsProcessing(false);
  };

  return (
    <div className="h-screen bg-[#0f1115] text-[#e1e1e6] font-sans flex overflow-hidden antialiased selection:bg-blue-500 selection:text-white">
      {/* Left Sidebar: Sequential Queue */}
      <aside className="w-72 border-r border-[#2a2d35] bg-[#161920] flex flex-col shrink-0">
        <header className="p-4 border-b border-[#2a2d35] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[11px] tracking-wider uppercase text-blue-400">Prompt Queue</span>
          </div>
          <span className="text-[10px] bg-[#2a2d35] px-2 py-0.5 rounded text-gray-400 font-mono">
            {prompts.filter(p => p.status === GenerationStatus.COMPLETED).length} / {prompts.length}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          <AnimatePresence initial={false}>
            {prompts.map((prompt, index) => (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 rounded transition-all cursor-pointer group border ${
                  prompt.status !== GenerationStatus.IDLE 
                    ? 'bg-[#2a2d35]/30 border-[#2a2d35]' 
                    : 'border-transparent hover:bg-[#1c202a]'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-mono font-bold uppercase ${
                    prompt.status === GenerationStatus.COMPLETED ? 'text-green-400' :
                    prompt.status === GenerationStatus.ERROR ? 'text-red-400' :
                    prompt.status !== GenerationStatus.IDLE ? 'text-blue-400' : 'text-gray-500'
                  }`}>
                    #{ (index + 1).toString().padStart(2, '0') } {prompt.status}
                  </span>
                  {prompt.status !== GenerationStatus.IDLE && (
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      prompt.status === GenerationStatus.COMPLETED ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                      prompt.status === GenerationStatus.ERROR ? 'bg-red-500' :
                      'bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]'
                    }`}></div>
                  )}
                </div>
                
                <textarea
                  value={prompt.rawInput}
                  onChange={(e) => updatePromptInput(prompt.id, e.target.value)}
                  placeholder="Define segment..."
                  className="w-full text-xs text-gray-300 bg-transparent border-none outline-none resize-none placeholder:text-gray-600 min-h-[40px] leading-relaxed"
                  disabled={isProcessing}
                />

                <div className="flex items-center justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removePrompt(prompt.id)}
                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-[#0f1115] border-t border-[#2a2d35] space-y-3">
          <button 
            onClick={addPrompt}
            className="w-full py-2 bg-[#2a2d35] hover:bg-[#353945] text-white rounded text-[10px] font-bold transition-all uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Plus className="w-3 h-3" /> Add Segment
          </button>
          
          <button
            onClick={runAll}
            disabled={isProcessing || prompts.every(p => !p.rawInput.trim())}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Sequence</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0f1115]">
        {/* Top Header */}
        <header className="h-14 border-b border-[#2a2d35] flex items-center justify-between px-6 bg-[#161920]/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <span className="font-bold text-xs tracking-tight uppercase">Studio Consistent <span className="text-gray-500 font-mono font-normal ml-2">v1.2.4</span></span>
            </div>
            <div className="h-4 w-px bg-[#2a2d35]"></div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-green-400">
               <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Style Lock Active
            </div>
          </div>
          <div className="flex gap-2">
            <div className="hidden sm:flex items-center px-3 py-1.5 border border-[#2a2d35] rounded text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
              MEM: 12.4GB / 32GB
            </div>
            <button className="px-3 py-1.5 bg-white text-black font-bold rounded text-[10px] uppercase tracking-wider hover:bg-gray-200 transition-colors">Export Assets</button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Gallery Canvas */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex items-end justify-between border-b border-[#2a2d35] pb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-light tracking-tight text-white uppercase">Series Overview</h2>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Global Sequence Buffer | {prompts.length} Nodes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {prompts.map((prompt, index) => (
                  <motion.div
                    key={prompt.id}
                    layout
                    className="group space-y-3"
                  >
                    <div className="aspect-square bg-[#090a0c] rounded border border-[#2a2d35] relative overflow-hidden transition-all duration-500 group-hover:border-blue-500/50 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                      {prompt.imageUrl ? (
                        <img 
                          src={prompt.imageUrl} 
                          alt={prompt.rawInput}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                          {prompt.status === GenerationStatus.REFINING || prompt.status === GenerationStatus.GENERATING ? (
                            <div className="space-y-4 flex flex-col items-center">
                              <div className="relative">
                                <div className="w-10 h-10 border-2 border-blue-500/20 rounded-full border-t-blue-500 animate-spin"></div>
                                <Sparkles className="w-4 h-4 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400">
                                  {prompt.status === GenerationStatus.REFINING ? 'Synthesizing' : 'Rendering'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="opacity-20 group-hover:opacity-40 transition-opacity flex flex-col items-center">
                              <div className="w-16 h-16 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center mb-4">
                                <ImageIcon className="w-6 h-6 text-gray-500" />
                              </div>
                              <p className="text-[10px] font-mono text-gray-600 uppercase">NODE_{(index + 1).toString().padStart(2, '0')}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info Badge */}
                      <div className="absolute top-3 left-3 flex gap-1">
                        <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono font-bold text-white border border-white/10 uppercase tracking-widest">
                          SGNL_{(index + 1).toString().padStart(2, '0')}
                        </div>
                      </div>

                      {/* Detail Overlay */}
                      {prompt.imageUrl && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                          <p className="text-[10px] leading-relaxed line-clamp-3 text-gray-300 italic mb-3">
                            {prompt.refinedPrompt}
                          </p>
                          <button 
                            onClick={() => processOne(prompt.id)}
                            className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold uppercase tracking-widest rounded transition-colors"
                          >
                            Recalculate Node
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="px-1">
                      <div className="flex items-center justify-between">
                         <h3 className="text-[11px] font-bold uppercase text-gray-200 truncate pr-4">
                           {prompt.rawInput || 'Unlabeled Segment'}
                         </h3>
                         <span className={`text-[9px] font-mono font-bold ${
                           prompt.status === GenerationStatus.COMPLETED ? 'text-green-500' : 'text-gray-500'
                         }`}>
                           {prompt.status}
                         </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <footer className="pt-16 pb-8 border-t border-[#2a2d35] flex flex-col items-center gap-4">
                 <div className="flex items-center gap-4 text-gray-700">
                    <div className="h-px w-8 bg-current"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                    <div className="h-px w-8 bg-current"></div>
                 </div>
                 <p className="text-[9px] font-mono font-bold uppercase tracking-[0.5em] text-gray-600">Secure Sequential Link Active</p>
              </footer>
            </div>
          </div>

          {/* Right Sidebar: Logic & Consistency Controls */}
          <aside className="w-80 border-l border-[#2a2d35] bg-[#161920] flex flex-col p-5 space-y-8 shrink-0 overflow-y-auto scrollbar-hide">
             {/* Consistency Stats */}
             <section>
                <div className="flex items-center gap-2 mb-4">
                   <Settings2 className="w-3.5 h-3.5 text-gray-500" />
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Master Consistency</h3>
                </div>
                <div className="space-y-5">
                   <div>
                      <div className="flex justify-between text-[10px] mb-2 font-bold uppercase tracking-tighter">
                         <span className="text-gray-400">Visual Cohesion Strength</span>
                         <span className="text-blue-400">94.8%</span>
                      </div>
                      <div className="h-1 w-full bg-[#2a2d35] rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 w-[94.8%] shadow-[0_0_8px_#3b82f6]"></div>
                      </div>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-[#0f1115] border border-[#2a2d35] rounded">
                      <div className="space-y-1">
                         <span className="block text-[10px] text-gray-400 uppercase font-bold">Semantic Lock</span>
                         <span className="block text-[9px] text-green-400 font-mono uppercase tracking-tighter font-bold">Stable Architecture</span>
                      </div>
                      <div className="w-10 h-5 bg-blue-600 rounded-full relative shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                         <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                      </div>
                   </div>
                </div>
             </section>

             <div className="h-px bg-[#2a2d35]"></div>

             {/* Reasoning Mode Selector */}
             <section className="space-y-4">
                <div className="flex items-center gap-2">
                   <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Reasoning Engine (사고 모드)</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button 
                     onClick={() => setRefinementModel(RefinementModel.FLASH)}
                     className={`p-2.5 rounded border text-[10px] font-bold uppercase transition-all ${
                       refinementModel === RefinementModel.FLASH 
                         ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                         : 'border-[#2a2d35] text-gray-500 hover:border-gray-600'
                     }`}
                   >
                     Flash (Standard)
                   </button>
                   <button 
                     onClick={() => setRefinementModel(RefinementModel.THINKING)}
                     className={`p-2.5 rounded border text-[10px] font-bold uppercase transition-all ${
                       refinementModel === RefinementModel.THINKING 
                         ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                         : 'border-[#2a2d35] text-gray-500 hover:border-gray-600'
                     }`}
                   >
                     Thinking (COGNITIVE)
                   </button>
                </div>
                {refinementModel === RefinementModel.THINKING && (
                  <p className="text-[9px] text-purple-400 italic font-mono leading-tight">
                    * Applying Deep Reasoning for enhanced consistency & creative prompt injection.
                  </p>
                )}
             </section>

             <div className="h-px bg-[#2a2d35]"></div>

             {/* Style Engine Selector */}
             <section className="space-y-4">
                <div className="flex items-center gap-2">
                   <Palette className="w-3.5 h-3.5 text-gray-500" />
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Aesthetic Engine</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-1.5">
                   {DEFAULT_STYLES.map(style => (
                    <button
                      key={style.name}
                      onClick={() => setSelectedStyle(style)}
                      className={`text-left p-2.5 rounded border transition-all duration-200 group flex items-center justify-between ${
                        selectedStyle.name === style.name 
                          ? 'border-blue-500/50 bg-blue-500/5' 
                          : 'border-[#2a2d35] hover:bg-[#2a2d35]/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`text-[10px] font-bold uppercase tracking-tight ${selectedStyle.name === style.name ? 'text-blue-400' : 'text-gray-300'}`}>{style.name}</div>
                        <div className="text-[9px] text-gray-500 truncate mt-0.5 font-medium">{style.description}</div>
                      </div>
                    </button>
                   ))}
                   
                   <button
                    onClick={() => setSelectedStyle({ name: 'Custom', description: '' })}
                    className={`text-left p-2.5 rounded border transition-all duration-200 ${
                      selectedStyle.name === 'Custom' 
                        ? 'border-blue-500/50 bg-blue-500/5' 
                        : 'border-[#2a2d35] hover:bg-[#2a2d35]/30'
                    }`}
                   >
                     <div className={`text-[10px] font-bold uppercase tracking-tight ${selectedStyle.name === 'Custom' ? 'text-blue-400' : 'text-gray-300'}`}>Override Style</div>
                   </button>
                </div>

                {selectedStyle.name === 'Custom' && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                    <textarea
                      value={customStyleDesc}
                      onChange={(e) => setCustomStyleDesc(e.target.value)}
                      placeholder="Input style parameters..."
                      className="w-full h-24 p-3 text-[11px] bg-[#0f1115] border border-[#2a2d35] rounded focus:border-blue-500 outline-none resize-none font-mono text-gray-400 leading-relaxed"
                    />
                  </motion.div>
                )}
             </section>

             <div className="h-px bg-[#2a2d35]"></div>

             {/* System Logistics */}
             <section>
                <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-3 tracking-widest">Logic Flow</h3>
                <div className="bg-[#0f1115] p-3 rounded text-[10px] font-mono text-gray-500 leading-relaxed border border-[#2a2d35] space-y-1">
                  <div className="flex justify-between border-b border-[#2a2d35]/50 pb-1">
                    <span>PROMPT_CHAINING</span>
                    <span className="text-blue-400">ENABLED</span>
                  </div>
                  <div className="flex justify-between border-b border-[#2a2d35]/50 pb-1 pt-1">
                    <span>REFERENCE_DEPTH</span>
                    <span className="text-white">5_STEPS</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>SEMANTIC_STILL</span>
                    <span className="text-green-400">ACTIVE</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                   <div className="p-2 bg-[#2a2d35] rounded text-center border border-white/5">
                      <div className="text-[9px] text-gray-500 uppercase font-bold">Model</div>
                      <div className="text-[11px] font-bold text-white uppercase mt-0.5">Gemini 3</div>
                   </div>
                   <div className="p-2 bg-[#2a2d35] rounded text-center border border-white/5">
                      <div className="text-[9px] text-gray-500 uppercase font-bold">Batch</div>
                      <div className="text-[11px] font-bold text-white uppercase mt-0.5">Serial</div>
                   </div>
                </div>
             </section>

             {/* Status Footer */}
             <div className="p-4 border border-blue-500/20 bg-blue-500/5 rounded shrink-0 space-y-3">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 animate-pulse bg-blue-500 rounded-full"></div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">System Ready</span>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] text-gray-400 leading-normal italic">
                     * Account Connected: AI Studio Secrets Panel
                   </p>
                   <p className="text-[9px] text-gray-500 leading-tight">
                     제미나이 계정 정보는 AI Studio의 'Secrets'에서 설정된 API 키를 통해 자동으로 연동되어 작동합니다.
                   </p>
                </div>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
