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

// --- SVG Icons ---
// Shapes
const CircleIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>);
const SquareIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" /></svg>);
const TriangleIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 10 L90 90 H10 Z" /></svg>);
const StarIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 2 l11 22 24 4 -18 18 4 24 -21 -11 -21 11 4 -24 -18 -18 24 -4z" /></svg>);
// Animals
const CatIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 10 C 20 10, 20 40, 20 50 C 20 80, 40 90, 50 90 C 60 90, 80 80, 80 50 C 80 40, 80 10, 50 10 Z M 35 40 A 5 5 0 0 1 45 40 A 5 5 0 0 1 35 40 M 65 40 A 5 5 0 0 1 75 40 A 5 5 0 0 1 65 40 M 50 60 L 50 75 M 40 70 L 60 70" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" /><path d="M30 20 L10 10 M70 20 L90 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>);
const DogIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 20 C 30 20, 25 40, 25 50 C 25 70, 30 90, 50 90 C 70 90, 75 70, 75 50 C 75 40, 70 20, 50 20 Z M 40 50 A 5 5 0 0 1 50 50 A 5 5 0 0 1 40 50 M 60 50 A 5 5 0 0 1 70 50 A 5 5 0 0 1 60 50 M 50 70 A 10 10 0 0 1 50 80 A 10 10 0 0 1 50 70" /><path d="M25 40 C 15 20, 15 10, 30 15 L 35 35 Z M75 40 C 85 20, 85 10, 70 15 L 65 35 Z" /></svg>);
const BirdIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20 50 C 20 30, 40 20, 60 30 C 80 40, 90 60, 70 70 C 50 80, 20 70, 20 50 Z" /><circle cx="65" cy="40" r="5" /><path d="M50 30 L80 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" /><path d="M20 50 L10 60 L30 60 Z" /></svg>);
const FishIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 50 C 40 20, 60 20, 90 50 C 60 80, 40 80, 10 50 Z" /><circle cx="75" cy="45" r="5" /><path d="M10 50 L5 35 L5 65 Z" /></svg>);
// Instruments
const DrumIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="40" ry="20" /><path d="M10 50 L10 80 L90 80 L90 50 Z" /><path d="M15 55 L85 75 M15 75 L85 55" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" /></svg>);
const GuitarIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M60 10 L70 5 L95 30 L90 40 Z M65 15 L30 50 C 20 60, 20 80, 35 85 C 50 90, 60 80, 50 70 L85 35 Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" /><circle cx="40" cy="67" r="8" fill="currentColor" /></svg>);
const PianoIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" /><path d="M20 30 L20 70 M30 30 L30 70 M40 30 L40 70 M50 30 L50 70 M60 30 L60 70 M70 30 L70 70 M80 30 L80 70" stroke="currentColor" strokeWidth="4" /><rect x="25" y="30" width="10" height="25" /><rect x="45" y="30" width="10" height="25" /><rect x="65" y="30" width="10" height="25" /></svg>);
const TrumpetIcon = ({ className }) => (<svg className={className} viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 45 L50 40 L50 60 L10 55 Z" /><path d="M50 50 L80 50" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" /><path d="M80 50 C 95 40, 95 60, 80 50 L 95 30 L 95 70 Z" /></svg>);

