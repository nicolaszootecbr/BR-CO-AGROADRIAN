export interface ProteinaInput {
  cmsTotalKg: number; // Consumo de Matéria Seca Total em kg
  ndtDietaPct: number; // % NDT na dieta
  pbDietaPct: number; // % PB na dieta
  pdrFornecidaG: number; // PDR fornecida em gramas
  pbTotalG: number; // PB total consumida em gramas
  modTotalKg: number; // Matéria Orgânica Degradável em kg
  eeDietaPct: number; // % Extrato Etéreo na dieta
  ureiaDietaPct: number; // % Ureia na dieta
  diasGestacao: number; // Dias de gestação (0 se não gestante)
}

export interface ProteinaResult {
  pbmic: number; // Proteína Microbiana sintetizada (g/dia)
  cndtKg: number; // Consumo de NDT em kg
  penalidadeFdnPct: number; // % de penalidade na digestibilidade da fibra
  logs: {
    warnings: string[];
    errors: string[];
    info: string[];
  };
}

export class FluxoProteicoEngine {
  /**
   * Motor de Auditoria Bioquímica e Sincronismo Proteína/Energia
   * Baseado no BR-COR 2024
   */
  public static audit(input: ProteinaInput): ProteinaResult {
    const logs = { warnings: [], errors: [], info: [] };
    let penalidadeFdnPct = 0;

    // ========================================================================
    // 1. MOTOR DE SÍNTESE MICROBIANA (PBmic)
    // ========================================================================
    // CNDT deve ser estritamente em quilogramas
    const cndtKg = input.cmsTotalKg * (input.ndtDietaPct / 100);
    
    // PBmic (g/dia) = 12.7311 + (59.2956 * CNDT)
    const pbmic = 12.7311 + (59.2956 * cndtKg);

    // ========================================================================
    // 5. SINCRONISMO PDR/NDT E DESPERDÍCIO
    // ========================================================================
    // No BR-COR 2024, a exigência de PDR é exatamente igual à PBmic
    const pdrExigida = pbmic;

    if (input.pdrFornecidaG < pdrExigida) {
      logs.warnings.push("WARN_FOME_MICROBIANA: FOME MICROBIANA DETECTADA. Há energia (NDT) abundante, mas falta PDR. Microrganismos não conseguirão se multiplicar. Adicione fontes de PDR (ex: Ureia, Farelos solúveis) ou a energia da dieta será perdida nas fezes.");
    } else if (input.pdrFornecidaG > (pdrExigida * 1.05)) {
      logs.warnings.push("WARN_DESPERDICIO_NITROGENIO: DESPERDÍCIO E TOXICIDADE. O rúmen não tem energia (CNDT) suficiente para capturar esta PDR. O excesso de amônia será absorvido, convertido em ureia no fígado (gastando energia do animal) e excretado na urina. Reduza a proteína degradável.");
    }

    // ========================================================================
    // 2. TRAVA DE NITROGÊNIO BASAL (AUDITORIA DE FIBRA)
    // ========================================================================
    if (input.pbDietaPct < 11.0) {
      penalidadeFdnPct = 15.0; // Aplica 15% de penalidade na digestibilidade da fibra
      logs.warnings.push("WARN_NITROGENIO_BASAL: PB da dieta < 11.0%. Falta de nitrogênio amoniacal (N-NH3) no ambiente ruminal. Aplicando penalidade de 15% na digestibilidade da fibra (estase ruminal).");
    }

    // ========================================================================
    // 3. RÁCIO ESTEQUIOMÉTRICO PB/MOd
    // ========================================================================
    if (input.modTotalKg > 0) {
      const racioPbMod = input.pbTotalG / input.modTotalKg;
      if (racioPbMod < 191.0) {
        logs.errors.push("ALERTA VERMELHO: Desacoplamento Energético. A taxa de liberação de energia está mais rápida que a disponibilidade de nitrogênio (Rácio PB/MOd < 191 g/kg).");
      }
    }

    // ========================================================================
    // 4. MIDDLEWARE DE SEGURANÇA LIPÍDICA (TRAVA DE EXTRATO ETÉREO)
    // ========================================================================
    if (input.eeDietaPct > 7.0) {
      throw new Error(JSON.stringify({
        codigo: "FATAL_LIPID_TOXICITY",
        mensagem: "TOXICIDADE LIPÍDICA RUMINAL: EE > 7.0% da MS. Inibição das bactérias celulolíticas por recobrimento físico da fibra. Dieta bloqueada."
      }));
    }

    // ========================================================================
    // 6. TRAVA DE UREIA (NNP) EM GESTAÇÃO
    // ========================================================================
    if (input.diasGestacao > 120 && input.ureiaDietaPct > 1.0) {
      throw new Error(JSON.stringify({
        codigo: "FATAL_ALKALOSIS_RISK",
        mensagem: "Risco Crítico de Alcalose: Em gestações avançadas (> 120 dias), a inclusão de Ureia não pode exceder 1.0% da Matéria Seca."
      }));
    }

    return {
      pbmic,
      cndtKg,
      penalidadeFdnPct,
      logs
    };
  }
}
