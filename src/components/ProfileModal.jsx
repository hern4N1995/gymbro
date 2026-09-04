import React, { useState, useEffect, useRef } from "react";
import { X, User, Dumbbell, Ruler, Calendar, SlidersHorizontal, Key, Check } from "lucide-react";
import supabase from "../../supabaseClient";
import InfoModal from "./InfoModal";
import { PrimaryButton, SecondaryButton } from "./Button";
import useClickOutside from "../hooks/useClickOutside";

export default function ProfileModal({ onClose, user, onSaved, onOpenTemplates }) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [age, setAge] = useState(30);
  const [profile, setProfile] = useState("Intermedio");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          setName(data.name || '');
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
      const payload = { id: user.id, weight, height, age, profile, name };
      const { data, error } = await supabase.from('profiles').upsert(payload).select().single();
      if (error) {
        console.error('Error upserting profile', error);
        alert('No se pudo guardar el perfil: ' + (error.message || error));
        return;
      }
      onSaved && onSaved(name || data?.name || user.user_metadata?.full_name || user.email);
      onClose && onClose();
    } catch (e) {
      console.error('Failed saving profile', e);
    }
  };

  const [showInfo, setShowInfo] = useState(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChecks, setPasswordChecks] = useState({ length: false, letters: false, numbers: false });
  const [passwordValid, setPasswordValid] = useState(false);
  const containerRef = useRef(null);
  useClickOutside(containerRef, onClose, true);

  useEffect(() => {
    const p = String(newPassword || '');
    const length = p.length >= 8;
    const letters = /[A-Za-z]/.test(p);
    const numbers = /\d/.test(p);
    setPasswordChecks({ length, letters, numbers });
    setPasswordValid(length && letters && numbers);
  }, [newPassword]);

  const changePassword = async () => {
    if (!newPassword) return alert('Ingresa la nueva contraseña');
    if (!passwordValid) return alert('La contraseña debe tener mínimo 8 caracteres e incluir letras y números.');
    if (newPassword !== confirmPassword) return alert('Las contraseñas no coinciden');
    try {
      const { error } = await supabase.auth.update({ password: newPassword });
      if (error) throw error;
      alert('Contraseña actualizada. Usá la nueva contraseña en tu próximo inicio de sesión.');
      setNewPassword(''); setConfirmPassword(''); setPwOpen(false);
    } catch (e) {
      console.error('Error updating password', e);
      const message = e?.message || 'No se pudo actualizar la contraseña.';
      const lower = String(message).toLowerCase();
      if (lower.includes('weak password')) {
        alert('La contraseña es demasiado débil. Usá al menos 8 caracteres con letras y números.');
        return;
      }
      alert('No se pudo actualizar la contraseña: ' + message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" />
      <div ref={containerRef} className="relative mx-auto bg-[#111214] border border-neutral-800 rounded-2xl w-full h-full sm:h-auto sm:max-w-md overflow-auto">
        <div className="px-4 py-3.5 border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-neutral-100">Perfil</h3>
            <p className="text-xs text-neutral-500">Controla tus datos y objetivos</p>
          </div>
          <button onClick={onClose} className="min-h-[36px] min-w-[36px] p-1.5 text-neutral-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] text-neutral-400 font-semibold uppercase flex items-center gap-2"><User size={14} className="text-neutral-400" />Nombre</label>
              <input placeholder="Ej. Juan Pérez" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white" />
              <div className="help-chip mt-1">El nombre que se mostrará en la app.</div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase flex items-center gap-2"><Dumbbell size={14} className="text-neutral-400" />Peso (kg)</label>
              <input placeholder="Ej. 75" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white" />
              <div className="help-chip mt-1">Introduce tu peso en kilogramos (kg).</div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase flex items-center gap-2"><Ruler size={14} className="text-neutral-400" />Altura (cm)</label>
              <input placeholder="Ej. 175" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white" />
              <div className="help-chip mt-1">Altura en centímetros (cm).</div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase flex items-center gap-2"><Calendar size={14} className="text-neutral-400" />Edad</label>
              <input placeholder="Ej. 30" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white" />
              <div className="help-chip mt-1">Edad en años.</div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase flex items-center gap-2"><SlidersHorizontal size={14} className="text-neutral-400" />Tipo de usuario</label>
              <select value={profile} onChange={(e) => setProfile(e.target.value)} className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white">
                <option>Principiante</option>
                <option>Volviendo tras un parate</option>
                <option>Intermedio</option>
                <option>Sobrepeso</option>
              </select>
              <div className="help-chip mt-1">Selecciona una categoría que describa tu nivel actual.</div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm px-4">
          <div>
            <button onClick={() => setShowInfo('BMR')} className="font-semibold underline decoration-neutral-500/70 underline-offset-2 decoration-1 hover:text-white">BMR:</button> {BMR} kcal/día
          </div>
          <div>
            <button onClick={() => setShowInfo('Protein')} className="font-semibold underline decoration-neutral-500/70 underline-offset-2 decoration-1 hover:text-white">Proteína objetivo:</button> {protein} g/día
          </div>
        </div>

          <div className="p-4">
          {onOpenTemplates && (
            <SecondaryButton onClick={onOpenTemplates} className="w-full text-left mb-3">Mis rutinas</SecondaryButton>
          )}
          <SecondaryButton onClick={() => setPwOpen(!pwOpen)} className="w-full text-left">Cambiar contraseña</SecondaryButton>
          {pwOpen && (
            <div className="mt-3 grid grid-cols-1 gap-2">
              <input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white" />
              <input type="password" placeholder="Confirmar contraseña" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white" />
              <div className="text-xs text-neutral-500">La contraseña debe tener mínimo 8 caracteres e incluir letras y números.</div>
              <div className="flex flex-wrap gap-2 text-[11px] mt-1">
                <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-emerald-400' : 'text-neutral-500'}`}><Check size={14} />8+ caracteres</div>
                <div className={`flex items-center gap-1 ${passwordChecks.letters ? 'text-emerald-400' : 'text-neutral-500'}`}><Check size={14} />Letras</div>
                <div className={`flex items-center gap-1 ${passwordChecks.numbers ? 'text-emerald-400' : 'text-neutral-500'}`}><Check size={14} />Números</div>
              </div>
              <div className="flex gap-2">
                <PrimaryButton onClick={changePassword} className="flex-1" disabled={!passwordValid}>Actualizar contraseña</PrimaryButton>
                <SecondaryButton onClick={() => { setPwOpen(false); setNewPassword(''); setConfirmPassword(''); setPasswordValid(false); setPasswordChecks({ length: false, letters: false, numbers: false }); }} className="flex-1">Cancelar</SecondaryButton>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <PrimaryButton onClick={save} className="flex-1">Guardar</PrimaryButton>
            <SecondaryButton onClick={onClose} className="flex-1">Cancelar</SecondaryButton>
          </div>

          <div className="mt-4 border-t border-neutral-800 pt-3 space-y-2">
            <button onClick={async () => { try { await supabase.auth.signOut(); onClose && onClose(); } catch(e){ console.error(e); } }} className="w-full flex items-center justify-center gap-2 border border-red-500/40 text-red-400 px-3 py-2 rounded-xl bg-transparent">
              <Key size={16} /> Cerrar Sesión
            </button>
            <button
              type="button"
              onClick={async () => {
                const confirmed = window.confirm('¿Seguro que querés eliminar tu cuenta? Esta acción borrará tus datos guardados.');
                if (!confirmed) return;
                try {
                  const { data, error } = await supabase.functions.invoke('delete-user', {
                    body: { user_id: user.id },
                  });
                  if (error) throw error;
                  if (data?.success) {
                    await supabase.auth.signOut();
                    onClose && onClose();
                    return;
                  }
                  throw new Error(data?.message || 'No se pudo eliminar la cuenta.');
                } catch (err) {
                  console.error('delete account error', err);
                  alert('Todavía no está configurada la eliminación de cuenta en Supabase. Debe crearse la función delete-user.');
                }
              }}
              className="w-full flex items-center justify-center gap-2 border border-red-500/40 bg-red-500/5 text-red-300 px-3 py-2 rounded-xl hover:bg-red-500/10"
            >
              Eliminar cuenta
            </button>
          </div>
        </div>

        <InfoModal
          term={showInfo}
          title={showInfo === 'BMR' ? 'BMR (Tasa Metabólica Basal)' : showInfo === 'Protein' ? 'Proteína objetivo' : ''}
          text={showInfo === 'BMR' ? 'Tu BMR es la energía que tu cuerpo necesita en reposo. Se usa para estimar tus calorías diarias.' : 'Cantidad aproximada de proteína (g) recomendada por día según tu peso.'}
          onClose={() => setShowInfo(null)}
        />
      </div>
    </div>
  );
}
