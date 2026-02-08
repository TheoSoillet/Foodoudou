import Image from 'next/image';
import type { Photo } from '@/lib/types';

type PhotoGalleryProps = {
  photos: Photo[];
  restaurantName: string;
};

export default function PhotoGallery({ photos, restaurantName }: PhotoGalleryProps) {
  if (!photos.length) {
    return <p className="text-sm text-slate-500">No photos yet.</p>;
  }

  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
      {photos.map((photo) => (
        <figure
          key={photo.id}
          className="glass relative h-32 min-w-48 snap-start overflow-hidden rounded-2xl border"
        >
          <Image
            src={photo.image_url}
            alt={`${restaurantName} photo`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 240px"
          />
        </figure>
      ))}
    </div>
  );
}
