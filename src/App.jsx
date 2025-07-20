import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, setLogLevel } from 'firebase/firestore';
import * as Tone from 'tone';

// --- Firebase Configuration ---

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};


// const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = import.meta.env.VITE_FIREBASE_APP_ID
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Keyframe Animation for Visual Cue ---
const keyframes = `
  @keyframes fadeInOut {
    0%, 100% { opacity: 0; transform: scale(0.8); }
    20%, 80% { opacity: 0.7; transform: scale(1); }
  }
  .animate-fade-in-out {
    animation: fadeInOut 1.2s ease-in-out;
  }
`;

// --- SVG Icons for Shapes ---
const CircleIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>);
const SquareIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" /></svg>);
const TriangleIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 10 L90 90 H10 Z" /></svg>);
const StarIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 2 l11 22 24 4 -18 18 4 24 -21 -11 -21 11 4 -24 -18 -18 24 -4z" /></svg>);

// --- Game Data ---
const SHAPES = [
  { id: 'circle', name: 'Circle', Icon: CircleIcon, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  { id: 'square', name: 'Square', Icon: SquareIcon, color: 'text-red-500', bgColor: 'bg-red-100' },
  { id: 'triangle', name: 'Triangle', Icon: TriangleIcon, color: 'text-green-500', bgColor: 'bg-green-100' },
  { id: 'star', name: 'Star', Icon: StarIcon, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
];

// --- Main App Component ---
export default function App() {
  // --- State Management ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [gameState, setGameState] = useState('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentShape, setCurrentShape] = useState(null);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', correct: false });
  const [isCueActive, setIsCueActive] = useState(false);

  // --- Accessibility & Comfort Settings ---
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [showVisualCues, setShowVisualCues] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [manualPacing, setManualPacing] = useState(false);

  // --- Sound Synthesis ---
  const createSound = useCallback((shapeId) => {
    if (isMuted) return; // Don't play sound if muted
    const synth = new Tone.FMSynth().toDestination();
    switch (shapeId) {
      case 'circle': synth.triggerAttackRelease('C4', '8n'); break;
      case 'square': synth.triggerAttackRelease('G3', '8n', '+0.1'); break;
      case 'triangle': new Tone.Synth().toDestination().triggerAttackRelease('E5', '16n'); break;
      case 'star': new Tone.PluckSynth().toDestination().triggerAttackRelease('C6', '8n'); break;
      default: break;
    }
  }, [isMuted]);

  // --- Firebase Initialization and Auth ---
  useEffect(() => {
    if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authInstance = getAuth(app);
        setDb(firestore);
        setAuth(authInstance);
        setLogLevel('debug');

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
          }
          setIsAuthReady(true);
        });
        return () => unsubscribe();
      } catch (error) {
        console.error("Firebase initialization error:", error);
        setIsAuthReady(true);
      }
    } else {
      setIsAuthReady(true);
    }
  }, []);

  // --- Data Loading/Saving ---
  const userDocRef = useMemo(() => {
    if (db && userId) return doc(db, `artifacts/${appId}/users/${userId}/gameData/main`);
    return null;
  }, [db, userId]);

  useEffect(() => {
    const loadData = async () => {
      if (userDocRef) {
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) setHighScore(docSnap.data().highScore || 0);
        } catch (error) { console.error("Error loading high score:", error); }
      }
    };
    if (isAuthReady) loadData();
  }, [isAuthReady, userDocRef]);

  const updateHighScore = useCallback(async (newScore) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      if (userDocRef) {
        try {
          await setDoc(userDocRef, { highScore: newScore }, { merge: true });
        } catch (error) { console.error("Error saving high score:", error); }
      }
    }
  }, [highScore, userDocRef]);

  // --- Game Logic ---
  const startNewRound = useCallback(() => {
    setGameState('playing');
    const correctShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const otherShapes = SHAPES.filter(s => s.id !== correctShape.id);
    const shuffledChoices = [...[correctShape, ...[...otherShapes].sort(() => Math.random() - 0.5).slice(0, 2)]].sort(() => Math.random() - 0.5);

    setCurrentShape(correctShape);
    setChoices(shuffledChoices);
  }, []);

  const handlePlayCue = useCallback(() => {
    if (currentShape) {
      Tone.start();
      createSound(currentShape.id);
      setIsCueActive(true);
      setTimeout(() => setIsCueActive(false), 1200);
    }
  }, [currentShape, createSound]);

  const handleChoice = (shape) => {
    setGameState('feedback');
    if (shape.id === currentShape.id) {
      const newScore = score + 1;
      setScore(newScore);
      updateHighScore(newScore);
      setFeedback({ message: `You found the ${shape.name}!`, correct: true });
    } else {
      setFeedback({ message: `That's the ${shape.name}. Let's find the ${currentShape.name}!`, correct: false });
      setScore(0);
    }
    if (!manualPacing) {
      setTimeout(() => startNewRound(), 1800);
    }
  };

  const handleStartGame = () => {
    setScore(0);
    startNewRound();
  };

  const themeClasses = isHighContrast ? 'bg-black text-white' : 'bg-gray-100 text-gray-800';

  const ToggleButton = ({ label, isEnabled, onToggle }) => (
    <div className="flex items-center">
      <span className="mr-2 text-sm">{label}</span>
      <button onClick={onToggle} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isEnabled ? 'bg-green-400' : 'bg-gray-300'}`}>
        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-300 font-sans ${themeClasses} relative overflow-hidden`}>
      <style>{keyframes}</style>

      {showVisualCues && isCueActive && currentShape && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <currentShape.Icon className={`w-64 h-64 ${currentShape.color} animate-fade-in-out`} />
        </div>
      )}

      <div className="absolute top-4 right-4 flex flex-wrap gap-x-4 gap-y-2 items-center justify-end z-10">
        <div className="text-sm">User ID: <span className="font-mono text-xs">{userId || 'loading...'}</span></div>
        <ToggleButton label="Mute" isEnabled={isMuted} onToggle={() => setIsMuted(!isMuted)} />
        <ToggleButton label="Manual Pacing" isEnabled={manualPacing} onToggle={() => setManualPacing(!manualPacing)} />
        <ToggleButton label="Visual Cues" isEnabled={showVisualCues} onToggle={() => setShowVisualCues(!showVisualCues)} />
        <ToggleButton label="High Contrast" isEnabled={isHighContrast} onToggle={() => setIsHighContrast(!isHighContrast)} />
      </div>

      <div className="w-full max-w-2xl mx-auto text-center z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Sensory Sound & Shape</h1>
        <p className="text-lg mb-6">Listen, watch, and find the matching shape.</p>

        <div className={`p-4 rounded-lg shadow-md ${isHighContrast ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-6 px-4">
            <div className="text-2xl font-bold">Score: <span className="text-green-500">{score}</span></div>
            <div className="text-2xl font-bold">High Score: <span className="text-blue-500">{highScore}</span></div>
          </div>

          {gameState === 'start' && (
            <div className="flex flex-col items-center justify-center h-64">
              <button onClick={handleStartGame} className="px-10 py-5 text-2xl font-bold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700 transform hover:scale-105 transition-transform">
                Start Game
              </button>
            </div>
          )}

          {(gameState === 'playing' || gameState === 'feedback') && (
            <div>
              <div className="mb-8 flex flex-col items-center">
                <p className="text-xl mb-4">Click the button to get your clue</p>
                <button onClick={handlePlayCue} disabled={gameState === 'feedback' || isCueActive} className="w-40 h-40 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-400 disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.552 11.998a.5.5 0 01-.552.5H9a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h6.002a.5.5 0 01.552.5v3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" /></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {choices.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => handleChoice(shape)}
                    disabled={gameState === 'feedback'}
                    className={`p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-4 ${shape.color} ${isHighContrast ? 'bg-gray-700 focus:ring-yellow-400' : `${shape.bgColor} focus:ring-current`} disabled:opacity-50 disabled:transform-none`}
                  >
                    <shape.Icon className="w-24 h-24 mx-auto" />
                    <span className="block mt-4 text-2xl font-semibold">{shape.name}</span>
                  </button>
                ))}
              </div>

              {gameState === 'feedback' && (
                <div className="mt-6 text-3xl font-bold animate-pulse">
                  <p className={`${feedback.correct ? 'text-green-500' : 'text-red-500'}`}>{feedback.message}</p>
                  {manualPacing && (
                    <button onClick={startNewRound} className="mt-4 px-6 py-2 text-xl font-bold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700">
                      Next Round
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
