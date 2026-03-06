import React, { useState, useEffect } from 'react';
import { Ingredient } from '../types';
import { getIngredients, updateIngredient } from '../services/db';
import { Edit2, Save, X } from 'lucide-react';

export const IngredientDB: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ price: number; ms: number }>({ price: 0, ms: 0 });

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    const data = await getIngredients();
    setIngredients(data);
  };

  const handleEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditForm({ price: ing.price, ms: ing.ms });
  };

  const handleSave = async (id: string) => {
    await updateIngredient(id, editForm);
    setEditingId(null);
    loadIngredients();
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-zinc-900 rounded-2xl shadow-lg border border-zinc-800">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6">Banco de Alimentos (BR-COR 2024)</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950 text-zinc-400 text-sm font-medium border-b border-zinc-800">
              <th className="p-4">Nome</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Preço (R$/kg)</th>
              <th className="p-4">MS (%)</th>
              <th className="p-4">PB (%)</th>
              <th className="p-4">NDT (%)</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm text-zinc-300">
            {ingredients.map(ing => (
              <tr key={ing.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                <td className="p-4 font-medium text-zinc-200">{ing.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ing.category === 'Volumoso' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    ing.category === 'Concentrado' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {ing.category}
                  </span>
                </td>
                
                {editingId === ing.id ? (
                  <>
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={editForm.price} 
                        onChange={e => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                        className="w-24 p-1 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 focus:ring-2 focus:ring-lime-500"
                        step="0.01"
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={editForm.ms} 
                        onChange={e => setEditForm(prev => ({ ...prev, ms: Number(e.target.value) }))}
                        className="w-20 p-1 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 focus:ring-2 focus:ring-lime-500"
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-4">R$ {ing.price.toFixed(2)}</td>
                    <td className="p-4">{ing.ms}%</td>
                  </>
                )}
                
                <td className="p-4">{ing.pb}%</td>
                <td className="p-4">{ing.ndt}%</td>
                
                <td className="p-4 text-right">
                  {editingId === ing.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleSave(ing.id)} className="p-2 text-lime-400 hover:bg-lime-400/10 rounded-lg transition-colors">
                        <Save size={18} />
                      </button>
                      <button onClick={handleCancel} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleEdit(ing)} className="p-2 text-zinc-500 hover:text-lime-400 hover:bg-lime-400/10 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
