'use client';

/**
 * /src/components/customer/ui/AddressAutocomplete.tsx
 * Fast X Nexus — Enterprise Multi-Tier Forward Geocoding Engine
 *
 * Implements:
 * 1. Progressive Cascading Address Resolution with Nigerian Bounding Guard
 * 2. Curated Nigerian Hyper-Local Communities / Sub-Districts registry matching
 * 3. Photon + Nominatim multi-engine progressive search (strictly bounded to Nigeria)
 * 4. Interactive Leaflet Pin-Drop Map Modal for sub-100m rooftop accuracy
 * 5. Deterministic Dropdown Open/Close lifecycle
 */

import React, { useState, useEffect, useRef } from 'react';
import { getH3CellFromCoords } from '@/lib/geo/h3';
import { searchLocalCommunities, NigerianLandmark } from '@/lib/geo/nigerianCommunities';
import { resolveAddressCascading, isWithinNigeria, ResolvedLocation } from '@/lib/geo/cascadingGeocoder';
import { checkStreetDisambiguation, DisambiguationResult } from '@/lib/geo/streetDisambiguation';
import { cacheVerifiedRooftop } from '@/lib/geo/rooftopLearningCache';
import { PinDropMapModal } from './PinDropMapModal';

export interface LocationSelection {
  address: string;
  lat: number;
  lng: number;
  h3Cell: string;
}

interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  prefixIcon?: string;
  value: string;
  currentCoords?: { lat: number; lng: number } | null;
  onChange: (value: string) => void;
  onSelectLocation: (loc: LocationSelection) => void;
  accentColor?: 'primary' | 'emerald';
}

interface CombinedSuggestion {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  isHyperLocal?: boolean;
}

