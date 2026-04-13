import * as React from "react";
import { useState, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, Wand2, Volume2, Loader2, Sparkles, RefreshCcw, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { analyzeImageAndGhostwrite, generateSpeech, AnalysisResult } from "./lib/gemini";
import { cn } from "@/lib/utils";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        setImage(event.target?.result as string);
        setMimeType(file.type);
        setResult(null);
        setAudioUrl(null);
        if (audioRef.current) {
          audioRef.current.pause();
          setIsSpeaking(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const base64 = image.split(",")[1];
      const data = await analyzeImageAndGhostwrite(base64, mimeType);
      setResult(data);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReadAloud = async () => {
    if (!result?.story) return;
    
    if (audioUrl) {
      if (isSpeaking) {
        audioRef.current?.pause();
        setIsSpeaking(false);
      } else {
        audioRef.current?.play();
        setIsSpeaking(true);
      }
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const base64Audio = await generateSpeech(result.story);
      const blob = await (await fetch(`data:audio/mp3;base64,${base64Audio}`)).blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setIsSpeaking(true);
    } catch (error) {
      console.error("Audio generation failed:", error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 min-h-screen flex flex-col">
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
              Ink & Image
            </h1>
            <p className="text-white/60 text-lg max-w-xl mx-auto font-light tracking-widest uppercase text-xs">
              Where visual moments become literary worlds
            </p>
          </motion.div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Image Upload & Preview */}
          <section className="space-y-6">
            <Card className="glass overflow-hidden border-none shadow-2xl">
              <CardContent className="p-0 relative aspect-[4/3] flex items-center justify-center group">
                {image ? (
                  <>
                    <img 
                      src={image} 
                      alt="Uploaded" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full"
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Change Image
                      </Button>
                    </div>
                  </>
                ) : (
                  <div 
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 animate-float">
                      <Upload className="w-8 h-8 text-white/60" />
                    </div>
                    <p className="text-white/40 font-light tracking-widest uppercase text-xs">Upload an image to begin</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                />
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button 
                disabled={!image || isAnalyzing} 
                onClick={handleAnalyze}
                className={cn(
                  "h-14 px-8 rounded-full text-lg font-medium transition-all duration-500",
                  image ? "bg-white text-black hover:bg-white/90" : "bg-white/10 text-white/40"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Scene...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Ghostwrite Story
                  </>
                )}
              </Button>
            </div>
          </section>

          {/* Right Column: AI Output */}
          <section className="space-y-8">
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-white/10" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
                      <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-white/10" />
                    <Skeleton className="h-40 w-full rounded-xl bg-white/10" />
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white/40 uppercase tracking-[0.2em] text-[10px] font-bold">
                      <Sparkles className="w-3 h-3" />
                      Atmospheric Analysis
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.mood.split(',').map((m, i) => (
                        <Badge key={i} variant="outline" className="bg-white/5 border-white/10 text-white/80 px-3 py-1 rounded-full font-light">
                          {m.trim()}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-white/60 italic font-light leading-relaxed">
                      "{result.scene}"
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/40 uppercase tracking-[0.2em] text-[10px] font-bold">
                        <ImageIcon className="w-3 h-3" />
                        The Opening
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleReadAloud}
                        disabled={isGeneratingAudio}
                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-10 px-4"
                      >
                        {isGeneratingAudio ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSpeaking ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause Narration
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 mr-2" />
                            Read Aloud
                          </>
                        )}
                      </Button>
                    </div>

                    <ScrollArea className="h-[300px] pr-4">
                      <p className="story-text text-white/90 first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:mt-1">
                        {result.story}
                      </p>
                    </ScrollArea>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[400px] flex flex-col items-center justify-center text-center p-8 glass rounded-3xl"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Sparkles className="w-6 h-6 text-white/20" />
                  </div>
                  <h3 className="text-xl font-serif mb-2 text-white/80">Awaiting Inspiration</h3>
                  <p className="text-white/40 font-light max-w-xs">
                    Upload an image and let the AI weave a narrative from the shadows and light within.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>

        <footer className="mt-auto pt-12 text-center text-white/20 text-[10px] uppercase tracking-[0.3em] font-bold">
          Powered by Gemini 2.0 & 3.0
        </footer>

        {audioUrl && (
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            onEnded={() => setIsSpeaking(false)}
            onPause={() => setIsSpeaking(false)}
            onPlay={() => setIsSpeaking(true)}
            className="hidden"
          />
        )}
      </div>
  );
}
