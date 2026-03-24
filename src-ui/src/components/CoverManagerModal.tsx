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
import { useUiStore } from "../store/uiStore";
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
  const { showAlert } = useUiStore();

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
        showAlert("Failed to save cover art: " + e, "Error");
      }
    }
  };

  const handleReset = async () => {
    const defaultUrl = `https://picsum.photos/seed/${game.id}-landscape/1920/1080`;
    try {
      await updateGameConfig(game.id, { coverImage: defaultUrl });
      onClose();
    } catch (e) {
      showAlert("Failed to reset cover art: " + e, "Error");
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
          className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-6xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex h-[650px] relative z-[51]"
          >
            {/* Left Side: Preview (Wide) */}
            <div className="w-5/12 bg-background relative flex items-center justify-center overflow-hidden border-r border-border">
              <div
                className="absolute inset-0 opacity-40"
                key={previewImage || game.coverImage}
              >
                {(previewImage || game.coverImage) && (
                  <img
                    src={previewImage || game.coverImage}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="relative z-10 w-full max-w-[400px] aspect-video rounded-lg shadow-2xl overflow-hidden border border-border group">
                {previewImage || game.coverImage ? (
                  <img
                    src={previewImage || game.coverImage}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt="Preview"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/20">
                    <ImageIcon size={48} className="text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-background via-background/40 to-transparent">
                  <div className="text-foreground font-black text-xl leading-none uppercase italic tracking-tighter">
                    {game.name}
                  </div>
                </div>
              </div>

              <div className="absolute top-6 left-6 bg-card px-4 py-1.5 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-primary shadow-xl">
                Background Preview
              </div>
            </div>

            {/* Right Side: Controls */}
            <div className="flex-1 flex flex-col min-w-0 bg-card">
              <div className="p-8 border-b border-border flex items-center justify-between shrink-0 bg-background">
                <div>
                  <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-1">
                    Visual Identity
                  </h2>
                  <p className="text-2xl font-black text-foreground tracking-tighter uppercase italic">
                    Customize Art
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 p-8 overflow-hidden flex flex-col">
                {/* Tabs */}
                <div className="flex gap-2 bg-background p-1.5 rounded-lg mb-8 shrink-0 border border-border">
                  {["official", "gallery", "upload"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                        activeTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {tab === "official"
                        ? "Official"
                        : tab === "gallery"
                          ? "Presets"
                          : "Upload / URL"}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {activeTab === "official" ? (
                    isLoadingCommunity ? (
                      <div className="h-full flex items-center justify-center">
                        <RefreshCw
                          size={32}
                          className="text-primary animate-spin"
                        />
                      </div>
                    ) : communityImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 pb-4">
                        {communityImages.map((url, index) => (
                          <button
                            key={index}
                            onClick={() => setPreviewImage(url)}
                            className={cn(
                              "group relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-300",
                              previewImage === url
                                ? "border-primary shadow-lg shadow-primary/20"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <img
                              src={url}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {previewImage === url && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <div className="bg-primary rounded-full p-1.5 text-primary-foreground shadow-xl">
                                  <Check size={18} />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                        <Grid size={48} className="text-muted-foreground" />
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          No Wallpapers Found
                        </p>
                      </div>
                    )
                  ) : activeTab === "upload" ? (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          External Asset URL
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={customUrl}
                            onChange={e => setCustomUrl(e.target.value)}
                            placeholder="https://example.com/wallpaper.jpg"
                            className="flex-1 bg-background border border-border rounded-lg px-5 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => setPreviewImage(customUrl)}
                            disabled={!customUrl}
                            className="px-5 py-3 bg-muted border border-border hover:bg-muted-foreground/20 text-foreground rounded-lg disabled:opacity-50 transition-all active:scale-95"
                          >
                            <ExternalLink size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:bg-background transition-all cursor-pointer group">
                        <Upload
                          size={40}
                          className="mb-4 text-muted-foreground group-hover:text-primary transition-all"
                        />
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
                            "group relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-300",
                            previewImage === url
                              ? "border-primary shadow-lg"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <img
                            src={url}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />

                          {previewImage === url && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary rounded-full p-1.5 text-primary-foreground shadow-xl">
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
              <div className="p-8 bg-background border-t border-border flex justify-between items-center shrink-0">
                <button
                  onClick={handleReset}
                  className="text-destructive hover:text-destructive/80 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95"
                >
                  <Trash2 size={16} /> Reset Default
                </button>

                <div className="flex gap-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!previewImage}
                    className="px-8 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
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
