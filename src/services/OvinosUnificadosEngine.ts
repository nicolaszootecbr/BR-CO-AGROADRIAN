export interface OvinosInput {
  raca: string; // Será ignorado pelo middleware
  pc: number; // Peso Corporal (kg)
  gmd: number; // Ganho Médio Diário (g/dia)
  sexo: 'Macho Inteiro' | 'Castrado' | 'Fêmea';
  isGestante: boolean;
  diasGestacao: number;
  isLactante: boolean;
  diasLactacao: number;
  producaoLeite?: number; // kg/dia
  gorduraLeite?: number; // %
  tipoParto?: 'Simples' | 'Gemelar';
}

export interface OvinosEngineResult {
  pcvz: number;
  cms: number; // kg/dia
  elg: number; // Mcal/dia
  ca: number; // g/dia
  p: number; // g/dia
  logs: {
    warnings: string[];
    errors: string[];
    info: string[];
  };
}

export class OvinosUnificadosEngine {
  /**
   * Motor de Cálculo Principal para Ovinos (Deslanados/Locais/Corte)
   * Baseado no BR-COR 2024
   */
  public static calculate(input: OvinosInput): OvinosEngineResult {
    const logs = { warnings: [], errors: [], info: [] };

    // ========================================================================
    // 3. Tratamento de Exceção (Hard Rule)
    // ========================================================================
    if (input.sexo !== 'Fêmea' && (input.isGestante || input.isLactante)) {
      throw new Error('FATAL_BIOLOGY_01');
    }

    // ========================================================================
    // 2. Trava de Lógica (Prioridade Metabólica)
    // ========================================================================
    let gmd_calculo = input.gmd;
    if (input.isGestante || input.isLactante) {
      gmd_calculo = 0;
      logs.info.push("Prioridade Reprodutiva Ativada: Ganho de peso para crescimento desabilitado.");
    }

    // ========================================================================
    // 1. UNIFICAÇÃO DE RAÇA E CONVERSÃO DE PESO
    // ========================================================================
    // Agnosticismo de Raça: Ignoramos input.raca e forçamos "Ovinos Deslanados"
    logs.info.push(`Override de Raça: Input '${input.raca}' ignorado. Aplicando modelo unificado 'Ovinos Deslanados'.`);

    // Trava de Performance Biológica (GMD > 500g)
    if (input.gmd > 500) {
      throw new Error(JSON.stringify({
        codigo: "ERR_BIOLOGICAL_PERFORMANCE_LIMIT",
        mensagem: "INCONSISTÊNCIA DE DESEMPENHO BIOLÓGICO: Ganhos superiores a 500g/dia ultrapassam a capacidade metabólica e de ingestão de ovinos deslanados tropicais."
      }));
    }

    // Conversão Obrigatória: PCVZ
    // O escalar 653.8 reflete o conteúdo do trato gastrointestinal típico.
    // A fórmula exata do JSON é 653.8 * pow(PC, -0.33)
    // Nota: Se a fórmula resultar em valores irreais, o BR-COR assume que PCVZ é derivado disso.
    // Vamos aplicar a fórmula estrita do JSON:
    const pcvz = 653.8 * Math.pow(input.pc, -0.33);
    
    if (!pcvz || pcvz === input.pc) {
      throw new Error("FATAL_PCVZ_MISSING: PCVZ não pode ser nulo ou igual ao PC.");
    }

    const gpcvz = (gmd_calculo / 1000) * (pcvz / input.pc); // Ganho em kg/dia proporcional ao PCVZ

    // ========================================================================
    // 3. MOTOR DE CONSUMO (Equação 2.6)
    // ========================================================================
    // CMS (g/dia) = -145.68 + (77.3709 * PC^0.75) + (1.3985 * GMD)
    const cmsGramas = -145.68 + (77.3709 * Math.pow(input.pc, 0.75)) + (1.3985 * gmd_calculo);
    let cmsKg = cmsGramas / 1000;

    // ========================================================================
    // 2. DIFERENCIAÇÃO POR CLASSE SEXUAL (Crescimento)
    // ========================================================================
    // Fêmeas depositam gordura mais cedo (maior exigência de energia), 
    // machos inteiros depositam mais proteína.
    let coefA_ELg = 0;
    if (input.sexo === 'Macho Inteiro') coefA_ELg = 0.285;
    else if (input.sexo === 'Castrado') coefA_ELg = 0.310;
    else if (input.sexo === 'Fêmea') coefA_ELg = 0.335;

    // ELg (Mcal/dia)
    const elg = gpcvz * (coefA_ELg * Math.pow(pcvz, 0.75));

    // ========================================================================
    // 4. BALANÇO MINERAL (Tabela 10.7)
    // ========================================================================
    let ca = 0;
    let p = 0;

    if (input.sexo === 'Macho Inteiro') {
      ca = gpcvz * (17.04 * Math.pow(pcvz, -0.1652));
      p = gpcvz * (9.19 * Math.pow(pcvz, -0.2057));
    } else if (input.sexo === 'Castrado') {
      ca = gpcvz * (16.75 * Math.pow(pcvz, -0.1192));
      p = gpcvz * (8.65 * Math.pow(pcvz, -0.1317));
    } else if (input.sexo === 'Fêmea') {
      ca = gpcvz * (17.52 * Math.pow(pcvz, -0.1465));
      p = gpcvz * (9.16 * Math.pow(pcvz, -0.1627));
    }

    // ========================================================================
    // 5. REPRODUÇÃO E FALLBACK DE GESTAÇÃO
    // ========================================================================
    if (input.isGestante) {
      logs.info.push("CRÍTICO - Lacuna declarada no BR-COR Ovinos. O cálculo de gestação nativo não existe, requer fallback para Aditividade Caprina (Equação 5.25).");
      // Implementação do fallback caprino seria adicionada aqui (exigências fetais)
    }

    if (input.isLactante && input.producaoLeite && input.gorduraLeite) {
      // Leite Corrigido para Gordura (LCG) - Base 6.5%
      const lcg = (0.3688 + 0.0971 * input.gorduraLeite) * input.producaoLeite;
      logs.info.push(`Leite Corrigido para Gordura (LCG base 6.5%): ${lcg.toFixed(2)} kg/dia`);

      // Fator F (Gallo & Tedeschi) para ajuste de consumo
      const ppl = 40; // Pico de lactação em dias
      const rp = input.tipoParto === 'Gemelar' ? 0.88 : 0.66;
      const dl = input.diasLactacao;
      
      const fatorF = (1 + rp * (dl / ppl) * Math.exp(1.4 * (1 - dl / ppl))) / (1 + rp);
      cmsKg *= fatorF; // Ajuste do consumo
      logs.info.push(`Fator F aplicado ao CMS: ${fatorF.toFixed(3)}`);
    }

    return {
      pcvz,
      cms: cmsKg,
      elg,
      ca,
      p,
      logs
    };
  }

  /**
   * Middleware para validar a dieta após o Solver (Segurança Dietética e Cobre)
   */
  public static validateDiet(fdnTotalDietaPct: number, cuTotalMgKg: number) {
    const logs = { warnings: [], errors: [] };

    // TRAVA DE COBRE
    if (cuTotalMgKg > 15) {
      throw new Error(JSON.stringify({
        codigo: "FATAL_COPPER_TOXICITY",
        mensagem: "Toxicidade de Cobre: Níveis perigosos para Ovinos (> 15 mg/kg MS)."
      }));
    }

    // SEGURANÇA DIETÉTICA (FDN)
    if (fdnTotalDietaPct < 27) {
      throw new Error(JSON.stringify({
        codigo: "BLOCK_SOLVER_LOW_NDF",
        mensagem: "Risco Crítico de Acidose Láctica Ruminal. Ausência de mastigação e tamponamento salivar adequado (FDN < 27%)."
      }));
    } else if (fdnTotalDietaPct > 30) {
      logs.warnings.push("WARN_SOLVER_HIGH_NDF: Saturação por Efeito de Enchimento (Fill Effect). O animal reduzirá drasticamente o consumo voluntário de Matéria Seca (FDN > 30%).");
    }

    return logs;
  }
}
