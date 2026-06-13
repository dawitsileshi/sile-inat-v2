import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Navigation, Star, ChevronDown, LocateFixed } from 'lucide-react'
import {
  GOOGLE_MAPS_API_KEY, SERVICE_TYPES, RADIUS_OPTIONS, ADDIS_CENTER,
  useGeolocation, searchTextNearby, haversineKm, formatDistance, embedMapSrc,
  type PlaceResult, type RadiusKm,
} from '@/lib/places'

export function FindHelpPage() {
  const [params, setParams] = useSearchParams()
  const initialType =
    SERVICE_TYPES.find((s) => s.value === params.get('type'))?.value ?? SERVICE_TYPES[0].value
  const initialRadius = Number(params.get('radius')) as RadiusKm
  const validInitialRadius = (RADIUS_OPTIONS as readonly number[]).includes(initialRadius)
    ? (initialRadius as RadiusKm)
    : (5 as RadiusKm)

  const [serviceType, setServiceType] = useState(initialType)
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(validInitialRadius)

  const { coords, denied, refresh: refreshLocation } = useGeolocation()
  const center = coords ?? ADDIS_CENTER

  const current = useMemo(
    () => SERVICE_TYPES.find((s) => s.value === serviceType) ?? SERVICE_TYPES[0],
    [serviceType]
  )

  const [places, setPlaces] = useState<PlaceResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Keep the URL in sync so the page is shareable / bookmarkable.
  useEffect(() => {
    const next = new URLSearchParams(params)
    next.set('type', serviceType)
    next.set('radius', String(radiusKm))
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, radiusKm])

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return
    let cancelled = false
    setPlaces(null)
    setError(null)
    searchTextNearby(current.query, center, radiusKm * 1000, 12)
      .then((result) => { if (!cancelled) setPlaces(result) })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load places.')
        setPlaces([])
      })
    return () => { cancelled = true }
  }, [current.query, center.lat, center.lng, radiusKm])

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Find help near you
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Mental health, maternity, and emergency care nearby.
          </p>
        </motion.header>

        <div className="grid gap-4 rounded-2xl bg-white p-4 card-shadow-sm sm:grid-cols-2">
          <Dropdown
            label="Service Type"
            value={serviceType}
            onChange={setServiceType}
            options={SERVICE_TYPES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Dropdown
            label="Distance"
            value={String(radiusKm)}
            onChange={(v) => setRadiusKm(Number(v) as RadiusKm)}
            options={RADIUS_OPTIONS.map((r) => ({ value: String(r), label: `Within ${r} km` }))}
          />
        </div>

        {/* Location status + manual refresh. Desktop browsers serve Wi-Fi
            positioning which is frequently stale; this button is the user's
            escape hatch when the map opens on yesterday's office instead of
            today's home. */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-cream/50 px-4 py-2.5 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <LocateFixed className="h-3.5 w-3.5" />
            {denied
              ? 'Location off — showing results centered on Addis Ababa.'
              : coords
                ? 'Using your current location.'
                : 'Locating you…'}
          </span>
          <button
            type="button"
            onClick={refreshLocation}
            className="rounded-full px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-light/60"
          >
            Refresh location
          </button>
        </div>

        {!GOOGLE_MAPS_API_KEY ? (
          <div className="mt-6 rounded-2xl bg-cream/60 p-6 text-sm text-text-secondary">
            Map unavailable — Google Maps API key not configured. Add{' '}
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">
              VITE_GOOGLE_MAPS_API_KEY
            </code>{' '}
            to <code className="rounded bg-white px-1.5 py-0.5 text-xs">frontend/.env.local</code>,
            then restart the dev server.
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <iframe
                src={embedMapSrc(current.query, center)}
                width="100%"
                height="420"
                loading="lazy"
                style={{ border: 0 }}
                referrerPolicy="no-referrer-when-downgrade"
                title="Nearby places map"
                allowFullScreen
              />
            </div>

            {denied && (
              <p className="mt-3 rounded-lg bg-cream/60 px-3 py-2 text-xs text-text-secondary">
                Showing results around Addis Ababa. Allow location to see places near you.
              </p>
            )}

            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                {current.label} — results
              </h2>

              {places === null && (
                <p className="text-sm text-text-muted">Looking nearby…</p>
              )}
              {error && (
                <p className="text-sm text-text-secondary">{error}</p>
              )}
              {places && places.length === 0 && !error && (
                <p className="text-sm text-text-muted">
                  None found within {radiusKm} km. Try expanding the distance.
                </p>
              )}

              {places && places.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {places.map((p) => (
                    <li key={p.id}>
                      <PlaceCard place={p} center={center} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Dropdown({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm font-medium text-text-primary focus:border-brand focus:outline-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </div>
    </label>
  )
}

function PlaceCard({ place, center }: { place: PlaceResult; center: { lat: number; lng: number } }) {
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber
  const telHref = phone ? `tel:${phone.replace(/\s+/g, '')}` : null
  const distance =
    place.location
      ? haversineKm(center, { lat: place.location.latitude, lng: place.location.longitude })
      : null
  const mapsUrl =
    place.googleMapsUri ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      place.displayName?.text ?? ''
    )}&query_place_id=${place.id}`

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-text-primary">
        {place.displayName?.text ?? 'Unknown place'}
      </p>
      {(place.shortFormattedAddress || place.formattedAddress) && (
        <p className="mt-0.5 text-xs leading-snug text-text-secondary">
          {place.shortFormattedAddress ?? place.formattedAddress}
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        {distance !== null && <span>{formatDistance(distance)} away</span>}
        {place.rating !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-current text-brand" />
            {place.rating.toFixed(1)}
            {place.userRatingCount ? ` (${place.userRatingCount})` : ''}
          </span>
        )}
      </div>

      <div className="mt-auto pt-3">
        <div className="flex flex-wrap gap-2">
          {telHref && (
            <a
              href={telHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark"
            >
              <Phone className="h-3 w-3" />
              Call
            </a>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-text-secondary hover:border-brand/40 hover:text-brand"
          >
            <Navigation className="h-3 w-3" />
            Directions
          </a>
        </div>
      </div>
    </div>
  )
}
