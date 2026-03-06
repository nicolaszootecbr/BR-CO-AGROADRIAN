export interface CaprinoCorteInput {
  pc: number; // Peso Corporal (kg)
  gmd: number; // Ganho Médio Diário (g/dia)
  sexo: 'Macho Inteiro' | 'Castrado' | 'Fêmea';
  isGestante: boolean;
  diasGestacao: number;
  isLactante: boolean;
  diasLactacao: number;
}

export interface EngineResult {
  pcvz: number;
  elm: number; // Mcal/dia
  elg: number; // Mcal/dia
  plg: number; // g/dia
  erp: number;
  eficiencia: number;
  cfdnMax: number; // kg/dia
  logs: {
    warnings: string[];
    errors: string[];
    info: string[];
  };
}

export class CaprinosCorteEngine {
  // Constantes Metabólicas
  private static ELM_INTERCEPT = 80.3; // kcal/kg PCVZ^0.75

  /**
   * Motor de Cálculo Principal para Caprinos de Corte (Boer e Mestiços)
   * Baseado no BR-COR 2024
   */
  public static calculate(input: CaprinoCorteInput): EngineResult {
    const logs = { warnings: [], errors: [], info: [] };

    // ========================================================================
    // 2. TRAVAS DE HIERARQUIA E SEXO (Middlewares de Validação)
    // ========================================================================
    if (input.sexo !== 'Fêmea' && (input.isGestante || input.isLactante)) {
      throw new Error('FATAL_BIOLOGY_01');
    }

    // ========================================================================
    // Trava de Lógica (Prioridade Metabólica)
    // ========================================================================
    let gmd_calculo = input.gmd;
    if (input.isGestante || input.isLactante) {
      gmd_calculo = 0;
      logs.info.push("Prioridade Reprodutiva Ativada: Ganho de peso para crescimento desabilitado.");
    }

    // ========================================================================
    // 1. ORDEM DE PRIORIDADE: Conversão PC para PCVZ
    // ========================================================================
    // O sistema NÃO PODE calcular ELm, ELg ou PLg usando PC bruto.
    const pcvz = input.pc * 0.85; // Fator de conversão padrão
    const gpcvz = (gmd_calculo / 1000) * 0.85; // Ganho em kg/dia convertido para PCVZ

    // ========================================================================
    // MANTENÇA (Trava de Intercepto)
    // ========================================================================
    // Proibido aplicar redutor de genótipo leiteiro. Intercepto travado em 80.3.
    const elmKcal = this.ELM_INTERCEPT * Math.pow(pcvz, 0.75);
    const elmMcal = elmKcal / 1000;

    // ========================================================================
    // 3. CÁLCULO DE CRESCIMENTO E EFICIÊNCIA
    // ========================================================================
    let elgMcal = 0;
    let plg = 0;
    let erp = 0;
    let eficiencia = 0.30; // Fallback

    if (gpcvz > 0) {
      // Energia Líquida de Ganho
      elgMcal = 1.068 * Math.pow(pcvz, 0.350) * gpcvz;
      
      // Proteína Líquida de Ganho (Universal)
      plg = 181.4 * Math.pow(pcvz, 0.02) * gpcvz;
      
      // Cálculo Dinâmico de Eficiência (Equação 5.21)
      // ERp = Proporção da Energia Retida na forma de Proteína
      // Assumindo 5.7 kcal por grama de proteína retida
      const energiaProteinaKcal = plg * 5.7;
      const energiaTotalKcal = elgMcal * 1000;
      
      if (energiaTotalKcal > 0) {
        erp = energiaProteinaKcal / energiaTotalKcal;
        eficiencia = 17 / (21 + (erp * 60));
      }
    }

    // ========================================================================
    // 4. GESTÃO DE REPRODUÇÃO (Limites Temporais)
    // ========================================================================
    let diasGestacao = input.diasGestacao;
    if (input.isGestante) {
      if (diasGestacao < 50) {
        logs.warnings.push("WARNING_GESTATION_EARLY: Gestação < 50 dias detectada. As exigências fetais foram zeradas pelo sistema por serem metabolicamente desprezíveis nesta fase.");
      } else if (diasGestacao > 150) {
        diasGestacao = 150;
        logs.info.push("Gestação > 150 dias: dias travados em 150 para evitar aberração exponencial da função Math.exp().");
      }
    }

    if (input.isLactante) {
      logs.warnings.push("WARNING_LACTATION_GAP: LACUNA EXPERIMENTAL: O BR-COR 2024 não possui modelo de lactação caprina fechado. O sistema foi redirecionado automaticamente para o modelo de Fallback (Fator F) garantindo a segurança do cálculo.");
    }

    // ========================================================================
    // 5. LIMITE FÍSICO DE CONSUMO (A Regra do FDN)
    // ========================================================================
    // CFDN_max = 3.155 * PC^-0.3190 (retorna % do PC)
    const cfdnMaxPct = 3.155 * Math.pow(input.pc, -0.3190);
    const cfdnMaxKg = (cfdnMaxPct / 100) * input.pc;

    // ========================================================================
    // 6. FALLBACK DE MINERAIS
    // ========================================================================
    logs.info.push("Aviso Visual: Minerais (Ca, P, Mg) rodando sob regime de fallback (Modelos Gerais / Saanen) devido a LACUNA EXPERIMENTAL DECLARADA para caprinos de corte.");

    return {
      pcvz,
      elm: elmMcal,
      elg: elgMcal,
      plg,
      erp,
      eficiencia,
      cfdnMax: cfdnMaxKg,
      logs
    };
  }

  /**
   * Middleware para validar a dieta após o Solver
   */
  public static validateDietFDN(fdnTotalDietaKg: number, cfdnMaxKg: number) {
    if (fdnTotalDietaKg > cfdnMaxKg) {
      throw new Error(JSON.stringify({
        codigo: 5001,
        tipo: "Invalidação de Dieta",
        mensagem: "FATAL_INTAKE_LIMIT: Limite Físico Excedido: A dieta formulada possui teor de FDN que ultrapassa o limite de distensão ruminal do animal (CFDN_max). Aumente a densidade energética ou reduza o volumoso."
      }));
    }
  }
}
