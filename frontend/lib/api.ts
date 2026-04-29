import type {
  CurrentUser,
  NearbyStationsResponse,
  StationDetail,
  VehicleProfileListResponse,
} from "@/lib/types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

function buildHeaders(needsUserContext = false): HeadersInit {
  if (!needsUserContext) {
    return {};
  }

  const email = process.env.EXPO_PUBLIC_DEV_USER_EMAIL;
  const displayName = process.env.EXPO_PUBLIC_DEV_USER_DISPLAY_NAME;
  const subject = process.env.EXPO_PUBLIC_DEV_USER_SUBJECT;

  const headers: Record<string, string> = {};
  if (email) headers["X-Dev-User-Email"] = email;
  if (displayName) headers["X-Dev-User-Display-Name"] = displayName;
  if (subject) headers["X-Dev-User-Subject"] = subject;
  return headers;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return fetchJson<CurrentUser>("/users/me", {
    headers: buildHeaders(true),
  });
}

export async function getVehicleProfiles(): Promise<VehicleProfileListResponse> {
  return fetchJson<VehicleProfileListResponse>("/vehicle-profiles", {
    headers: buildHeaders(true),
  });
}

export async function createVehicleProfile(payload: {
  name: string;
  fuel_type: string;
  avg_consumption_l_per_100km: string;
  tank_capacity_liters?: string;
  preferred_service_mode: string;
  preferred_brands: string[];
  excluded_brands: string[];
  is_default: boolean;
}) {
  return fetchJson("/vehicle-profiles", {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });
}

export async function deleteVehicleProfile(profileId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/vehicle-profiles/${profileId}`, {
    method: "DELETE",
    headers: buildHeaders(true),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
}

export async function searchNearby(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    searchParams.set(key, String(value));
  }

  const needsUserContext = searchParams.has("vehicle_profile_id");
  return fetchJson<NearbyStationsResponse>(`/stations/nearby?${searchParams.toString()}`, {
    headers: buildHeaders(needsUserContext),
  });
}

export async function getStationDetail(stationId: string | number): Promise<StationDetail> {
  return fetchJson<StationDetail>(`/stations/${stationId}`);
}