// --- Game Content Categories ---
const CATEGORIES = {
  shapes: {
    name: 'Shapes',
    items: [
      { id: 'circle', name: 'Circle', Icon: CircleIcon, color: 'text-blue-500', bgColor: 'bg-blue-100' },
      { id: 'square', name: 'Square', Icon: SquareIcon, color: 'text-red-500', bgColor: 'bg-red-100' },
      { id: 'triangle', name: 'Triangle', Icon: TriangleIcon, color: 'text-green-500', bgColor: 'bg-green-100' },
      { id: 'star', name: 'Star', Icon: StarIcon, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
    ]
  },
  animals: {
    name: 'Animals',
    items: [
      { id: 'cat', name: 'Cat', Icon: CatIcon, color: 'text-purple-500', bgColor: 'bg-purple-100' },
      { id: 'dog', name: 'Dog', Icon: DogIcon, color: 'text-orange-500', bgColor: 'bg-orange-100' },
      { id: 'bird', name: 'Bird', Icon: BirdIcon, color: 'text-sky-500', bgColor: 'bg-sky-100' },
      { id: 'fish', name: 'Fish', Icon: FishIcon, color: 'text-indigo-500', bgColor: 'bg-indigo-100' },
    ]
  },
  instruments: {
    name: 'Instruments',
    items: [
      { id: 'drum', name: 'Drum', Icon: DrumIcon, color: 'text-teal-500', bgColor: 'bg-teal-100' },
      { id: 'guitar', name: 'Guitar', Icon: GuitarIcon, color: 'text-pink-500', bgColor: 'bg-pink-100' },
      { id: 'piano', name: 'Piano', Icon: PianoIcon, color: 'text-gray-700', bgColor: 'bg-gray-200' },
      { id: 'trumpet', name: 'Trumpet', Icon: TrumpetIcon, color: 'text-amber-500', bgColor: 'bg-amber-100' },
    ]
  }
};

const DIFFICULTIES = {
  easy: { name: 'Easy', choices: 2 },
  medium: { name: 'Medium', choices: 3 },
  hard: { name: 'Hard', choices: 4 },
};

// --- Main App Component ---
export default function App() {
  // --- State Management ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [gameState, setGameState] = useState('start'); // start, setup, playing, feedback
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentItem, setCurrentItem] = useState(null);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', correct: false });
  const [isCueActive, setIsCueActive] = useState(false);

  // --- Game Settings ---
  const [category, setCategory] = useState('shapes');
  const [difficulty, setDifficulty] = useState('medium');

  // --- Accessibility & Comfort Settings ---
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [showVisualCues, setShowVisualCues] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [manualPacing, setManualPacing] = useState(false);
  const [isColorblindMode, setIsColorblindMode] = useState(false);

  // --- Sound Synthesis ---
  const createSound = useCallback((itemId) => {
    if (isMuted) return;
    let synth;
    switch (itemId) {
      // Shapes
      case 'circle': new Tone.FMSynth().toDestination().triggerAttackRelease('C4', '8n'); break;
      case 'square': new Tone.FMSynth().toDestination().triggerAttackRelease('G3', '8n', '+0.1'); break;
      case 'triangle': new Tone.Synth().toDestination().triggerAttackRelease('E5', '16n'); break;
      case 'star': new Tone.PluckSynth().toDestination().triggerAttackRelease('C6', '8n'); break;
      // Animals
      case 'cat': synth = new Tone.Synth().toDestination(); synth.triggerAttackRelease('A5', '16n', '+0.1'); synth.triggerAttackRelease('E6', '16n', '+0.2'); break;
      case 'dog': synth = new Tone.Synth({ oscillator: { type: 'sawtooth' } }).toDestination(); synth.triggerAttackRelease('A3', '8n'); break;
      case 'bird': new Tone.Synth().toDestination().triggerAttackRelease('C7', '16n'); break;
      case 'fish': new Tone.FMSynth({ modulationIndex: 10, harmonicity: 3.4 }).toDestination().triggerAttackRelease('C3', '16n'); break;
      // Instruments
      case 'drum': new Tone.MembraneSynth().toDestination().triggerAttackRelease('C2', '8n'); break;
      case 'guitar': new Tone.PluckSynth().toDestination().triggerAttackRelease('E3', '4n'); break;
      case 'piano': new Tone.PolySynth(Tone.Synth).toDestination().triggerAttackRelease(['C4', 'E4', 'G4'], '4n'); break;
      case 'trumpet': new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.05 } }).toDestination().triggerAttackRelease('G4', '8n'); break;
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
        setDb(firestore); setAuth(authInstance); setLogLevel('debug');
        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
          if (user) { setUserId(user.uid); }
          else {
            if (initialAuthToken) { await signInWithCustomToken(authInstance, initialAuthToken); }
            else { await signInAnonymously(authInstance); }
          }
          setIsAuthReady(true);
        });
        return () => unsubscribe();
      } catch (error) { console.error("Firebase init error:", error); setIsAuthReady(true); }
    } else { setIsAuthReady(true); }
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
        try { await setDoc(userDocRef, { highScore: newScore }, { merge: true }); }
        catch (error) { console.error("Error saving high score:", error); }
      }
    }
  }, [highScore, userDocRef]);

  // --- Game Logic ---
  const startNewRound = useCallback(() => {
    setGameState('playing');
    const items = CATEGORIES[category].items;
    const numChoices = DIFFICULTIES[difficulty].choices;

    const correctItem = items[Math.floor(Math.random() * items.length)];
    const otherItems = items.filter(i => i.id !== correctItem.id);
    const distractors = [...otherItems].sort(() => 0.5 - Math.random()).slice(0, numChoices - 1);

    const shuffledChoices = [...[correctItem, ...distractors]].sort(() => 0.5 - Math.random());

    setCurrentItem(correctItem);
    setChoices(shuffledChoices);
  }, [category, difficulty]);

  const handlePlayCue = useCallback(() => {
    if (currentItem) {
      Tone.start(); createSound(currentItem.id); setIsCueActive(true);
      setTimeout(() => setIsCueActive(false), 1200);
    }
  }, [currentItem, createSound]);

  const handleChoice = (item) => {
    setGameState('feedback');
    if (item.id === currentItem.id) {
      const newScore = score + 1;
      setScore(newScore); updateHighScore(newScore);
      setFeedback({ message: `You found the ${item.name}!`, correct: true });
    } else {
      setFeedback({ message: `That's a ${item.name}. Let's find the ${currentItem.name}!`, correct: false });
      setScore(0);
    }
    if (!manualPacing) { setTimeout(() => startNewRound(), 1800); }
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

  const getBorderStyle = (itemId) => {
    if (!isColorblindMode) return '';
    const borderStyles = ['border-solid', 'border-dashed', 'border-dotted', 'border-double'];
    const allItems = CATEGORIES[category].items;
    const index = allItems.findIndex(item => item.id === itemId);
    return `${borderStyles[index % borderStyles.length]} border-4`;
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-300 font-sans ${themeClasses} relative overflow-hidden`}>
      <style>{keyframes}</style>

      {showVisualCues && isCueActive && currentItem && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <currentItem.Icon className={`w-64 h-64 ${currentItem.color} animate-fade-in-out`} />
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
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Sensory Learning Game</h1>
        {/* <p className="text-lg mb-6">Listen, watch, and find the matching item.</p> */}

        <div className={`p-4 rounded-lg shadow-md ${isHighContrast ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-6 px-4">
            <div className="text-2xl font-bold">Score: <span className="text-green-500">{score}</span></div>
            <div className="text-2xl font-bold">High Score: <span className="text-blue-500">{highScore}</span></div>
          </div>

          {gameState === 'start' && (
            <div className="flex flex-col items-center justify-center h-64">
              <button onClick={() => setGameState('setup')} className="px-10 py-5 text-2xl font-bold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700 transform hover:scale-105 transition-transform">
                Start Game
              </button>
            </div>
          )}

          {gameState === 'setup' && (
            <div className="p-4">
              <h2 className="text-2xl font-bold mb-4">Game Setup</h2>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Choose a Category</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {Object.keys(CATEGORIES).map(key => (
                    <button key={key} onClick={() => setCategory(key)} className={`px-4 py-2 rounded-lg text-lg font-semibold ${category === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                      {CATEGORIES[key].name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Choose a Difficulty</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {Object.keys(DIFFICULTIES).map(key => (
                    <button key={key} onClick={() => setDifficulty(key)} className={`px-4 py-2 rounded-lg text-lg font-semibold ${difficulty === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                      {DIFFICULTIES[key].name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleStartGame} className="px-10 py-4 text-2xl font-bold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700">
                Play!
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

              <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4`}>
                {choices.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleChoice(item)}
                    disabled={gameState === 'feedback'}
                    className={`p-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 ${item.color} ${isHighContrast ? 'bg-gray-700 focus:ring-yellow-400' : `${item.bgColor} focus:ring-current`} disabled:opacity-50 disabled:transform-none ${getBorderStyle(item.id)}`}
                  >
                    <item.Icon className="w-24 h-24 mx-auto" />
                    <span className="block mt-4 text-2xl font-semibold">{item.name}</span>
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
