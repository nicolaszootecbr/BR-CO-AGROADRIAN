export interface IngredienteDB {
  id: string;
  nome: string;
  categoria: 'Volumoso' | 'Concentrado Energético' | 'Concentrado Proteico' | 'Mineral' | 'NNP';
  ms: number; // %
  pb: number; // % na MS
  ee: number; // % na MS
  fdn: number; // % na MS
  fda: number; // % na MS
  lignina: number; // % na MS
  mm: number; // % na MS
  ndt: number | null; // % na MS (Pode ser nulo para acionar a âncora)
  ca: number; // g/kg MS
  p: number; // g/kg MS
  preco_mn: number; // R$/kg na Matéria Natural
  
  // Microminerais (mg/kg MS)
  cu?: number;
  zn?: number;
  mn?: number;
  fe?: number;
  
  // Vitaminas (UI/kg)
  vitA?: number;
  vitD3?: number;
  vitE?: number;
  
  isEditable: boolean;
}

export interface DietaItem {
  ingrediente: IngredienteDB;
  inclusaoMS: number; // % na MS
}

export class InventoryEngine {
  // ========================================================================
  // 4. LÓGICA DE RECONCILIAÇÃO BR-COR 2024 (Âncoras)
  // ========================================================================
  private static ANCORAS_NDT: Record<string, number> = {
    'palma': 70.7,
    'milho': 88.0,
    'soja': 80.0,
    'buffel': 52.0,
    'manicoba': 58.0,
    'licuri': 70.0,
    'mandioca': 85.0
  };

  // ========================================================================
  // 3. REGRAS DE OURO PARA MINERAIS (DSM Tortuga) - Single Source of Truth
  // ========================================================================
  private static MINERAIS_TRAVADOS: IngredienteDB[] = [
    {
      id: "M01", nome: "Ovinofós (DSM Tortuga)", categoria: "Mineral",
      ms: 99.0, pb: 0, ee: 0, fdn: 0, fda: 0, lignina: 0, mm: 95, ndt: 0,
      ca: 122.5, p: 87.0, cu: 590.0, zn: 3800.0, preco_mn: 5.20, isEditable: false
    },
    {
      id: "M02", nome: "Caprinofós (DSM Tortuga)", categoria: "Mineral",
      ms: 99.0, pb: 0, ee: 0, fdn: 0, fda: 0, lignina: 0, mm: 95, ndt: 0,
      ca: 249.5, p: 71.0, cu: 400.0, zn: 1700.0, fe: 2500.0, 
      vitA: 135000, vitD3: 68000, vitE: 450, preco_mn: 5.80, isEditable: false
    },
    {
      id: "N01", nome: "Ureia Pecuária", categoria: "NNP",
      ms: 99.0, pb: 281, ee: 0, fdn: 0, fda: 0, lignina: 0, mm: 0, ndt: 0,
      ca: 0, p: 0, preco_mn: 3.20, isEditable: false
    }
  ];

  /**
   * Sanitizador de Dados: Aplica âncoras de NDT se o valor for nulo
   */
  public static sanitizeIngredient(ing: Partial<IngredienteDB>): IngredienteDB {
    let ndt = ing.ndt;
    if (ndt === null || ndt === undefined) {
      // Busca âncora pelo nome (simplificado)
      const key = Object.keys(this.ANCORAS_NDT).find(k => ing.nome?.toLowerCase().includes(k));
      ndt = key ? this.ANCORAS_NDT[key] : 60.0; // Fallback genérico
    }

    return {
      ...ing,
      ndt
    } as IngredienteDB;
  }

  /**
   * Filtra ingredientes baseados na espécie (Regra de Ouro)
   */
  public static filterBySpecies(ingredients: IngredienteDB[], especie: 'Ovino' | 'Caprino'): IngredienteDB[] {
    return ingredients.filter(ing => {
      if (especie === 'Ovino' && ing.id === 'M02') return false; // Bloqueia Caprinofós
      if (especie === 'Caprino' && ing.id === 'M01') return false; // Bloqueia Ovinofós
      return true;
    });
  }

  // ========================================================================
  // 2. NORMALIZAÇÃO DE MATÉRIA SECA (MS) vs. NATURAL (MN)
  // ========================================================================
  
  /**
   * Converte kg de MS para kg de MN
   */
  public static msToMn(kgMS: number, msPct: number): number {
    if (msPct <= 0) return 0;
    return kgMS / (msPct / 100);
  }

  /**
   * Converte kg de MN para kg de MS
   */
  public static mnToMs(kgMN: number, msPct: number): number {
    return kgMN * (msPct / 100);
  }

  // ========================================================================
  // 5. CÁLCULO DE CUSTOS E KPIs FINANCEIROS
  // ========================================================================
  
  public static calculateKPIs(dieta: DietaItem[], cmsTotalKg: number) {
    let custoTotalDia = 0;
    let energiaTotalMcal = 0;
    let pbTotalKg = 0;

    dieta.forEach(item => {
      const kgMS = cmsTotalKg * (item.inclusaoMS / 100);
      const kgMN = this.msToMn(kgMS, item.ingrediente.ms);
      
      // Custo é SEMPRE sobre a Matéria Natural
      custoTotalDia += kgMN * item.ingrediente.preco_mn;
      
      // 1 kg NDT ~= 4.409 Mcal DE
      energiaTotalMcal += (kgMS * (item.ingrediente.ndt! / 100)) * 4.409;
      pbTotalKg += kgMS * (item.ingrediente.pb / 100);
    });

    const custoPorKgMS = custoTotalDia / cmsTotalKg;
    const custoPorMcal = energiaTotalMcal > 0 ? custoTotalDia / energiaTotalMcal : 0;
    const custoPorKgPB = pbTotalKg > 0 ? custoTotalDia / pbTotalKg : 0;

    return {
      custoCabecaDia: custoTotalDia,
      custoPorKgMS,
      custoPorMcal,
      custoPorKgPB
    };
  }

  // ========================================================================
  // 6. INTERFACE DE COMPARAÇÃO DE CENÁRIOS (Split Screen)
  // ========================================================================
  
  public static compareScenarios(dietaA: DietaItem[], dietaB: DietaItem[], cmsTotalKg: number) {
    const kpiA = this.calculateKPIs(dietaA, cmsTotalKg);
    const kpiB = this.calculateKPIs(dietaB, cmsTotalKg);

    const calcMinerais = (dieta: DietaItem[]) => {
      let caTotal = 0;
      let pTotal = 0;
      dieta.forEach(item => {
        const kgMS = cmsTotalKg * (item.inclusaoMS / 100);
        caTotal += kgMS * item.ingrediente.ca; // g/kg * kg = g
        pTotal += kgMS * item.ingrediente.p;
      });
      return { caTotal, pTotal };
    };

    const minA = calcMinerais(dietaA);
    const minB = calcMinerais(dietaB);

    return {
      diferencaCustoDia: kpiA.custoCabecaDia - kpiB.custoCabecaDia,
      diferencaCustoMcal: kpiA.custoPorMcal - kpiB.custoPorMcal,
      variacaoCa: minA.caTotal - minB.caTotal,
      variacaoP: minA.pTotal - minB.pTotal,
      cenarioMaisBarato: kpiA.custoCabecaDia < kpiB.custoCabecaDia ? 'Dieta A' : 'Dieta B'
    };
  }
}
