import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Ingredient } from '../types';

interface NutriCoreDB extends DBSchema {
  ingredients: {
    key: string;
    value: Ingredient;
  };
}

const banco_dados_completo = {
  volumosos: [
    { id: "V01", nome: "Palma Forrageira", ms: 11.3, PB: 4.24, EE: 1.8, FDN: 29.08, NDT: 70.7, Ca_gkg: 35, P_gkg: 2, tipo: "Cocho/Cactácea" },
    { id: "V02", nome: "Palma Miúda", PB: 3.55, FDN: 24.49, NDT: 70.7, tipo: "Cocho/Cactácea", Ca: 3.2, P: 0.15 },
    { id: "V03", nome: "Capim Buffel", PB: 6.08, FDN: 79.12, NDT: 55.0, tipo: "Pasto/Nativa", Ca: 0.4, P: 0.15 },
    { id: "V04", nome: "Feno de Tifton 85", ms: 88.94, PB: 9.69, EE: 1.55, FDN: 71.04, NDT: 67.8, Ca_gkg: 4, P_gkg: 2, tipo: "Cocho/Fornecido" },
    { id: "V05", nome: "Silagem de Sorgo", ms: 29.76, PB: 6.45, EE: 2.53, FDN: 58.59, NDT: 50.0, Ca_gkg: 3, P_gkg: 2, tipo: "Cocho/Fornecido" },
    { id: "V06", nome: "Silagem de Sorgo", PB: 7.20, FDN: 52.00, NDT: 72.8, tipo: "Cocho/Fornecido", Ca: 0.3, P: 0.2 },
    { id: "V07", nome: "Capim Elefante", ms: 27.7, PB: 5.47, EE: 2.23, FDN: 67.27, NDT: 66.7, Ca_gkg: 4, P_gkg: 2, tipo: "Cocho/Fornecido" },
    { id: "V08", nome: "Feno de Maniçoba", PB: 12.17, FDN: 49.54, NDT: 51.63, tipo: "Nativa/Regional", Ca: 1.2, P: 0.25 },
    { id: "V09", nome: "Feno de Leucena", PB: 19.89, FDN: 59.26, NDT: 54.67, tipo: "Nativa/Regional", Ca: 1.5, P: 0.25 },
    { id: "V10", nome: "Silagem de Gliricídia", PB: 14.76, FDN: 60.30, NDT: 60.0, tipo: "Nativa/Regional", Ca: 1.4, P: 0.25 },
    { id: "V11", nome: "Feno de Jurema Preta", PB: 14.30, FDN: 35.80, NDT: 52.0, tipo: "Nativa/Regional", Ca: 1.1, P: 0.2 },
    { id: "V12", nome: "Cana-de-açúcar fresca", ms: 28.77, PB: 2.76, EE: 1.34, FDN: 49.73, NDT: 75.0, Ca_gkg: 2, P_gkg: 1, tipo: "Cocho/Fornecido" }
  ],
  concentrados: [
    { id: "C01", nome: "Milho Amarelo (Fubá)", PB: 9.20, FDN: 12.50, NDT: 88.0, cat: "Energético", Ca: 0.03, P: 0.3 },
    { id: "C02", nome: "Farelo de Soja", PB: 48.50, FDN: 14.80, NDT: 82.0, cat: "Proteico", Ca: 0.3, P: 0.6 },
    { id: "C03", nome: "Raspa de Mandioca", PB: 3.93, FDN: 13.64, NDT: 78.5, cat: "Energético", Ca: 0.1, P: 0.1 },
    { id: "C04", nome: "Torta de Licuri", PB: 6.40, FDN: 52.90, NDT: 62.0, cat: "Proteico/Regional", Ca: 0.15, P: 0.4 },
    { id: "C05", nome: "Subproduto de Caju", PB: 15.21, FDN: 68.02, NDT: 45.10, cat: "Regional/Fibroso", Ca: 0.1, P: 0.2 }
  ],
  minerais_e_nnp: [
    { id: "M01", nome: "Sal Mineral (SM)", PB: 0, NDT: 0, Ca_gkg: 180, P_gkg: 90 },
    { id: "M02", nome: "Sal Comum (NaCl)", PB: 0, NDT: 0, tipo: "Mineral" },
    { id: "M03", nome: "Fosfato Bicálcico", PB: 0, NDT: 0, Ca_gkg: 240, P_gkg: 180 },
    { id: "M04", nome: "Calcário Calcítico", PB: 0, NDT: 0, Ca_gkg: 380, P_gkg: 0 },
    { id: "N01", nome: "Ureia Pecuária", PB: 281, NDT: 0, tipo: "NNP" },
    { 
      id: "M05", 
      nome: "Ovinofós (Tortuga)", 
      PB: 0, NDT: 0, 
      Ca_gkg: 122.5, // Média (110 a 135)
      P_gkg: 87, 
      Na_gkg: 147,
      Cu: 590, 
      Zn: 3800, 
      Mn: 2000, 
      Co: 15, 
      tipo: "Mineral" 
    },
    { 
      id: "M06", 
      nome: "Caprinofós (Tortuga)", 
      PB: 0, NDT: 0, 
      Ca_gkg: 249.5, 
      P_gkg: 71, 
      Mg_gkg: 20, 
      Na_gkg: 0, 
      Cu: 400, 
      Zn: 1700, 
      Mn: 1350, 
      Fe: 2500, 
      Co: 30, 
      tipo: "Mineral" 
    },
    { 
      id: "M07", 
      nome: "Ovinofós Núcleo Proteico", 
      PB: 562.5, 
      NDT: 0, 
      Ca_gkg: 115, 
      P_gkg: 40, 
      Na_gkg: 90, 
      Cu: 140, 
      Zn: 1300, 
      Mn: 700, 
      tipo: "Mineral/NNP" 
    }
  ]
};

