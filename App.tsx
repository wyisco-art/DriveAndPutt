import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { PAR_STROKES, CANVAS_WIDTH, CANVAS_HEIGHT, RENDER_SCALE } from './constants';
import { Flag, Trophy, RotateCcw, Play } from 'lucide-react';

const getScoreDetails = (strokes: number, par: number) => {
    const diff = strokes - par;
    let term = "";
    let colorClass = "";

    if (strokes === 1) {
        term = "Hole-in-One!";
        colorClass = "text-purple-400";
    } else if (diff <= -3) {
        term = "Albatross";
        colorClass = "text-purple-400";
    } else if (diff === -2) {
        term = "Eagle";
        colorClass = "text-blue-400";
    } else if (diff === -1) {
        term = "Birdie";
        colorClass = "text-green-400";
    } else if (diff === 0) {
        term = "Par";
        colorClass = "text-white";
    } else if (diff === 1) {
        term = "Bogey";
        colorClass = "text-yellow-400";
    } else if (diff === 2) {
        term = "Double Bogey";
        colorClass = "text-orange-400";
    } else if (diff >= 3) {
        term = "Triple Bogey+";
        colorClass = "text-red-400";
    }

    const sign = diff > 0 ? "+" : "";
    const scoreText = diff === 0 ? "E" : `${sign}${diff}`;
    
    return { diff, term, scoreText, colorClass };
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [strokes, setStrokes] = useState(0);
  const [scale, setScale] = useState(1);
  const [strokeBump, setStrokeBump] = useState(false);

  const scoreDetails = getScoreDetails(strokes, PAR_STROKES);
  
  // Calculate the low-resolution dimensions
  const LOW_RES_WIDTH = CANVAS_WIDTH * RENDER_SCALE;
  const LOW_RES_HEIGHT = CANVAS_HEIGHT * RENDER_SCALE;

  useEffect(() => {
    const handleResize = () => {
        const targetRatio = LOW_RES_WIDTH / LOW_RES_HEIGHT;
        const windowRatio = window.innerWidth / window.innerHeight;
        
        let newScale;
        // Determine scale based on the limiting dimension
        if (windowRatio > targetRatio) {
            // Window is wider than game -> Limit by height
            newScale = window.innerHeight / LOW_RES_HEIGHT;
        } else {
            // Window is taller than game -> Limit by width
            newScale = window.innerWidth / LOW_RES_WIDTH;
        }
        
        // Use 90% of available space to provide a small safety margin
        setScale(newScale * 0.90);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation

    return () => window.removeEventListener('resize', handleResize);
  }, [LOW_RES_WIDTH, LOW_RES_HEIGHT]);

  // Trigger animation on stroke increase
  useEffect(() => {
      if (strokes > 0) {
        setStrokeBump(true);
        const t = setTimeout(() => setStrokeBump(false), 200);
        return () => clearTimeout(t);
      }
  }, [strokes]);

  const startGame = () => {
    setStrokes(0);
    setGameState(GameState.PLAYING);
  };

  const resetGame = () => {
    setStrokes(0);
    setGameState(GameState.MENU);
  };

  return (
    <div className="w-screen h-screen bg-neutral-950 flex items-center justify-center overflow-hidden">
      <div 
        className="relative bg-black shadow-2xl overflow-hidden border-2 border-neutral-800 rounded-sm"
        style={{
            width: LOW_RES_WIDTH,
            height: LOW_RES_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            imageRendering: 'pixelated'
        }}
      >
        
        {/* CRT / Posterization Overlay Container */}
        <div className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSIjRkZGIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4=')] bg-repeat"></div>
        <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]"></div>

        {/* Game Canvas */}
        <div className="w-full h-full filter contrast-[1.1] saturate-[1.2] brightness-110">
            <GameCanvas 
                gameState={gameState} 
                setGameState={setGameState} 
                strokes={strokes}
                setStrokes={setStrokes}
            />
        </div>

        {/* HUD Overlay - Scaled down for Pixel Art Look */}
        <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start pointer-events-none z-20">
          <div className="flex flex-col">
            <h1 className="text-[10px] font-retro text-yellow-400 drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">DRIVE & PUTT</h1>
            <span className="text-[6px] text-white mt-0.5 font-retro drop-shadow-md">HOLE 1</span>
          </div>
          
          <div className="flex gap-2 bg-slate-900/40 backdrop-blur-sm px-2 py-1 rounded-none border border-slate-600/50 shadow-[1px_1px_0_rgba(0,0,0,0.25)]">
             <div className="flex flex-col items-center min-w-[20px]">
                <span className="text-[4px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Par</span>
                <span className="text-[8px] font-bold font-retro text-white">{PAR_STROKES}</span>
             </div>
             <div className="w-px bg-slate-600/50"></div>
             <div className="flex flex-col items-center min-w-[20px]">
                <span className="text-[4px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Strokes</span>
                <span className={`text-[8px] font-bold font-retro transition-colors ${strokes > PAR_STROKES ? 'text-red-400' : 'text-white'} ${strokeBump ? 'animate-hud-bump' : ''}`}>
                    {strokes}
                </span>
             </div>
             <div className="w-px bg-slate-600/50"></div>
             <div className="flex flex-col items-center min-w-[30px]">
                <span className="text-[4px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Score</span>
                <span className={`text-[8px] font-bold font-retro ${scoreDetails.colorClass}`}>
                    {scoreDetails.scoreText}
                </span>
             </div>
          </div>
        </div>

        {/* Controls Hint */}
        {gameState === GameState.PLAYING && (
            <div className="absolute bottom-2 left-2 text-white/70 text-[6px] font-retro pointer-events-none select-none drop-shadow-md animate-slide-up" style={{ textShadow: '1px 1px 0 #000' }}>
                WASD / ARROWS to Drive
            </div>
        )}

        {/* UI Overlays - Menu */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] flex items-center justify-center z-40">
            <div className="bg-slate-800 p-4 border-2 border-slate-600 text-center shadow-[4px_4px_0_rgba(0,0,0,0.5)] max-w-[200px] transform transition-all animate-pop-in">
              <div className="flex justify-center mb-2 text-yellow-400">
                <Flag size={24} />
              </div>
              <h2 className="text-lg font-retro text-white mb-2 tracking-wide drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">TEE OFF</h2>
              <p className="text-slate-300 mb-4 leading-relaxed font-retro text-[6px] leading-3">
                DRIVE YOUR CAR TO PUSH THE BALL INTO THE HOLE.
                <br />
                <span className="text-slate-400 mt-2 block">WATCH YOUR SPEED IN SAND & WATER!</span>
              </p>
              <button 
                onClick={startGame}
                className="group relative inline-flex items-center justify-center px-4 py-2 font-bold text-white transition-all duration-200 bg-green-700 font-retro text-[8px] border-b-2 border-green-900 active:border-b-0 active:translate-y-0.5 hover:bg-green-600 hover:scale-105"
              >
                <Play className="mr-1" size={10} />
                START ENGINE
              </button>
            </div>
          </div>
        )}

        {/* UI Overlays - Won */}
        {gameState === GameState.WON && (
          <div className="absolute inset-0 bg-green-900/90 backdrop-blur-[1px] flex items-center justify-center z-40">
            <div className="bg-slate-800 p-4 border-2 border-green-500 text-center shadow-[4px_4px_0_rgba(0,0,0,0.5)] max-w-[200px] animate-slide-up">
               <div className="flex justify-center mb-2 text-yellow-400 animate-bounce">
                <Trophy size={28} />
              </div>
              <h2 className="text-lg font-retro text-white mb-1 drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">HOLE COMPLETE!</h2>
              
              <div className="my-4 bg-slate-900/50 p-2 border border-slate-700">
                <div className={`text-[8px] font-retro mb-1 ${scoreDetails.colorClass}`}>
                    {scoreDetails.term}
                </div>
                <div className="text-lg font-bold text-white mb-1 font-retro">
                    {scoreDetails.scoreText}
                </div>
                <div className="text-[6px] text-slate-400 uppercase tracking-wider font-retro">
                    {strokes} Strokes
                </div>
              </div>
              
              <button 
                onClick={resetGame}
                className="inline-flex items-center px-4 py-2 bg-blue-700 text-white hover:bg-blue-600 font-retro text-[8px] transition-all border-b-2 border-blue-900 active:border-b-0 active:translate-y-0.5 hover:scale-105"
              >
                <RotateCcw className="mr-1" size={10} />
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;