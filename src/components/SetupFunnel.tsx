import React from 'react';
import { Biometrics } from '../types';

interface SetupFunnelProps {
  bio: Biometrics;
  setBio: React.Dispatch<React.SetStateAction<Biometrics>>;
  onNext: () => void;
}

export const SetupFunnel: React.FC<SetupFunnelProps> = ({ bio, setBio, onNext }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let val: any = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                type === 'number' ? Number(value) : value;
                
    setBio(prev => {
      const nextBio = { ...prev, [name]: val };
      
      // Trava de Interface (Sexo vs. Reprodução)
      if (name === 'sexClass' && val !== 'Fêmea') {
        nextBio.isPregnant = false;
        nextBio.isLactating = false;
        nextBio.dl = 0;
      }

      // Trava GMD na Reprodução
      if (nextBio.isPregnant || nextBio.isLactating) {
        nextBio.gmd = 0;
      }
      
      return nextBio;
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-zinc-900 rounded-2xl shadow-lg border border-zinc-800">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6">Configuração do Lote</h2>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Espécie</label>
            <select name="species" value={bio.species} onChange={handleChange} className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500">
              <option value="Ovino">Ovino</option>
              <option value="Caprino">Caprino</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Aptidão</label>
            <select name="biotype" value={bio.biotype} onChange={handleChange} className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500">
              <option value="Corte">Corte</option>
              <option value="Leite">Leite</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Classe Sexual</label>
          <select name="sexClass" value={bio.sexClass} onChange={handleChange} className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500">
            <option value="Macho Inteiro">Macho Inteiro</option>
            <option value="Castrado">Castrado</option>
            <option value="Fêmea">Fêmea</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Peso Vivo (kg)</label>
            <input type="number" name="pc" value={bio.pc} onChange={handleChange} className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">GMD (g/dia)</label>
            <input 
              type="number" 
              name="gmd" 
              value={bio.gmd} 
              onChange={handleChange} 
              disabled={bio.isPregnant || bio.isLactating}
              className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500 disabled:opacity-50 disabled:cursor-not-allowed" 
            />
            {(bio.isPregnant || bio.isLactating) && (
              <p className="text-xs text-zinc-500 mt-1">Ganho de peso desabilitado (Prioridade Reprodutiva)</p>
            )}
          </div>
        </div>

        {bio.sexClass === 'Fêmea' && (
          <div className="space-y-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">Estado Reprodutivo</h3>
            <div className="flex items-center space-x-2">
              <input type="checkbox" name="isPregnant" checked={bio.isPregnant} onChange={handleChange} className="rounded bg-zinc-950 border-zinc-800 text-lime-500 focus:ring-lime-500 focus:ring-offset-zinc-900" />
              <label className="text-sm font-medium text-zinc-300">Fêmea Gestante</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" name="isLactating" checked={bio.isLactating} onChange={handleChange} className="rounded bg-zinc-950 border-zinc-800 text-lime-500 focus:ring-lime-500 focus:ring-offset-zinc-900" />
              <label className="text-sm font-medium text-zinc-300">Fêmea em Lactação</label>
            </div>
            
            {(bio.isPregnant || bio.isLactating) && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Dias de Gestação/Lactação</label>
                <input type="number" name="dl" value={bio.dl} onChange={handleChange} className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
              </div>
            )}
          </div>
        )}

        {bio.sexClass === 'Fêmea' && (bio.isPregnant || bio.isLactating) && (
          <div className="p-4 bg-lime-500/10 text-lime-400 rounded-lg border border-lime-500/20 text-sm">
            <strong>Prioridade Reprodutiva Ativada:</strong> Ganho de peso para crescimento desabilitado.
          </div>
        )}

        {bio.species === 'Ovino' && bio.gmd > 500 && (
          <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-sm">
            <strong>ERR_BIOLOGICAL_PERFORMANCE_LIMIT:</strong> Limite de performance biológica excedido (GMD &gt; 500g para Ovinos).
          </div>
        )}

        <button 
          onClick={onNext}
          disabled={bio.species === 'Ovino' && bio.gmd > 500}
          className="w-full py-3 bg-lime-500 text-zinc-950 font-bold rounded-xl hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Confirmar Lote
        </button>
      </div>
    </div>
  );
};
