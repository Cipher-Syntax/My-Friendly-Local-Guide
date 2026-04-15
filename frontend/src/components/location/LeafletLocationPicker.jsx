import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import api from '../../api/api';

const ZDS_CENTER = [6.93, 122.08];
const ZDS_BOUNDS = [
    [6.75, 121.7],
    [7.35, 122.35],
];
const CITY_SCOPE = 'Zamboanga City';

const markerIcon = L.divIcon({
    className: 'leaflet-location-pin',
    html: '<div style="width:16px;height:16px;border-radius:9999px;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 2px rgba(239,68,68,.4);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

const toRoundedCoordinate = (value) => {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return null;
    return Number(numeric.toFixed(6));
};

const normalizeValue = (value) => ({
    location: String(value?.location || '').trim(),
    municipality: String(value?.municipality || '').trim(),
    latitude: toRoundedCoordinate(value?.latitude),
    longitude: toRoundedCoordinate(value?.longitude),
});

const toResultPayload = (item, fallbackLocation = '') => ({
    location: item?.label || item?.name || fallbackLocation,
    municipality: item?.municipality || CITY_SCOPE,
    latitude: item?.latitude,
    longitude: item?.longitude,
});

function MapClickCapture({ onPick }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });

    return null;
}

function MapAutoCenter({ markerPosition }) {
    const map = useMap();

    useEffect(() => {
        if (!Array.isArray(markerPosition)) return;

        const nextZoom = Math.max(map.getZoom(), 14);
        map.flyTo(markerPosition, nextZoom, { animate: true, duration: 0.7 });
    }, [map, markerPosition?.[0], markerPosition?.[1]]);

    return null;
}

export default function LeafletLocationPicker({
    value,
    onChange,
    label = 'Location',
    required = false,
    idPrefix = 'location',
    readOnly = false,
    readOnlyReason = '',
}) {
    const normalized = useMemo(() => normalizeValue(value), [value]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);

    const markerPosition = useMemo(() => {
        if (normalized.latitude == null || normalized.longitude == null) {
            return null;
        }

        return [normalized.latitude, normalized.longitude];
    }, [normalized.latitude, normalized.longitude]);

    useEffect(() => {
        if (readOnly) {
            setResults([]);
            setSearching(false);
            return;
        }

        const query = searchQuery.trim();
        if (query.length < 2) {
            setResults([]);
            return;
        }

        let active = true;
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const response = await api.get('api/locations/search/', {
                    params: { q: query, limit: 8 },
                });

                if (!active) return;
                const fetchedResults = Array.isArray(response.data) ? response.data : [];
                setResults(fetchedResults);

                // Auto-pin the first match so user does not need an extra click.
                if (fetchedResults.length > 0) {
                    emitChange(toResultPayload(fetchedResults[0], normalized.location || query));
                }
            } catch (_error) {
                if (active) setResults([]);
            } finally {
                if (active) setSearching(false);
            }
        }, 350);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [searchQuery, readOnly]);

    const emitChange = (partial) => {
        if (!onChange) return;

        const next = {
            ...normalized,
            ...partial,
        };

        if (typeof next.location === 'string') {
            next.location = next.location.trim();
        }

        if (typeof next.municipality === 'string') {
            next.municipality = next.municipality.trim();
        }

        if (!next.municipality && (next.location || next.latitude != null || next.longitude != null)) {
            next.municipality = CITY_SCOPE;
        }

        next.latitude = toRoundedCoordinate(next.latitude);
        next.longitude = toRoundedCoordinate(next.longitude);

        onChange(next);
    };

    const handleMapPick = (lat, lng) => {
        if (readOnly) return;

        const municipality = normalized.municipality || CITY_SCOPE;
        const fallbackLocation = normalized.location || `Pinned location in ${CITY_SCOPE}`;

        emitChange({
            latitude: lat,
            longitude: lng,
            municipality,
            location: fallbackLocation,
        });
    };

    const handleResultPick = (item) => {
        if (readOnly) return;

        emitChange(toResultPayload(item, normalized.location));

        setSearchQuery(item.label || item.name || '');
        setResults([]);
    };

    return (
        <div className="space-y-3">
            <label className="block text-slate-900 dark:text-white text-sm font-medium mb-1">
                {label}{required ? ' *' : ''}
            </label>

            <div className="grid grid-cols-1 gap-3">
                <input
                    id={`${idPrefix}-address`}
                    type="text"
                    value={normalized.location}
                    onChange={(event) => {
                        if (readOnly) return;
                        emitChange({ location: event.target.value });
                    }}
                    placeholder={`Search/landmark in ${CITY_SCOPE} (e.g. Sta Cruz Island)`}
                    disabled={readOnly}
                    className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${readOnly ? 'opacity-80 cursor-not-allowed' : ''}`}
                />
            </div>

            <div className="relative">
                <input
                    id={`${idPrefix}-search`}
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={`Search locations in ${CITY_SCOPE}`}
                    disabled={readOnly}
                    className={`w-full px-4 py-2 pr-10 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${readOnly ? 'opacity-80 cursor-not-allowed' : ''}`}
                />
                {searching && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                )}

                {results.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-lg max-h-56 overflow-auto">
                        {results.map((item) => (
                            <button
                                key={item.id || `${item.latitude}-${item.longitude}-${item.label}`}
                                type="button"
                                onClick={() => handleResultPick(item)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                            >
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {item.label || item.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {item.municipality || CITY_SCOPE}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/50">
                <MapContainer
                    center={ZDS_CENTER}
                    zoom={11}
                    style={{ width: '100%', height: 220 }}
                    scrollWheelZoom
                    maxBounds={ZDS_BOUNDS}
                    maxBoundsViscosity={0.3}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapAutoCenter markerPosition={markerPosition} />
                    {!readOnly && <MapClickCapture onPick={handleMapPick} />}
                    {markerPosition && <Marker position={markerPosition} icon={markerIcon} />}
                </MapContainer>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                {markerPosition
                    ? `Pinned at ${normalized.latitude}, ${normalized.longitude}`
                    : (readOnly ? 'Marker is controlled by the linked destination' : 'Click the map or search to place a marker')}
            </div>

            {readOnly && readOnlyReason ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">{readOnlyReason}</p>
            ) : null}
        </div>
    );
}
