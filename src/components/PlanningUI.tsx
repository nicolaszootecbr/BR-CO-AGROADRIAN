import React, { useState, useMemo, useRef } from 'react';
import { Target, Calendar, Info, TrendingUp, AlertTriangle, DollarSign, Lightbulb, ArrowLeft, Download, PieChart, Package, FileText, Loader2 } from 'lucide-react';
import { exportElementToPdf } from '../services/pdfService';
import { Biometrics, Ingredient, Diet } from '../types';
import { calculateRequirements } from '../services/engine';
import { solveDiet } from '../services/solver';

interface PlanningUIProps {
  bio: Biometrics;
  ingredients: Ingredient[];
  diet: Diet;
  onBack?: () => void;
}

interface PhaseData {
  nome: string;
  dias: number;
  diaInicio: number;
  diaFim: number;
  pesoMedio: number;
  reqs: any;
  dietaSugerida: {
    feasible: boolean;
    cost: number;
    items: { ingredientId: string; inclusionMS: number }[];
  };
}

export const PlanningUI: React.FC<PlanningUIProps> = ({ bio, ingredients, diet, onBack }) => {
  const [targetWeight, setTargetWeight] = useState<number>(bio.pc + 15);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const hasAnchorDiet = diet.items.length > 0;
  
  // Calculate total days based on target weight and current GMD
  const weightToGain = targetWeight - bio.pc;
  
  let totalDays = 0;
  if (bio.isPregnant) {
    totalDays = Math.max(0, 150 - bio.dl);
  } else if (bio.isLactating) {
    totalDays = Math.max(0, 120 - bio.dl);
  } else {
    totalDays = bio.gmd > 0 ? Math.max(0, weightToGain / (bio.gmd / 1000)) : 0;
  }

  const getErrorMessage = (faseIndex: number, isPregnant: boolean) => {
    if (isPregnant && (faseIndex === 1 || faseIndex === 2)) {
      return 'FALHA METABÓLICA: A alta exigência fetal exige ingredientes com maior densidade energética. Adicione uma fonte de Amido (Ex: Milho) ou mais Suplemento Mineral na dieta âncora.';
    }
    if (!isPregnant && faseIndex === 2) {
      return 'LIMITE FÍSICO ATINGIDO: O animal não consegue consumir fibra suficiente para bater a energia. Reduza os Volumosos de baixa qualidade (Alto FDN) da dieta âncora.';
    }
    return 'Alerta: A Dieta Âncora atual não suporta as exigências metabólicas desta fase. O animal atingiu o limite de ingestão (FDN) ou requer maior densidade de nutrientes.';
  };

  const cyclePhases = useMemo(() => {
    if (!hasAnchorDiet || totalDays <= 0) return [];

    const anchorIngs = ingredients.filter(ing => diet.items.some(d => d.ingredientId === ing.id));

    const phasesConfig = [
      { nome: 'Fase 1: Adaptação', percent: 0.15 },
      { nome: 'Fase 2: Crescimento', percent: 0.50 },
      { nome: 'Fase 3: Terminação', percent: 0.35 },
    ];

    let currentDay = 1;
    const phases: PhaseData[] = [];

    for (const config of phasesConfig) {
      const diasFase = Math.round(totalDays * config.percent);
      const diaInicio = currentDay;
      const diaFim = currentDay + diasFase - 1;
      
      // Metade exata dos dias daquela fase
      const diaMedio = diaInicio + (diasFase / 2);
      
      let pesoMedioFase = bio.pc;
      let dlMedioFase = bio.dl;

      if (bio.isPregnant || bio.isLactating) {
        dlMedioFase = bio.dl + diaMedio;
      } else {
        pesoMedioFase = bio.pc + (diaMedio * (bio.gmd / 1000));
      }

      const bioFase: Biometrics = {
        ...bio,
        pc: pesoMedioFase,
        dl: dlMedioFase,
      };

      const reqsFase = calculateRequirements(bioFase);
      const solverResult = solveDiet(anchorIngs, reqsFase);

      phases.push({
        nome: config.nome,
        dias: diasFase,
        diaInicio,
        diaFim,
        pesoMedio: pesoMedioFase,
        reqs: reqsFase,
        dietaSugerida: solverResult,
      });

      currentDay = diaFim + 1;
    }

    return phases;
  }, [bio, targetWeight, totalDays, hasAnchorDiet, ingredients, diet.items]);

  const financialSummary = useMemo(() => {
    if (!cyclePhases.length || cyclePhases.some(p => !p.dietaSugerida.feasible)) return null;

    let totalCost = 0;
    const stockMap = new Map<string, { name: string, kgMN: number, cost: number }>();

    cyclePhases.forEach(fase => {
      const dias = fase.dias;
      const custoDiario = fase.dietaSugerida.cost;
      totalCost += custoDiario * dias;

      const cmsFase = fase.reqs.cms; // kg MS/dia

      fase.dietaSugerida.items.forEach(item => {
        if (item.inclusionMS <= 0) return;
        const ing = ingredients.find(ig => ig.id === item.ingredientId);
        if (!ing) return;

        // kg MS do ingrediente por dia
        const kgMS_ing_dia = (item.inclusionMS / 100) * cmsFase;
        // kg MN do ingrediente por dia
        const kgMN_ing_dia = kgMS_ing_dia / (ing.ms / 100);
        // kg MN total na fase
        const kgMN_total_fase = kgMN_ing_dia * dias;
        // Custo total do ingrediente na fase
        const cost_fase = kgMN_total_fase * ing.price;

        if (stockMap.has(ing.id)) {
          const entry = stockMap.get(ing.id)!;
          entry.kgMN += kgMN_total_fase;
          entry.cost += cost_fase;
        } else {
          stockMap.set(ing.id, { name: ing.name, kgMN: kgMN_total_fase, cost: cost_fase });
        }
      });
    });

    const stock = Array.from(stockMap.values()).map(s => ({
      ...s,
      costPercent: totalCost > 0 ? (s.cost / totalCost) * 100 : 0
    })).sort((a, b) => b.kgMN - a.kgMN);
    
    const costPerKgGain = (bio.gmd > 0 && !bio.isPregnant && !bio.isLactating) ? totalCost / weightToGain : null;

    return { totalCost, stock, costPerKgGain };
  }, [cyclePhases, ingredients, bio.gmd, bio.isPregnant, bio.isLactating, weightToGain]);

  const handleGeneratePDF = async () => {
    if (!pdfRef.current) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      await exportElementToPdf(pdfRef.current, {
        filename: `Plano_Confinamento_AgroAdrian_${bio.species}_${dateStr}`,
        orientation: 'landscape',
        format: 'a4',
        margin: 8
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar o PDF. Se o problema persistir, tente novamente ou utilize a impressão direta do navegador.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!hasAnchorDiet) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-zinc-900 rounded-2xl shadow-lg border border-orange-500/50">
        <div className="flex items-start gap-4 text-orange-400">
          <Info size={24} className="shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold mb-2">Dieta Âncora Ausente</h2>
            <p className="text-zinc-300 leading-relaxed">
              Para iniciar a simulação de ciclo, retorne à aba Formulação e crie uma dieta base. 
              O Planejador utilizará seus ingredientes selecionados para escalar as fases de crescimento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 text-zinc-100">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800"
              title="Voltar à Formulação"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <TrendingUp className="text-lime-400" size={24} />
            <h2 className="text-2xl font-bold">Painel de Simulação</h2>
          </div>
        </div>
        
        {financialSummary && (
          <button 
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileText size={18} />
                <span>Baixar Plano de Confinamento - PDF</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Setup de Ciclo */}
        <div className="bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <Target className="text-lime-400" size={20} />
            Setup de Ciclo
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
              <span className="text-sm font-medium text-zinc-400">Peso Atual</span>
              <span className="font-mono text-lg font-bold text-zinc-200">{bio.pc} kg</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
              <span className="text-sm font-medium text-zinc-400">GMD Atual</span>
              <span className="font-mono text-lg font-bold text-zinc-200">{bio.gmd} g/dia</span>
            </div>

            <div className="pt-2">
              {bio.isPregnant || bio.isLactating ? (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    {bio.isPregnant ? 'Dias até o Parto (Automático)' : 'Dias até o fim da Lactação (Automático)'}
                  </label>
                  <input 
                    type="number" 
                    value={Math.ceil(totalDays)}
                    disabled
                    className="w-full p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-500 font-mono text-lg cursor-not-allowed"
                  />
                  <p className="text-xs text-lime-400/80 mt-2 italic">
                    {bio.isPregnant 
                      ? 'Simulação baseada no avanço da curva exponencial de exigência fetal.'
                      : 'Simulação baseada na curva de lactação.'}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Peso Alvo de Abate (kg)</label>
                  <input 
                    type="number" 
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(Number(e.target.value))}
                    className="w-full p-3 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 font-mono text-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resumo de Tempo */}
        <div className="bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-800 flex flex-col justify-center items-center text-center">
          <Calendar className="text-lime-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">Duração Estimada</h3>
          <div className="font-mono text-5xl font-bold text-lime-400 mb-2">
            {Math.ceil(totalDays)} <span className="text-2xl text-zinc-500">dias</span>
          </div>
          <p className="text-sm text-zinc-500 mt-4">
            {bio.isPregnant || bio.isLactating 
              ? `Baseado no dia atual (${bio.dl} dias).`
              : `Baseado no GMD atual de ${bio.gmd} g/dia para ganhar ${(weightToGain).toFixed(1)} kg.`}
          </p>
        </div>
      </div>

      {/* Fases do Ciclo */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
          <Target className="text-lime-400" size={24} />
          Projeção de Fases
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cyclePhases.map((fase, index) => (
            <div 
              key={index}
              className={`p-6 rounded-2xl shadow-lg border flex flex-col h-full ${
                fase.dietaSugerida.feasible 
                  ? 'bg-zinc-900 border-zinc-800' 
                  : 'bg-orange-950/30 border-orange-500/50'
              }`}
            >
              <div className="mb-4">
                <h4 className={`text-lg font-bold ${fase.dietaSugerida.feasible ? 'text-zinc-100' : 'text-orange-400'}`}>
                  {fase.nome}
                </h4>
                <p className={`text-sm mt-1 ${fase.dietaSugerida.feasible ? 'text-zinc-400' : 'text-orange-500/80'}`}>
                  Dias {fase.diaInicio} a {fase.diaFim} ({fase.dias} dias)
                </p>
              </div>

              <div className={`flex justify-between items-center p-3 rounded-xl border mb-4 ${
                fase.dietaSugerida.feasible 
                  ? 'bg-zinc-950 border-zinc-800/50' 
                  : 'bg-orange-950/50 border-orange-500/30'
              }`}>
                <span className={`text-sm font-medium ${fase.dietaSugerida.feasible ? 'text-zinc-400' : 'text-orange-300'}`}>
                  Peso Médio
                </span>
                <span className={`font-mono text-lg font-bold ${fase.dietaSugerida.feasible ? 'text-zinc-200' : 'text-orange-200'}`}>
                  {fase.pesoMedio.toFixed(1)} kg
                </span>
              </div>

              <div className="flex-grow">
                {!fase.dietaSugerida.feasible ? (
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex items-start gap-3 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 mb-4">
                      <Lightbulb className="text-orange-400 shrink-0 mt-0.5" size={20} />
                      <p className="text-sm text-orange-300 leading-relaxed">
                        {getErrorMessage(index, bio.isPregnant)}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        // Find the tab button and click it to switch to Formulation
                        const formTab = document.querySelector('button[data-tab="formulation"]') as HTMLButtonElement;
                        if (formTab) formTab.click();
                      }}
                      className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mt-auto"
                    >
                      <ArrowLeft size={18} />
                      Voltar para Dieta
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">Receita Sugerida</h5>
                    <ul className="space-y-2">
                      {fase.dietaSugerida.items
                        .filter(item => item.inclusionMS > 0)
                        .map((item, i) => {
                          const ing = ingredients.find(ig => ig.id === item.ingredientId);
                          return (
                            <li key={i} className="flex justify-between items-center text-sm">
                              <span className="text-zinc-400 truncate pr-2">{ing?.name || item.ingredientId}</span>
                              <span className="font-mono font-medium text-zinc-200">{item.inclusionMS.toFixed(2)}%</span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </div>

              {fase.dietaSugerida.feasible && (
                <div className="mt-6 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <DollarSign size={16} />
                    <span className="text-sm font-medium">Custo Diário</span>
                  </div>
                  <span className="font-mono text-lg font-bold text-lime-400">
                    R$ {fase.dietaSugerida.cost.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Financial Summary UI */}
      {financialSummary && (
        <div className="mt-8 bg-zinc-900 p-8 rounded-2xl shadow-lg border border-zinc-800">
          <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <PieChart className="text-blue-400" size={24} />
            Viabilidade Financeira do Lote
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800/50">
                <p className="text-sm font-medium text-zinc-400 mb-1">Custo Total por Animal</p>
                <p className="font-mono text-4xl font-bold text-lime-400">
                  R$ {financialSummary.totalCost.toFixed(2)}
                </p>
              </div>
              
              {financialSummary.costPerKgGain !== null && (
                <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800/50">
                  <p className="text-sm font-medium text-zinc-400 mb-1">Custo por kg de Ganho</p>
                  <p className="font-mono text-3xl font-bold text-blue-400">
                    R$ {financialSummary.costPerKgGain.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800/50">
              <h4 className="text-md font-bold text-zinc-200 mb-4 flex items-center gap-2">
                <Package className="text-zinc-400" size={18} />
                Previsão de Estoque (Por Animal)
              </h4>
              <ul className="space-y-3">
                {financialSummary.stock.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                    <span className="text-sm text-zinc-400">{item.name}</span>
                    <span className="font-mono font-medium text-zinc-200">{item.kgMN.toFixed(1)} kg MN</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen PDF Template Container */}
      <div 
        className="fixed top-0 left-0 z-[-9999] opacity-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
        style={{ width: '277mm' }}
      >
        <div 
          id="planning-pdf-report" 
          ref={pdfRef} 
          className="bg-white text-black font-sans"
          style={{ width: '277mm', padding: '10mm', boxSizing: 'border-box' }}
        >
          {/* Page 1: Resumo Executivo e Financeiro */}
          <div className="mb-12">
            <div className="border-b-2 border-black pb-4 mb-6 text-center">
              <h1 className="text-2xl font-bold uppercase tracking-wider font-serif">BR-CO AgroAdrian</h1>
              <h2 className="text-xl text-gray-800 mt-1">Planejamento Estratégico de Confinamento</h2>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold border-b border-gray-200 pb-1 mb-3 uppercase text-gray-800">Dados do Lote</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <p><strong>Espécie/Categoria:</strong> {bio.species} - {bio.sexClass}</p>
                <p><strong>GMD Projetado:</strong> {bio.gmd} g/dia</p>
                <p><strong>Peso Inicial:</strong> {bio.pc} kg</p>
                <p><strong>{bio.isPregnant || bio.isLactating ? 'Dias Restantes:' : 'Peso Alvo:'}</strong> {bio.isPregnant || bio.isLactating ? Math.ceil(totalDays) + ' dias' : targetWeight + ' kg'}</p>
                <p><strong>Duração Estimada:</strong> {Math.ceil(totalDays)} dias</p>
              </div>
            </div>

            {financialSummary && (
              <div className="mb-8">
                <h3 className="text-lg font-bold border-b border-gray-200 pb-1 mb-3 uppercase text-gray-800">Resumo Financeiro</h3>
                <div className="grid grid-cols-2 gap-8 text-sm mb-6">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-500 mb-1 font-medium">Custo Total por Animal</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {financialSummary.totalCost.toFixed(2)}</p>
                  </div>
                  {financialSummary.costPerKgGain !== null && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-500 mb-1 font-medium">Custo por kg de Ganho</p>
                      <p className="text-2xl font-bold text-gray-900">R$ {financialSummary.costPerKgGain.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                <h4 className="font-bold mb-3 text-gray-800">Lista de Compras (Estoque MN por Animal)</h4>
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-left p-2 text-[10px]">Ingrediente</th>
                      <th className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-right p-2 text-[10px]">Volume (kg MN)</th>
                      <th className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-right p-2 text-[10px]">Participação no Custo (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialSummary.stock.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 text-xs text-gray-700 truncate" title={item.name}>{item.name}</td>
                        <td className="p-2 text-right text-xs text-gray-700">{item.kgMN.toFixed(1)}</td>
                        <td className="p-2 text-right text-xs text-gray-700">{item.costPercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Page 2: Balanço Nutricional por Fases */}
          <div>
            <h3 className="text-xl font-bold border-b-2 border-gray-800 pb-2 mb-6 uppercase text-center text-gray-900">Balanço Nutricional por Fases</h3>
            
            {cyclePhases.map((fase, idx) => {
              // Calculate supplied nutrients for the phase
              let ndtTotal = 0, pbTotal = 0, caTotal = 0, pTotal = 0, fdnTotal = 0;
              const cms = fase.reqs.cms;

              fase.dietaSugerida.items.forEach(item => {
                const ing = ingredients.find(ig => ig.id === item.ingredientId);
                if (!ing) return;
                const kgMS = (item.inclusionMS / 100) * cms;
                ndtTotal += kgMS * (ing.ndt / 100) * 1000;
                pbTotal += kgMS * (ing.pb / 100) * 1000;
                caTotal += kgMS * (ing.ca / 100) * 1000;
                pTotal += kgMS * (ing.p / 100) * 1000;
                fdnTotal += kgMS * (ing.fdn / 100);
              });

              return (
                <div key={idx} className="mb-8 break-inside-avoid">
                  <h4 className="text-base font-bold mb-3 border-b border-gray-200 pb-2 text-gray-800">
                    {fase.nome} - Peso Médio: {fase.pesoMedio.toFixed(1)} kg (Dias {fase.diaInicio} a {fase.diaFim})
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-xs mb-2 text-gray-600 uppercase tracking-wider">Receita (% MS)</h5>
                      <table className="w-full table-fixed border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-left px-2 py-1 text-[10px]">Ingrediente</th>
                            <th className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-right px-2 py-1 text-[10px]">Inclusão</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fase.dietaSugerida.items.filter(i => i.inclusionMS > 0).map((item, i) => {
                            const ing = ingredients.find(ig => ig.id === item.ingredientId);
                            return (
                              <tr key={i} className="border-b border-gray-200">
                                <td className="px-2 py-1 text-[10px] text-gray-700 truncate" title={ing?.name}>{ing?.name}</td>
                                <td className="px-2 py-1 text-right text-[10px] text-gray-700">{item.inclusionMS.toFixed(2)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold text-xs mb-2 text-gray-600 uppercase tracking-wider">Balanço Reduzido (Oferta vs Meta)</h5>
                      <table className="w-full table-fixed border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-left px-2 py-1 text-[10px]">Nutriente</th>
                            <th className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-right px-2 py-1 text-[10px]">Oferta</th>
                            <th className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-right px-2 py-1 text-[10px]">Meta</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1 text-[10px] text-gray-700">CMS (kg/dia)</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{cms.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{fase.reqs.cms.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1 text-[10px] text-gray-700">NDT (g/dia)</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{ndtTotal.toFixed(0)}</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{fase.reqs.ndt.toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1 text-[10px] text-gray-700">PB (g/dia)</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{pbTotal.toFixed(0)}</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{fase.reqs.pb.toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1 text-[10px] text-gray-700">Ca (g/dia)</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{caTotal.toFixed(1)}</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{fase.reqs.ca.toFixed(1)}</td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1 text-[10px] text-gray-700">P (g/dia)</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{pTotal.toFixed(1)}</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{fase.reqs.p.toFixed(1)}</td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1 text-[10px] text-gray-700">FDN (kg/dia)</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{fdnTotal.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-700">{fase.reqs.trace?.cfdnMax ? fase.reqs.trace.cfdnMax.toFixed(2) : '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-600 flex flex-col items-center justify-center break-inside-avoid">
            <p className="font-bold text-gray-800 text-xs">Nicolas Adrian Viana de Oliveira</p>
            <p>Graduando em Zootecnia - Universidade Federal da Bahia (UFBA)</p>
            <p className="mt-1">WhatsApp: (71) 9-8844-1004 | E-mail: nicolaszootec@gmail.com</p>
            <p className="mt-2 text-[8px] text-gray-400">Tecnologia de Nutrição de Precisão - Gerado por BR-CO AgroAdrian</p>
          </div>
        </div>
      </div>
    </div>
  );
};
