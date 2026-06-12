// Google Places (New) + geolocation utilities, shared between the
// CrisisButton modal's small medical-lane map and the dedicated
// /find-help page.

import { useEffect, useMemo, useState } from 'react'

export const GOOGLE_MAPS_API_KEY: string =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? ''

export interface Coords { lat: number; lng: number }

// Addis Ababa — used when geolocation is unavailable or denied.
export const ADDIS_CENTER: Coords = { lat: 9.0320, lng: 38.7469 }

export interface PlaceResult {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  shortFormattedAddress?: string
  location?: { latitude: number; longitude: number }
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
}

export interface ServiceType {
  value: string
  label: string
  /** Text query passed to Places API (New) Text Search. */
  query: string
}

export const SERVICE_TYPES: ServiceType[] = [
  {
    value: 'psychological',
    label: 'Psychological service',
    query: 'psychologist OR mental health clinic OR counseling',
  },
  {
    value: 'maternity',
    label: 'Maternity Clinic',
    query: 'maternity clinic OR obstetrics OR OBGYN',
  },
  {
    value: 'hospital',
    label: 'Hospital',
    query: 'hospital',
  },
  {
    value: 'pharmacy',
    label: 'Pharmacy',
    query: 'pharmacy',
  },
]

export const RADIUS_OPTIONS = [2, 5, 10, 20] as const
export type RadiusKm = (typeof RADIUS_OPTIONS)[number]

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDenied(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setDenied(true),
      { timeout: 10_000, maximumAge: 300_000 }
    )
  }, [])

  return useMemo(() => ({ coords, denied }), [coords, denied])
}

export async function searchTextNearby(
  query: string,
  center: Coords,
  radiusMeters: number,
  maxResults = 10,
): Promise<PlaceResult[]> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.shortFormattedAddress',
        'places.location',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.rating',
        'places.userRatingCount',
        'places.googleMapsUri',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: maxResults,
      locationBias: {
        circle: {
          center: { latitude: center.lat, longitude: center.lng },
          radius: radiusMeters,
        },
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    if (response.status === 403) {
      throw new Error(
        'Places API error — enable Places API (New) in Google Cloud Console and check the key’s referrer restrictions.'
      )
    }
    throw new Error(`Places lookup failed (${response.status}). ${body.slice(0, 160)}`)
  }

  const data = (await response.json()) as { places?: PlaceResult[] }
  return data.places ?? []
}

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function embedMapSrc(query: string, center: Coords): string {
  const q = encodeURIComponent(`${query} near ${center.lat},${center.lng}`)
  return `https://www.google.com/maps/embed/v1/search?key=${GOOGLE_MAPS_API_KEY}&q=${q}`
}
