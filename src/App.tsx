import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Droplets, 
  Camera, 
  Flame, 
  Utensils, 
  Activity, 
  ChevronRight, 
  X, 
  History, 
  BookOpen, 
  Scale, 
  Check,
  Zap,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Meal, WaterLog, DailyStats, Macronutrients } from './types';

// Constants from the provided PDF plan
const CALORIE_GOAL = 2100;
const PROTEIN_GOAL = 190;
const CARB_GOAL = 150;
const FAT_GOAL = 60;
const WATER_GOAL = 2000;

export const PLANNED_MEALS = [
  { id: 'meal-1', name: "1ra Comida", time: "Desayuno", targetTime: "08:00 AM", desc: "4 huevos, pan/arepa, yogurt griego, whey, frutos rojos + Suplementos (500mg Vit C, 1000mg Omega 3, 1 scoop Creatina)", macros: { p: 45, c: 40, f: 20, calories: 520 }, isSupplement: true },
  { id: 'meal-2', name: "2da Comida", time: "Snack 1", targetTime: "11:00 AM", desc: "1/2 scoop whey, 2 galletas arroz/manzana", macros: { p: 12, c: 15, f: 1, calories: 120 } },
  { id: 'meal-3', name: "3ra Comida", time: "Almuerzo", targetTime: "01:00 PM", desc: "180g pechuga/res/salmón, 100g arroz/150g papa, vegetales + Suplementos (1000mg Omega 3, 1 scoop Glutamina)", macros: { p: 45, c: 30, f: 10, calories: 410 }, isSupplement: true },
  { id: 'meal-5', name: "5ta Comida", time: "Snack 2", targetTime: "05:00 PM", desc: "90g pollo/atún, 3 galletas arroz o 80g papa", macros: { p: 25, c: 25, f: 5, calories: 245 } },
  { id: 'meal-6', name: "6ta Comida", time: "Cena", targetTime: "08:00 PM", desc: "180g proteína magra, 4 galletas arroz/100g papa, vegetales, aguacate/aceite", macros: { p: 40, c: 30, f: 22, calories: 478 } },
  { id: 'meal-7', name: "Pre-sleep", time: "Noche", targetTime: "10:30 PM", desc: "1 scoop proteína, psyllium, magnesio", macros: { p: 25, c: 2, f: 1, calories: 120 }, isSupplement: true }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'comidas' | 'history' | 'plan'>('dashboard');
  const [selectedPlannedMeal, setSelectedPlannedMeal] = useState<typeof PLANNED_MEALS[0] | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', p: '', c: '', f: '', calories: '' });

  // Load from localStorage on mount
  useEffect(() => {
    const savedMeals = localStorage.getItem('nico_meals');
    const savedWater = localStorage.getItem('nico_water');
    if (savedMeals) setMeals(JSON.parse(savedMeals));
    if (savedWater) setWaterLogs(JSON.parse(savedWater));
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('nico_meals', JSON.stringify(meals));
    localStorage.setItem('nico_water', JSON.stringify(waterLogs));
  }, [meals, waterLogs]);

  const addWater = (amount: number) => {
    const newLog: WaterLog = {
      id: Date.now().toString(),
      amount,
      timestamp: new Date().toISOString(),
    };
    setWaterLogs([...waterLogs, newLog]);
  };

  const resetWater = () => {
    const today = new Date().toDateString();
    setWaterLogs(waterLogs.filter(l => new Date(l.timestamp).toDateString() !== today));
  };

  const totalWater = waterLogs.reduce((acc, log) => {
    if (new Date(log.timestamp).toDateString() === new Date().toDateString()) {
       return acc + log.amount;
    }
    return acc;
  }, 0);
  const dailyMeals = meals.filter(m => new Date(m.timestamp).toDateString() === new Date().toDateString());
  const dailyMacros = dailyMeals.reduce((acc, meal) => ({
    p: acc.p + meal.macros.p,
    c: acc.c + meal.macros.c,
    f: acc.f + meal.macros.f,
    calories: acc.calories + meal.macros.calories,
  }), { p: 0, c: 0, f: 0, calories: 0 });

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraOpen(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');

    // Close camera
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    setIsCameraOpen(false);

    // Analyze with AI
    setAnalyzingImage(true);
    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });
      const data = await response.json();
      
      const newMeal: Meal = {
        id: Date.now().toString(),
        name: data.foodName,
        timestamp: new Date().toISOString(),
        macros: {
          p: data.protein,
          c: data.carbs,
          f: data.fat,
          calories: data.calories
        },
        image: imageData,
        isCustom: true
      };
      setMeals([...meals, newMeal]);
    } catch (err) {
      console.error("AI Analysis error:", err);
    } finally {
      setAnalyzingImage(false);
    }
  };

  const togglePlannedMeal = (plannedMeal: typeof PLANNED_MEALS[0]) => {
    const today = new Date().toDateString();
    const existingMeal = meals.find(m => m.plannedMealId === plannedMeal.id && new Date(m.timestamp).toDateString() === today);

    if (existingMeal) {
      setMeals(meals.filter(m => m.id !== existingMeal.id));
    } else {
      const newMeal: Meal = {
        id: Date.now().toString(),
        name: plannedMeal.name,
        timestamp: new Date().toISOString(),
        macros: { ...plannedMeal.macros },
        plannedMealId: plannedMeal.id
      };
      setMeals([...meals, newMeal]);
    }
  };

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(manualForm.p) || 0;
    const c = parseFloat(manualForm.c) || 0;
    const f = parseFloat(manualForm.f) || 0;
    const cal = parseFloat(manualForm.calories) || (p * 4 + c * 4 + f * 9);
    
    const newMeal: Meal = {
      id: Date.now().toString(),
      name: manualForm.name || "Comida Registrada",
      timestamp: new Date().toISOString(),
      macros: { p, c, f, calories: cal },
      isCustom: true
    };
    setMeals([...meals, newMeal]);
    setShowManualLog(false);
    setManualForm({ name: '', p: '', c: '', f: '', calories: '' });
  };

  const customMeals = dailyMeals.filter(m => !m.plannedMealId);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-brand-bg flex flex-col pb-24 relative overflow-x-hidden">
      {/* Header */}
      <header className="p-6 pt-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-brand-red tracking-tight leading-none mb-1">NutriBuddy.</h1>
          <p className="text-sm font-bold opacity-70">¡A darle con todo, Nico! ☀️</p>
        </div>
        <div className="w-12 h-12 bg-brand-yellow rounded-full border-4 border-brand-dark flex items-center justify-center font-black text-xl shadow-[4px_4px_0px_0px_#2D3436]">
          N
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 flex-1 space-y-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Progress Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="brutalist-card p-6"
            >
              <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                <span className="text-2xl">🔥</span> Energía Diaria
              </h3>
              <div className="space-y-4">
                <div className="relative h-6 bg-brand-gray rounded-full border-2 border-brand-dark overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((dailyMacros.calories / CALORIE_GOAL) * 100, 100)}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 10 }}
                    className="absolute top-0 left-0 h-full bg-brand-red" 
                  />
                </div>
                <div className="flex justify-between text-sm font-black uppercase">
                  <span>{dailyMacros.calories} / {CALORIE_GOAL} kcal</span>
                  <span className="text-brand-red">{Math.round((dailyMacros.calories / CALORIE_GOAL) * 100) || 0}%</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-2 border-t-2 border-brand-gray">
                  <MacroStat label="Prote" current={dailyMacros.p} target={PROTEIN_GOAL} color="text-brand-teal" bgColor="bg-brand-teal" />
                  <MacroStat label="Carbo" current={dailyMacros.c} target={CARB_GOAL} color="text-brand-yellow" bgColor="bg-brand-yellow" />
                  <MacroStat label="Grasa" current={dailyMacros.f} target={FAT_GOAL} color="text-brand-purple" bgColor="bg-brand-purple" />
                </div>
              </div>
            </motion.div>

            {/* Water Tracker */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-brand-mint brutalist-card p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black">Agua Diaria 💧</h3>
                  <button onClick={resetWater} className="p-2 -rotate-90 hover:rotate-0 hover:bg-brand-dark/10 rounded-full transition-all" title="Reiniciar agua de hoy">
                    <RotateCcw className="w-5 h-5 text-brand-dark opacity-40 hover:opacity-100" />
                  </button>
                </div>
                <span className="text-sm font-black">{totalWater}ml / {WATER_GOAL}ml</span>
              </div>
              <div className="flex gap-2 justify-between">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => {
                  const threshold = (i / 7) * WATER_GOAL;
                  const isFilled = totalWater >= threshold;
                  return (
                    <div 
                      key={i} 
                      className={`w-8 h-12 border-2 border-brand-dark rounded-lg transition-colors ${isFilled ? 'bg-brand-dark' : 'bg-white'}`}
                    />
                  );
                })}
              </div>
              <button 
                onClick={() => addWater(250)}
                className="w-full mt-6 bg-white brutalist-button py-3 rounded-2xl font-black text-brand-dark uppercase tracking-widest text-sm"
              >
                +250ml ¡Slurrp!
              </button>
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
               <ActionCard 
                icon={<Camera className="w-6 h-6" />} 
                label="Escanear Comida" 
                onClick={startCamera}
                color="bg-brand-red"
               />
               <ActionCard 
                icon={<Plus className="w-6 h-6" />} 
                label="Log Manual" 
                onClick={() => setShowManualLog(true)}
                color="bg-brand-purple"
               />
            </div>
          </>
        )}

        {activeTab === 'comidas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xl font-black">Tu Plan del Día</h2>
              </div>
              <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest mb-4 opacity-50 px-1">
                <span>P = Proteína</span>
                <span>C = Carbs</span>
                <span>G = Grasa</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PLANNED_MEALS.map(pm => {
                  const isLogged = dailyMeals.some(m => m.plannedMealId === pm.id);
                  let bgClasses = 'bg-white hover:bg-brand-gray';
                  if (pm.isSupplement) {
                    bgClasses = 'bg-brand-blue/30 hover:bg-brand-blue/50 border-brand-blue-dark';
                  }
                  if (isLogged) {
                    bgClasses = 'bg-brand-mint border-brand-teal';
                  }

                  return (
                    <div 
                      key={pm.id}
                      className={`w-full text-left brutalist-card p-3 flex flex-col transition-all relative ${bgClasses}`}
                    >
                      <div className="flex justify-between items-start w-full mb-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); togglePlannedMeal(pm); }}
                          className={`w-10 h-10 rounded-xl border-2 border-brand-dark flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform ${isLogged ? 'bg-brand-teal text-white' : 'bg-brand-yellow text-brand-dark'}`}
                        >
                          {isLogged ? <Check className="w-5 h-5" /> : <Utensils className="w-5 h-5 opacity-80" />}
                        </button>
                        <div className="text-right">
                          <span className="text-[8px] sm:text-[9px] font-black uppercase text-brand-dark opacity-40 tracking-widest block leading-tight">{pm.time}</span>
                          <span className="text-[8px] sm:text-[9px] font-black uppercase text-brand-dark opacity-40 tracking-widest block leading-tight">{pm.targetTime}</span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className={`font-black text-xs truncate ${isLogged ? 'text-brand-teal' : 'text-brand-dark'}`}>{pm.name}</h4>
                        <p className={`text-[9.5px] font-bold leading-tight line-clamp-2 mt-0.5 ${isLogged ? 'text-brand-teal opacity-80' : 'text-brand-dark opacity-60'}`}>{pm.desc}</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedPlannedMeal(pm); }}
                          className={`text-[8.5px] font-black uppercase mt-1 px-1.5 py-0.5 rounded active:scale-95 transition-colors ${isLogged ? 'text-brand-teal underline decoration-2 underline-offset-2 hover:bg-brand-teal/10' : 'text-brand-purple underline decoration-2 underline-offset-2 hover:bg-brand-purple/10'}`}
                        >
                          Ver Detalles &rarr;
                        </button>
                      </div>

                      <div className={`flex flex-col gap-1.5 w-full pt-2 border-t-2 mt-auto align-bottom ${isLogged ? 'border-brand-teal/30' : 'border-brand-gray'}`}>
                        <div className="flex gap-1 flex-wrap">
                          <span className={`text-[8.5px] font-black px-1 py-0.5 rounded ${isLogged ? 'bg-brand-teal text-white border border-brand-teal' : 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'}`}>P {pm.macros.p}g</span>
                          <span className={`text-[8.5px] font-black px-1 py-0.5 rounded ${isLogged ? 'bg-brand-teal text-white border border-brand-teal' : 'bg-brand-yellow/30 text-brand-yellow border border-brand-yellow/50'}`}>C {pm.macros.c}g</span>
                          <span className={`text-[8.5px] font-black px-1 py-0.5 rounded ${isLogged ? 'bg-brand-teal text-white border border-brand-teal' : 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'}`}>G {pm.macros.f}g</span>
                        </div>
                        <span className={`text-[9.5px] font-black ${isLogged ? 'text-brand-teal' : 'text-brand-red'}`}>{pm.macros.calories} kcal</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Extras */}
            {customMeals.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-black text-brand-dark">Extras Loggeados</h3>
                {customMeals.map(meal => (
                  <MealItem key={meal.id} meal={meal} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'plan' && <PlanSection />}
        {activeTab === 'history' && <HistorySection meals={meals} />}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-6 inset-x-6 h-20 bg-brand-dark rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] flex justify-between items-center px-4 z-50">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Activity />} label="Dash" />
        <NavButton active={activeTab === 'comidas'} onClick={() => setActiveTab('comidas')} icon={<Utensils />} label="Comidas" />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="Hist" />
        <NavButton active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} icon={<BookOpen />} label="Plan" />
      </nav>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-dark z-[100] flex flex-col"
          >
            <div className="flex-1 relative">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <button 
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach(t => t.stop());
                  setIsCameraOpen(false);
                }}
                className="absolute top-8 right-8 p-4 bg-brand-red border-4 border-brand-dark text-white rounded-full shadow-[4px_4px_0px_0px_#2D3436]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-12 flex justify-center bg-brand-dark">
              <button 
                onClick={captureImage}
                className="w-24 h-24 bg-white rounded-full border-8 border-brand-teal shadow-[0_0_40px_rgba(78,205,196,0.5)] active:scale-90 transition-transform"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyzing Overlay */}
      <AnimatePresence>
        {analyzingImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-yellow z-[200] flex flex-col items-center justify-center p-10 text-center"
          >
            <div className="w-32 h-32 bg-white border-8 border-brand-dark rounded-full flex items-center justify-center animate-bounce mb-8">
              <Camera className="w-12 h-12 text-brand-dark" />
            </div>
            <h3 className="text-3xl font-black text-brand-dark uppercase tracking-tight">¡Ojo al plato!</h3>
            <p className="font-bold text-brand-dark opacity-60 mt-2">Gemini está identificando los macros...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Planned Meal Details Modal */}
      <AnimatePresence>
        {selectedPlannedMeal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[200] flex flex-col justify-end p-6"
            onClick={() => setSelectedPlannedMeal(null)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="bg-white brutalist-card p-6 pb-12 w-full max-w-sm mx-auto space-y-4"
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-2xl font-black text-brand-dark">{selectedPlannedMeal.name}</h3>
                  <div className="text-xs font-black uppercase opacity-50 tracking-widest mt-1">{selectedPlannedMeal.time} • {selectedPlannedMeal.targetTime}</div>
                </div>
                <button onClick={() => setSelectedPlannedMeal(null)} className="p-2 border-2 border-brand-dark rounded-full active:scale-95">
                  <X className="w-5 h-5 text-brand-dark" />
                </button>
              </div>

              <div className="bg-brand-gray p-4 border-4 border-brand-dark rounded-2xl">
                <h4 className="font-black text-[10px] uppercase opacity-50 mb-2">Contenido</h4>
                <p className="text-sm font-bold text-brand-dark leading-relaxed">
                  {selectedPlannedMeal.desc}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-white">
                <div className="bg-brand-teal border-2 border-brand-dark rounded-xl p-2 flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase opacity-70">Pro</div>
                  <div className="font-black">{selectedPlannedMeal.macros.p}g</div>
                </div>
                <div className="bg-brand-yellow text-brand-dark border-2 border-brand-dark rounded-xl p-2 flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase opacity-70">Car</div>
                  <div className="font-black">{selectedPlannedMeal.macros.c}g</div>
                </div>
                <div className="bg-brand-purple border-2 border-brand-dark rounded-xl p-2 flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase opacity-70">Gra</div>
                  <div className="font-black">{selectedPlannedMeal.macros.f}g</div>
                </div>
                <div className="bg-brand-red border-2 border-brand-dark rounded-xl p-2 flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase opacity-70">Kcal</div>
                  <div className="font-black">{selectedPlannedMeal.macros.calories}</div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  togglePlannedMeal(selectedPlannedMeal);
                  setSelectedPlannedMeal(null);
                }}
                className={`w-full text-white brutalist-button py-4 rounded-xl font-black uppercase tracking-widest mt-4 flex items-center justify-center gap-2 ${dailyMeals.some(m => m.plannedMealId === selectedPlannedMeal.id) ? 'bg-brand-red border-brand-dark shadow-[4px_4px_0px_0px_#2D3436]' : 'bg-brand-dark border-brand-dark shadow-[4px_4px_0px_0px_transparent] active:shadow-[0px_0px_0px_0px_transparent] active:translate-y-[4px]'}`}
              >
                {dailyMeals.some(m => m.plannedMealId === selectedPlannedMeal.id) ? (
                  <>Desmarcar Comida</>
                ) : (
                  <><Check className="w-5 h-5"/> Marcar Completada</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Log Modal */}
      <AnimatePresence>
        {showManualLog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[200] flex flex-col justify-end p-6"
            onClick={() => setShowManualLog(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="bg-white brutalist-card p-6 pb-12 w-full max-w-sm mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-brand-dark">Log Manual ✍️</h3>
                <button onClick={() => setShowManualLog(false)} className="p-2 border-2 border-brand-dark rounded-full active:scale-95">
                  <X className="w-5 h-5 text-brand-dark" />
                </button>
              </div>
              <form onSubmit={handleManualLogSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase opacity-50 ml-1">Nombre</label>
                  <input required value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} type="text" placeholder="Ej. Avena con whey" className="w-full bg-brand-gray border-4 border-brand-dark rounded-xl px-4 py-3 font-bold outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-teal ml-1">Prote (g)</label>
                    <input required type="number" value={manualForm.p} onChange={e => setManualForm({...manualForm, p: e.target.value})} className="w-full bg-brand-gray border-4 border-brand-dark rounded-xl px-3 py-3 font-black text-center outline-none focus:border-brand-teal" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-yellow ml-1">Carb (g)</label>
                    <input required type="number" value={manualForm.c} onChange={e => setManualForm({...manualForm, c: e.target.value})} className="w-full bg-brand-gray border-4 border-brand-dark rounded-xl px-3 py-3 font-black text-center outline-none focus:border-brand-yellow" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-purple ml-1">Grasa (g)</label>
                    <input required type="number" value={manualForm.f} onChange={e => setManualForm({...manualForm, f: e.target.value})} className="w-full bg-brand-gray border-4 border-brand-dark rounded-xl px-3 py-3 font-black text-center outline-none focus:border-brand-purple" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase opacity-50 ml-1">Kcal (Opcional)</label>
                  <input type="number" value={manualForm.calories} onChange={e => setManualForm({...manualForm, calories: e.target.value})} placeholder="Se calcula si está vacío" className="w-full bg-brand-gray border-4 border-brand-dark rounded-xl px-4 py-3 font-bold outline-none" />
                </div>
                <button type="submit" className="w-full bg-brand-dark text-white brutalist-button py-4 rounded-xl font-black uppercase tracking-widest mt-4">Guardar Comida</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MacroStat({ label, current, target, color, bgColor }: { label: string, current: number, target: number, color: string, bgColor: string }) {
  const percent = Math.min((current / target) * 100, 100) || 0;
  return (
    <div className="text-center">
      <div className="text-[10px] font-black uppercase opacity-40 mb-1">{label}</div>
      <div className="relative h-2 w-full bg-brand-gray border border-brand-dark rounded-full overflow-hidden mb-1">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 10 }}
          className={`absolute top-0 left-0 h-full ${bgColor}`}
        />
      </div>
      <div className={`text-lg font-black ${color}`}>{current}g</div>
    </div>
  );
}

function ActionCard({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={`${color} brutalist-button p-6 rounded-[28px] text-brand-dark flex flex-col items-center gap-3 active:scale-95`}
    >
      <div className="p-2 bg-white/30 rounded-xl">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

const MealItem: React.FC<{ meal: Meal }> = ({ meal }) => {
  const pPct = Math.round((meal.macros.p / PROTEIN_GOAL) * 100);
  const cPct = Math.round((meal.macros.c / CARB_GOAL) * 100);
  const fPct = Math.round((meal.macros.f / FAT_GOAL) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border-4 border-brand-dark rounded-[24px] p-4 flex flex-col gap-3 shadow-[4px_4px_0px_0px_#2D3436]"
    >
      <div className="flex gap-4 items-center w-full">
        <div className="w-14 h-14 bg-brand-gray border-2 border-brand-dark rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
          {meal.image ? <img src={meal.image} className="w-full h-full object-cover" /> : <Utensils className="text-brand-dark opacity-30 w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-brand-dark truncate leading-tight">{meal.name}</h4>
          <div className="text-[10px] font-black text-brand-dark/40 mt-1">{new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
      <div className="flex items-center justify-between w-full pt-3 border-t-2 border-brand-gray">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase bg-brand-teal/20 text-brand-teal px-2 py-0.5 rounded-md">P: {meal.macros.p}g ({pPct}%)</span>
          <span className="text-[10px] font-black uppercase bg-brand-yellow/30 text-brand-yellow px-2 py-0.5 rounded-md">C: {meal.macros.c}g ({cPct}%)</span>
          <span className="text-[10px] font-black uppercase bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded-md">G: {meal.macros.f}g ({fPct}%)</span>
        </div>
        <span className="text-[12px] font-black text-brand-red flex-shrink-0">{meal.macros.calories} kcal</span>
      </div>
    </motion.div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 flex-1 transition-all ${active ? 'scale-110' : 'opacity-40'}`}>
      <div className={`${active ? 'text-brand-teal' : 'text-white'}`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter text-white">{label}</span>
    </button>
  );
}

function PlanSection() {
  const [cookedWeight, setCookedWeight] = useState('');
  const [rawResult, setRawResult] = useState<number | null>(null);

  const calculateRaw = () => {
    const weight = parseFloat(cookedWeight);
    if (!isNaN(weight)) {
      setRawResult(Math.round(weight * 1.33));
    }
  };

  const planMeals = [
    { name: "1ra Comida", options: ["4 huevos con vegetales (espinaca/brócoli/tomate)", "2 rebanadas pan integral o 1 arepa delgada", "80g yogurt griego + 1/2 scoop whey", "100g frutos rojos", "Suplementos: 500mg Vit C, 1000mg Omega 3, 1 scoop Creatina"], time: "Desayuno", targetTime: "08:00 AM" },
    { name: "2da Comida", options: ["1/2 scoop proteína whey en 200ml líquido", "2 galletas de arroz o 1 manzana verde"], time: "Snack 1", targetTime: "11:00 AM" },
    { name: "3ra Comida", options: ["180g pechuga, res, lomo de cerdo o salmón", "100g arroz/pasta o 150g papa/plátano", "Vegetales verdes al gusto (brócoli, espinaca...)", "Suplementos: 1000mg Omega 3, 1 scoop Glutamina"], time: "Almuerzo", targetTime: "01:00 PM" },
    { name: "5ta Comida", options: ["90g pollo o 1 lata atún", "3 galletas de arroz o 80g papa", "Opción rápida: 1 scoop whey + 40g avena"], time: "Snack 2", targetTime: "05:00 PM" },
    { name: "6ta Comida (Cena)", options: ["180g pechuga, res, lomo o salmón", "4 galletas arroz o 2 tortillas maíz o 100g papa", "Porción libre de vegetales", "1 aguacate hass o 2 cdas aceite oliva extr. virgen"], time: "Cena", targetTime: "08:00 PM" },
    { name: "Pre-sleep", options: ["1 scoop proteína en agua", "1 cda psyllium (fibra)", "2000mg Bisglicinato de magnesio"], time: "Noche", targetTime: "10:30 PM" }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="bg-brand-yellow brutalist-card p-6">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2">Proteína Scaler ⚖️</h3>
        <p className="text-sm font-bold opacity-80 mb-4">Calcula peso en CRUDO a partir de peso COCIDO.</p>
        <div className="bg-white rounded-2xl border-4 border-brand-dark p-4 space-y-4">
           <div className="flex items-center gap-2">
            <input 
              type="number" 
              placeholder="Gramos cocidos..." 
              value={cookedWeight}
              onChange={(e) => setCookedWeight(e.target.value)}
              className="flex-1 min-w-0 h-14 bg-brand-gray border-4 border-brand-dark rounded-xl px-4 font-black text-brand-dark outline-none placeholder:opacity-40"
            />
            <button onClick={calculateRaw} className="h-14 px-6 bg-brand-dark text-white rounded-xl flex items-center justify-center font-black uppercase text-xs active:scale-95 transition-transform border-4 border-brand-dark shadow-[4px_4px_0px_0px_white]">GO</button>
          </div>
          {rawResult && (
             <div className="flex items-center justify-between pt-4 border-t-2 border-brand-gray">
              <span className="text-xs font-black uppercase opacity-40">Estimado Crudo:</span>
              <span className="text-3xl font-black text-brand-red">{rawResult}g</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-brand-purple brutalist-card p-6 text-white">
        <h3 className="text-xl font-black mb-4">¿No Galletas de Arroz? 🚫</h3>
        <p className="text-sm font-bold opacity-80 mb-4">Opciones crujientes permitidas:</p>
        <ul className="space-y-3">
          {[
            { label: "1 Manzana verde", val: "Fresco & Ácido" },
            { label: "80g de Papa vapor", val: "Saciedad Máxima" },
            { label: "2 Tortillas maíz", val: "Opción Versátil" },
            { label: "40g Avena hojuelas", val: "Energía Sostenida" }
          ].map((alt, i) => (
            <li key={i} className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl">
              <div className="w-8 h-8 flex-shrink-0 bg-white text-brand-purple rounded-full flex items-center justify-center font-black text-sm">{i+1}</div>
              <div>
                <div className="font-black text-sm text-white">{alt.label}</div>
                <div className="text-[10px] opacity-80 uppercase font-black tracking-widest text-white/80">{alt.val}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="brutalist-card p-6 bg-white border-4 border-brand-dark">
        <h3 className="text-xl font-black mb-4 text-brand-dark">Tu Plan Nutricional 📋</h3>
        <p className="text-sm font-bold text-brand-dark opacity-60 mb-6">Basado en el documento de Nicolas Rey (2100 kcal, 190g Pro).</p>
        
        <div className="space-y-4">
          {planMeals.map((m, i) => (
            <div key={i} className="border-2 border-brand-dark rounded-2xl overflow-hidden">
              <div className="bg-brand-dark text-white px-4 py-2 flex justify-between items-center">
                <span className="font-black">{m.name}</span>
                <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">{m.time} • {m.targetTime}</span>
              </div>
              <div className="bg-brand-gray p-4">
                <ul className="space-y-2">
                  {m.options.map((opt, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm font-bold text-brand-dark">
                      <span className="text-brand-teal mt-0.5">✓</span>
                      <span>{opt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function HistorySection({ meals }: { meals: Meal[] }) {
  const grouped = meals.reduce((groups: any, meal) => {
    const date = new Date(meal.timestamp).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(meal);
    return groups;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-3xl font-black tracking-tight">El Diario 📖</h2>
      {dates.length === 0 && (
        <div className="brutalist-card p-12 text-center opacity-40">
           <p className="font-black text-lg">Tu historia empieza aquí.</p>
        </div>
      )}
      {dates.map(date => (
        <div key={date} className="space-y-4">
          <div className="bg-brand-dark text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
            {date === new Date().toDateString() ? 'Hoy' : date}
          </div>
          <div className="space-y-4">
            {grouped[date].map((meal: Meal) => (
              <MealItem key={meal.id} meal={meal} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
