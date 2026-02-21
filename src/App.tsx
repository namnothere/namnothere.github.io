import { useCallback, useEffect, useRef, useState, type TransitionEvent } from "react";
import "./index.css";
import epicTrack from "../music/epic.mp3";
import japaneseGuyScreamingTrack from "../music/japanese-guy-screaming-in-tunnel.mp3";
import narutoSadTrack from "../music/naruto-sad-music-instant.mp3";
import uiaCatTrack from "../music/uia-uia-uia-cat.mp3";
import yippeeTrack from "../music/yippee-tbh.mp3";

type PacketItem = {
  id: number;
  value: number;
};

// Update this array to change the fixed lucky-money values.
const RED_PACKET_VALUES = [36_000, 34_000, 39_000, 67_000, 68_000, 69_000, 77_000, 96_000, 111_100, 520_000];

const ROLL_ITEM_COUNT = 92;
const TARGET_INDEX = 70;
const DEFAULT_ITEM_WIDTH = 124;
const DEFAULT_ITEM_GAP = 18;
const DEFAULT_TRACK_SIDE_PADDING = 16;
const SPIN_DURATION_MS = 6200;

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});
const AUDIO_TRACKS = [epicTrack, japaneseGuyScreamingTrack, narutoSadTrack, uiaCatTrack, yippeeTrack];

function pickRandom<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index]!;
}

function buildRollItems(values: number[]): PacketItem[] {
  return Array.from({ length: ROLL_ITEM_COUNT }, (_, id) => ({
    id,
    value: pickRandom(values),
  }));
}

export function App() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isRolling, setIsRolling] = useState(false);
  const [pendingResult, setPendingResult] = useState<PacketItem | null>(null);
  const [result, setResult] = useState<PacketItem | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [openPhase, setOpenPhase] = useState<"idle" | "opening" | "revealed">("idle");
  const [rollItems, setRollItems] = useState<PacketItem[]>(() => buildRollItems(RED_PACKET_VALUES));
  const [trackOffset, setTrackOffset] = useState(0);
  const [trackTransitionMs, setTrackTransitionMs] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const clearRevealTimeout = useCallback(() => {
    if (!revealTimeoutRef.current) {
      return;
    }

    clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = null;
  }, []);

  const stopCurrentTrack = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }, []);

  const playRandomTrack = useCallback(() => {
    stopCurrentTrack();

    const audio = new Audio(pickRandom(AUDIO_TRACKS));
    audio.volume = 0.75;
    audioRef.current = audio;
    audio.addEventListener(
      "ended",
      () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      },
      { once: true },
    );

    void audio.play().catch(() => {
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    });
  }, [stopCurrentTrack]);

  const closeResultModal = useCallback(() => {
    setIsResultModalOpen(false);
  }, []);

  const readSizeVar = useCallback((name: string, fallback: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return fallback;
    }

    const raw = getComputedStyle(viewport).getPropertyValue(name).trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const updateSize = () => setViewportWidth(viewport.clientWidth);
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      clearRevealTimeout();
      stopCurrentTrack();
    },
    [clearRevealTimeout, stopCurrentTrack],
  );

  useEffect(() => {
    if (!isResultModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeResultModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeResultModal, isResultModalOpen]);

  const spin = useCallback(() => {
    if (isRolling || openPhase === "opening" || viewportWidth === 0) {
      return;
    }

    clearRevealTimeout();
    playRandomTrack();

    const nextItems = buildRollItems(RED_PACKET_VALUES);
    const winningPacket: PacketItem = {
      id: TARGET_INDEX,
      value: pickRandom(RED_PACKET_VALUES),
    };
    nextItems[TARGET_INDEX] = winningPacket;

    const itemWidth = readSizeVar("--packet-width", DEFAULT_ITEM_WIDTH);
    const itemGap = readSizeVar("--packet-gap", DEFAULT_ITEM_GAP);
    const trackSidePadding = readSizeVar("--track-side-padding", DEFAULT_TRACK_SIDE_PADDING);
    const itemStep = itemWidth + itemGap;
    const targetOffset = trackSidePadding + TARGET_INDEX * itemStep - (viewportWidth / 2 - itemWidth / 2);

    setIsRolling(true);
    setPendingResult(winningPacket);
    setResult(null);
    setIsResultModalOpen(false);
    setOpenPhase("idle");
    setRollItems(nextItems);
    setTrackTransitionMs(0);
    setTrackOffset(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTrackTransitionMs(SPIN_DURATION_MS);
        setTrackOffset(targetOffset);
      });
    });
  }, [clearRevealTimeout, isRolling, openPhase, playRandomTrack, readSizeVar, viewportWidth]);

  const handleTrackTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.propertyName !== "transform" || !isRolling) {
        return;
      }

      setIsRolling(false);
      setTrackTransitionMs(0);
      if (!pendingResult) {
        return;
      }

      setResult(pendingResult);
      setOpenPhase("opening");
      revealTimeoutRef.current = setTimeout(() => {
        setOpenPhase("revealed");
        setIsResultModalOpen(true);
        revealTimeoutRef.current = null;
      }, 900);
    },
    [isRolling, pendingResult],
  );

  return (
    <div className="tet-home">
      <main className="content-shell">
        <section className="roulette-panel" aria-live="polite">
          <div className="roulette-head">
            <h2>Bảng quay lì xì</h2>
          </div>

          <div className="roulette-window" ref={viewportRef}>
            <div aria-hidden className="center-marker" />
            <div
              className="roulette-track"
              onTransitionEnd={handleTrackTransitionEnd}
              style={{
                transform: `translate3d(${-trackOffset}px, 0, 0)`,
                transitionDuration: `${trackTransitionMs}ms`,
              }}
            >
              {rollItems.map((item, index) => {
                const isWinner = result?.id === item.id;
                const isOpening = isWinner && openPhase === "opening";
                const isRevealed = isWinner && openPhase === "revealed";
                const packetClass = [
                  "red-packet",
                  isWinner ? "is-winning" : "",
                  isOpening ? "is-opening" : "",
                  isRevealed ? "is-revealed" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <article className={packetClass} key={`${item.id}-${index}`}>
                    <span className="packet-seal">LOC</span>
                    <p className={`packet-value ${isRevealed ? "is-visible" : "is-concealed"}`}>
                      {isRevealed ? currencyFormatter.format(item.value) : "••••••"}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="result-bar">
            <button className="spin-button" disabled={isRolling || openPhase === "opening"} onClick={spin} type="button">
              {isRolling ? "Rolling..." : "Roll"}
            </button>
            <p className="result-text">
              {isRolling && "never gonna give you up"}
              {!isRolling && openPhase === "opening" && "never gonna let you down"}
            </p>
          </div>
        </section>
      </main>
      <div aria-hidden className="lantern lantern-left" />
      <div aria-hidden className="lantern lantern-right" />
      {result && isResultModalOpen && (
        <div aria-modal className="result-modal" role="dialog" onClick={closeResultModal}>
          <div className="result-modal-card" onClick={event => event.stopPropagation()}>
            <p className="result-modal-title">Lì xì của bạn</p>
            <article className="red-packet modal-packet is-revealed">
              <span className="packet-seal">LOC</span>
              <p className="packet-value is-visible">{currencyFormatter.format(result.value)}</p>
            </article>
            <button className="result-modal-close" onClick={closeResultModal} type="button">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
