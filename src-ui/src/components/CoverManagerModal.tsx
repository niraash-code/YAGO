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
} from "lucide-react";
import { Game } from "../types";

import { useAppStore } from "../store/gameStore";

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
  const [activeTab, setActiveTab] = useState<"upload" | "gallery">("upload");
  const [customUrl, setCustomUrl] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { updateGameConfig, appConfig } = useAppStore();

  const PRESET_COVERS = appConfig?.presetCovers || [];

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
            className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex h-[600px] relative z-[51]"
          >
            {/* Left Side: Preview (Wide) */}
            <div className="w-5/12 bg-black relative flex items-center justify-center overflow-hidden border-r border-white/5">
              <div
                className="absolute inset-0 opacity-50 blur-xl"
                style={{
                  backgroundImage: `url(${previewImage || game.coverImage})`,
                  backgroundSize: "cover",
                }}
              />

              <div className="relative z-10 w-full max-w-[320px] aspect-video rounded-lg shadow-2xl overflow-hidden ring-1 ring-white/20 group">
                <img
                  src={previewImage || game.coverImage}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt="Preview"
                />
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="text-white font-bold text-lg leading-none shadow-black drop-shadow-md">
                    {game.name}
                  </div>
                </div>
              </div>

              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-slate-300">
                Background Preview
              </div>
            </div>

            {/* Right Side: Controls */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ImageIcon className="text-indigo-400" />
                    Customize Game Art
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Change the{" "}
                    <span className="text-white">wide background</span> image
                    for {game.name}.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 p-8 overflow-hidden flex flex-col">
                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 mb-6 shrink-0">
                  <button
                    onClick={() => setActiveTab("upload")}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === "upload" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Custom URL / Upload
                    {activeTab === "upload" && (
                      <motion.div
                        layoutId="tabLine"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("gallery")}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === "gallery" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Gallery Presets
                    {activeTab === "gallery" && (
                      <motion.div
                        layoutId="tabLine"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      />
                    )}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {activeTab === "upload" ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">
                          Image URL (1920x1080 Recommended)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customUrl}
                            onChange={e => setCustomUrl(e.target.value)}
                            placeholder="https://example.com/wallpaper.jpg"
                            className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => setPreviewImage(customUrl)}
                            disabled={!customUrl}
                            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg disabled:opacity-50 transition-colors"
                          >
                            <ExternalLink size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer">
                        <Upload size={32} className="mb-3 opacity-50" />
                        <span className="text-sm font-medium">
                          Drag & Drop image here
                        </span>
                        <span className="text-xs opacity-50 mt-1">
                          Supports JPG, PNG, WEBP
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 pb-4">
                      {PRESET_COVERS.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setPreviewImage(url)}
                          className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            previewImage === url
                              ? "border-indigo-500 ring-2 ring-indigo-500/50"
                              : "border-transparent hover:border-white/30"
                          }`}
                        >
                          <img
                            src={url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />

                          {previewImage === url && (
                            <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[2px]">
                              <div className="bg-indigo-600 rounded-full p-1 text-white shadow-lg">
                                <Check size={16} />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                      <button className="aspect-video rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5 transition-colors">
                        <Grid size={24} className="mb-2 opacity-50" />
                        <span className="text-xs font-medium">More...</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-950 border-t border-white/5 flex justify-between items-center shrink-0">
                <button
                  onClick={handleReset}
                  className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 size={16} /> Reset to Default
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!previewImage}
                    className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Check size={16} /> Save Changes
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
