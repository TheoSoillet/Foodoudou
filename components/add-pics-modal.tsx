'use client';

import { FormEvent, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Restaurant } from '@/lib/types';

type AddPicsModalProps = {
  open: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export default function AddPicsModal({ open, restaurant, onClose, onSaved }: AddPicsModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function makePath(file: File): string {
    return `public/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, '-')}`;
  }

  async function uploadOne(file: File): Promise<string> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Image trop volumineuse. Taille maximale: 20 MB.');
    }

    const path = makePath(file);
    const { error: uploadError } = await supabaseBrowser.storage.from('restaurant-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabaseBrowser.storage.from('restaurant-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;

    if (!files.length) {
      setError('Ajoute au moins une image.');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      const urls = await Promise.all(files.map((file) => uploadOne(file)));
      const rows = urls.map((image_url) => ({ restaurant_id: restaurant.id, image_url }));
      const { error: insertError } = await supabaseBrowser.from('photos').insert(rows);
      if (insertError) throw new Error(insertError.message);

      await onSaved();
      setFiles([]);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Impossible d\'ajouter les photos.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!open || !restaurant) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
      <section className="glass w-full max-w-2xl rounded-3xl p-6">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Ajouter des photos</h3>
            <p className="text-sm text-slate-600">{restaurant.name}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-stroke px-3 py-1.5 text-sm hover:bg-white/70">
            Fermer
          </button>
        </header>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Photos libres (plusieurs)</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                const tooLarge = selected.find((file) => file.size > MAX_FILE_SIZE_BYTES);
                if (tooLarge) {
                  setError('Une image est trop volumineuse. Taille maximale: 20 MB.');
                  return;
                }
                setError('');
                setFiles(selected);
              }}
              className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2"
            />
            {files.length > 0 ? <span className="mt-1 block text-xs text-slate-500">{files.length} photo(s) sélectionnée(s)</span> : null}
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {isSaving ? 'Ajout...' : 'Ajouter les photos'}
          </button>
        </form>
      </section>
    </div>
  );
}