export function AddressAutocomplete({
  label,
  placeholder = 'Type street name, sub-district (e.g. 4b Adeshina Balogun St, Oreyo, Ikorodu)...',
  prefixIcon = 'location_on',
  value,
  currentCoords,
  onChange,
  onSelectLocation,
  accentColor = 'primary',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CombinedSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [activeResolution, setActiveResolution] = useState<ResolvedLocation | null>(null);
  const [disambiguation, setDisambiguation] = useState<DisambiguationResult | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const justSelectedRef = useRef(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cascading progressive search on input changes
  useEffect(() => {
    // If the user just clicked a selection, do not re-open the dropdown
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      setIsOpen(false);
      return;
    }

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setActiveResolution(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsSearching(true);
      const query = value.trim();

      // Check for duplicate/ambiguous Nigerian street names
      const dis = checkStreetDisambiguation(query);
      setDisambiguation(dis);

      let resolved: ResolvedLocation | null = null;
      // Run Cascading Geocoding Resolver to guarantee nearest spatial anchor within Nigeria
      try {
        resolved = await resolveAddressCascading(query, abortControllerRef.current.signal);
        if (isWithinNigeria(resolved.lat, resolved.lng)) {
          setActiveResolution(resolved);

          // Auto-emit spatial coordinates so order always has a valid location in Nigeria
          if (!currentCoords || !isWithinNigeria(currentCoords.lat, currentCoords.lng)) {
            onSelectLocation({
              address: value,
              lat: resolved.lat,
              lng: resolved.lng,
              h3Cell: resolved.h3Cell,
            });
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('[AddressAutocomplete] Cascading resolve error:', e);
        }
      }

      // Populate interactive suggestions list
      const results: CombinedSuggestion[] = [];

      // Priority 0: The Top AI/Cascading Verified Resolution
      if (resolved && isWithinNigeria(resolved.lat, resolved.lng)) {
        results.push({
          id: `resolved_${resolved.lat.toFixed(5)}_${resolved.lng.toFixed(5)}`,
          title: resolved.resolvedName.split(',')[0],
          subtitle: `${resolved.resolvedName} • [${resolved.matchedLevel === 'exact_street' ? 'Verified Road Node' : 'Vicinity Anchor'}]`,
          lat: resolved.lat,
          lng: resolved.lng,
          isHyperLocal: true,
        });
      }

      // Priority 1: OpenStreetMap / Nominatim Road Search with Query Normalization
      const strippedQuery = query.replace(/^\d+[\s,\/-]+/, '').replace(/\bGRA\b/gi, '').trim();
      const osmSearchQueries = [query, strippedQuery].filter(Boolean);

      for (const q of osmSearchQueries) {
        if (results.length >= 4) break;
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            q.toLowerCase().includes('lagos') ? q : `${q}, Lagos, Nigeria`
          )}&format=json&countrycodes=ng&viewbox=3.0,6.7,3.9,6.3&bounded=0&limit=3`;

          const nomRes = await fetch(nomUrl, { signal: abortControllerRef.current.signal });
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            nomData.forEach((item: any) => {
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (isWithinNigeria(lat, lng)) {
                // Avoid near-duplicate coordinates
                const isDupe = results.some((r) => Math.abs(r.lat - lat) < 0.0005 && Math.abs(r.lng - lng) < 0.0005);
                if (!isDupe) {
                  results.push({
                    id: `nom_${item.place_id}`,
                    title: item.display_name.split(',')[0],
                    subtitle: item.display_name,
                    lat,
                    lng,
                    isHyperLocal: false,
                  });
                }
              }
            });
          }
        } catch {
          // Ignore
        }
      }

      // Priority 2: Curated Local Communities / Landmarks (Direct Name Matches)
      const localMatches: NigerianLandmark[] = searchLocalCommunities(query);
      localMatches.forEach((m) => {
        if (isWithinNigeria(m.lat, m.lng) && results.length < 6) {
          const isDupe = results.some((r) => Math.abs(r.lat - m.lat) < 0.001 && Math.abs(r.lng - m.lng) < 0.001);
          if (!isDupe) {
            results.push({
              id: `local_${m.name}_${m.lat}`,
              title: `${m.name} (${m.subDistrict})`,
              subtitle: `${m.lga}, ${m.state} State, Nigeria`,
              lat: m.lat,
              lng: m.lng,
              isHyperLocal: true,
            });
          }
        }
      });

      // Only open if the user didn't just select an item
      if (!justSelectedRef.current) {
        setSuggestions(results);
        setIsOpen(results.length > 0);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (item: CombinedSuggestion) => {
    justSelectedRef.current = true;
    const fullAddress = `${item.title}, ${item.subtitle}`;
    const h3Cell = getH3CellFromCoords(item.lat, item.lng, 9);

    onChange(fullAddress);
    onSelectLocation({
      address: fullAddress,
      lat: item.lat,
      lng: item.lng,
      h3Cell,
    });
    setIsOpen(false);
    setSuggestions([]);
  };

  const handlePinConfirm = (loc: LocationSelection) => {
    justSelectedRef.current = true;
    onChange(loc.address);
    onSelectLocation(loc);
    cacheVerifiedRooftop(loc.address, loc.lat, loc.lng, loc.h3Cell);
    setIsOpen(false);
    setSuggestions([]);
  };

  const borderFocusClass =
    accentColor === 'emerald'
      ? 'focus-within:border-emerald-500'
      : 'focus-within:border-primary';

  return (
    <div ref={containerRef} className="relative font-mono space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black uppercase tracking-wider text-text-dim">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setPinModalOpen(true)}
          className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors ${
            accentColor === 'emerald'
              ? 'text-emerald-400 hover:text-emerald-300'
              : 'text-primary hover:text-primary/90'
          }`}
        >
          <span className="material-symbols-outlined text-xs" aria-hidden="true">pin_drop</span>
          <span>Pinpoint on Map</span>
        </button>
      </div>

      <div
        className={`relative flex items-center bg-surface border border-border ${borderFocusClass} transition-colors`}
      >
        <span className="material-symbols-outlined text-sm text-text-muted pl-3">
          {prefixIcon}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            justSelectedRef.current = false;
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if ((suggestions.length > 0 || disambiguation?.isAmbiguous) && !justSelectedRef.current) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-text px-3 py-2.5 text-xs font-mono focus:outline-none placeholder:text-text-dim"
        />
        {isSearching && (
          <span className="material-symbols-outlined text-xs text-text-muted animate-spin pr-3">
            progress_activity
          </span>
        )}
      </div>

      {/* Cascading Resolution Anchor Confirmation Card */}
      {activeResolution && (
        <div className="p-2.5 bg-surface-low border border-border text-[10px] space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-xs text-emerald-500 mt-0.5">
                {activeResolution.isEstimatedVicinity ? 'radar' : 'verified'}
              </span>
              <div className="min-w-0">
                <p className="text-text font-bold leading-tight truncate">
                  {activeResolution.resolvedName}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] text-text-muted font-mono">
                  <span className="text-text-dim">
                    GPS: {activeResolution.lat.toFixed(5)}, {activeResolution.lng.toFixed(5)}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                    activeResolution.isEstimatedVicinity 
                      ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                  }`}>
                    {activeResolution.isEstimatedVicinity 
                      ? `Surrounding Vicinity (±${activeResolution.accuracyRadius || 180}m)`
                      : `Confirmed Street (±${activeResolution.accuracyRadius || 45}m)`}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPinModalOpen(true)}
              className="px-2 py-1 bg-surface-dim hover:bg-surface text-primary border border-border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 flex-shrink-0 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[11px]">pin_drop</span>
              <span>Fine-Tune Pin</span>
            </button>
          </div>
          {activeResolution.nearestLandmarkNote && (
            <p className="text-[9px] text-text-muted pl-4 border-l border-border/60">
              {activeResolution.nearestLandmarkNote}
            </p>
          )}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && (suggestions.length > 0 || (disambiguation && disambiguation.isAmbiguous)) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-surface-elevated border border-border shadow-2xl divide-y divide-border overflow-hidden max-h-64 overflow-y-auto">
          {/* Duplicate Street Disambiguation Chips */}
          {disambiguation && disambiguation.isAmbiguous && (
            <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/20">
              <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-xs">alt_route</span>
                <span>Multiple corridors found for &quot;{disambiguation.detectedStreet}&quot; — Select LGA:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {disambiguation.options.map((opt) => (
                  <button
                    key={opt.lga}
                    type="button"
                    onClick={() => {
                      justSelectedRef.current = false;
                      onChange(opt.augmentedQuery);
                      setIsOpen(true);
                    }}
                    className="px-2.5 py-1 bg-surface border border-amber-500/30 hover:border-emerald-500 rounded text-[10px] font-mono text-text hover:text-primary transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>{opt.formattedLabel}</span>
                    <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-1.5 bg-surface-low text-[9px] font-bold text-text-dim uppercase tracking-wider flex items-center justify-between">
            <span>Detected Location Nodes</span>
            <span className="text-[8px] text-primary">Cascading Match</span>
          </div>
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left p-2.5 hover:bg-surface-dim transition-colors flex items-start gap-2 text-xs font-mono"
            >
              <span className={`material-symbols-outlined text-sm flex-shrink-0 mt-0.5 ${
                item.isHyperLocal ? 'text-emerald-400' : 'text-primary'
              }`}>
                {item.isHyperLocal ? 'verified' : 'location_on'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-text font-bold text-[11px] truncate">{item.title}</p>
                  {item.isHyperLocal && (
                    <span className="px-1 py-0.2 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">
                      Exact Area
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-[10px] truncate">{item.subtitle}</p>
                <p className="text-[9px] text-text-dim font-mono mt-0.5">
                  GPS: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Interactive Map Pin Dropper Modal */}
      <PinDropMapModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        initialLat={
          currentCoords && isWithinNigeria(currentCoords.lat, currentCoords.lng)
            ? currentCoords.lat
            : (activeResolution?.lat ?? 6.5244)
        }
        initialLng={
          currentCoords && isWithinNigeria(currentCoords.lat, currentCoords.lng)
            ? currentCoords.lng
            : (activeResolution?.lng ?? 3.3792)
        }
        initialAddress={value}
        onConfirmLocation={handlePinConfirm}
        title={`Pinpoint Exact ${label}`}
      />
    </div>
  );
}
