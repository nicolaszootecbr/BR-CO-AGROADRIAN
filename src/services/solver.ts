import solver from 'javascript-lp-solver';
import { Ingredient, Requirements } from '../types';

export const solveDiet = (ingredients: Ingredient[], reqs: Requirements) => {
  // We want to minimize cost while meeting EM, PB, Ca, P requirements
  // Variables: ingredients (kg MS)
  // Constraints:
  // sum(kg MS) = reqs.cms
  // sum(EM * kg MS) >= targetEM
  // sum(PB * kg MS) >= reqs.pb
  // sum(Ca * kg MS) >= reqs.ca
  // sum(P * kg MS) >= reqs.p

  // Aproximação linear para o Solver:
  // Como km e kg dependem da densidade energética da dieta (não-linear),
  // assumimos valores típicos (km = 0.70, kg = 0.42) para gerar uma meta de EM em Mcal.
  const targetEM = ((reqs.elm + reqs.elgest + reqs.ellac) / 0.70) + (reqs.elg / 0.42);

  const model: any = {
    optimize: 'cost',
    opType: 'min',
    constraints: {
      cms: { equal: reqs.cms },
      em: { min: targetEM },
      pb: { min: reqs.pb / 1000 }, // Convert g to kg
      ca: { min: reqs.ca / 1000 },
      p: { min: reqs.p / 1000 },
      ee: { max: reqs.cms * 0.07 }, // Max 7% EE
      urea: { max: reqs.cms * 0.01 }, // Max 1% Urea (NNP)
      ca_p_min: { min: 0 }, // Ca - 1.5 * P >= 0
      ca_p_max: { max: 0 }  // Ca - 2.0 * P <= 0
    },
    variables: {},
    ints: {}
  };

  const hasMineral = ingredients.some(ing => ing.category === 'Mineral');
  if (hasMineral) {
    model.constraints.mineral = { min: reqs.cms * 0.015 }; // Min 1.5% Mineral
  }

  const hasVolumoso = ingredients.some(ing => ing.category === 'Volumoso');
  if (hasVolumoso) {
    model.constraints.volumoso = { min: reqs.cms * 0.30 }; // Min 30% Volumoso
  }

  ingredients.forEach(ing => {
    const caKg = ing.ca / 100;
    const pKg = ing.p / 100;
    
    // O custo deve ser baseado na Matéria Natural (MN)
    const costPerKgMS = ing.price / (ing.ms / 100);
    
    // Calcula a EM do ingrediente (Mcal/kg)
    const emMcalKg = (ing.ndt / 100) * 4.409 * 0.82;

    model.variables[ing.id] = {
      cost: costPerKgMS,
      cms: 1,
      em: emMcalKg,
      pb: ing.pb / 100,
      ca: caKg,
      p: pKg,
      ee: ing.ee / 100,
      urea: ing.category === 'NNP' ? 1 : 0,
      mineral: ing.category === 'Mineral' ? 1 : 0,
      volumoso: ing.category === 'Volumoso' ? 1 : 0,
      ca_p_min: caKg - 1.5 * pKg,
      ca_p_max: caKg - 2.0 * pKg
    };
  });

  const result = solver.Solve(model) as any;
  
  // Convert result to DietItem[]
  const items = [];
  let totalInclusion = 0;

  for (const [key, value] of Object.entries(result)) {
    if (key !== 'feasible' && key !== 'result' && key !== 'bounded' && key !== 'isIntegral') {
      const kgMS = value as number;
      if (kgMS > 0) {
        const inclusionMS = Number(((kgMS / reqs.cms) * 100).toFixed(2));
        items.push({
          ingredientId: key,
          inclusionMS
        });
        totalInclusion += inclusionMS;
      }
    }
  }

  // Adjust the last item to make the sum exactly 100.00
  if (items.length > 0) {
    const diff = 100 - totalInclusion;
    items[items.length - 1].inclusionMS = Number((items[items.length - 1].inclusionMS + diff).toFixed(2));
  }

  return {
    feasible: result.feasible,
    cost: result.result,
    items
  };
};
