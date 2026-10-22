import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { Leaf, Droplets, Map, Sun, Wind, ChevronRight, CheckCircle2, AlertCircle, Camera, Lock, Download, Users, ArrowUpDown, Trophy, Star, Sparkles } from 'lucide-react';

// --- Custom Styles for Animations ---
const customStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  .confetti {
    position: absolute;
    width: 12px;
    height: 12px;
    background-color: #f00;
    animation: fall linear forwards;
    z-index: 1000;
  }
  @keyframes fall {
    to { transform: translateY(100vh) rotate(720deg); }
  }
`;

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'marie-galante-quiz';

// --- Dynamic Backgrounds ---
const THEME_BACKGROUNDS = {
  'DEFAULT':"https://stackblitz.com/storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTkxMTQ1NTA5LCJwdXIiOiJibG9iX2lkIn19--a92506f21f3bf4966e26fe1470b90bf8478e6a68/MG%20melting%20pot.png", // MG melting pot
  "PATRIMOINE ET HABITATION": "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?q=80&w=2000&auto=format&fit=crop", // Photographie réelle de ruines/moulin en pierre
  "FESTIVALS ET CULTURE": "https://images.unsplash.com/photo-1540039155732-684735035726?q=80&w=2000&auto=format&fit=crop", // Foule vibrante lors d'un festival de musique en plein air
  "PRODUITS DU TERROIR ET SAVOIR-FAIRE": "https://images.unsplash.com/photo-1620021305411-92cb3e46cde6?q=80&w=2000&auto=format&fit=crop", // Champs de canne à sucre
  "TRADITIONS AGRICOLES": "https://images.unsplash.com/photo-1595859702582-1b1512da1111?q=80&w=2000&auto=format&fit=crop", // Bétail/bœufs dans un paysage agricole
  "DISTILLERIES ET RHUM": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2000&auto=format&fit=crop", // Fûts de chêne dans une distillerie authentique
  "GASTRONOMIE LOCALE": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2000&auto=format&fit=crop", // Photographie culinaire généreuse
  "BIODIVERSITÉ ET ENVIRONNEMENT": "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?q=80&w=2000&auto=format&fit=crop", // Tortue marine nageant dans des eaux claires
};

// --- Quiz Data ---
const QUESTIONS = [
  {
    id: 1, theme: "PATRIMOINE ET HABITATION", type: "single", points: 1,
    text: "En 1835, combien d'habitations-sucreries comptait Marie-Galante, à l'époque où la culture de la canne à sucre dominait l'économie de l'île ?",
    options: ["15 habitations-sucreries", "39 habitations-sucreries", "81 habitations-sucreries", "106 habitations-sucreries"],
    correct: [3],
    explanation: "Marie-Galante était surnommée l'île aux cent moulins. En 1835, on comptait 106 habitations-sucreries."
  },
  {
    id: 2, theme: "PATRIMOINE ET HABITATION", type: "single", points: 1,
    text: "Quelle est la particularité de l'Habitation Murat aujourd'hui ?",
    options: [
      "Elle abrite l'Écomusée des arts et traditions populaires de Marie-Galante.",
      "Elle est devenue une distillerie de rhum en activité.",
      "Elle accueille le principal port de commerce de l'île.",
      "Elle est aujourd'hui une usine sucrière industrielle."
    ],
    correct: [0],
    explanation: "L'Habitation Murat abrite l'Écomusée de Marie-Galante, qui valorise l'histoire, les arts et les traditions populaires de l'île."
  },
  {
    id: 3, theme: "PATRIMOINE ET HABITATION", type: "multiple", points: 2,
    text: "Quels éléments du patrimoine peut-on découvrir sur le site de l'Habitation Roussel-Trianon ? (Plusieurs réponses possibles)",
    options: ["Un moulin à vent", "Une cheminée de l'ancienne sucrerie", "Des écuries en pierre et en brique", "Un ancien fort militaire avec des canons"],
    correct: [0, 1, 2],
    explanation: "Roussel-Trianon est une ancienne habitation sucrière dont les vestiges témoignent de la production de sucre de canne. Son moulin à vent, sa cheminée et ses écuries comptent parmi les éléments remarquables de son patrimoine architectural."
  },
  {
    id: 4, theme: "FESTIVALS ET CULTURE", type: "single", points: 1,
    text: "En quelle année a eu lieu la première édition du festival devenu Terre de Blues, et sur quel site se déroule-t-il depuis ses premières éditions ?",
    options: ["En 2000, à l'Habitation Murat", "En 2005, à la distillerie Bielle", "En 1990, à l'Habitation Roussel-Trianon", "En 2010, sur la plage de Folle-Anse"],
    correct: [0],
    explanation: "La première édition a eu lieu en 2000 sous le nom « Créole Blues ». Le festival est associé au site de l'Habitation Murat."
  },
  {
    id: 5, theme: "FESTIVALS ET CULTURE", type: "single", points: 1,
    text: "À quelle période de l'année se déroule généralement le festival Terre de Blues à Marie-Galante ?",
    options: ["Pendant le Carnaval, en février ou en mars", "Pendant le week-end de la Pentecôte, généralement en mai ou en juin", "Pendant les vacances de Noël, en décembre", "Au moment des grandes vacances, en juillet ou en août"],
    correct: [1],
    explanation: "Le festival se déroule généralement pendant le week-end de la Pentecôte."
  },
  {
    id: 6, theme: "PRODUITS DU TERROIR ET SAVOIR-FAIRE", type: "single", points: 1,
    text: "De quoi est fabriqué le sirop de batterie traditionnel de Marie-Galante ?",
    options: ["De pur jus de canne à sucre concentré par cuisson", "De mélasse mélangée à de l'eau de mer", "De jus de manioc fermenté", "De rhum blanc mélangé à du sucre"],
    correct: [0],
    explanation: "Le jus de canne est cuit et concentré pour obtenir ce sirop traditionnel."
  },
  {
    id: 7, theme: "TRADITIONS AGRICOLES", type: "multiple", points: 2,
    text: "Quelles affirmations décrivent correctement le cabrouet traditionnel de Marie-Galante ? (Plusieurs réponses possibles)",
    options: [
      "C'est une charrette traditionnelle tirée par une paire de bœufs.",
      "Il servait à transporter la canne à sucre des champs vers les moulins et les distilleries.",
      "Il est utilisé lors des compétitions traditionnelles de bœufs tirants.",
      "C'est une machine motorisée destinée à broyer la canne à sucre dans les champs."
    ],
    correct: [0, 1, 2],
    explanation: "Le cabrouet est une charrette à traction bovine historiquement utilisée pour transporter la canne à sucre. Il demeure un symbole du patrimoine agricole de Marie-Galante et joue un rôle dans les courses de bœufs tirants."
  },
  {
    id: 8, theme: "TRADITIONS AGRICOLES", type: "single", points: 1,
    text: "En quoi consiste une compétition de bœufs tirants à Marie-Galante ?",
    options: [
      "Deux bœufs tirent une charrette chargée sur une côte, sur un parcours chronométré.",
      "Un cheval tire une charrette vide sur un parcours plat.",
      "Des bœufs labourent un champ sans charge ni parcours chronométré.",
      "Des bovins traversent un bassin en nageant."
    ],
    correct: [0],
    explanation: "Cette épreuve met à l'honneur la force des animaux, leur entraînement et le savoir-faire des meneurs."
  },
  {
    id: 9, theme: "DISTILLERIES ET RHUM", type: "multiple", points: 2,
    text: "Quelles sont les trois distilleries traditionnellement recensées en activité à Marie-Galante ? (Plusieurs réponses possibles)",
    options: ["Bellevue", "Bielle", "Poisson, qui produit le rhum Père Labat", "Damoiseau"],
    correct: [0, 1, 2],
    explanation: "Les trois distilleries traditionnellement recensées sont Bellevue, Bielle et Poisson. Damoiseau est située au Moule, en Grande-Terre."
  },
  {
    id: 10, theme: "DISTILLERIES ET RHUM", type: "multiple", points: 2,
    text: "Quelles affirmations décrivent correctement le rhum de Marie-Galante ? (Plusieurs réponses possibles)",
    options: [
      "Le rhum agricole est élaboré à partir du jus de canne à sucre frais.",
      "Le rhum blanc à 59° est une particularité emblématique de Marie-Galante.",
      "L'île compte trois distilleries traditionnelles: Bellevue, Bielle et Poisson.",
      "Le rhum agricole est exclusivement fabriqué à partir de mélasse importée."
    ],
    correct: [0, 1, 2],
    explanation: "Le rhum agricole de Marie-Galante est produit à partir du jus de canne à sucre. L'île est réputée pour son rhum blanc à 59° et ses trois distilleries traditionnelles. Le rhum élaboré à partir de mélasse relève d'un autre procédé."
  },
  {
    id: 11, theme: "GASTRONOMIE LOCALE", type: "single", points: 1,
    text: "Quelle pâtisserie emblématique de Marie-Galante est préparée notamment avec du sirop de batterie et peut être parfumée à la noix de coco ?",
    options: ["Le caca bœuf", "Le tourment d'amour", "La kassav", "Le bébélé"],
    correct: [0],
    explanation: "Le caca bœuf est une pâtisserie traditionnelle à base de sirop de batterie, souvent garnie de noix de coco."
  },
  {
    id: 12, theme: "GASTRONOMIE LOCALE", type: "single", points: 1,
    text: "Quel plat traditionnel de Marie-Galante est préparé notamment avec des tripes de bœuf, des bananes vertes, du fruit à pain et des petits dombrés ?",
    options: ["Le bébélé", "Le chaudage", "Le blaff de poisson", "La fricassée de lambis"],
    correct: [0],
    explanation: "Le bébélé est le plat typique et traditionnel de Marie-Galante par excellence."
  },
  {
    id: 13, theme: "GASTRONOMIE LOCALE", type: "single", points: 1,
    text: "Dans la préparation traditionnelle de la kassav, qu'est-ce qu'une platine ?",
    options: [
      "Une plaque métallique chaude sur laquelle on cuit la galette de manioc",
      "Une presse utilisée pour extraire le jus de canne",
      "Un moulin servant à broyer les grains de café",
      "Un four traditionnel destiné à cuire les viandes"
    ],
    correct: [0],
    explanation: "La platine est une plaque métallique chaude sur laquelle on cuit la galette de manioc après en avoir extrait le jus toxique."
  },
  {
    id: 14, theme: "BIODIVERSITÉ ET ENVIRONNEMENT", type: "single", points: 1,
    text: "Combien d'espèces de tortues marines fréquentent les eaux de la Guadeloupe ?",
    options: ["3 espèces", "4 espèces", "5 espèces", "6 espèces"],
    correct: [2],
    explanation: "Cinq espèces de tortues marines sont recensées : la tortue luth, verte, imbriquée, caouanne et olivâtre. Trois viennent régulièrement pondre sur les plages."
  },
  {
    id: 15, theme: "BIODIVERSITÉ ET ENVIRONNEMENT", type: "single", points: 1,
    text: "Comment appelle-t-on le palétuvier qui possède des racines en échasses ?",
    options: [
      "Le palétuvier rouge (Rhizophora mangle)",
      "Le palétuvier noir (Avicennia germinans)",
      "Le palétuvier gris (Conocarpus erectus)",
      "Le palétuvier blanc (Laguncularia racemosa)"
    ],
    correct: [0],
    explanation: "Le palétuvier rouge est reconnaissable à ses racines aériennes en forme d'échasses, qui lui permettent de s'ancrer dans les sols vaseux."
  },
  {
    id: 16, theme: "BIODIVERSITÉ ET ENVIRONNEMENT", type: "photo", points: 2,
    text: "Quel est le nom de cette espèce ?",
    imagePlaceholder: "Un lézard vert émeraude aux nuances bleutées sur le tronc d'un arbre.",
    options: [
      "Anolis marbré (Ctenonotus marmoratus)",
      "Hémidactyle mabouia (Hemidactylus mabouia)",
      "Anolis ferreus (Ctenonotus ferreus)",
      "Anolis de la Sagra (Norops sagrei)"
    ],
    correct: [2],
    explanation: "Il s'agit de l'Anolis ferreus, une espèce endémique magnifique de Marie-Galante."
  },
  {
    id: 17, theme: "BIODIVERSITÉ ET ENVIRONNEMENT", type: "single", points: 1,
    text: "Dans le cadre du projet de restauration écologique du marais de la rivière de Vieux-Fort, comment le cocotier (Cocos nucifera) est-il considéré sur le site ?",
    options: [
      "Comme une espèce indigène de la mangrove",
      "Comme une espèce strictement endémique de Guadeloupe",
      "Comme une espèce exotique envahissante",
      "Comme une espèce de palétuvier naturellement présente"
    ],
    correct: [2],
    explanation: "Le projet mentionne le cocotier parmi les espèces exotiques envahissantes présentes sur le site étudié."
  },
  {
    id: 18, theme: "BIODIVERSITÉ ET ENVIRONNEMENT", type: "photo", points: 2,
    text: "Où se trouve cette mangrove à Marie-Galante ?",
    imagePlaceholder: "Une mangrove paisible avec une promenade en bois traversant l'eau et une petite barque.",
    options: ["Au marais de Vieux-Fort", "Au marais de Folle-Anse", "Au marais de Petite-Anse", "Au marais de Port-Louis"],
    correct: [0],
    explanation: "Il s'agit du marais de Vieux-Fort."
  },
  {
    id: 19, theme: "BIODIVERSITÉ ET ENVIRONNEMENT", type: "single", points: 1,
    text: "Quelle association locale œuvre activement depuis l'an 2000 pour la protection des tortues marines et la surveillance des pontes à Marie-Galante ?",
    options: ["L'association Écolambda", "Le Conservatoire du littoral", "L'Office français de la biodiversité", "L'association Corail"],
    correct: [0],
    explanation: "Écolambda participe activement à la protection des tortues marines à Marie-Galante, notamment par la surveillance des pontes."
  },
  {
    id: 20, theme: "BIODIVERSITÉ ET ENVIRONNEMENT", type: "multiple", points: 2,
    text: "Quels sont les rôles des mares à Marie-Galante ? (Plusieurs réponses possibles)",
    options: [
      "Elles sont des lieux de passage et d'abreuvement pour divers animaux.",
      "Elles sont utilisées pour répondre à certains besoins agricoles (abreuvement bétail).",
      "Elles n'ont aucun rôle écologique et ne servent pas d'habitat.",
      "Elles peuvent retenir une partie des eaux pluviales et limiter les inondations."
    ],
    correct: [0, 1, 3],
    explanation: "Les mares constituent des habitats pour la biodiversité, fournissent de l'eau pour l'agriculture et participent à la régulation des eaux pluviales."
  },
  {
    id: 21, theme: "BIODIVERSITÉ ET ENVIRONNEMENT", type: "photo", points: 2,
    text: "De quelle plage s'agit-il ?",
    imagePlaceholder: "Une immense plage de sable blanc fin, bordée d'eaux turquoise calmes, typique des Caraïbes.",
    options: ["Trois-Îlets", "Moustique", "Anse Canot", "Anse de Mays"],
    correct: [3],
    explanation: "Il s'agit de la magnifique plage de l'Anse de Mays."
  }
];

const Confetti = () => {
  const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {[...Array(60)].map((_, i) => {
        const left = Math.random() * 100;
        const animationDuration = Math.random() * 2.5 + 2;
        const animationDelay = Math.random() * 1.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        return (
          <div
            key={i}
            className="confetti rounded-sm"
            style={{
              left: `${left}%`,
              top: '-20px',
              backgroundColor: color,
              animationDuration: `${animationDuration}s`,
              animationDelay: `${animationDelay}s`,
            }}
          />
        );
      })}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('registration'); // registration, quiz, bonus, result
  const [participant, setParticipant] = useState({ firstName: '', lastName: '', email: '' });
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const [score, setScore] = useState(0);
  
  const [bonusData, setBonusData] = useState({ b1: '', b2: '', b3: '' });
  const [isSaving, setIsSaving] = useState(false);

  // --- Admin State ---
  const [adminPassword, setAdminPassword] = useState('');
  const [participantsList, setParticipantsList] = useState([]);
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' ou 'asc'

  // --- Auth Effect ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // --- Handlers ---
  const handleRegistrationSubmit = (e) => {
    e.preventDefault();
    if (participant.firstName && participant.lastName && participant.email) {
      setStep('quiz');
    }
  };

  const toggleOption = (index, type) => {
    if (showExplanation) return;
    if (type === 'single' || type === 'photo') {
      setSelectedOptions([index]);
    } else {
      setSelectedOptions(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    }
  };

  const calculatePoints = (question, selected) => {
    let earned = 0;
    if (question.type === 'single' || question.type === 'photo') {
      if (selected.length === 1 && selected[0] === question.correct[0]) {
        earned = question.points;
      }
    } else {
      // Multiple choice logic
      const correctAnswers = question.correct;
      const isPerfect = correctAnswers.length === selected.length && correctAnswers.every(ans => selected.includes(ans));
      const hasWrongAnswer = selected.some(ans => !correctAnswers.includes(ans));
      const missedOne = !hasWrongAnswer && selected.length === correctAnswers.length - 1;

      if (isPerfect) earned = 2;
      else if (missedOne) earned = 1;
      else earned = 0;
    }
    return earned;
  };

  const handleValidateAnswer = () => {
    if (selectedOptions.length === 0) return;
    
    const earned = calculatePoints(QUESTIONS[currentQuestionIndex], selectedOptions);
    setScore(prev => prev + earned);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    setShowExplanation(false);
    setSelectedOptions([]);
    
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setStep('bonus');
    }
  };

  const getRank = (finalScore) => {
    if (finalScore <= 6) return "Passeport Découverte";
    if (finalScore <= 13) return "Explorateur";
    if (finalScore <= 19) return "Connaisseur";
    if (finalScore <= 24) return "Ambassadeur";
    return "Expert de Marie-Galante";
  };

  const submitFinalResults = async () => {
    if (!user || !db) {
      setStep('result');
      return;
    }
    setIsSaving(true);
    try {
      const participantsRef = collection(db, 'artifacts', appId, 'public', 'data', 'participants');
      await addDoc(participantsRef, {
        userId: user.uid,
        ...participant,
        score: score,
        rank: getRank(score),
        bonusAnswers: bonusData,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error saving data:", err);
    } finally {
      setIsSaving(false);
      setStep('result');
    }
  };

  // --- Admin Handlers ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'soleil') { // Mot de passe simple pour la démo
      setStep('admin-dashboard');
    } else {
      alert("Mot de passe incorrect"); // Remplacé par une alerte simple pour l'organisateur
    }
  };

  useEffect(() => {
    if (step === 'admin-dashboard' && user && db) {
      const fetchParticipants = async () => {
        try {
          const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'participants'));
          const querySnapshot = await getDocs(q);
          const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setParticipantsList(data);
        } catch (err) {
          console.error("Erreur lors de la récupération des participants", err);
        }
      };
      fetchParticipants();
    }
  }, [step, user, db]);

  const exportToCSV = () => {
    const headers = ["Nom", "Prénom", "Email", "Score", "Niveau", "Bonus 1 (Moulin)", "Bonus 2 (Point Culminant)", "Bonus 3 (Superficie)"];
    const rows = filteredAndSortedParticipants.map(p => [
      p.lastName,
      p.firstName,
      p.email,
      p.score,
      p.rank,
      p.bonusAnswers?.b1 || '',
      p.bonusAnswers?.b2 || '',
      p.bonusAnswers?.b3 || ''
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(item => `"${item}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "participants_marie_galante.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Computed Data for Admin ---
  const filteredAndSortedParticipants = participantsList
    .filter(p => filterLevel === 'all' || p.rank === filterLevel)
    .sort((a, b) => {
      if (sortOrder === 'desc') return b.score - a.score;
      return a.score - b.score;
    });

  // --- Views ---
  const renderRegistration = () => (
    <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl border-t-4 border-emerald-500 relative animate-fade-in">
      <div className="text-center mb-10">
        <Map className="w-20 h-20 mx-auto text-emerald-600 mb-6 animate-float" />
        <h2 className="text-3xl font-extrabold text-slate-800">Passeport Marie-Galante</h2>
        <p className="text-slate-500 mt-3 font-medium text-lg">Participez à notre grand jeu-concours !</p>
      </div>
      <form onSubmit={handleRegistrationSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Prénom</label>
          <input required type="text" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all text-lg"
            value={participant.firstName} onChange={e => setParticipant({...participant, firstName: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Nom</label>
          <input required type="text" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all text-lg"
            value={participant.lastName} onChange={e => setParticipant({...participant, lastName: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Email</label>
          <input required type="email" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all text-lg"
            value={participant.email} onChange={e => setParticipant({...participant, email: e.target.value})} />
        </div>
        <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3 mt-8 text-lg">
          Commencer le Quiz <ChevronRight size={24} />
        </button>
      </form>
      
      <button 
        onClick={() => setStep('admin-login')} 
        className="absolute bottom-6 right-6 text-slate-300 hover:text-slate-600 transition-colors bg-slate-50 p-2 rounded-full hover:bg-slate-200"
        title="Espace Organisateur"
      >
        <Lock size={18} />
      </button>
    </div>
  );

  const renderAdminLogin = () => (
    <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-xl border-t-4 border-slate-800">
      <div className="text-center mb-8">
        <Lock className="w-16 h-16 mx-auto text-slate-700 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Espace Organisateur</h2>
        <p className="text-slate-600 mt-2">Veuillez vous identifier</p>
      </div>
      <form onSubmit={handleAdminLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
          <input 
            type="password" 
            required 
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
            value={adminPassword} 
            onChange={e => setAdminPassword(e.target.value)} 
          />
        </div>
        <div className="flex gap-4 mt-6">
          <button type="button" onClick={() => setStep('registration')} className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-4 rounded-lg transition-colors">
            Retour
          </button>
          <button type="submit" className="w-2/3 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Connexion
          </button>
        </div>
      </form>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border-t-4 border-cyan-600">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-cyan-600" /> Tableau de Bord - Participants
          </h2>
          <p className="text-slate-600">{participantsList.length} participant(s) enregistré(s)</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep('registration')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
            Quitter
          </button>
          <button onClick={exportToCSV} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
            <Download size={18} /> Exporter CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Filtrer par niveau</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-cyan-500"
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
          >
            <option value="all">Tous les niveaux</option>
            <option value="Passeport Découverte">Passeport Découverte (0-6)</option>
            <option value="Explorateur">Explorateur (7-13)</option>
            <option value="Connaisseur">Connaisseur (14-19)</option>
            <option value="Ambassadeur">Ambassadeur (20-24)</option>
            <option value="Expert de Marie-Galante">Expert (25-29)</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Trier par score</label>
          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="w-full flex items-center justify-between p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            <span>{sortOrder === 'desc' ? 'Du plus grand au plus petit' : 'Du plus petit au plus grand'}</span>
            <ArrowUpDown size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="p-4 font-semibold">Participant</th>
              <th className="p-4 font-semibold">Contact</th>
              <th className="p-4 font-semibold text-center">Score</th>
              <th className="p-4 font-semibold">Niveau</th>
              <th className="p-4 font-semibold text-amber-600">Q. Bonus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedParticipants.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500 italic">Aucun participant trouvé.</td>
              </tr>
            ) : (
              filteredAndSortedParticipants.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{p.lastName} {p.firstName}</td>
                  <td className="p-4 text-slate-600">{p.email}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center bg-cyan-100 text-cyan-800 font-bold w-8 h-8 rounded-full">
                      {p.score}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-semibold">
                      {p.rank}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-500 space-y-1">
                    <p><strong className="text-amber-700">1.</strong> {p.bonusAnswers?.b1 || '-'}</p>
                    <p><strong className="text-amber-700">2.</strong> {p.bonusAnswers?.b2 || '-'}</p>
                    <p><strong className="text-amber-700">3.</strong> {p.bonusAnswers?.b3 || '-'}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderQuiz = () => {
    const q = QUESTIONS[currentQuestionIndex];
    const isMultiple = q.type === 'multiple';
    const progressPercentage = ((currentQuestionIndex) / QUESTIONS.length) * 100;

    return (
      <div key={currentQuestionIndex} className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-2xl border-t-4 border-cyan-500 animate-fade-in">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-bold text-cyan-800 mb-2 uppercase tracking-wider">
            <span>Progression</span>
            <span>{currentQuestionIndex + 1} / {QUESTIONS.length}</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6 text-sm font-semibold text-cyan-800">
          <span className="bg-cyan-100/80 px-4 py-1.5 rounded-full shadow-sm">{q.theme}</span>
        </div>
        
        <h3 className="text-2xl font-extrabold text-slate-800 mb-4 leading-tight">{q.text}</h3>
        
        {isMultiple && <p className="text-sm text-amber-600 font-bold mb-5 flex items-center gap-1 bg-amber-50 inline-block px-3 py-1 rounded-lg"><Sparkles size={16}/> Plusieurs réponses possibles</p>}

        {q.imagePlaceholder && (
          <div className="w-full h-56 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-6 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 shadow-sm transition-transform hover:scale-[1.01]">
            <Camera size={40} className="mb-3 text-slate-400 animate-pulse" />
            <p className="text-sm px-4 text-center font-medium">{q.imagePlaceholder}</p>
          </div>
        )}

        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            const isSelected = selectedOptions.includes(idx);
            let btnClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 transform outline-none ";
            
            if (showExplanation) {
              const isCorrectOpt = q.correct.includes(idx);
              if (isCorrectOpt) btnClass += "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-md scale-[1.02]";
              else if (isSelected && !isCorrectOpt) btnClass += "border-red-400 bg-red-50 text-red-900 shadow-md";
              else btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-60";
            } else {
              btnClass += isSelected 
                ? "border-cyan-500 bg-cyan-50 text-cyan-900 shadow-md scale-[1.02]" 
                : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50 hover:shadow-sm hover:-translate-y-0.5 text-slate-700";
            }

            return (
              <button key={idx} onClick={() => toggleOption(idx, q.type)} disabled={showExplanation} className={btnClass}>
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 rounded-${isMultiple ? 'md' : 'full'} transition-colors ${isSelected || (showExplanation && q.correct.includes(idx)) ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300'}`}>
                    {(isSelected || (showExplanation && q.correct.includes(idx))) && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                  <span className="font-medium text-lg">{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-amber-900 shadow-inner animate-fade-in">
            <h4 className="font-extrabold flex items-center gap-2 mb-2 text-amber-800"><AlertCircle size={20} className="text-amber-600"/> Explication</h4>
            <p className="text-base leading-relaxed font-medium">{q.explanation}</p>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          {!showExplanation ? (
            <button onClick={handleValidateAnswer} disabled={selectedOptions.length === 0} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-10 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Valider
            </button>
          ) : (
            <button onClick={handleNextQuestion} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-4 px-10 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-3 animate-pulse">
              Continuer <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderBonus = () => (
    <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl border-t-4 border-amber-500 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Star className="text-amber-500" size={32} />
        <h2 className="text-3xl font-extrabold text-slate-800">Questions Bonus</h2>
      </div>
      <p className="text-slate-600 mb-8 text-lg font-medium">Ces questions serviront à départager les éventuels ex-æquo pour le tirage au sort des lots.</p>
      
      <div className="space-y-8">
        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
          <label className="block text-base font-bold text-slate-800 mb-3">1. Quel est le nom du moulin à vent emblématique que l'on peut visiter à Marie-Galante ?</label>
          <input type="text" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all text-lg bg-white"
            value={bonusData.b1} onChange={e => setBonusData({...bonusData, b1: e.target.value})} placeholder="Votre réponse..." />
        </div>
        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
          <label className="block text-base font-bold text-slate-800 mb-3">2. Quel est le point culminant de Marie-Galante et quelle est son altitude approximative ?</label>
          <input type="text" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all text-lg bg-white"
            value={bonusData.b2} onChange={e => setBonusData({...bonusData, b2: e.target.value})} placeholder="Ex: Morne... XXXm" />
        </div>
        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
          <label className="block text-base font-bold text-slate-800 mb-3">3. À votre avis, quelle est la superficie de Marie-Galante, en kilomètres carrés (km²) ?</label>
          <input type="number" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all text-lg bg-white"
            value={bonusData.b3} onChange={e => setBonusData({...bonusData, b3: e.target.value})} placeholder="Saisissez un nombre..." />
        </div>
      </div>

      <button onClick={submitFinalResults} disabled={isSaving} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 mt-10 text-lg">
        {isSaving ? 'Enregistrement en cours...' : 'Terminer le concours'}
      </button>
    </div>
  );

  const renderResult = () => (
    <div className="max-w-lg mx-auto bg-white/95 backdrop-blur-md p-10 rounded-3xl shadow-2xl text-center border-t-4 border-emerald-500 animate-fade-in relative overflow-hidden">
      <Confetti />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-50 via-transparent to-transparent opacity-50 pointer-events-none"></div>
      
      <Trophy className="w-24 h-24 mx-auto text-yellow-400 mb-6 animate-float drop-shadow-lg" />
      <h2 className="text-4xl font-extrabold text-slate-800 mb-2">Félicitations {participant.firstName} !</h2>
      <p className="text-lg text-slate-600 mb-8 font-medium">Votre participation a bien été enregistrée pour le grand tirage au sort.</p>
      
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-8 mb-8 shadow-inner transform transition-all hover:scale-105">
        <p className="text-sm font-bold text-emerald-800 uppercase tracking-widest mb-3 flex items-center justify-center gap-2"><Star size={16}/> Votre Score <Star size={16}/></p>
        <div className="text-7xl font-black text-emerald-600 mb-4 drop-shadow-sm">{score} <span className="text-3xl text-emerald-400/80">/ 29</span></div>
        <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Votre niveau :</p>
        <p className="text-2xl font-extrabold text-emerald-800 bg-emerald-100/50 inline-block px-4 py-2 rounded-xl">{getRank(score)}</p>
      </div>

      <button onClick={() => window.location.reload()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md w-full">
        Retour à l'accueil
      </button>
    </div>
  );

  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeSplash(true), 5000);
    const removeTimer = setTimeout(() => setShowSplash(false), 5000);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);
  
  const currentTheme = step === 'quiz' ? QUESTIONS[currentQuestionIndex].theme : 'DEFAULT';
  const bgImage = THEME_BACKGROUNDS[currentTheme] || THEME_BACKGROUNDS['DEFAULT'];

  return (
    <>
    {/* ÉCRAN D'INTRODUCTION (SPLASH SCREEN) */}
    {showSplash && (
      <div 
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-emerald-900 transition-opacity duration-1000 ease-in-out ${fadeSplash ? 'opacity-0' : 'opacity-100'}`}
      >
        <img 
          src="/MG melting pot.png" 
          alt="Accueil Marie-Galante" 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="relative z-10 text-center px-4 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-xl mb-4">
            Bienvenue à Marie-Galante
          </h1>
          <h2 className="text-2xl md:text-4xl font-semibold text-white drop-shadow-lg">
            Welcome to Marie-Galante
          </h2>
        </div>
      </div>
    )}
    
    <div className="min-h-screen py-12 px-4 font-sans text-slate-800 selection:bg-cyan-200 relative">
      <style>{customStyles}</style>

      {/* Dynamic Background with Fade Transition & Overlay */}
      <div 
        className="fixed inset-0 z-[-2] bg-contain bg-no-repeat bg-center transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="fixed inset-0 z-[-1] bg-slate-900/60 backdrop-blur-[2px]" />

      {/* Abstract Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[-1] opacity-30">
        <Leaf className="absolute top-10 left-10 text-emerald-300 w-32 h-32 transform -rotate-45" />
        <Droplets className="absolute bottom-20 right-10 text-cyan-300 w-40 h-40" />
        <Wind className="absolute top-40 right-20 text-sky-200 w-24 h-24" />
      </div>

      <header className="max-w-4xl mx-auto text-center mb-10">
        {/*AJOUT DU LOGO ICI*/}
        <img src="/Logo OTMG sans fond.jpg" alt="Logo Office du Tourisme" className="w-48 mx-auto drop-shadow-lg mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-md">
          L'île aux cent moulins
        </h1>
      </header>

      <main>
        {step === 'registration' && renderRegistration()}
        {step === 'admin-login' && renderAdminLogin()}
        {step === 'admin-dashboard' && renderAdminDashboard()}
        {step === 'quiz' && renderQuiz()}
        {step === 'bonus' && renderBonus()}
        {step === 'result' && renderResult()}
      </main>
    </div>
    </>
  );
}
const root = createRoot(document.getElementById('root'));
root.render(<App />);