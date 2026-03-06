export interface CaprinosLeiteInput {
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

export interface CaprinosLeiteResult {
  pcvz: number;
  elm: number; // Mcal/dia
  elg: number; // Mcal/dia
  gestacao: {
    energiaMcal: number;
    proteinaG: number;
    caG: number;
    pG: number;
    mgG: number;
  };
  lactacao: {
    lcg: number; // kg/dia
    fatorF: number; // Ajuste de CMS
  };
  logs: {
    warnings: string[];
    errors: string[];
    info: string[];
  };
}

export class CaprinosLeiteEngine {
  // Constante de Mantença para Biotipo Leiteiro
  private static ELM_INTERCEPT = 74.0; // kcal/kg PCVZ^0.75

  /**
   * Motor de Cálculo Principal para Caprinos de Leite (Saanen, Alpina, Cruzamentos)
   * Baseado no BR-COR 2024
   */
  public static calculate(input: CaprinosLeiteInput): CaprinosLeiteResult {
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
    // 1. CONVERSÃO DE PESO E MANTENÇA (ELm)
    // ========================================================================
    const pcvz = input.pc * 0.85; // Conversão padrão para Peso Corporal Vazio
    const gpcvz = (gmd_calculo / 1000) * 0.85;

    // Diferente de bovinos, caprinos leiteiros exigem MENOS energia de mantença que corte.
    // Intercepto cravado em 74.0 kcal/kg^0.75 PCVZ (redutor de 8.5% sobre 80.3).
    const elmKcal = this.ELM_INTERCEPT * Math.pow(pcvz, 0.75);
    const elmMcal = elmKcal / 1000;

    // ========================================================================
    // 2. DIFERENCIAÇÃO SEXUAL NO CRESCIMENTO (ELg)
    // ========================================================================
    let elgMcal = 0;
    if (gpcvz > 0) {
      if (input.sexo === 'Fêmea') {
        // Fêmeas leiteiras depositam energia (gordura mamária/corporal) mais cedo
        elgMcal = gpcvz * (0.301 * Math.pow(pcvz, 0.75));
      } else {
        // Machos leiteiros têm maior turnover proteico e depositam menos gordura
        elgMcal = gpcvz * (0.265 * Math.pow(pcvz, 0.75));
      }
    }

    // ========================================================================
    // 3. MODELO DE GESTAÇÃO EXPONENCIAL (PRECISÃO DIÁRIA)
    // ========================================================================
    const gestacao = { energiaMcal: 0, proteinaG: 0, caG: 0, pG: 0, mgG: 0 };
    
    if (input.isGestante) {
      let dias = input.diasGestacao;
      
      // Trava de Segurança Gestacional
      if (dias > 150) {
        dias = 150;
        logs.warnings.push("WARNING: Gestação > 150 dias. Cálculo travado no dia 150 para evitar erro de estouro matemático (infinito) no modelo exponencial.");
      }

      // Somatória Aditiva: Útero Grávido + Glândula Mamária
      const energiaUteroKcal = 68 * Math.exp(0.03396 * dias);
      const energiaMamaKcal = 312 * Math.exp(0.0211 * dias);
      gestacao.energiaMcal = (energiaUteroKcal + energiaMamaKcal) / 1000;

      const proteinaUtero = 7.11 * Math.exp(0.03689 * dias);
      const proteinaMama = 13 * Math.exp(0.0237 * dias);
      gestacao.proteinaG = proteinaUtero + proteinaMama;

      // Minerais (já contemplam prêmio de desenvolvimento fetal gemelar)
      gestacao.caG = 0.379 * Math.exp(0.0352 * dias);
      gestacao.pG = 0.470 * Math.exp(0.0309 * dias);
      gestacao.mgG = 0.0436 * Math.exp(0.0296 * dias);
    }

    // ========================================================================
    // 4. MODELO DE LACTAÇÃO (FALLBACK OBRIGATÓRIO)
    // ========================================================================
    const lactacao = { lcg: 0, fatorF: 1 };

    if (input.isLactante) {
      if (input.diasLactacao <= 0) {
        logs.info.push("Dias em Lactação <= 0. Exigência de Fator F e LCG zeradas (animal em transição pré-parto).");
      } else {
        logs.warnings.push("WARNING_LACTATION_GAP: LACUNA BR-COR 2024. Aplicando modelo de Fallback (Gallo & Tedeschi) para ajuste de consumo e LCG.");
        
        // Leite Corrigido para Gordura (LCG)
        const prod = input.producaoLeite || 0;
        const gordura = input.gorduraLeite || 0;
        lactacao.lcg = (0.3688 + 0.0971 * gordura) * prod;

        // Fator F (Ajuste de Consumo CMS)
        const ppl = 40; // Pico de lactação em dias
        const rp = input.tipoParto === 'Gemelar' ? 0.88 : 0.66;
        const dl = input.diasLactacao;
        
        lactacao.fatorF = (1 + rp * (dl / ppl) * Math.exp(1.4 * (1 - dl / ppl))) / (1 + rp);
      }
    }

    return {
      pcvz,
      elm: elmMcal,
      elg: elgMcal,
      gestacao,
      lactacao,
      logs
    };
  }

  /**
   * Middleware de Segurança Gestacional (Toxicidade NNP)
   */
  public static validateDietGestacao(diasGestacao: number, ureiaTotalMS: number) {
    // SEG_GESTACAO_TOXICIDADE_NNP
    if (diasGestacao > 120 && ureiaTotalMS > 1.0) {
      throw new Error(JSON.stringify({
        codigo: "FATAL_ALKALOSIS_RISK",
        mensagem: "Risco Crítico de Alcalose: Em gestações avançadas (> 120 dias), a inclusão de Ureia não pode exceder 1.0% da Matéria Seca."
      }));
    }
  }
}
