import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Image as ImageIcon,
  Upload,
  Grid,
  Trash2,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Game } from "../types";

import { useAppStore } from "../store/gameStore";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

interface CoverManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
}

const CoverManagerModal: React.FC<CoverManagerModalProps> = ({
  isOpen,
  onClose,
  game,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "gallery" | "official">(
    "official"
  );
  const [customUrl, setCustomUrl] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [communityImages, setCommunityImages] = useState<string[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const { updateGameConfig, appConfig } = useAppStore();

  const PRESET_COVERS = appConfig?.presetCovers || [];

  React.useEffect(() => {
    if (isOpen && activeTab === "official") {
      fetchCommunityGallery();
    }
  }, [isOpen, activeTab, game.id]);

  const fetchCommunityGallery = async () => {
    setIsLoadingCommunity(true);
    try {
      const urls = await api.getCommunityBackgrounds(game.id);
      setCommunityImages(urls);
    } catch (e) {
      console.error("Failed to fetch community backgrounds", e);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  const handleSave = async () => {
    if (previewImage) {
      try {
        await updateGameConfig(game.id, { coverImage: previewImage });
        onClose();
        setPreviewImage(null);
        setCustomUrl("");
      } catch (e) {
        alert("Failed to save cover art: " + e);
      }
    }
  };

  const handleReset = async () => {
    // Logic for resetting to default based on game ID
    const defaultUrl = `https://picsum.photos/seed/${game.id}-landscape/1920/1080`;
    try {
      await updateGameConfig(game.id, { coverImage: defaultUrl });
      onClose();
    } catch (e) {
      alert("Failed to reset cover art: " + e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-6xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex h-[650px] relative z-[51]"
          >
            {/* Left Side: Preview (Wide) */}
            <div className="w-5/12 bg-black relative flex items-center justify-center overflow-hidden border-r border-white/5">
              <div
                className="absolute inset-0 opacity-50 blur-xl scale-110"
                key={previewImage || game.coverImage}
              >
                <img 
                  src={previewImage || game.coverImage} 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="relative z-10 w-full max-w-[400px] aspect-video rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/20 group">
                <img
                  src={previewImage || game.coverImage}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt="Preview"
                />
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <div className="text-white font-black text-xl leading-none uppercase italic tracking-tighter drop-shadow-lg">
                    {game.name}
                  </div>
                </div>
              </div>

              <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-indigo-300 shadow-xl">
                Background Preview
              </div>
            </div>

            {/* Right Side: Controls */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/5">
                <div>
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">
                    Visual Identity
                  </h2>
                  <p className="text-2xl font-black text-white tracking-tighter uppercase italic">
                    Customize Art
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-950/20">
                {/* Tabs */}
                <div className="flex gap-2 bg-black/20 p-1.5 rounded-xl mb-8 shrink-0">
                  <button
                    onClick={() => setActiveTab("official")}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      activeTab === "official"
                        ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    Official Gallery
                  </button>
                  <button
                    onClick={() => setActiveTab("gallery")}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      activeTab === "gallery"
                        ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      activeTab === "upload"
                        ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    Upload / URL
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {activeTab === "official" ? (
                    isLoadingCommunity ? (
                      <div className="h-full flex items-center justify-center">
                        <RefreshCw size={32} className="text-indigo-500 animate-spin" />
                      </div>
                    ) : communityImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 pb-4">
                        {communityImages.map((url, index) => (
                          <button
                            key={index}
                            onClick={() => setPreviewImage(url)}
                            className={cn(
                              "group relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300",
                              previewImage === url
                                ? "border-indigo-500 ring-4 ring-indigo-500/20"
                                : "border-white/5 hover:border-white/20 hover:scale-[1.02]"
                            )}
                          >
                            <img
                              src={url}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              loading="lazy"
                            />
                            {previewImage === url && (
                              <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="bg-indigo-600 rounded-full p-1.5 text-white shadow-xl">
                                  <Check size={18} />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <Grid size={48} className="opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Wallpapers Found</p>
                      </div>
                    )
                  ) : activeTab === "upload" ? (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          External Asset URL
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={customUrl}
                            onChange={e => setCustomUrl(e.target.value)}
                            placeholder="https://example.com/wallpaper.jpg"
                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                          />
                          <button
                            onClick={() => setPreviewImage(customUrl)}
                            disabled={!customUrl}
                            className="px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl disabled:opacity-50 transition-all active:scale-95"
                          >
                            <ExternalLink size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                        <Upload size={40} className="mb-4 opacity-20 group-hover:opacity-100 group-hover:text-indigo-400 transition-all" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                          Select Local File
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 pb-4">
                      {PRESET_COVERS.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setPreviewImage(url)}
                          className={cn(
                            "group relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300",
                            previewImage === url
                              ? "border-indigo-500 ring-4 ring-indigo-500/20"
                              : "border-white/5 hover:border-white/20 hover:scale-[1.02]"
                          )}
                        >
                          <img
                            src={url}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                          />

                          {previewImage === url && (
                            <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[1px]">
                              <div className="bg-indigo-600 rounded-full p-1.5 text-white shadow-xl">
                                <Check size={18} />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-white/5 border-t border-white/5 flex justify-between items-center shrink-0">
                <button
                  onClick={handleReset}
                  className="text-red-400/80 hover:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-red-400/5 transition-all active:scale-95"
                >
                  <Trash2 size={16} /> Reset Default
                </button>

                <div className="flex gap-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!previewImage}
                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                  >
                    <Check size={18} /> Apply Changes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CoverManagerModal;
