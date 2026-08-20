import React, { useState, useEffect } from "react";
import supabase from "../../supabaseClient";

export default function ProfileModal({ onClose, user }) {
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [age, setAge] = useState(30);
  const [profile, setProfile] = useState("Intermedio");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          setWeight(data.weight || 75);
          setHeight(data.height || 175);
          setAge(data.age || 30);
          setProfile(data.profile || 'Intermedio');
        }
      } catch (e) {
        console.error('Failed loading profile', e);
      }
    };
    if (user) load();
  }, [user]);

  const BMR = Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
  const protein = Math.round(weight * 2.0);

  const save = async () => {
    try {
      await supabase.from('profiles').upsert({ id: user.id, weight, height, age, profile });
      onClose && onClose();
    } catch (e) {
      console.error('Failed saving profile', e);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1B1D21] border border-neutral-800 rounded-2xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Perfil</h3>
          <button onClick={onClose}>Cerrar</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="p-2 bg-[#121315]" />
          <input value={height} onChange={(e) => setHeight(Number(e.target.value))} className="p-2 bg-[#121315]" />
          <input value={age} onChange={(e) => setAge(Number(e.target.value))} className="p-2 bg-[#121315]" />
          <select value={profile} onChange={(e) => setProfile(e.target.value)} className="p-2 bg-[#121315]">
            <option>Principiante</option>
            <option>Volviendo tras un parate</option>
            <option>Intermedio</option>
            <option>Sobrepeso</option>
          </select>
        </div>
        <div className="mt-3 text-sm">
          <div><strong>BMR:</strong> {BMR} kcal/día</div>
          <div><strong>Proteína objetivo:</strong> {protein} g/día</div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} className="bg-amber-500 px-3 py-2 rounded">Guardar</button>
          <button onClick={onClose} className="bg-neutral-800 px-3 py-2 rounded">Cancelar</button>
          <button onClick={async () => { try { await supabase.auth.signOut(); onClose && onClose(); } catch(e){ console.error(e); } }} className="bg-red-600 px-3 py-2 rounded text-white">Cerrar Sesión</button>
        </div>
      </div>
    </div>
  );
}
