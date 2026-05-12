import type { PlaceSuggestion } from "./types";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_BASE_URL = "https://nominatim.openstreetmap.org/reverse";

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    cycleway?: string;
    path?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    hamlet?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
  };
};

export async function searchItalianPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const allResults = new Map<number, NominatimResult>();
  const queries = buildSearchRequests(trimmedQuery);

  for (const params of queries) {
    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "it,en",
      },
    });

    if (!response.ok) {
      throw new Error(`Location search failed with status ${response.status}`);
    }

    const results = (await response.json()) as NominatimResult[];
    for (const result of results) {
      allResults.set(result.place_id, result);
    }
  }

  return [...allResults.values()]
    .sort((left, right) => scorePlaceResult(right, trimmedQuery) - scorePlaceResult(left, trimmedQuery))
    .slice(0, 6)
    .map((result) => mapPlaceSuggestion(result));
}

export async function reverseItalianPlace(latitude: number, longitude: number): Promise<PlaceSuggestion | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "12",
  });

  const response = await fetch(`${NOMINATIM_REVERSE_BASE_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "it,en",
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`);
  }

  const result = (await response.json()) as NominatimResult | { error?: string };
  if ("place_id" in result === false) {
    return null;
  }
  return mapPlaceSuggestion(result);
}

function mapPlaceSuggestion(result: NominatimResult): PlaceSuggestion {
  const street =
    result.address?.road ??
    result.address?.pedestrian ??
    result.address?.footway ??
    result.address?.cycleway ??
    result.address?.path ??
    null;
  const houseNumber = result.address?.house_number ?? null;
  const city =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality ??
    result.address?.hamlet ??
    result.display_name.split(",")[0]?.trim() ??
    "Unknown place";

  const province = result.address?.county ?? null;
  const region = result.address?.state ?? null;
  const streetLabel = [street, houseNumber].filter(Boolean).join(" ").trim() || null;
  const localityLabel = result.address?.suburb ?? result.address?.neighbourhood ?? city;
  const labelParts = [
    streetLabel ?? localityLabel,
    streetLabel ? city : null,
    province,
    region,
  ].filter(Boolean);

  return {
    id: String(result.place_id),
    label: labelParts.join(" · ") || result.display_name,
    city,
    province,
    region,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  };
}

function buildSearchRequests(query: string) {
  const requests: URLSearchParams[] = [baseSearchParams({ q: query })];
  const parts = query
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const [street, city, ...rest] = parts;
    requests.push(
      baseSearchParams({
        street,
        city,
      }),
    );
    requests.push(
      baseSearchParams({
        q: [street, city, ...rest, "Italia"].join(", "),
      }),
    );
  }

  return requests;
}

function baseSearchParams(values: Record<string, string>) {
  return new URLSearchParams({
    format: "jsonv2",
    countrycodes: "it",
    addressdetails: "1",
    limit: "10",
    ...values,
  });
}

function scorePlaceResult(result: NominatimResult, query: string) {
  const normalizedQuery = normalizeText(query);
  const queryParts = query
    .split(",")
    .map((part) => normalizeText(part))
    .filter(Boolean);
  const displayName = normalizeText(result.display_name);
  const city =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality ??
    result.address?.hamlet ??
    "";
  const street =
    result.address?.road ??
    result.address?.pedestrian ??
    result.address?.footway ??
    result.address?.cycleway ??
    result.address?.path ??
    "";

  let score = 0;

  if (displayName.includes(normalizedQuery)) {
    score += 5;
  }

  for (const part of queryParts) {
    if (displayName.includes(part)) {
      score += 2;
    }
  }

  if (queryParts.length >= 2) {
    const [streetQuery, cityQuery] = queryParts;
    if (normalizeText(street).includes(streetQuery)) {
      score += 5;
    }
    if (normalizeText(city).includes(cityQuery)) {
      score += 4;
    }
  }

  return score;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
