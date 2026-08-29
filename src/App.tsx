import React, { useState, useEffect } from 'react';
import { SetupFunnel } from './components/SetupFunnel';
import { FormulationUI } from './components/FormulationUI';
import { IngredientDB } from './components/IngredientDB';
import { PlanningUI } from './components/PlanningUI';
import { Biometrics, Ingredient, Diet } from './types';
import { getIngredients, initDB } from './services/db';
import { Leaf, Database, Calculator, Settings, TrendingUp } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'setup' | 'formulation' | 'planning' | 'db'>('setup');
  const [bio, setBio] = useState<Biometrics>({
    species: 'Ovino',
    biotype: 'Corte',
    sexClass: 'Macho Inteiro',
    pc: 30,
    gmd: 200,
    dl: 0,
    isPregnant: false,
    isLactating: false
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [diet, setDiet] = useState<Diet>({ items: [] });

  useEffect(() => {
    const loadData = async () => {
      await initDB();
      const data = await getIngredients();
      setIngredients(data);
    };
    loadData();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20 sm:pb-0">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lime-400">
            <Leaf size={24} />
            <h1 className="text-xl font-bold tracking-tight">BR-CO AgroAdrian</h1>
          </div>
          
          <nav className="flex gap-2">
            <button 
              onClick={() => setActiveTab('setup')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'setup' ? 'bg-lime-400/10 text-lime-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
            >
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <span>Setup</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('formulation')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'formulation' ? 'bg-lime-400/10 text-lime-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
            >
              <div className="flex items-center gap-2">
                <Calculator size={18} />
                <span>Formulação</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('planning')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'planning' ? 'bg-lime-400/10 text-lime-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={18} />
                <span>Planejamento</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('db')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'db' ? 'bg-lime-400/10 text-lime-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
            >
              <div className="flex items-center gap-2">
                <Database size={18} />
                <span>Banco de Dados</span>
              </div>
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10 sm:hidden">
        <div className="px-4 h-14 flex items-center justify-center">
          <div className="flex items-center gap-2 text-lime-400">
            <Leaf size={20} />
            <h1 className="text-lg font-bold tracking-tight">BR-CO AgroAdrian</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {activeTab === 'setup' && (
          <SetupFunnel 
            bio={bio} 
            setBio={setBio} 
            onNext={() => setActiveTab('formulation')} 
          />
        )}
        
        {activeTab === 'formulation' && (
          <FormulationUI 
            bio={bio} 
            ingredients={ingredients}
            diet={diet}
            setDiet={setDiet}
            onBack={() => setActiveTab('setup')}
          />
        )}

        {activeTab === 'planning' && (
          <PlanningUI 
            bio={bio} 
            ingredients={ingredients} 
            diet={diet}
            onBack={() => setActiveTab('formulation')}
          />
        )}
        
        {activeTab === 'db' && (
          <IngredientDB />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around items-center h-16 z-50">
        <button 
          onClick={() => setActiveTab('setup')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'setup' ? 'text-lime-400' : 'text-zinc-500'}`}
        >
          <Settings size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Setup</span>
        </button>
        <button 
          onClick={() => setActiveTab('formulation')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'formulation' ? 'text-lime-400' : 'text-zinc-500'}`}
        >
          <Calculator size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Formulação</span>
        </button>
        <button 
          onClick={() => setActiveTab('planning')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'planning' ? 'text-lime-400' : 'text-zinc-500'}`}
        >
          <TrendingUp size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Planejamento</span>
        </button>
        <button 
          onClick={() => setActiveTab('db')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'db' ? 'text-lime-400' : 'text-zinc-500'}`}
        >
          <Database size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Banco</span>
        </button>
      </nav>
    </div>
  );
}
