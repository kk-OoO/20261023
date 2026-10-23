"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// --- サウンドエンジン (Web Audio API) ---
class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmInterval: NodeJS.Timeout | null = null;
  public isMuted: boolean = false;
  public isBgmPlaying: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // 効果音：アイテム取得
  playEat(type: "normal" | "gold" | "freeze") {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === "gold") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.24); // C6
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "freeze") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  // 効果音：ゲームオーバー
  playGameOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.5);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // 効果音：方向転換 / クリック
  playTurn() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // BGM ループ（チップチューン調メロディ）
  startBgm() {
    if (this.isBgmPlaying || this.isMuted) return;
    this.initCtx();
    this.isBgmPlaying = true;

    const notes = [
      261.63, 329.63, 392.0, 523.25,
      293.66, 349.23, 440.0, 587.33,
      329.63, 392.0, 493.88, 659.25,
      392.0, 493.88, 587.33, 783.99,
    ];
    let step = 0;

    this.bgmInterval = setInterval(() => {
      if (this.isMuted || !this.isBgmPlaying) return;
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(notes[step % notes.length], now);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);

      step++;
    }, 220);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

const sounds = new SoundEngine();

// --- 定数と型定義 ---
const GRID_SIZE = 20; // 20x20のグリッド
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type ItemType = "normal" | "gold" | "freeze";

interface Point {
  x: number;
  y: number;
}

interface Item {
  x: number;
  y: number;
  type: ItemType;
  timer?: number; // 金オーブの消滅カウント
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

export default function Home() {
  // ゲームステータス
  const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "PAUSED" | "GAMEOVER">("IDLE");
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<"EASY" | "NORMAL" | "HARD">("NORMAL");
  const [combo, setCombo] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bgmActive, setBgmActive] = useState<boolean>(true);
  const [showDeployGuide, setShowDeployGuide] = useState<boolean>(false);