const mapIngredient = (item: any, defaultCategory: string): Ingredient => {
  // Tratamento de Atributos Regionais
  const isRegional = item.tipo?.includes('Regional') || item.cat?.includes('Regional');
  const name = isRegional ? `${item.nome} [Regional]` : item.nome;

  // Mapeamento de Chaves (Sanitização)
  // Ca_gkg e P_gkg vêm em g/kg (ex: 180g/kg = 18%). Dividimos por 10 para obter a %.
  const ca = item.Ca_gkg !== undefined ? item.Ca_gkg / 10 : (item.Ca || 0);
  const p = item.P_gkg !== undefined ? item.P_gkg / 10 : (item.P || 0);
  const na = item.Na_gkg !== undefined ? item.Na_gkg / 10 : (item.Na || 0);
  const mg = item.Mg_gkg !== undefined ? item.Mg_gkg / 10 : (item.Mg || 0);
  
  // Determinando MS baseada no nome/tipo se não fornecida
  let ms = 88;
  if (name.toLowerCase().includes('palma')) ms = 12;
  else if (name.toLowerCase().includes('silagem')) ms = 30;
  else if (name.toLowerCase().includes('capim')) ms = 25;
  else if (name.toLowerCase().includes('sal') || name.toLowerCase().includes('fosfato') || name.toLowerCase().includes('calcário') || name.toLowerCase().includes('ureia') || name.toLowerCase().includes('fós')) ms = 99;

  // Preços baseados em estimativas comuns (usuário pode editar depois)
  let price = 1.00;
  if (defaultCategory === 'Volumoso') price = 0.30;
  if (defaultCategory === 'Concentrado') price = 1.50;
  if (defaultCategory === 'Mineral' || defaultCategory === 'NNP') price = 4.00;

  return {
    id: item.id,
    name,
    category: item.cat || item.tipo || defaultCategory,
    price,
    ms: item.ms || ms,
    pb: item.PB || 0,
    pdr: item.PB ? item.PB * 0.65 : 0, // Estimativa padrão
    ndt: item.NDT || 0,
    fdn: item.FDN || 0,
    ee: item.EE || (defaultCategory === 'Mineral' || defaultCategory === 'NNP' ? 0 : 2.0),
    ca,
    p,
    na,
    mg,
    k: item.K || 0,
    cu: item.Cu || 0,
    zn: item.Zn || 0,
    mn: item.Mn || 0,
    fe: item.Fe || 0,
    co: item.Co || 0,
    cr: item.Cr || 0,
    isEditable: true
  };
};

const INITIAL_INGREDIENTS: Ingredient[] = [
  ...banco_dados_completo.volumosos.map(i => mapIngredient(i, 'Volumoso')),
  ...banco_dados_completo.concentrados.map(i => mapIngredient(i, 'Concentrado')),
  ...banco_dados_completo.minerais_e_nnp.map(i => mapIngredient(i, 'Mineral'))
];

let dbPromise: Promise<IDBPDatabase<NutriCoreDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<NutriCoreDB>('NutriCoreDB', 5, {
      upgrade(db, oldVersion) {
        if (oldVersion < 5) {
          if (db.objectStoreNames.contains('ingredients')) {
            db.deleteObjectStore('ingredients');
          }
        }
        if (!db.objectStoreNames.contains('ingredients')) {
          const store = db.createObjectStore('ingredients', { keyPath: 'id' });
          INITIAL_INGREDIENTS.forEach(ing => store.put(ing));
        }
      },
    });
  }
  return dbPromise;
};

export const getIngredients = async (): Promise<Ingredient[]> => {
  const db = await initDB();
  return db.getAll('ingredients');
};

export const updateIngredient = async (id: string, updates: Partial<Ingredient>): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('ingredients', 'readwrite');
  const store = tx.objectStore('ingredients');
  const ing = await store.get(id);
  if (ing) {
    await store.put({ ...ing, ...updates });
  }
  await tx.done;
};
