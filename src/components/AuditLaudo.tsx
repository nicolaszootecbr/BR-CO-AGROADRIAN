import React, { forwardRef } from 'react';
import { Biometrics, Requirements, DietAnalysis, Diet, Ingredient } from '../types';

interface AuditLaudoProps {
  bio: Biometrics;
  reqs: Requirements;
  analysis: DietAnalysis;
  diet: Diet;
  ingredients: Ingredient[];
}

export const AuditLaudo = forwardRef<HTMLDivElement, AuditLaudoProps>(({ bio, reqs, analysis, diet, ingredients }, ref) => {
  const trace = reqs.trace;
  if (!trace) return null;

  const formatVal = (val: number | null | undefined, unit: string = '') => {
    if (val == null || isNaN(val)) return '---';
    return `${val.toFixed(2)}${unit ? ' ' + unit : ''}`;
  };

  const reqEM = (reqs.ndt / 1000) * 4.409 * 0.82; // Estimativa de exigência de EM em Mcal/dia

  return (
    <div ref={ref} className="bg-white text-black w-[210mm] min-h-[297mm] p-8 mx-auto relative flex flex-col font-sans" style={{ boxSizing: 'border-box' }}>
      <div className="flex-grow">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-6 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider">Relatório Técnico de Auditoria Nutricional</h1>
          <p className="text-sm text-gray-600 mt-2">BR-CO AgroAdrian - Motor de Exigências v2.0 (BR-COR 2024)</p>
        </div>

        {/* Identificação */}
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 mb-2 pb-1">Identificação do Lote</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="font-semibold">Espécie:</span> {bio.species}</div>
            <div><span className="font-semibold">Biotipo:</span> {bio.biotype}</div>
            <div><span className="font-semibold">Classe Sexual:</span> {bio.sexClass}</div>
            <div><span className="font-semibold">Peso Corporal (PC):</span> {bio.pc} kg</div>
            {bio.isPregnant || bio.isLactating ? (
              <div className="col-span-2"><span className="font-semibold text-lime-600">Status Reprodutivo:</span> {bio.isPregnant ? `Gestante (${bio.dl} dias)` : `Lactante (${bio.dl} dias)`}</div>
            ) : (
              <div><span className="font-semibold">GMD:</span> {bio.gmd} g/dia</div>
            )}
          </div>
        </section>

        {/* PASSO 1 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold bg-gray-100 p-2 border border-gray-300 mb-2">PASSO 1 [Entrada Alométrica]</h2>
          <div className="text-sm space-y-2">
            <p><span className="font-semibold">Peso Corporal Vazio (PCVZ):</span> PCVZ = (653.8 × PC<sup>0.67</sup>) / 1000 <span className="text-gray-500 italic">(BR-COR, 2024)</span></p>
            <p className="ml-4">Resultado: {(trace.pcvz ?? 0).toFixed(2)} kg</p>
            <p><span className="font-semibold">Peso Metabólico:</span> PC<sup>0.75</sup> <span className="text-gray-500 italic">(BR-COR, 2024)</span></p>
            <p className="ml-4">Resultado: {(trace.pesoMetabolico ?? 0).toFixed(2)} kg<sup>0.75</sup></p>
          </div>
        </section>

        <div className="text-center text-gray-400 my-2">↓</div>

        {/* PASSO 2 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold bg-gray-100 p-2 border border-gray-300 mb-2">PASSO 2 [Limites Físicos]</h2>
          <div className="text-sm space-y-2">
            <p><span className="font-semibold">Equação de Consumo:</span> {trace.cmsEquacao} <span className="text-gray-500 italic">(BR-COR, 2024)</span></p>
            <p className="ml-4">CMS Meta: {(reqs.cms ?? 0).toFixed(2)} kg/dia</p>
            <p><span className="font-semibold">Capacidade de FDN (CFDN_max):</span> CFDN_max = 3.155 × PC<sup>-0.3190</sup> <span className="text-gray-500 italic">(BR-COR, 2024)</span></p>
            <p className="ml-4">Limite Físico: {(trace.cfdnMax ?? 0).toFixed(2)} kg/dia</p>
          </div>
        </section>

        <div className="text-center text-gray-400 my-2">↓</div>

        {/* PASSO 3 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold bg-gray-100 p-2 border border-gray-300 mb-2">PASSO 3 [Exigência Energética]</h2>
          <div className="text-sm space-y-2">
            <p><span className="font-semibold">Mantença (ELm):</span> ELm = {trace.elmIntercepto} × PCVZ<sup>0.75</sup> / 1000 <span className="text-gray-500 italic">(BR-COR, 2024)</span></p>
            <p className="ml-4">ELm: {(reqs.elm ?? 0).toFixed(2)} Mcal/dia</p>
            <p><span className="font-semibold">Crescimento (ELg):</span> {trace.elgEquacao} <span className="text-gray-500 italic">(BR-COR, 2024 - Patch 01)</span></p>
            <p className="ml-4">ELg: {(reqs.elg ?? 0).toFixed(2)} Mcal/dia</p>
            
            {bio.isPregnant && (
              <>
                {bio.sexClass === 'Macho Inteiro' || bio.sexClass === 'Macho Castrado' ? (
                  <p className="text-red-600 font-bold">Gestação: BLOQUEIO POR COERÊNCIA BIOLÓGICA</p>
                ) : (
                  <>
                    <p><span className="font-semibold">Gestação (Derivada y'):</span> {trace.elgestDerivada} <span className="text-gray-500 italic">(BR-COR, 2024)</span></p>
                    <p className="ml-4">ELgest: {(reqs.elgest ?? 0).toFixed(2)} Mcal/dia</p>
                  </>
                )}
              </>
            )}
          </div>
        </section>

        <div className="text-center text-gray-400 my-2">↓</div>

        {/* PASSO 4 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold bg-gray-100 p-2 border border-gray-300 mb-2">PASSO 4 [Conversão Estequiométrica]</h2>
          <div className="text-sm space-y-2">
            <p><span className="font-semibold">Fluxo de Energia:</span> ED → EM → EL <span className="text-gray-500 italic">(BR-COR, 2024)</span></p>
            <p><span className="font-semibold">Concentração Energética (q):</span> q = EM / ED = {(analysis.q ?? 0).toFixed(3)}</p>
            <p><span className="font-semibold">Eficiência de Mantença (km):</span> km = 0.287q + 0.554 = {(analysis.km ?? 0).toFixed(3)}</p>
            <p><span className="font-semibold">Eficiência de Ganho (kg):</span> kg = 0.78q + 0.006 = {(analysis.kg ?? 0).toFixed(3)}</p>
            <p className="mt-2 text-gray-600">A conversão de EL de volta para NDT utiliza estas eficiências dinâmicas para calcular a densidade energética necessária na dieta.</p>
          </div>
        </section>

        <div className="text-center text-gray-400 my-2">↓</div>

        {/* PASSO 5 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold bg-gray-100 p-2 border border-gray-300 mb-2">PASSO 5 [Metabolismo Proteico]</h2>
          <div className="text-sm space-y-2">
            <p><span className="font-semibold">Rota:</span> PM → PBmic → PDR → PNDR → PB total <span className="text-gray-500 italic">(BR-COR, 2024)</span></p>
            <table className="w-full border-collapse border border-gray-300 mt-2">
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold w-1/3">Proteína Líquida (PL) - Mantença</td>
                  <td className="border border-gray-300 p-1">{(trace.plm ?? 0).toFixed(1)} g/dia</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold">Proteína Líquida (PL) - Ganho</td>
                  <td className="border border-gray-300 p-1">{(trace.plg ?? 0).toFixed(1)} g/dia</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold">Proteína Metabolizável (PM)</td>
                  <td className="border border-gray-300 p-1">{(trace.pm ?? 0).toFixed(1)} g/dia</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold">PB Microbiana (PBmic)</td>
                  <td className="border border-gray-300 p-1">{(trace.pbmic ?? 0).toFixed(1)} g/dia</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold">PDR Meta</td>
                  <td className="border border-gray-300 p-1">PDR_meta = PBmic = {(trace.pdrMeta ?? 0).toFixed(1)} g/dia</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold">PNDR Meta</td>
                  <td className="border border-gray-300 p-1">PNDR_meta = (PM - (PBmic × 0.64 × 0.8)) / 0.8 = {(trace.pndrMeta ?? 0).toFixed(1)} g/dia</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold bg-gray-50">PB Total (Meta)</td>
                  <td className="border border-gray-300 p-1 bg-gray-50 font-bold">{(reqs.pb ?? 0).toFixed(1)} g/dia</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="text-center text-gray-400 my-2">↓</div>

        {/* PASSO 6 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold bg-gray-100 p-2 border border-gray-300 mb-2">PASSO 6 [Densidade da Dieta]</h2>
          <div className="text-sm space-y-2">
            <p className="text-gray-600 italic">O <strong>Valor de Segurança (+10% para Proteína)</strong> previne variações na qualidade do pasto/alimento e garante o atendimento das exigências mesmo com flutuações de consumo.</p>
            <table className="w-full border-collapse border border-gray-300 mt-2" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-1 text-left w-1/5">Fração</th>
                  <th className="border border-gray-300 p-1 text-right w-1/5">Exigência (g/dia)</th>
                  <th className="border border-gray-300 p-1 text-right w-1/5">Fornecido (g/dia)</th>
                  <th className="border border-gray-300 p-1 text-right w-1/5">Concentração (g/kg MS)</th>
                  <th className="border border-gray-300 p-1 text-right w-1/5">Segurança (+10%)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold truncate">Proteína Bruta (PB)</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(reqs.pb)}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal((analysis.pbTotal ?? 0) / 100 * (analysis.cmsTotal ?? 0) * 1000)}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal((analysis.pbTotal ?? 0) * 10)}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold text-lime-700">{formatVal((reqs.pb ?? 0) * 1.10)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold truncate">NDT</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(reqs.ndt, 'g/dia')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal((analysis.ndtTotal ?? 0) / 100 * (analysis.cmsTotal ?? 0) * 1000, 'g/dia')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal((analysis.ndtTotal ?? 0) * 10, 'g/kg MS')}</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold truncate">Energia (EM)</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(reqEM, 'Mcal/dia')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal((analysis.emMcalKg ?? 0) * (analysis.cmsTotal ?? 0), 'Mcal/dia')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(analysis.emMcalKg, 'Mcal/kg MS')}</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="text-center text-gray-400 my-2">↓</div>

        {/* PASSO 7 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold bg-gray-100 p-2 border border-gray-300 mb-2">PASSO 7 [Saúde Mineral]</h2>
          <div className="text-sm space-y-2">
            <p className="text-gray-600 italic">O <strong>Valor de Segurança (+30% para Minerais)</strong> é recomendado para suprir variações na biodisponibilidade e garantir a saúde óssea e metabólica.</p>
            {bio.isPregnant && (
              <>
                {bio.sexClass === 'Macho Inteiro' || bio.sexClass === 'Macho Castrado' ? (
                  <p className="text-red-600 font-bold">Gestação: BLOQUEIO POR COERÊNCIA BIOLÓGICA</p>
                ) : (
                  <>
                    <p><span className="font-semibold">Cálcio Gestação:</span> {trace.caGestacaoFormula} <span className="text-gray-500 italic">(sem derivada)</span></p>
                    <p><span className="font-semibold">Fósforo Gestação:</span> {trace.pGestacaoFormula} <span className="text-gray-500 italic">(sem derivada)</span></p>
                  </>
                )}
              </>
            )}
            <table className="w-full border-collapse border border-gray-300 mt-2 text-xs" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-1 text-left">Mineral</th>
                  <th className="border border-gray-300 p-1 text-right">Mantença</th>
                  <th className="border border-gray-300 p-1 text-right">Ganho</th>
                  <th className="border border-gray-300 p-1 text-right">Total (Exigência)</th>
                  <th className="border border-gray-300 p-1 text-right">Fornecido</th>
                  <th className="border border-gray-300 p-1 text-right">Segurança (+30%)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-1 truncate font-semibold">Cálcio (Ca)</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(trace.caMant, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(trace.caGanho, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold">{formatVal(reqs.ca, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(analysis.caIngeridoG, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold text-lime-700">{formatVal((reqs.ca ?? 0) * 1.30, 'g')}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 truncate font-semibold">Fósforo (P)</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(trace.pMant, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(trace.pGanho, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold">{formatVal(reqs.p, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(analysis.pIngeridoG, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold text-lime-700">{formatVal((reqs.p ?? 0) * 1.30, 'g')}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 truncate font-semibold">Magnésio (Mg)</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right font-bold">{formatVal(reqs.mg, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(analysis.mgIngeridoG, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold text-lime-700">{formatVal((reqs.mg ?? 0) * 1.30, 'g')}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 truncate font-semibold">Sódio (Na)</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right font-bold">{formatVal(reqs.na, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(analysis.naIngeridoG, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold text-lime-700">{formatVal((reqs.na ?? 0) * 1.30, 'g')}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 truncate font-semibold">Potássio (K)</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right font-bold">{formatVal(reqs.k, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(analysis.kIngeridoG, 'g')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold text-lime-700">{formatVal((reqs.k ?? 0) * 1.30, 'g')}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 truncate font-semibold">Cobalto (Co)</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right font-bold">---</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(analysis.coIngeridoMg, 'mg')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold text-lime-700">---</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1 truncate font-semibold">Cromo (Cr)</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right text-gray-400">---</td>
                  <td className="border border-gray-300 p-1 text-right font-bold">---</td>
                  <td className="border border-gray-300 p-1 text-right">{formatVal(analysis.crIngeridoMg, 'mg')}</td>
                  <td className="border border-gray-300 p-1 text-right font-bold text-lime-700">---</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Legenda */}
        <section className="mb-6 bg-gray-50 p-4 border border-gray-200 text-xs text-gray-600">
          <h3 className="font-bold mb-2">Legenda de Siglas:</h3>
          <ul className="grid grid-cols-2 gap-2">
            <li><strong>PL:</strong> Proteína Líquida</li>
            <li><strong>PM:</strong> Proteína Metabolizável</li>
            <li><strong>PDR:</strong> Proteína Degradável no Rúmen</li>
            <li><strong>PNDR:</strong> Proteína Não Degradável no Rúmen</li>
            <li><strong>NDT:</strong> Nutrientes Digestíveis Totais</li>
            <li><strong>MS:</strong> Matéria Seca</li>
            <li><strong>CMS:</strong> Consumo de Matéria Seca</li>
          </ul>
        </section>
      </div>

      {/* Professional Footer */}
      <div className="mt-auto pt-4 border-t border-gray-300 text-zinc-600 text-xs text-center">
        <p className="font-bold text-sm mb-1">Nicolas Adrian Viana de Oliveira</p>
        <p className="mb-1">Graduando em Zootecnia - Universidade Federal da Bahia (UFBA)</p>
        <p className="mb-2">
          WhatsApp: <a href="https://wa.me/5571988441004" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">(71) 9-88441004</a> | 
          E-mail: <a href="mailto:nicolaszootec@gmail.com" className="text-blue-600 hover:underline">nicolaszootec@gmail.com</a>
        </p>
        <p className="italic text-[10px] mb-1">As exigências minerais de oligoelementos (Co, Cr, Se) seguem recomendações complementares ao BR-COR para dietas de alta performance.</p>
        <p className="italic text-[10px]">Este documento foi gerado pelo sistema BR-CO AgroAdrian - Tecnologia de Nutrição de Precisão.</p>
      </div>
    </div>
  );
});
AuditLaudo.displayName = 'AuditLaudo';
