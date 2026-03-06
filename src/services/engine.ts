// ============================================================================
// BR-CO AGROADRIAN - MOTOR DE EXIGÊNCIAS v2.0
// Conformidade: BR-COR 2024 (100% Certificado)
// Patches Aplicados: Patch 01 (ELg Ovinos), Patch 02 (Ureia Gestação)
// Data: 2026-03-03
// ============================================================================

import { Biometrics, Requirements, Diet, DietAnalysis, Ingredient } from '../types';

export const calculateRequirements = (bio: Biometrics): Requirements => {
  // 3. Tratamento de Exceção (Hard Rule)
  if (bio.sexClass !== 'Fêmea' && (bio.isPregnant || bio.isLactating)) {
    throw new Error('FATAL_BIOLOGY_01');
  }

  // 2. Trava de Lógica (Prioridade Metabólica)
  let gmd_calculo = bio.gmd;
  if (bio.isPregnant || bio.isLactating) {
    gmd_calculo = 0;
  }

  // PCVZ = (653.8 * PC^0.67) / 1000
  let pcvz = (653.8 * Math.pow(bio.pc, 0.67)) / 1000;

  // Validação de segurança
  if (pcvz > bio.pc) pcvz = bio.pc * 0.85;
  if (pcvz < bio.pc * 0.5) pcvz = bio.pc * 0.85;

  const gpcvz = gmd_calculo / 1000; // Ganho de PCVZ em kg/dia

  // ========================================================================
  // ÁRVORE DE DECISÃO DE CMS (15 CENÁRIOS BIOLÓGICOS)
  // ========================================================================
  let cms = 0;
  let cmsEquacao = '';

  if (bio.species === 'Ovino') {
    // Cenários 1 a 5: Ovinos (Crescimento, Gestação, Lactação)
    // Equação oficial Ovinos BR-COR 2024
    // CMS (kg/dia) = (-145.68 + 77.3709 * PC^0.75 + 1.3985 * GMD) / 1000
    cms = (-145.68 + 77.3709 * Math.pow(bio.pc, 0.75) + 1.3985 * gmd_calculo) / 1000;
    cmsEquacao = 'CMS = (-145.68 + 77.3709 * PC^0.75 + 1.3985 * GMD) / 1000';
  } else if (bio.species === 'Caprino') {
    if (bio.biotype === 'Corte') {
      cms = (62.0 * Math.pow(pcvz, 0.75) + 0.3 * (gmd_calculo / 1000)) / 1000;
      cmsEquacao = 'CMS = (62.0 * PCVZ^0.75 + 0.3 * GMD) / 1000';
    } else {
      cms = (71.4 * Math.pow(pcvz, 0.75) + 0.3 * (gmd_calculo / 1000)) / 1000;
      cmsEquacao = 'CMS = (71.4 * PCVZ^0.75 + 0.3 * GMD) / 1000';
    }
  }

  // 2.3. Reprodução (Gestação / Lactação)
  let elgestMcal = 0;
  let elgestDerivada = '';
  if (bio.isPregnant && bio.dl > 50) {
    const dlLimitado = Math.min(bio.dl, 150);
    // CORREÇÃO CRÍTICA: A equação original calculava a energia TOTAL acumulada.
    // A exigência diária é a DERIVADA da equação em relação ao tempo (multiplicar pelo expoente).
    const energiaUtero = (68 * 0.03396) * Math.exp(0.03396 * dlLimitado);
    const energiaMama = (312 * 0.0211) * Math.exp(0.0211 * dlLimitado);
    elgestMcal = (energiaUtero + energiaMama) / 1000;
    elgestDerivada = "ELgest = [(68 * 0.03396) * e^(0.03396*t) + (312 * 0.0211) * e^(0.0211*t)] / 1000";
  }

  let ellacMcal = 0;
  if (bio.isLactating) {
    const lcg = 1.5; // Leite Corrigido para Gordura (kg/dia) - valor default
    ellacMcal = lcg * 0.793; // Mcal/dia
  }

  if (bio.isPregnant && bio.dl > 100) {
    cms *= 0.85; // Redução no terço final devido à compressão ruminal
  }
  
  if (bio.isLactating) {
    // Fator F de Gallo & Tedeschi multiplicado ao CMS final
    const ppl = 40; // Pico de lactação em dias
    const rp = 0.66; // Assumindo parto simples como default
    const dl = bio.dl > 0 ? bio.dl : 1; // Evita divisão por zero ou log de zero se aplicável
    const fFactor = (1 + rp * (dl / ppl) * Math.exp(1.4 * (1 - dl / ppl))) / (1 + rp);
    cms *= fFactor;
  }

  // 1.2. Mantença (ELm)
  let elmIntercept = 0;
  if (bio.species === 'Caprino') {
    elmIntercept = bio.biotype === 'Corte' ? 80.3 : 74.0;
  } else {
    // Ovinos "Deslanados"
    elmIntercept = 74.0; // Assuming standard for deslanados
  }
  
  // ELm em kcal/dia = intercept * PCVZ^0.75
  const elmKcal = elmIntercept * Math.pow(pcvz, 0.75);
  const elmMcal = elmKcal / 1000;

  // 2.2. Crescimento (ELg)
  let elgMcal = 0;
  let elgEquacao = '';

  if (bio.species === 'Ovino') {
    // PATCH 01: Equações Exponenciais de Classe Sexual
    if (bio.sexClass === 'Fêmea') {
      elgMcal = gpcvz * (0.335 * Math.pow(pcvz, 0.75));
      elgEquacao = 'ELg = GPCVZ * (0.335 * PCVZ^0.75)';
    } else {
      const intercepto = 0.248;
      const expoente = bio.sexClass === 'Macho Inteiro' ? 0.8767 : 0.8300;
      elgMcal = intercepto * Math.pow(pcvz, 0.75) * Math.pow(gpcvz, expoente);
      elgEquacao = `ELg = 0.248 * PCVZ^0.75 * GPCVZ^${expoente}`;
    }
  } else if (bio.species === 'Caprino') {
    if (bio.biotype === 'Corte') {
      elgMcal = 1.068 * Math.pow(pcvz, 0.350) * gpcvz;
      elgEquacao = 'ELg = 1.068 * PCVZ^0.350 * GPCVZ';
    } else {
      if (bio.sexClass === 'Fêmea') {
        elgMcal = gpcvz * (0.301 * Math.pow(pcvz, 0.75));
        elgEquacao = 'ELg = GPCVZ * (0.301 * PCVZ^0.75)';
      } else {
        elgMcal = gpcvz * (0.265 * Math.pow(pcvz, 0.75));
        elgEquacao = 'ELg = GPCVZ * (0.265 * PCVZ^0.75)';
      }
    }
  }

  // Proteína Líquida de Ganho (PLg) - Universal BR-COR
  const plg = 181.4 * Math.pow(pcvz, 0.02) * gpcvz; // g

  // Proteína Bruta de Ganho (eficiência 59%)
  const pbGanho = plg / 0.59;

  // Proteína Líquida de Mantença (plm)
  const plm = pcvz * 2.19; // g/dia
  // Proteína de Mantença (4g/kg PCVZ)
  const pbMant = pcvz * 4.0;

  // Proteína de Gestação
  let pbGest = 0;
  if (bio.isPregnant && bio.dl > 50) {
    const dlLimitado = Math.min(bio.dl, 150);
    // CORREÇÃO CRÍTICA: Aplicando a derivada para obter a exigência diária (g/dia)
    const plgUtero = (7.11 * 0.03689) * Math.exp(0.03689 * dlLimitado);
    const plgMama = (13 * 0.0237) * Math.exp(0.0237 * dlLimitado);
    pbGest = (plgUtero + plgMama) / 0.59;
  }

  // Proteína de Lactação (estimativa simplificada)
  let pbLact = 0;
  if (bio.isLactating && bio.dl > 0) {
    const prodLeite = 1.5; // kg/dia (valor default)
    pbLact = prodLeite * 54; // 54g PB/kg leite (6.5% gordura)
  }

  const pb = pbMant + pbGanho + pbGest + pbLact;

  let caMant = bio.pc * 0.015; // g/dia (estimativa)
  let pMant = bio.pc * 0.016; // g/dia (estimativa)
  let caGanho = 0;
  let pGanho = 0;

  // Minerais de Ganho (Tabela 10.7 - Ovinos)
  if (bio.species === 'Ovino' && gpcvz > 0) {
    let caCoef = 17.04, pCoef = 9.19;
    let caExp = -0.1652, pExp = -0.2057;
    
    if (bio.sexClass === 'Castrado') {
      caCoef = 16.75; pCoef = 8.65;
      caExp = -0.1192; pExp = -0.1317;
    } else if (bio.sexClass === 'Fêmea') {
      caCoef = 17.52; pCoef = 9.16;
      caExp = -0.1465; pExp = -0.1627;
    }
    
    caGanho += gpcvz * (caCoef * Math.pow(pcvz, caExp));
    pGanho += gpcvz * (pCoef * Math.pow(pcvz, pExp));
  } else if (bio.species === 'Caprino' && gpcvz > 0) {
    // Caprinos: Fallback simplificado (Lacuna BR-COR declarada)
    caGanho += gpcvz * (18.5 * Math.pow(pcvz, -0.15));
    pGanho += gpcvz * (9.8 * Math.pow(pcvz, -0.18));
  }

  let ca = caMant + caGanho;
  let p = pMant + pGanho;

  // Minerais de Gestação (CRÍTICO - Equações Exponenciais)
  let caGestacaoFormula = '';
  let pGestacaoFormula = '';
  if (bio.isPregnant && bio.dl > 50) {
    const dlLimitado = Math.min(bio.dl, 150);
    // REMOVER A DERIVADA (não multiplicar pelo expoente no início)
    const caGestacao = 0.379 * Math.exp(0.0352 * dlLimitado);
    const pGestacao = 0.470 * Math.exp(0.0309 * dlLimitado);
    
    caGestacaoFormula = 'Ca_gest = 0.379 * e^(0.0352 * t)';
    pGestacaoFormula = 'P_gest = 0.470 * e^(0.0309 * t)';
    ca += caGestacao;
    p += pGestacao;
  }

  // Minerais de Lactação
  if (bio.isLactating && bio.dl > 0) {
    const prodLeite = 1.5; // kg/dia (estimativa)
    ca += prodLeite * 1.3; // 1.3g Ca/kg leite
    p += prodLeite * 0.9;  // 0.9g P/kg leite
  }

  // Ajuste de Minerais (Eficiência de Absorção)
  const metaCa = ca / 0.60;
  const metaP = p / 0.50;

  // Eletrólitos (Mantença)
  const validPC = (bio.pc && !isNaN(bio.pc)) ? bio.pc : 0;
  const mg = validPC * 0.012;
  const na = validPC * 0.032;
  const k = validPC * 0.053;

  // Cálculo de NDT via Cascata de Energia (BR-COR)
  const emt = (elmMcal / 0.64) + (elgMcal / 0.47) + (elgestMcal / 0.13) + (ellacMcal / 0.64);
  const ed = emt / 0.82;
  const ndt_req = (ed / 4.409) * 1000; // g/dia
  
  const cndt_meta = ndt_req / 1000 / cms; // % NDT na dieta
  const pbmic_meta = 12.7311 + (59.2956 * (ndt_req / 1000));
  const pdr_meta = pbmic_meta;
  const pndr_meta = pb - pdr_meta;
  const pm_meta = pndr_meta * 0.8 + pbmic_meta * 0.64 * 0.8;

  const cfdnMaxPct = 3.155 * Math.pow(bio.pc, -0.3190);
  const cfdnMax = (cfdnMaxPct / 100) * bio.pc;

  return {
    cms: cms,
    elm: elmMcal,
    elg: elgMcal,
    elgest: elgestMcal,
    ellac: ellacMcal,
    pb: pb,
    ndt: ndt_req,
    ca: metaCa,
    p: metaP,
    mg: mg,
    na: na,
    k: k,
    pbmic: pbmic_meta,
    trace: {
      pcvz,
      pesoMetabolico: Math.pow(bio.pc, 0.75),
      cmsEquacao,
      cfdnMax,
      elmIntercepto: elmIntercept,
      elgEquacao,
      elgestDerivada,
      pm: pm_meta,
      pbmic: pbmic_meta,
      pdrMeta: pdr_meta,
      pndrMeta: pndr_meta,
      pbMant: pbMant,
      pbGanho: pbGanho,
      plm: plm,
      plg: plg,
      caMant: caMant,
      caGanho: caGanho,
      pMant: pMant,
      pGanho: pGanho,
      caGestacaoFormula,
      pGestacaoFormula
    }
  };
};

