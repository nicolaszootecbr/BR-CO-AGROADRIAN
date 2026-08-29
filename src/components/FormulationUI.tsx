import React, { useState, useMemo, useRef } from 'react';
import { Biometrics, Diet, Ingredient, Requirements, DietAnalysis } from '../types';
import { calculateRequirements, analyzeDiet } from '../services/engine';
import { solveDiet } from '../services/solver';
import { AlertCircle, CheckCircle2, AlertTriangle, Calculator, FileText, X, Loader2, ArrowLeft } from 'lucide-react';
import { AuditLaudo } from './AuditLaudo';
import { exportElementToPdf } from '../services/pdfService';

interface FormulationUIProps {
  bio: Biometrics;
  ingredients: Ingredient[];
  diet: Diet;
  setDiet: React.Dispatch<React.SetStateAction<Diet>>;
  onBack: () => void;
}

export const FormulationUI: React.FC<FormulationUIProps> = ({ bio, ingredients, diet, setDiet, onBack }) => {
  const [viewMN, setViewMN] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const laudoRef = useRef<HTMLDivElement>(null);

  // Derivação de estado síncrona: garante que reqs e analysis estejam sempre atualizados com a bio atual
  const reqs = useMemo(() => calculateRequirements(bio), [bio]);
  const analysis = useMemo(() => analyzeDiet(diet, ingredients, bio, reqs), [diet, ingredients, bio, reqs]);

  const availableIngredients = useMemo(() => {
    return ingredients.filter(ing => {
      // 1. Remove already added ingredients
      if (diet.items.some(i => i.ingredientId === ing.id)) return false;
      
      // 2. Species specific filtering
      if (bio.species === 'Ovino' && (ing.id === 'M06' || ing.name.toLowerCase().includes('caprinofós'))) return false;
      if (bio.species === 'Caprino' && (ing.id === 'M05' || ing.name.toLowerCase().includes('ovinofós'))) return false;
      
      return true;
    });
  }, [ingredients, diet.items, bio.species]);

  const handleAddIngredient = (id: string) => {
    if (!diet.items.find(i => i.ingredientId === id)) {
      setDiet(prev => ({ items: [...prev.items, { ingredientId: id, inclusionMS: 0 }] }));
    }
  };

  const handleRemoveIngredient = (id: string) => {
    setDiet(prev => ({ items: prev.items.filter(i => i.ingredientId !== id) }));
  };

  const handleUpdateInclusion = (id: string, value: number) => {
    // Limita a 2 casas decimais no momento do input
    const roundedValue = Math.round(value * 100) / 100;
    setDiet(prev => ({
      items: prev.items.map(i => i.ingredientId === id ? { ...i, inclusionMS: roundedValue } : i)
    }));
  };

  const handleDownloadPDF = async () => {
    if (!laudoRef.current) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      await exportElementToPdf(laudoRef.current, {
        filename: `Laudo_Tecnico_AgroAdrian_${bio.species}_${dateStr}`,
        orientation: 'portrait',
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
  const handleSolve = () => {
    if (!reqs) return;
    
    const selectedIngs = ingredients.filter(ing => diet.items.some(d => d.ingredientId === ing.id));
    if (selectedIngs.length === 0) {
      alert('Adicione pelo menos 1 volumoso e 1 concentrado na lista antes de otimizar.');
      return;
    }

    try {
      const result = solveDiet(selectedIngs, reqs);
      if (result.feasible) {
        setDiet({ items: result.items });
      } else {
        alert('Não foi possível encontrar uma dieta viável com os ingredientes atuais e restrições.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao otimizar dieta.');
    }
  };

  if (!reqs || !analysis) return <div className="text-zinc-400">Carregando...</div>;

  const totalInclusion = diet.items.reduce((sum, item) => sum + item.inclusionMS, 0);
  const isDietValid = Math.abs(totalInclusion - 100) <= 0.01;

  const BulletBar = ({ label, current, target, unit, tooltip, type = 'default', minZone, maxZone }: any) => {
    const safeCurrent = current ?? 0;
    const safeTarget = target ?? 0;
    const maxLimit = safeTarget * 1.10;
    
    const scaleMax = Math.max(safeTarget * 1.2, safeCurrent * 1.1, maxZone ? maxZone * 1.2 : 0);
    
    let pctCurrent = scaleMax > 0 ? (safeCurrent / scaleMax) * 100 : 0;
    let pctTarget = scaleMax > 0 ? (safeTarget / scaleMax) * 100 : 0;
    let pctMaxLimit = scaleMax > 0 ? (maxLimit / scaleMax) * 100 : 0;

    let color = 'bg-lime-500';
    let statusText = '';

    if (type === 'danger-limit') {
      if (safeCurrent <= safeTarget) {
        color = 'bg-lime-500';
        statusText = 'SEGURO';
      } else {
        color = 'bg-red-500';
        statusText = 'ACIMA DO LIMITE';
      }
    } else if (type === 'safety-zone') {
      pctTarget = scaleMax > 0 ? (minZone / scaleMax) * 100 : 0;
      pctMaxLimit = scaleMax > 0 ? (maxZone / scaleMax) * 100 : 0;
      if (safeCurrent < minZone) {
        color = 'bg-cyan-500';
        statusText = 'Abaixo';
      } else if (safeCurrent > maxZone) {
        color = 'bg-orange-500';
        statusText = 'Acima';
      } else {
        color = 'bg-lime-500';
        statusText = 'Ideal';
      }
    } else {
      if (safeCurrent < safeTarget * 0.95) {
        color = 'bg-cyan-500';
        statusText = 'Abaixo';
      } else if (safeCurrent > maxLimit) {
        color = 'bg-orange-500';
        statusText = 'Acima';
      } else {
        color = 'bg-lime-500';
        statusText = 'Ideal';
      }
    }

    return (
      <div className="mb-4 group relative">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs text-zinc-400 border-b border-dashed border-zinc-700 cursor-help">{label}</span>
          <span className="flex items-center gap-2">
            {statusText && <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${color.replace('bg-', 'text-').replace('500', '400')} bg-zinc-800/50`}>{statusText}</span>}
            <span className="font-mono text-sm text-zinc-100">{safeCurrent.toFixed(2)}</span>
            {safeTarget > 0 && <span className="font-mono text-xs text-zinc-500">/ {safeTarget.toFixed(2)} {unit}</span>}
          </span>
        </div>
        <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className={`absolute top-0 left-0 h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(pctCurrent, 100)}%` }} />
          {safeTarget > 0 && type !== 'safety-zone' && (
            <>
              <div className="absolute top-0 bottom-0 w-0.5 bg-zinc-400 z-10" style={{ left: `${pctTarget}%` }} title="Meta" />
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-10" style={{ left: `${pctMaxLimit}%` }} title="Máximo (Meta + 10%)" />
            </>
          )}
          {type === 'safety-zone' && (
            <>
              <div className="absolute top-0 bottom-0 w-0.5 bg-zinc-400 z-10" style={{ left: `${pctTarget}%` }} title="Mínimo" />
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-10" style={{ left: `${pctMaxLimit}%` }} title="Máximo" />
            </>
          )}
        </div>
        {tooltip && (
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-zinc-800 text-xs text-zinc-200 rounded shadow-xl border border-zinc-700 z-20">
            {tooltip}
          </div>
        )}
      </div>
    );
  };

  const AlertGauge = ({ label, current, limit, unit, tooltip }: any) => {
    const isDanger = current > limit;
    return (
      <div className={`p-3 rounded-xl border mb-4 ${isDanger ? 'bg-red-500/10 border-red-500/50' : 'bg-zinc-800/50 border-zinc-700/50'} relative group`}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-zinc-400 border-b border-dashed border-zinc-700 cursor-help">{label}</span>
          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${isDanger ? 'text-red-400 bg-red-500/20' : 'text-lime-400 bg-lime-500/20'}`}>
            {isDanger ? 'PERIGO' : 'SEGURO'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`font-mono text-lg ${isDanger ? 'text-red-400' : 'text-zinc-100'}`}>{current.toFixed(2)}</span>
          <span className="font-mono text-xs text-zinc-500">/ Máx {limit.toFixed(2)} {unit}</span>
        </div>
        {tooltip && (
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-zinc-800 text-xs text-zinc-200 rounded shadow-xl border border-zinc-700 z-20">
            {tooltip}
          </div>
        )}
      </div>
    );
  };

  // Cálculos de Tradução de Escala Nutricional
  const ofertaCMS = (totalInclusion / 100) * reqs.cms;
  const metaCMS = reqs.cms;

  const ofertaEL = analysis.elFornecidaMcal;
  const metaEL = reqs.elm + reqs.elg + reqs.elgest + reqs.ellac;

  const ofertaPB = (analysis.pbTotal / 100) * ofertaCMS * 1000;
  const metaPB = reqs.pb;

  const ofertaNDT = (analysis.ndtTotal / 100) * ofertaCMS * 1000;
  const metaNDT = reqs.ndt;

  const ofertaCa = analysis.caIngeridoG;
  const metaCa = reqs.ca;

  const ofertaP = analysis.pIngeridoG;
  const metaP = reqs.p;

  const ofertaMg = analysis.mgIngeridoG;
  const metaMg = reqs.mg;

  const ofertaNa = analysis.naIngeridoG;
  const metaNa = reqs.na;

  const ofertaK = analysis.kIngeridoG;
  const metaK = reqs.k;

  const ofertaFDN = analysis.fdnTotal;
  const cfdnMaxPct = 3.155 * Math.pow(bio.pc, -0.3190);
  const cfdnMaxKg = (cfdnMaxPct / 100) * bio.pc;

  const ofertaFDNKg = (analysis.fdnTotal / 100) * ofertaCMS;
  const metaFDNKg = cfdnMaxKg;
  const ocupacaoPct = metaFDNKg > 0 ? (ofertaFDNKg / metaFDNKg) * 100 : 0;
  
  let ocupacaoColor = 'bg-lime-500';
  let ocupacaoText = 'SEGURO';
  if (ocupacaoPct > 100) {
    ocupacaoColor = 'bg-red-500';
    ocupacaoText = 'RÚMEN EMPACHADO / BLOQUEIO FÍSICO';
  } else if (ocupacaoPct >= 90) {
    ocupacaoColor = 'bg-orange-500';
    ocupacaoText = 'ALERTA';
  }

  const ofertaZn = analysis.znIngeridoMg;
  const metaZn = 35 * reqs.cms; // Estimativa base

  const ofertaCu = analysis.cuIngeridoMg;
  const metaCu = 15 * reqs.cms; // Limite toxicidade ovinos convertido para mg/dia

  const ofertaEE = analysis.eeTotal;
  const metaEE = 7; // Limite 7%

  const ofertaUreia = analysis.ureaTotal;
  let metaUreia = 1.0; // Limite 1% MS
  if (bio.isPregnant && bio.dl > 120) {
    metaUreia = 0.8; // Limite mais rígido no terço final da gestação
  }

  // Sincronismo Ruminal
  const cndt = (analysis.ndtTotal / 100) * ofertaCMS;
  const pbmic = 12.7311 + (59.2956 * cndt); // g
  const pdrFornecida = (analysis.pdrTotal / 100) * ofertaCMS * 1000; // g
  const balancoPDR = pdrFornecida - pbmic;
  const statusPDR = balancoPDR < 0 ? 'Fome Microbiana' : 'Desperdício de Nitrogênio';

  const relacaoCaP = ofertaP > 0 ? (ofertaCa / ofertaP).toFixed(2) : '0.00';

  // Receita de Bateia (100kg MN)
  const calculateBateia = () => {
    let totalMN = 0;
    const itemsMN = diet.items.map(item => {
      const ing = ingredients.find(i => i.id === item.ingredientId);
      if (!ing) return null;
      const mnValue = (item.inclusionMS / 100) / (ing.ms / 100);
      totalMN += mnValue;
      return { ing, mnValue };
    }).filter(Boolean);

    if (totalMN === 0) return [];

    return itemsMN.map(item => ({
      name: item!.ing.name,
      kg100: (item!.mnValue / totalMN) * 100
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Esquerda: Painel de Inclusão */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900 p-4 rounded-2xl shadow-lg border border-zinc-800 gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800"
                title="Voltar ao Setup"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Formulação</h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                {bio.species} • {bio.biotype} • {bio.pc}kg • {bio.gmd}g/dia
              </p>
              {bio.sexClass === 'Fêmea' && (bio.isPregnant || bio.isLactating) && (
                <p className="text-xs text-lime-400 mt-1 font-medium">
                  Prioridade Reprodutiva Ativada
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onClick={() => setViewMN(!viewMN)} className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700">
              Ver em {viewMN ? 'MS (%)' : 'MN (kg)'}
            </button>
          </div>
        </div>

        {/* Action Bar - Clean 3-button grid visible on both PC and mobile */}
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={handleSolve} 
            className="px-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-lime-400 font-semibold rounded-xl border border-zinc-700 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors text-xs text-center"
            title="Otimizar dieta pelo Solver"
          >
            <Calculator size={16} className="shrink-0" />
            <span className="truncate">Otimizar</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="px-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl border border-zinc-700 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors text-xs text-center"
            title="Ver proporções da Bateia em 100kg MN"
          >
            <FileText size={16} className="shrink-0 text-zinc-400" />
            <span className="truncate">Receita</span>
          </button>
          <button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPDF}
            className="px-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl border border-blue-500 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors text-xs text-center shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar Laudo Técnico em PDF"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span className="truncate">Gerando...</span>
              </>
            ) : (
              <>
                <FileText size={16} className="shrink-0" />
                <span className="truncate">Laudo PDF</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-zinc-900 p-4 rounded-2xl shadow-lg border border-zinc-800">
          <div className="mb-4">
            <select 
              onChange={(e) => handleAddIngredient(e.target.value)}
              className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              value=""
            >
              <option value="" disabled>+ Adicionar Ingrediente</option>
              {availableIngredients.map(ing => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} (R$ {(ing?.price ?? 0).toFixed(2)}/kg)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {diet.items.map(item => {
              const ing = ingredients.find(i => i.id === item.ingredientId);
              if (!ing) return null;
              
              const mnValue = (item.inclusionMS / 100) * reqs.cms / (ing.ms / 100);

              return (
                <div key={item.ingredientId} className="flex items-center gap-4 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="flex-1">
                    <div className="font-medium text-zinc-200">{ing.name}</div>
                    <div className="text-xs text-zinc-500">MS: {ing.ms}% | R$ {(ing?.price ?? 0).toFixed(2)}/kg</div>
                  </div>
                  <div className="w-32">
                    {viewMN ? (
                      <div className="text-right font-mono text-sm text-zinc-300">{(mnValue ?? 0).toFixed(2)} kg MN</div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          max="100"
                          value={Number((item?.inclusionMS ?? 0).toFixed(2))}
                          onChange={(e) => handleUpdateInclusion(item.ingredientId, Number(e.target.value))}
                          className="w-20 p-1 text-right bg-zinc-900 border border-zinc-700 rounded text-zinc-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                        />
                        <span className="text-sm text-zinc-500">%</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleRemoveIngredient(item.ingredientId)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
            <span className="font-medium text-zinc-400">Total Inclusão (MS):</span>
            <span className={`font-bold ${totalInclusion === 100 ? 'text-lime-400' : 'text-orange-500'}`}>
              {(totalInclusion ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Direita: Dashboard de Atendimento */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-zinc-950 p-6 rounded-2xl shadow-lg border border-zinc-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zinc-100">Dashboard Nutricional</h3>
            <div className="flex gap-4">
              <div className="flex flex-col items-end">
                <span className="text-xs text-zinc-500">Custo / Cabeça / Dia</span>
                <span className="font-mono text-lg font-bold text-lime-400">R$ {(analysis?.costPerHeadDay ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-zinc-500">Custo / kg MS</span>
                <span className="font-mono text-lg font-bold text-zinc-300">R$ {(analysis?.costPerKgMS ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {!isDietValid && (
            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3 text-orange-400 text-sm">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <p>Aguardando fechamento de 100% da inclusão para validar o balanço.</p>
            </div>
          )}

          <div className={`transition-opacity duration-300 ${!isDietValid ? 'opacity-50 pointer-events-none' : ''}`}>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card Energia */}
              <div className="bg-zinc-900 p-5 rounded-xl shadow-lg border border-zinc-800">
                <h4 className="text-xs font-bold text-lime-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400"></span>
                  Energia e Consumo
                </h4>
                <BulletBar label="Consumo (CMS)" current={ofertaCMS} target={metaCMS} unit="kg" tooltip="Consumo de Matéria Seca: Base para ingestão de todos os nutrientes." />
                <BulletBar label="Energia Líquida (EL)" current={ofertaEL} target={metaEL} unit="Mcal" tooltip="Energia Líquida total (Mantença + Ganho). Calculada a partir da EM da dieta e eficiências km e kg." />
                
                <details className="mt-4 group">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors list-none flex items-center gap-2 select-none">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    Métricas Secundárias
                  </summary>
                  <div className="pt-4 space-y-2">
                    <BulletBar label="NDT" current={ofertaNDT} target={metaNDT} unit="g" tooltip="Nutrientes Digestíveis Totais: Estimativa de digestibilidade e energia." />
                    <div className="mb-4 group relative">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs text-zinc-400 border-b border-dashed border-zinc-700 cursor-help">Espaço Ruminal Ocupado (Limite FDN)</span>
                        <span className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${ocupacaoColor.replace('bg-', 'text-').replace('500', '400')} bg-zinc-800/50`}>{ocupacaoText}</span>
                          <span className="font-mono text-sm text-zinc-100">{ocupacaoPct.toFixed(1)}%</span>
                        </span>
                      </div>
                      <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`absolute top-0 left-0 h-full ${ocupacaoColor} transition-all duration-500`} style={{ width: `${Math.min(ocupacaoPct, 100)}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-10" style={{ left: `100%` }} title="Máximo (100%)" />
                      </div>
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-zinc-800 text-xs text-zinc-200 rounded shadow-xl border border-zinc-700 z-20">
                        Preenchimento do rúmen em relação ao limite físico (CFDN_max). Se ultrapassar 100%, o animal não consumirá toda a dieta.
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              {/* Card Proteína */}
              <div className="bg-zinc-900 p-5 rounded-xl shadow-lg border border-zinc-800">
                <h4 className="text-xs font-bold text-lime-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400"></span>
                  Metabolismo Proteico
                </h4>
                <BulletBar label="Proteína Bruta (PB)" current={ofertaPB} target={metaPB} unit="g" tooltip="Proteína Bruta: Essencial para manutenção e crescimento. Níveis abaixo de 11% reduzem drasticamente a digestibilidade da fibra." />
                <AlertGauge label="Ureia (NNP)" current={ofertaUreia} limit={metaUreia} unit="%" tooltip="Nitrogênio Não Proteico: Risco de intoxicação se ultrapassar 1% da Matéria Seca total da dieta." />
                
                <details className="mt-4 group">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors list-none flex items-center gap-2 select-none">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    Sincronismo Ruminal
                  </summary>
                  <div className="pt-4 space-y-2">
                    <div className="mb-2">
                      <div className="text-xs text-zinc-400 mb-1">Capacidade de Síntese Microbiana: <span className="font-mono text-zinc-100">{(pbmic ?? 0).toFixed(0)} g</span></div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-zinc-400 border-b border-dashed border-zinc-700 cursor-help" title="Proteína Degradável no Rúmen fornecida vs PBmic">PDR Fornecida</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${pdrFornecida > pbmic ? 'text-orange-400 bg-orange-500/20' : 'text-cyan-400 bg-cyan-500/20'}`}>
                          {pdrFornecida > pbmic ? 'DESPERDÍCIO DE N' : 'FOME MICROBIANA'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-sm text-zinc-100">{(pdrFornecida ?? 0).toFixed(0)}</span>
                        <span className="font-mono text-xs text-zinc-500">/ {pbmic.toFixed(0)} g</span>
                      </div>
                      <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden mt-1">
                        <div className={`absolute top-0 left-0 h-full ${pdrFornecida > pbmic ? 'bg-orange-500' : 'bg-cyan-500'} transition-all duration-500`} style={{ width: `${Math.min((pdrFornecida / (pbmic * 1.2)) * 100, 100)}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-zinc-400 z-10" style={{ left: `${(pbmic / (pbmic * 1.2)) * 100}%` }} title="Meta (PBmic)" />
                      </div>
                    </div>
                    {reqs.trace?.pm && (
                      <BulletBar label="Proteína Metabolizável (PM)" current={analysis.pmFornecida} target={reqs.trace.pm} unit="g" tooltip="Exigência de Proteína Metabolizável." />
                    )}
                  </div>
                </details>
              </div>

              {/* Card Minerais */}
              <div className="bg-zinc-900 p-5 rounded-xl shadow-lg border border-zinc-800">
                <h4 className="text-xs font-bold text-lime-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400"></span>
                  Minerais e Saúde
                </h4>
                <BulletBar label={`Cálcio (Ca:P = ${relacaoCaP}:1)`} current={ofertaCa} target={metaCa} unit="g" tooltip="Cálcio: Formação óssea e contração muscular. A proporção ideal de Ca:P é entre 1.5:1 e 2:1 para evitar urolitíase (cálculos renais)." />
                <BulletBar label="Fósforo" current={ofertaP} target={metaP} unit="g" tooltip="Fósforo: Metabolismo energético e ósseo." />
                
                <details className="mt-4 group">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors list-none flex items-center gap-2 select-none">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    Microminerais e Eletrólitos
                  </summary>
                  <div className="pt-4 space-y-2">
                    <BulletBar label="Magnésio" current={ofertaMg} target={metaMg} unit="g" tooltip="Magnésio: Função nervosa e muscular." />
                    <BulletBar label="Sódio" current={ofertaNa} target={metaNa} unit="g" tooltip="Sódio: Equilíbrio osmótico e absorção de nutrientes." />
                    <BulletBar label="Potássio" current={ofertaK} target={metaK} unit="g" tooltip="Potássio: Equilíbrio ácido-base e função muscular." />
                    <BulletBar label="Zinco" current={ofertaZn} target={metaZn} unit="mg" tooltip="Zinco: Essencial para imunidade, saúde de cascos e pele." />
                    <BulletBar label="Manganês" current={0} target={40 * reqs.cms} unit="mg" tooltip="Manganês: Reprodução e desenvolvimento ósseo. (Estimativa baseada no consumo)." />
                    <BulletBar label="Ferro" current={0} target={50 * reqs.cms} unit="mg" tooltip="Ferro: Transporte de oxigênio no sangue. (Estimativa baseada no consumo)." />
                  </div>
                </details>
              </div>

              {/* Card Estrutura e Alertas */}
              <div className="bg-zinc-900 p-5 rounded-xl shadow-lg border border-zinc-800">
                <h4 className="text-xs font-bold text-lime-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400"></span>
                  Estrutura e Alertas
                </h4>
                <BulletBar label="Fibra (FDN)" current={ofertaFDN} target={30} minZone={27} maxZone={30} unit="%" type="safety-zone" tooltip="Fibra em Detergente Neutro: Efeito de enchimento (Fill Effect). Essencial para ruminação, salivação e saúde do ambiente ruminal. Zona ideal: 27% a 30%." />
                <AlertGauge label="Extrato Etéreo (EE)" current={ofertaEE} limit={metaEE} unit="%" tooltip="Extrato Etéreo: Limite de 7% na MS. Níveis superiores são tóxicos para bactérias fibrolíticas, reduzindo a digestão da fibra." />
                {bio.species === 'Ovino' && (
                  <AlertGauge label="Cobre" current={ofertaCu} limit={metaCu} unit="mg" tooltip="Cobre: Ovinos são extremamente sensíveis. Níveis acima de 15 mg/kg MS podem causar intoxicação cumulativa e hemólise." />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alertas e Erros Bioquímicos (Toasts/Cards) */}
        {(analysis.errors.length > 0 || analysis.warnings.length > 0) && (
          <div className="space-y-3">
            {analysis.errors.map((err, i) => (
              <div key={i} className="flex gap-3 text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-sm shadow-lg">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <span className="font-medium">{err}</span>
              </div>
            ))}
            {analysis.warnings.map((warn, i) => (
              <div key={i} className="flex gap-3 text-orange-400 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 text-sm shadow-lg">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <span className="font-medium">{warn}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Receita de Bateia */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zinc-100">Receita de Bateia (100kg MN)</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              {calculateBateia().map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="font-medium text-zinc-300">{item.name}</span>
                  <span className="font-mono text-lime-400">{(item?.kg100 ?? 0).toFixed(2)} kg</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowModal(false)}
              className="w-full mt-6 py-3 bg-lime-500 text-zinc-950 font-bold rounded-xl hover:bg-lime-400 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
      
      {/* Off-screen container for PDF generation */}
      {reqs && analysis && (
        <div 
          className="fixed top-0 left-0 z-[-9999] opacity-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
          style={{ width: '210mm' }}
        >
          <AuditLaudo 
            ref={laudoRef}
            bio={bio}
            reqs={reqs}
            analysis={analysis}
            diet={diet}
            ingredients={ingredients}
          />
        </div>
      )}
    </div>
  );
};
