'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { CountryWithRestaurants, Medal } from '@/lib/types';

type GlobeMapProps = {
  countries: CountryWithRestaurants[];
  selectedCountryCode: string | null;
  selectedCountryCenter: [number, number] | null;
  selectedCountryPhotos: string[];
  onCountrySelect: (countryCode: string, countryName?: string, center?: [number, number]) => void;
};

const medalToColor: Record<Medal, string> = {
  gold: '#d4af37',
  silver: '#b2becd',
  bronze: '#b07d62'
};

const defaultCountryColor = 'rgba(0, 0, 0, 0)';
const countriesSourceId = 'countries-src';
const countriesSourceLayer = 'country_boundaries';

function buildCountryColorExpression(countries: CountryWithRestaurants[]) {
  const expression: unknown[] = ['match', ['get', 'iso_3166_1']];
  let hasMappedCountry = false;

  for (const country of countries) {
    const hasReviews = country.restaurants.some((restaurant) => restaurant.reviews.length > 0);
    if (!hasReviews) {
      continue;
    }

    expression.push(country.code.toUpperCase());
    expression.push(medalToColor[country.medal]);
    hasMappedCountry = true;
  }

  // Keep a valid expression shape even before the first review exists.
  if (!hasMappedCountry) {
    expression.push('__NO_COUNTRY__');
    expression.push(defaultCountryColor);
  }

  expression.push(defaultCountryColor);
  return expression;
}

