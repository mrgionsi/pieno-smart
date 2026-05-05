export type FuelType = "benzina" | "diesel" | "gpl" | "metano" | "gnl" | "hvo" | "altro";
export type ServiceMode = "self" | "servito" | "unknown";
export type NearbySort = "distance" | "price" | "convenience";
export type FreshnessStatus = "fresh" | "stale" | "unknown";

export type NearbyStationItem = {
  id: number;
  ministerial_station_id: string;
  name: string | null;
  brand: string | null;
  address: string | null;
  comune: string | null;
  provincia: string | null;
  postal_code: string | null;
  is_highway_station: boolean | null;
  latitude: number;
  longitude: number;
  distance_meters: number;
  selected_fuel_type: FuelType | null;
  selected_service_mode: ServiceMode | null;
  current_price: string | null;
  price_effective_at: string | null;
  source_updated_at: string | null;
  freshness_status: FreshnessStatus;
  score: number | null;
  match_reasons: string[];
};

export type NearbyStationsResponse = {
  items: NearbyStationItem[];
  filters: {
    lat: number;
    lon: number;
    radius_meters: number;
    fuel_type: FuelType | null;
    service_mode: ServiceMode | null;
    vehicle_profile_id: string | null;
    brand: string | null;
    sort: NearbySort;
    limit: number;
  };
};

export type StationPriceItem = {
  fuel_type: FuelType;
  service_mode: ServiceMode;
  price: string;
  price_effective_at: string | null;
  source_updated_at: string | null;
  freshness_status: FreshnessStatus;
};

export type StationDetail = {
  id: number;
  ministerial_station_id: string;
  name: string | null;
  brand: string | null;
  address: string | null;
  comune: string | null;
  provincia: string | null;
  postal_code: string | null;
  is_highway_station: boolean | null;
  latitude: number;
  longitude: number;
  source_updated_at: string | null;
  freshness_status: FreshnessStatus;
  prices: StationPriceItem[];
};

export type VehicleProfile = {
  id: string;
  name: string;
  fuel_type: FuelType;
  avg_consumption_l_per_100km: string;
  tank_capacity_liters: string | null;
  preferred_service_mode: ServiceMode;
  preferred_brands: string[];
  excluded_brands: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type VehicleProfileListResponse = {
  items: VehicleProfile[];
  default_vehicle_profile_id: string | null;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  external_auth_subject: string | null;
  is_active: boolean;
  default_vehicle_profile_id: string | null;
};

export type PlaceSuggestion = {
  id: string;
  label: string;
  city: string;
  province: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
};
