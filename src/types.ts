export type Species = 'Ovino' | 'Caprino';
export type Biotype = 'Corte' | 'Leite';
export type SexClass = 'Macho Inteiro' | 'Castrado' | 'Fêmea';

export interface Biometrics {
  species: Species;
  biotype: Biotype;
  sexClass: SexClass;
  pc: number; // Peso Vivo (kg)
  gmd: number; // Ganho Médio Diário (g/dia)
  dl: number; // Dias em Lactação ou Gestação
  isPregnant: boolean;
  isLactating: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'Volumoso' | 'Concentrado' | 'Mineral' | 'NNP';
  price: number; // R$/kg
  ms: number; // Matéria Seca (%)
  pb: number; // Proteína Bruta (% MS)
  pdr: number; // Proteína Degradável no Rúmen (% PB)
  ndt: number; // Nutrientes Digestíveis Totais (% MS)
  fdn: number; // Fibra em Detergente Neutro (% MS)
  ee: number; // Extrato Etéreo (% MS)
  ca: number; // Cálcio (% MS)
  p: number; // Fósforo (% MS)
  cu: number; // Cobre (mg/kg MS)
  zn: number; // Zinco (mg/kg MS)
  mn: number; // Manganês (mg/kg MS)
  fe: number; // Ferro (mg/kg MS)
  mg: number; // Magnésio (% MS)
  na: number; // Sódio (% MS)
  k: number;  // Potássio (% MS)
  co: number; // Cobalto (mg/kg MS)
  cr: number; // Cromo (mg/kg MS)
  isEditable: boolean; // Only price and MS are editable by user
}

export interface DietItem {
  ingredientId: string;
  inclusionMS: number; // % in Dry Matter
}

export interface Diet {
  items: DietItem[];
}

export interface RequirementsTrace {
  pcvz: number;
  pesoMetabolico: number;
  cmsEquacao: string;
  cfdnMax: number;
  elmIntercepto: number;
  elgEquacao: string;
  elgestDerivada: string;
  pm: number;
  pbmic: number;
  pdrMeta: number;
  pndrMeta: number;
  pbMant: number;
  pbGanho: number;
  plm: number;
  plg: number;
  caMant: number;
  caGanho: number;
  pMant: number;
  pGanho: number;
  caGestacaoFormula: string;
  pGestacaoFormula: string;
}

export interface Requirements {
  cms: number; // Consumo de Matéria Seca (kg/dia)
  elm: number; // Energia Líquida de Mantença (Mcal/dia)
  elg: number; // Energia Líquida de Ganho (Mcal/dia)
  elgest: number; // Energia Líquida de Gestação (Mcal/dia)
  ellac: number; // Energia Líquida de Lactação (Mcal/dia)
  pb: number; // PB exigida (g/dia)
  ndt: number; // NDT exigido (g/dia)
  ca: number; // Ca exigido (g/dia)
  p: number; // P exigido (g/dia)
  mg: number; // Mg exigido (g/dia)
  na: number; // Na exigido (g/dia)
  k: number; // K exigido (g/dia)
  pbmic: number; // Proteína Microbiana (g/dia)
  trace?: RequirementsTrace;
}

export interface DietAnalysis {
  cmsTotal: number;
  ndtTotal: number;
  edMcalKg: number;
  emMcalKg: number;
  q: number;
  km: number;
  kg: number;
  elmMcalKg: number;
  elgMcalKg: number;
  elFornecidaMcal: number;
  elMantençaFornecidaMcal: number;
  elGanhoFornecidaMcal: number;
  pbTotal: number;
  pdrTotal: number;
  fdnTotal: number;
  eeTotal: number;
  caTotal: number;
  pTotal: number;
  cuTotal: number;
  znTotal: number;
  mgTotal: number;
  naTotal: number;
  kTotal: number;
  coTotal: number;
  crTotal: number;
  caIngeridoG: number;
  pIngeridoG: number;
  mgIngeridoG: number;
  naIngeridoG: number;
  kIngeridoG: number;
  cuIngeridoMg: number;
  znIngeridoMg: number;
  coIngeridoMg: number;
  crIngeridoMg: number;
  ureaTotal: number; // % MS
  costPerKgMS: number;
  costPerHeadDay: number;
  pmFornecida: number;
  warnings: string[];
  errors: string[];
}