export default function GlobeMap({
  countries,
  selectedCountryCode,
  selectedCountryCenter,
  selectedCountryPhotos,
  onCountrySelect
}: GlobeMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedCodeRef = useRef<string | null>(null);
  const handlersBoundRef = useRef(false);
  const onCountrySelectRef = useRef(onCountrySelect);
  const photoMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [viewportCountryCode, setViewportCountryCode] = useState<string | null>(null);
  const [viewportCenter, setViewportCenter] = useState<[number, number] | null>(null);

  const colorExpression = useMemo(() => buildCountryColorExpression(countries), [countries]);

  useEffect(() => {
    onCountrySelectRef.current = onCountrySelect;
  }, [onCountrySelect]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      zoom: 1.4,
      center: [12, 24],
      projection: 'globe',
      antialias: true,
      pitch: 16
    });

    mapRef.current = map;

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(231, 240, 248)',
        'high-color': 'rgb(212, 228, 241)',
        'horizon-blend': 0.06,
        'space-color': 'rgb(228, 238, 248)',
        'star-intensity': 0
      });

      if (!map.getSource(countriesSourceId)) {
        map.addSource(countriesSourceId, {
          type: 'vector',
          url: 'mapbox://mapbox.country-boundaries-v1'
        });
      }

      if (!map.getLayer('country-fill')) {
        map.addLayer({
          id: 'country-fill',
          type: 'fill',
          source: countriesSourceId,
          'source-layer': countriesSourceLayer,
          paint: {
            // Set a stable default; dynamic colors are applied by a dedicated effect.
            'fill-color': defaultCountryColor,
            'fill-opacity': 0.66,
            'fill-opacity-transition': { duration: 500, delay: 0 },
            'fill-color-transition': { duration: 550, delay: 0 }
          }
        });
      }

      if (!map.getLayer('country-outline')) {
        map.addLayer({
          id: 'country-outline',
          type: 'line',
          source: countriesSourceId,
          'source-layer': countriesSourceLayer,
          paint: {
            'line-color': '#ffffff',
            'line-width': 0.7,
            'line-opacity': 0.45
          }
        });
      }

      if (!map.getLayer('country-selected-outline')) {
        map.addLayer({
          id: 'country-selected-outline',
          type: 'line',
          source: countriesSourceId,
          'source-layer': countriesSourceLayer,
          paint: {
            'line-color': '#0f172a',
            'line-width': 2,
            'line-opacity': 0.85
          },
          filter: ['==', ['get', 'iso_3166_1'], '']
        });
      }

      if (!handlersBoundRef.current) {
        handlersBoundRef.current = true;

        const updateViewportCountry = () => {
          const centerPoint = [map.getContainer().clientWidth / 2, map.getContainer().clientHeight / 2] as [
            number,
            number
          ];
          const features = map.queryRenderedFeatures(centerPoint, { layers: ['country-fill'] });
          const feature = features[0];
          const isoCode = String(feature?.properties?.iso_3166_1 ?? '').toUpperCase();
          setViewportCountryCode(isoCode || null);
          const center = map.getCenter();
          setViewportCenter([center.lng, center.lat]);
        };

        map.on('mousemove', 'country-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'country-fill', () => {
          map.getCanvas().style.cursor = '';
        });

        map.on('click', 'country-fill', (event) => {
          const feature = event.features?.[0];
          if (!feature) {
            return;
          }

          const isoCode = String(feature.properties?.iso_3166_1 ?? '').toUpperCase();
          const countryName = String(
            feature.properties?.name_en ?? feature.properties?.name ?? feature.properties?.name_fr ?? ''
          ).trim();
          if (!isoCode) {
            return;
          }

          onCountrySelectRef.current(isoCode, countryName || undefined, [event.lngLat.lng, event.lngLat.lat]);
        });

        map.on('moveend', updateViewportCountry);
        map.on('zoomend', updateViewportCountry);
        map.on('idle', updateViewportCountry);
      }
    });

    return () => {
      photoMarkersRef.current.forEach((marker) => marker.remove());
      photoMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      handlersBoundRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('country-fill')) {
      return;
    }

    map.setPaintProperty('country-fill', 'fill-color', colorExpression as unknown as mapboxgl.Expression);
  }, [colorExpression]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('country-selected-outline')) {
      return;
    }

    if (selectedCountryCode === selectedCodeRef.current) {
      return;
    }

    selectedCodeRef.current = selectedCountryCode;
    map.setFilter('country-selected-outline', [
      '==',
      ['get', 'iso_3166_1'],
      selectedCountryCode ? selectedCountryCode.toUpperCase() : ''
    ] as mapboxgl.FilterSpecification);
  }, [selectedCountryCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCountryCenter) {
      return;
    }

    map.flyTo({
      center: selectedCountryCenter,
      zoom: Math.max(map.getZoom(), 2.8),
      duration: 850,
      essential: true
    });
  }, [selectedCountryCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    photoMarkersRef.current.forEach((marker) => marker.remove());
    photoMarkersRef.current = [];

    const selectedHasPhotos = Boolean(selectedCountryCenter && selectedCountryPhotos.length);
    let photosToShow = selectedCountryPhotos;
    let centerToShow = selectedCountryCenter;

    if (!selectedHasPhotos && viewportCountryCode) {
      const viewportCountry = countries.find((country) => country.code.toUpperCase() === viewportCountryCode);
      const viewportPhotos = viewportCountry
        ? viewportCountry.restaurants.flatMap((restaurant) => restaurant.photos.map((photo) => photo.image_url))
        : [];
      photosToShow = viewportPhotos;
      centerToShow = viewportCenter;
    }

    if (!centerToShow || !photosToShow.length || map.getZoom() < 2.2) {
      return;
    }

    const [centerLng, centerLat] = centerToShow;
    const displayUrls = photosToShow.slice(0, 8);

    displayUrls.forEach((url, index) => {
      const angle = (Math.PI * 2 * index) / displayUrls.length;
      const radius = 2 + (index % 3) * 0.9;
      const lng = centerLng + Math.cos(angle) * radius;
      const lat = centerLat + Math.sin(angle) * (radius * 0.5);

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'country-photo-marker';
      el.style.animationDelay = `${index * 75}ms`;
      const inner = document.createElement('div');
      inner.className = 'country-photo-marker-inner';
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Photo du restaurant';
      inner.appendChild(img);
      el.appendChild(inner);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
      photoMarkersRef.current.push(marker);
    });

    const rerenderOnMoveEnd = () => {
      if (map.getZoom() < 2.2) {
        photoMarkersRef.current.forEach((marker) => marker.remove());
        photoMarkersRef.current = [];
      }
    };

    map.on('moveend', rerenderOnMoveEnd);
    return () => {
      map.off('moveend', rerenderOnMoveEnd);
      photoMarkersRef.current.forEach((marker) => marker.remove());
      photoMarkersRef.current = [];
    };
  }, [selectedCountryCenter, selectedCountryPhotos, viewportCountryCode, viewportCenter, countries]);

  return <div ref={mapContainerRef} className="h-screen w-full" />;
}