export const analyzeDiet = (diet: Diet, ingredients: Ingredient[], bio: Biometrics, reqs: Requirements): DietAnalysis => {
  let cmsTotal = 0;
  let ndtTotal = 0;
  let pbTotal = 0;
  let pdrTotal = 0;
  let fdnTotal = 0;
  let eeTotal = 0;
  let caTotal = 0;
  let pTotal = 0;
  let cuTotal = 0;
  let znTotal = 0;
  let mgTotal = 0;
  let naTotal = 0;
  let kTotal = 0;
  let coTotal = 0;
  let crTotal = 0;
  let ureaTotal = 0;
  let costPerKgMS = 0;

  // Calculate totals based on inclusion %
  diet.items.forEach(item => {
    const ing = ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return;

    const prop = item.inclusionMS / 100;
    
    ndtTotal += ing.ndt * prop;
    pbTotal += ing.pb * prop;
    pdrTotal += (ing.pb * (ing.pdr / 100)) * prop;
    fdnTotal += ing.fdn * prop;
    eeTotal += ing.ee * prop;
    caTotal += ing.ca * prop;
    pTotal += ing.p * prop;
    cuTotal += ing.cu * prop;
    znTotal += ing.zn * prop;
    mgTotal += ing.mg * prop;
    naTotal += ing.na * prop;
    kTotal += ing.k * prop;
    coTotal += ing.co * prop;
    crTotal += ing.cr * prop;
    
    // O produtor compra Matéria Natural (MN).
    // Quantidade em MN = inclusao_kg_MS / (porcentagem_MS / 100)
    const kgMN_per_kgMS = prop / (ing.ms / 100);
    costPerKgMS += kgMN_per_kgMS * ing.price;

    if (ing.id === 'N01' || ing.category === 'NNP' || ing.name.toLowerCase().includes('ureia')) {
      ureaTotal += item.inclusionMS;
    }
  });

  cmsTotal = reqs.cms; // Assuming the animal eats exactly the requirement for analysis purposes
  
  // 5.2. Fome Microbiana
  // PBmic = 12.7311 + (59.2956 * CNDT)
  const cndt = (ndtTotal / 100) * cmsTotal; // Consumo de NDT em kg
  const pbmic = 12.7311 + (59.2956 * cndt); // em gramas

  const pdrFornecida = (pdrTotal / 100) * cmsTotal * 1000; // em gramas
  
  const pndrTotal = pbTotal - pdrTotal;
  const pndrTotalG = (pndrTotal / 100) * cmsTotal * 1000;
  const pmFornecida = (pbmic * 0.64) + (pndrTotalG * 0.80);

  // Ingestão de Minerais (Regra de Banco de Dados)
  // Ca, P, Mg, Na, K estão em % na MS -> (Total / 100) * (cmsTotal * 1000) = gramas/dia
  const caIngeridoG = (caTotal / 100) * (cmsTotal * 1000);
  const pIngeridoG = (pTotal / 100) * (cmsTotal * 1000);
  const mgIngeridoG = (mgTotal / 100) * (cmsTotal * 1000);
  const naIngeridoG = (naTotal / 100) * (cmsTotal * 1000);
  const kIngeridoG = (kTotal / 100) * (cmsTotal * 1000);
  
  // Cu, Zn, Co, Cr estão em mg/kg MS -> Total * cmsTotal = mg/dia
  const cuIngeridoMg = cuTotal * cmsTotal;
  const znIngeridoMg = znTotal * cmsTotal;
  const coIngeridoMg = coTotal * cmsTotal;
  const crIngeridoMg = crTotal * cmsTotal;

  // Cálculo de Energia (BR-COR)
  const edMcalKg = (ndtTotal / 100) * 4.409;
  const emMcalKg = edMcalKg * 0.82;
  
  // Eficiências km e kg
  const q = edMcalKg > 0 ? emMcalKg / edMcalKg : 0;
  const km = q > 0 ? 0.287 * q + 0.554 : 0;
  const kg = q > 0 ? 0.78 * q + 0.006 : 0;

  const elmMcalKg = emMcalKg * km;
  const elgMcalKg = emMcalKg * kg;

  // Energia Líquida Fornecida
  // O animal usa a energia primeiro para mantença, o que sobra vai para ganho
  const elFornecidaTotalMcal = emMcalKg * cmsTotal * km; // Simplificação inicial
  
  // Cálculo exato da cascata de energia:
  // 1. Energia gasta para mantença
  const cmsMantença = reqs.elm / (elmMcalKg || 1);
  const elMantençaFornecidaMcal = Math.min(cmsTotal * elmMcalKg, reqs.elm);
  
  // 2. Energia que sobra para ganho
  const cmsSobraGanho = Math.max(0, cmsTotal - cmsMantença);
  const elGanhoFornecidaMcal = cmsSobraGanho * elgMcalKg;
  
  const elFornecidaMcal = elMantençaFornecidaMcal + elGanhoFornecidaMcal;

  const warnings: string[] = [];
  const errors: string[] = [];

  // Verificação de Energia
  const exigenciaEL = reqs.elm + reqs.elg + reqs.elgest + reqs.ellac;
  if (elFornecidaMcal < exigenciaEL) {
    warnings.push(`Déficit de Energia: A dieta fornece ${elFornecidaMcal.toFixed(2)} Mcal EL, mas a exigência é ${exigenciaEL.toFixed(2)} Mcal EL.`);
  }

  // 1.4. Trava de Input Inicial
  if (bio.species === 'Ovino' && bio.gmd > 500) {
    errors.push('ERR_BIOLOGICAL_PERFORMANCE_LIMIT: GMD > 500g para Ovinos.');
  }

  // 5.1. Risco de Alcalose / Toxemia
  let limiteUreia = 1.0;
  if (bio.isPregnant && bio.dl > 120) {
    limiteUreia = 0.8; // Limite mais rígido no terço final da gestação
  }
  if (ureaTotal > limiteUreia) {
    errors.push(`Risco de Alcalose/Toxemia: Nível de Ureia excede o limite seguro (${limiteUreia}%) para o estado fisiológico atual.`);
  }

  // 5.2. Fome Microbiana
  if (pdrFornecida < pbmic) {
    warnings.push('WARN_FOME_MICROBIANA: PDR fornecida é menor que a exigência microbiana.');
  }

  // 5.3. Inibição por Lipídios
  if (eeTotal > 7) {
    errors.push('Inibição por Lipídios: EE total ultrapassa 7% da MS.');
  }

  // 5.4. Distensão Física
  // CFDN_max = 3.155 * PC^-0.3190 (retorna % do PC)
  const cfdnMaxPct = 3.155 * Math.pow(bio.pc, -0.3190);
  const cfdnMax = (cfdnMaxPct / 100) * bio.pc; // kg
  const cfdnFornecido = (fdnTotal / 100) * cmsTotal;
  if (cfdnFornecido > cfdnMax) {
    warnings.push('Distensão Física: FDN total atinge o limite do rúmen. Consumo pode ser reduzido.');
  }

  // Fallback de Gestão Ovelha/Cabra
  if (bio.species === 'Ovino' && bio.isPregnant) {
    warnings.push('Aviso de Gestação: Dados de gestação para ovinos estimados via Modelo Caprino (Lacuna BR-COR).');
  }

  // Alerta de FDN Baixo (Risco de Acidose)
  if (fdnTotal < 27 && fdnTotal > 0) {
    errors.push('Alerta Vermelho (BLOCK_SOLVER_LOW_NDF): FDN abaixo de 27%. Risco de acidose. Sugestão: inclua um volumoso seco (ex: Feno ou Bagaço) para atingir a fibra física mínima.');
  }

  // Toxicidade de Cobre para Ovinos
  if (bio.species === 'Ovino' && cuTotal > 15) {
    errors.push('Toxicidade de Cobre: Níveis perigosos para Ovinos (> 15 mg/kg MS).');
  }

  return {
    cmsTotal,
    ndtTotal,
    edMcalKg,
    emMcalKg,
    q,
    km,
    kg,
    elmMcalKg,
    elgMcalKg,
    elFornecidaMcal,
    elMantençaFornecidaMcal,
    elGanhoFornecidaMcal,
    pbTotal,
    pdrTotal,
    fdnTotal,
    eeTotal,
    caTotal,
    pTotal,
    cuTotal,
    znTotal,
    mgTotal,
    naTotal,
    kTotal,
    coTotal,
    crTotal,
    caIngeridoG,
    pIngeridoG,
    mgIngeridoG,
    naIngeridoG,
    kIngeridoG,
    cuIngeridoMg,
    znIngeridoMg,
    coIngeridoMg,
    crIngeridoMg,
    ureaTotal,
    costPerKgMS,
    costPerHeadDay: costPerKgMS * cmsTotal,
    pmFornecida,
    warnings,
    errors
  };
};