  // 内部ゲームステート
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const directionRef = useRef<Direction>("UP");
  const nextDirectionRef = useRef<Direction>("UP");
  const itemsRef = useRef<Item[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const freezeTimerRef = useRef<number>(0);

  // 難易度による移動間隔 (ms)
  const getSpeedMs = useCallback(() => {
    let base = 120;
    if (difficulty === "EASY") base = 160;
    if (difficulty === "HARD") base = 85;
    if (freezeTimerRef.current > 0) base += 70; // タイムワープ中はスロー
    return base;
  }, [difficulty]);

  // localStorageの初期読み込み
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cyber_snake_highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    }
  }, []);

  // ハイスコア更新保存
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      if (typeof window !== "undefined") {
        localStorage.setItem("cyber_snake_highscore", score.toString());
      }
    }
  }, [score, highScore]);

  // ミュート切り替え
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.isMuted = next;
    if (next) {
      sounds.stopBgm();
    } else if (bgmActive && gameState === "PLAYING") {
      sounds.startBgm();
    }
  };

  const toggleBgm = () => {
    const next = !bgmActive;
    setBgmActive(next);
    if (!next) {
      sounds.stopBgm();
    } else if (gameState === "PLAYING" && !isMuted) {
      sounds.startBgm();
    }
  };

  // アイテム生成
  const spawnItem = useCallback(() => {
    const occupied = new Set(snakeRef.current.map((p) => `${p.x},${p.y}`));
    itemsRef.current.forEach((it) => occupied.add(`${it.x},${it.y}`));

    let newX = 0;
    let newY = 0;
    let found = false;
    for (let i = 0; i < 100; i++) {
      const rx = Math.floor(Math.random() * GRID_SIZE);
      const ry = Math.floor(Math.random() * GRID_SIZE);
      if (!occupied.has(`${rx},${ry}`)) {
        newX = rx;
        newY = ry;
        found = true;
        break;
      }
    }
    if (!found) return;

    // アイテム種別の抽選
    const rand = Math.random();
    let type: ItemType = "normal";
    let timer: number | undefined = undefined;

    if (rand < 0.15) {
      type = "gold";
      timer = 15; // 15秒で消える
    } else if (rand < 0.28) {
      type = "freeze";
    }

    itemsRef.current.push({ x: newX, y: newY, type, timer });
  }, []);

  // パーティクル発生
  const addParticles = (x: number, y: number, color: string, count: number = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x: (x + 0.5) * (400 / GRID_SIZE),
        y: (y + 0.5) * (400 / GRID_SIZE),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        size: Math.random() * 3 + 2,
      });
    }
  };

  // ゲームリセット / スタート
  const startGame = () => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    directionRef.current = "UP";
    nextDirectionRef.current = "UP";
    itemsRef.current = [];
    particlesRef.current = [];
    freezeTimerRef.current = 0;
    setScore(0);
    setCombo(0);
    setGameState("PLAYING");

    // 初期アイテム2個生成
    spawnItem();
    spawnItem();

    if (bgmActive && !isMuted) {
      sounds.startBgm();
    }
  };

  // ゲームオーバー処理
  const handleGameOver = useCallback(() => {
    setGameState("GAMEOVER");
    sounds.playGameOver();
    sounds.stopBgm();
  }, []);

  // 方向転換
  const changeDirection = useCallback((newDir: Direction) => {
    const cur = directionRef.current;
    if (
      (newDir === "UP" && cur !== "DOWN") ||
      (newDir === "DOWN" && cur !== "UP") ||
      (newDir === "LEFT" && cur !== "RIGHT") ||
      (newDir === "RIGHT" && cur !== "LEFT")
    ) {
      nextDirectionRef.current = newDir;
      sounds.playTurn();
    }
  }, []);

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (gameState === "PLAYING") setGameState("PAUSED");
        else if (gameState === "PAUSED") setGameState("PLAYING");
        else if (gameState === "IDLE" || gameState === "GAMEOVER") startGame();
        return;
      }

      if (gameState !== "PLAYING") return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          changeDirection("UP");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          changeDirection("DOWN");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          changeDirection("LEFT");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          changeDirection("RIGHT");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, changeDirection]);

  // ゲームのメインアップデート
  const updateGame = useCallback(() => {
    if (gameState !== "PLAYING") return;

    directionRef.current = nextDirectionRef.current;
    const head = { ...snakeRef.current[0] };

    switch (directionRef.current) {
      case "UP":
        head.y -= 1;
        break;
      case "DOWN":
        head.y += 1;
        break;
      case "LEFT":
        head.x -= 1;
        break;
      case "RIGHT":
        head.x += 1;
        break;
    }

    // 壁との衝突判定 (ワープではなくゲームオーバー)
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      handleGameOver();
      return;
    }

    // 自身の身体との衝突判定
    for (let i = 0; i < snakeRef.current.length; i++) {
      if (head.x === snakeRef.current[i].x && head.y === snakeRef.current[i].y) {
        handleGameOver();
        return;
      }
    }

    // 移動
    snakeRef.current.unshift(head);

    // アイテム判定
    const hitItemIndex = itemsRef.current.findIndex((it) => it.x === head.x && it.y === head.y);
    if (hitItemIndex >= 0) {
      const hitItem = itemsRef.current[hitItemIndex];
      itemsRef.current.splice(hitItemIndex, 1);

      sounds.playEat(hitItem.type);

      // パーティクル & スコア
      let point = 10;
      let pColor = "#10b981"; // green
      if (hitItem.type === "gold") {
        point = 50;
        pColor = "#f59e0b"; // gold
        setCombo((c) => c + 1);
      } else if (hitItem.type === "freeze") {
        point = 25;
        pColor = "#06b6d4"; // cyan
        freezeTimerRef.current = 40; // 40ステップ分低速
      } else {
        setCombo((c) => c + 1);
      }

      addParticles(hitItem.x, hitItem.y, pColor, 16);
      setScore((s) => s + point);

      // アイテム再補充（常に盤面に2〜3個維持）
      spawnItem();
      if (itemsRef.current.length < 2) {
        spawnItem();
      }
    } else {
      // アイテムを食べなかった場合は末尾を削除
      snakeRef.current.pop();
    }

    // フリーズタイマーの減衰
    if (freezeTimerRef.current > 0) {
      freezeTimerRef.current--;
    }
  }, [gameState, handleGameOver, spawnItem]);

  // レンダリングループ
  useEffect(() => {
    let animId: number;

    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cellSize = width / GRID_SIZE;

      // 1. ゲーム進行のステップ更新
      if (gameState === "PLAYING") {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const elapsed = time - lastTimeRef.current;
        const interval = getSpeedMs();
        if (elapsed > interval) {
          updateGame();
          lastTimeRef.current = time;
        }
      }

      // 2. 画面描画クリア
      ctx.fillStyle = "#030712"; // dark cyber background
      ctx.fillRect(0, 0, width, height);

      // サイバーグリッド背景描画
      ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(width, i * cellSize);
        ctx.stroke();
      }

      // 3. アイテムの描画（ネオングロー）
      itemsRef.current.forEach((item) => {
        ctx.save();
        const cx = item.x * cellSize + cellSize / 2;
        const cy = item.y * cellSize + cellSize / 2;
        const radius = cellSize * 0.38;

        if (item.type === "gold") {
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 15;
          ctx.fillStyle = "#fbbf24";
        } else if (item.type === "freeze") {
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 15;
          ctx.fillStyle = "#38bdf8";
        } else {
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 12;
          ctx.fillStyle = "#34d399";
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // コアのハイライト
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 4. スネークの描画
      const snake = snakeRef.current;
      snake.forEach((segment, idx) => {
        ctx.save();
        const px = segment.x * cellSize + 1.5;
        const py = segment.y * cellSize + 1.5;
        const size = cellSize - 3;

        const isHead = idx === 0;
        if (isHead) {
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 18;
          ctx.fillStyle = "#0284c7";
        } else {
          // グラデーションボディ
          const ratio = 1 - idx / snake.length;
          ctx.shadowColor = "#0284c7";
          ctx.shadowBlur = 8;
          ctx.fillStyle = `rgba(14, 165, 233, ${Math.max(0.4, ratio)})`;
        }

        // 角丸四角形
        ctx.beginPath();
        ctx.roundRect(px, py, size, size, isHead ? 6 : 4);
        ctx.fill();

        // 頭部の目
        if (isHead) {
          ctx.fillStyle = "#ffffff";
          const eyeOffset = cellSize * 0.25;
          const eyeRadius = cellSize * 0.1;
          const dir = directionRef.current;

          let e1x = px + eyeOffset;
          let e1y = py + eyeOffset;
          let e2x = px + size - eyeOffset;
          let e2y = py + eyeOffset;

          if (dir === "DOWN") {
            e1y = py + size - eyeOffset;
            e2y = py + size - eyeOffset;
          } else if (dir === "LEFT") {
            e1x = px + eyeOffset;
            e2x = px + eyeOffset;
            e1y = py + eyeOffset;
            e2y = py + size - eyeOffset;
          } else if (dir === "RIGHT") {
            e1x = px + size - eyeOffset;
            e2x = px + size - eyeOffset;
            e1y = py + eyeOffset;
            e2y = py + size - eyeOffset;
          }

          ctx.beginPath();
          ctx.arc(e1x, e1y, eyeRadius, 0, Math.PI * 2);
          ctx.arc(e2x, e2y, eyeRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 5. パーティクルの更新と描画
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, getSpeedMs, updateGame]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full">
      {/* ヘッダーエリア */}
      <header className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
            ⚡
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              NEON CYBER RUNNER
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Next.js 16 + Tailwind CSS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-400 font-semibold">Vercel Ready</span>
            </p>
          </div>
        </div>

        {/* サウンド & ガイドボタン */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              isMuted
                ? "bg-rose-950/60 border-rose-800 text-rose-300"
                : "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500"
            }`}
          >
            {isMuted ? "🔇 サウンドOFF" : "🔊 サウンドON"}
          </button>
          <button
            onClick={toggleBgm}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              bgmActive
                ? "bg-cyan-950/60 border-cyan-700 text-cyan-300"
                : "bg-slate-900 border-slate-700 text-slate-400"
            }`}
          >
            🎵 BGM {bgmActive ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setShowDeployGuide(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md hover:brightness-110 transition flex items-center gap-1"
          >
            🚀 Vercelデプロイ手順
          </button>
        </div>
      </header>

      {/* スコア・ステータスバー */}
      <div className="w-full bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-xl">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">スコア</span>
          <span className="text-2xl font-black text-cyan-400 tabular-nums">{score}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">ハイスコア</span>
          <span className="text-2xl font-black text-amber-400 tabular-nums">{highScore}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">難易度</span>
          <div className="flex gap-1 mt-1">
            {(["EASY", "NORMAL", "HARD"] as const).map((diff) => (
              <button
                key={diff}
                disabled={gameState === "PLAYING"}
                onClick={() => setDifficulty(diff)}
                className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                  difficulty === diff
                    ? "bg-cyan-500 text-black shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">コンボ</span>
          <span className="text-xl font-black text-emerald-400 flex items-center gap-1">
            🔥 {combo}x
          </span>
        </div>
      </div>

      {/* ゲームキャンバスコンテナ */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] bg-slate-950">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] block cursor-pointer"
          onClick={() => {
            if (gameState === "IDLE" || gameState === "GAMEOVER") startGame();
          }}
        />

        {/* スタート前オーバーレイ */}
        {gameState === "IDLE" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="text-4xl mb-3 animate-bounce">🎮</div>
            <h2 className="text-2xl font-black text-cyan-300 mb-2 tracking-wide">
              サイバー・ランナー
            </h2>
            <p className="text-xs text-slate-300 mb-6 max-w-xs leading-relaxed">
              矢印キーまたはWASDで操作。<br />
              ネオンエネルギーを集めて高スコアを目指せ！
            </p>
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95 transition"
            >
              ▶ ゲームスタート (Space)
            </button>
          </div>
        )}

        {/* 一時停止オーバーレイ */}
        {gameState === "PAUSED" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-black text-amber-400 mb-4 tracking-wider">⏸ 一時停止中</h2>
            <button
              onClick={() => setGameState("PLAYING")}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm hover:brightness-110 active:scale-95 transition"
            >
              再開する (Space)
            </button>
          </div>
        )}

        {/* ゲームオーバーオーバーレイ */}
        {gameState === "GAMEOVER" && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="text-4xl mb-2">💥</div>
            <h2 className="text-2xl font-black text-rose-500 mb-1 tracking-wider">GAME OVER</h2>
            <p className="text-sm text-slate-300 mb-4">
              最終スコア: <span className="text-cyan-400 font-black text-xl">{score}</span>
            </p>
            {score === highScore && score > 0 && (
              <span className="inline-block bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 rounded-full font-bold mb-4 animate-pulse">
                🏆 NEW HIGH SCORE!
              </span>
            )}
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition"
              >
                もう一度遊ぶ
              </button>
              <button
                onClick={() => setShowDeployGuide(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
              >
                デプロイ手順を見る
              </button>
            </div>
          </div>
        )}
      </div>

      {/* モバイル・オンスクリーン十字キーコントローラー */}
      <div className="mt-4 flex flex-col items-center gap-1 sm:hidden">
        <button
          onClick={() => changeDirection("UP")}
          className="w-14 h-12 bg-slate-800 active:bg-cyan-600 rounded-xl flex items-center justify-center text-xl font-bold border border-slate-700 text-white active:scale-95 transition"
        >
          ▲
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => changeDirection("LEFT")}
            className="w-14 h-12 bg-slate-800 active:bg-cyan-600 rounded-xl flex items-center justify-center text-xl font-bold border border-slate-700 text-white active:scale-95 transition"
          >
            ◀
          </button>
          <button
            onClick={() => changeDirection("DOWN")}
            className="w-14 h-12 bg-slate-800 active:bg-cyan-600 rounded-xl flex items-center justify-center text-xl font-bold border border-slate-700 text-white active:scale-95 transition"
          >
            ▼
          </button>
          <button
            onClick={() => changeDirection("RIGHT")}
            className="w-14 h-12 bg-slate-800 active:bg-cyan-600 rounded-xl flex items-center justify-center text-xl font-bold border border-slate-700 text-white active:scale-95 transition"
          >
            ▶
          </button>
        </div>
      </div>

      {/* アイテム説明カード */}
      <div className="w-full max-w-md mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-300">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400 mx-auto mb-1 shadow-[0_0_8px_#10b981]"></div>
          <span className="font-bold text-emerald-400">グリーンオーブ</span>
          <p className="text-[10px] text-slate-400 mt-0.5">+10点 / 成長</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
          <div className="w-3 h-3 rounded-full bg-amber-400 mx-auto mb-1 shadow-[0_0_8px_#f59e0b]"></div>
          <span className="font-bold text-amber-400">ゴールドスター</span>
          <p className="text-[10px] text-slate-400 mt-0.5">+50点 / レア</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
          <div className="w-3 h-3 rounded-full bg-cyan-400 mx-auto mb-1 shadow-[0_0_8px_#06b6d4]"></div>
          <span className="font-bold text-cyan-400">タイムワープ</span>
          <p className="text-[10px] text-slate-400 mt-0.5">+25点 / 一時減速</p>
        </div>
      </div>

      {/* Vercel デプロイ手順モーダル */}
      {showDeployGuide && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
                <span>▲</span> Vercel デプロイの手順書
              </h3>
              <button
                onClick={() => setShowDeployGuide(false)}
                className="text-slate-400 hover:text-white text-lg font-bold w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <p className="font-bold text-white mb-1">【ステップ1】GitHubにリポジトリを作成してPush</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>GitHub (https://github.com) で新規リポジトリを作成</li>
                  <li>ターミナルで以下を実行してPush：
                    <pre className="bg-slate-950 p-2 rounded mt-1 text-[11px] text-cyan-300 font-mono overflow-x-auto">
                      git add .{"\n"}
                      git commit -m &quot;feat: Next.js Neon Runner Game&quot;{"\n"}
                      git remote add origin &lt;あなたのリポジトリURL&gt;{"\n"}
                      git branch -M main{"\n"}
                      git push -u origin main
                    </pre>
                  </li>
                </ol>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <p className="font-bold text-white mb-1">【ステップ2】VercelとGitHubを連携</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li><a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Vercel (https://vercel.com)</a> にアクセスしてログイン (Continue with GitHub)</li>
                  <li>「Add New...」→「Project」をクリック</li>
                  <li>先ほどPushしたGitHubリポジトリを選択して「Import」</li>
                  <li>「Deploy」ボタンを押すだけで、約1分で世界中に自動公開されます！🎉</li>
                </ol>
              </div>

              <div className="bg-cyan-950/40 p-3 rounded-xl border border-cyan-800/50">
                <p className="font-bold text-cyan-300 mb-1">💡 なぜ Next.js × Vercel なのか？</p>
                <p className="text-slate-300">
                  Next.jsはVercel社が開発しているため、Vercelとの親和性が世界一です。GitHubにPushするたびに自動でビルド＆再デプロイが行われ、高速なCDN配信が無料で利用できます。
                </p>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setShowDeployGuide(false)}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
