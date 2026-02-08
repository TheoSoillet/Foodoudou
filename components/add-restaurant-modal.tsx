'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { CountryWithRestaurants, ItemCategory } from '@/lib/types';

type AddRestaurantModalProps = {
  open: boolean;
  onClose: () => void;
  countries: CountryWithRestaurants[];
  selectedCountryCode: string | null;
  onCreated: () => Promise<void>;
};

type DraftItem = {
  localId: string;
  name: string;
  category: ItemCategory;
  photoFile: File | null;
};

const categoryLabels: Record<ItemCategory, string> = {
  plat: 'Plat',
  boisson: 'Boisson (optionnel)',
  entree: 'Entrée (optionnel)',
  dessert: 'Dessert (optionnel)',
  autre: 'Autre'
};
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function newDraftItem(category: ItemCategory = 'plat'): DraftItem {
  return {
    localId: crypto.randomUUID(),
    name: '',
    category,
    photoFile: null
  };
}

export default function AddRestaurantModal({
  open,
  onClose,
  countries,
  selectedCountryCode,
  onCreated
}: AddRestaurantModalProps) {
  const [countryCode, setCountryCode] = useState(selectedCountryCode ?? countries[0]?.code ?? '');
  const [restaurantName, setRestaurantName] = useState('');
  const [visitedAt, setVisitedAt] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DraftItem[]>([newDraftItem('plat')]);
  const [miscPhotoFiles, setMiscPhotoFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sortedCountries = useMemo(() => [...countries].sort((a, b) => a.name.localeCompare(b.name)), [countries]);

  useEffect(() => {
    if (selectedCountryCode) setCountryCode(selectedCountryCode);
  }, [selectedCountryCode]);

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

  function updateItem(localId: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
  }

  function resetState() {
    setRestaurantName('');
    setVisitedAt(new Date().toISOString().slice(0, 10));
    setItems([newDraftItem('plat')]);
    setMiscPhotoFiles([]);
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const cleanedItems = items.filter((item) => item.name.trim() !== '');
    const hasMainDish = cleanedItems.some((item) => item.category === 'plat');

    if (!countryCode) {
      setError('Choisis un pays.');
      return;
    }
    if (!hasMainDish) {
      setError('Ajoute au moins un plat.');
      return;
    }

    setIsSaving(true);

    try {
      const countryName = sortedCountries.find((c) => c.code === countryCode)?.name ?? countryCode;

      const { error: countryErr } = await supabaseBrowser.from('countries').upsert(
        { code: countryCode, name: countryName, medal: 'bronze' },
        { onConflict: 'code', ignoreDuplicates: true }
      );
      if (countryErr) throw new Error(countryErr.message);

      const { data: restaurant, error: restaurantErr } = await supabaseBrowser
        .from('restaurants')
        .upsert(
          { country_code: countryCode, name: restaurantName.trim(), visited_at: visitedAt },
          { onConflict: 'country_code,name,visited_at', ignoreDuplicates: false }
        )
        .select('id')
        .single();
      if (restaurantErr) throw new Error(restaurantErr.message);
      if (!restaurant) throw new Error('Impossible de créer le restaurant.');

      const itemRows = await Promise.all(
        cleanedItems.map(async (item) => ({
          restaurant_id: restaurant.id,
          name: item.name.trim(),
          category: item.category,
          photo_url: item.photoFile ? await uploadOne(item.photoFile) : null
        }))
      );

      const { error: itemsErr } = await supabaseBrowser.from('restaurant_items').insert(itemRows);
      if (itemsErr) throw new Error(itemsErr.message);

      if (miscPhotoFiles.length > 0) {
        const miscUrls = await Promise.all(miscPhotoFiles.map((file) => uploadOne(file)));
        const photoRows = miscUrls.map((image_url) => ({ restaurant_id: restaurant.id, image_url }));
        const { error: photosErr } = await supabaseBrowser.from('photos').insert(photoRows);
        if (photosErr) throw new Error(photosErr.message);
      }

      await onCreated();
      resetState();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs" aria-hidden={!open}>
      <section className="glass w-full max-w-4xl rounded-3xl p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Étape 1/2</p>
            <h3 className="text-xl font-semibold">Nouveau restaurant</h3>
            <p className="text-sm text-slate-600">Ajoute le lieu, la date et les plats/boissons dégustés.</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-stroke px-3 py-1.5 text-sm hover:bg-white/70">
            Fermer
          </button>
        </header>

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm md:col-span-2">
            <span className="mb-1.5 block font-medium">Cuisine / pays</span>
            <select
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2"
              required
            >
              {sortedCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Nom du restaurant</span>
            <input
              required
              value={restaurantName}
              onChange={(event) => setRestaurantName(event.target.value)}
              className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Date</span>
            <input
              required
              type="date"
              value={visitedAt}
              onChange={(event) => setVisitedAt(event.target.value)}
              className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2"
            />
          </label>

          <div className="md:col-span-2 rounded-2xl border border-stroke bg-white/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Plats et consommations</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, newDraftItem('boisson')])}
                  className="rounded-lg border border-stroke px-2.5 py-1 text-xs"
                >
                  + Boisson
                </button>
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, newDraftItem('entree')])}
                  className="rounded-lg border border-stroke px-2.5 py-1 text-xs"
                >
                  + Entrée
                </button>
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, newDraftItem('plat')])}
                  className="rounded-lg border border-stroke px-2.5 py-1 text-xs"
                >
                  + Plat
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.localId} className="grid gap-2 rounded-xl border border-stroke bg-white/80 p-3 md:grid-cols-12">
                  <label className="text-xs md:col-span-3">
                    <span className="mb-1 block font-medium">Type</span>
                    <select
                      value={item.category}
                      onChange={(event) => updateItem(item.localId, { category: event.target.value as ItemCategory })}
                      className="w-full rounded-lg border border-stroke bg-white px-2 py-1.5"
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs md:col-span-5">
                    <span className="mb-1 block font-medium">Nom</span>
                    <input
                      value={item.name}
                      onChange={(event) => updateItem(item.localId, { name: event.target.value })}
                      className="w-full rounded-lg border border-stroke bg-white px-2 py-1.5"
                      placeholder={item.category === 'plat' ? 'Ex: Ramen tonkotsu' : 'Optionnel'}
                    />
                  </label>

                  <label className="text-xs md:col-span-3">
                    <span className="mb-1 block font-medium">Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (file && file.size > MAX_FILE_SIZE_BYTES) {
                          setError('Image trop volumineuse. Taille maximale: 20 MB.');
                          return;
                        }
                        setError('');
                        updateItem(item.localId, { photoFile: file });
                      }}
                      className="w-full rounded-lg border border-stroke bg-white px-2 py-1"
                    />
                  </label>

                  <div className="flex items-end md:col-span-1">
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((row) => row.localId !== item.localId))}
                      className={clsx('w-full rounded-lg px-2 py-1.5 text-xs', index === 0 ? 'opacity-40' : 'bg-rose-100')}
                      disabled={index === 0}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="text-sm md:col-span-2">
            <span className="mb-1.5 block font-medium">Photos du moment (optionnel, plusieurs)</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
                if (tooLarge) {
                  setError('Une image est trop volumineuse. Taille maximale: 20 MB.');
                  return;
                }
                setError('');
                setMiscPhotoFiles(files);
              }}
              className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2"
            />
            {miscPhotoFiles.length > 0 ? (
              <span className="mt-1 block text-xs text-slate-500">{miscPhotoFiles.length} photo(s) sélectionnée(s)</span>
            ) : null}
          </label>

          {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

          <button
            type="submit"
            disabled={isSaving}
            className="md:col-span-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer le restaurant'}
          </button>
        </form>
      </section>
    </div>
  );
}
