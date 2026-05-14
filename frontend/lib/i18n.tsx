import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import type { FreshnessStatus, FuelType, NearbySort, ServiceMode } from "./types";

export type Locale = "en" | "it";

const STORAGE_KEY = "pienosmart.locale";

const translations = {
  en: {
    navNearby: "Nearby",
    navProfiles: "Profiles",
    navTrips: "Trips",
    navFavorites: "Favorites",
    openMenu: "Open Menu",
    closeMenu: "Close Menu",
    language: "Language",
    english: "English",
    italian: "Italiano",
    shellValueLine:
      "Better Than a Plain Fuel List: Compare Stations Using Distance, Freshness, Convenience, and Trip Context.",
    homeTitle: "Best Refueling Decision, Not Just the Cheapest Station",
    profilesTitle: "Profiles Shape Smarter Suggestions",
    profilesSubtitle:
      "Save Fuel and Service Preferences Now So the Same Profile Can Drive Nearby and Route-Based Recommendation Later.",
    tripsTitle: "Trip Planning Is the Next Major Product Surface",
    tripsSubtitle: "This Section Will Turn Route-Aware Refueling into a First-Class Decision Flow.",
    tripsBody:
      "This Screen Is the Placeholder for the Route-Based Refuel Planner. It Gives the Web App a Clear Information Architecture Now, Even Before the Full Trip Flow Lands on This Branch.",
    favoritesTitle: "Favorites Will Keep Your Trusted Stations Close",
    favoritesSubtitle:
      "This Section Will Collect Saved Stations and Make Nearby and Trip Decisions Faster.",
    favoritesBody:
      "The Backend Foundation Is Already in Place. The Next Step Here is the Saved-Station Flow and Favorite-Aware Recommendation.",
    vehicleProfiles: "Vehicle Profiles",
    profileManagerSubtitle:
      "These profiles personalize recommendation defaults for fuel and service mode.",
    profileName: "Profile Name",
    consumption: "Consumption (L/100Km)",
    tankCapacity: "Tank Capacity (Liters)",
    fuelType: "Fuel Type",
    preferredServiceMode: "Preferred Service Mode",
    willBecomeDefault: "Will Become Default",
    createAsSecondaryProfile: "Create as Secondary Profile",
    createVehicleProfile: "Create Vehicle Profile",
    creating: "Creating…",
    savedProfiles: "Saved Profiles",
    noSavedProfilesYet: "No Saved Profiles Yet.",
    delete: "Delete",
    default: "Default",
    stationDetails: "Station Details",
    close: "Close",
    freshness: "Freshness",
    noTimestamp: "No Timestamp",
    stationDetail: "Station Detail",
    stationDetailSubtitle: "See all current prices and freshness data before you decide where to stop.",
    missingStationId: "Missing Station Id",
    unableToLoadStation: "Unable To Load Station",
    unnamedStation: "Unnamed Station",
    noAddressAvailable: "No Address Available",
    noPrice: "No Price",
    priceUnavailable: "Price Unavailable",
    searchPlaceholder: "Search City or Street",
    area: "Area",
    searchExample: "Example: Via Roma, Napoli",
    searchingPlaces: "Searching Places…",
    sort: "Sort",
    fuel: "Fuel",
    moreFilters: "More Filters",
    hideFilters: "Hide Filters",
    vehicleProfile: "Vehicle Profile",
    manualFilters: "Manual Filters",
    usingProfileDefaults: "Using Profile Defaults",
    serviceMode: "Service Mode",
    any: "Any",
    viewportHint: "Move or Zoom the Map to Change the Search Area.",
    locating: "Locating…",
    useMyLocation: "Use My Location",
    search: "Search",
    searchSummary: "Search Summary",
    notSelected: "Not Selected",
    results: "Results",
    summaryHint: "Use the Filters on the Left, Then Compare Results in the Map and List Below.",
    nearbyStations: "Nearby Stations",
    nearbyEmpty: "Run a Search to See Nearby Stations and Convenience Suggestions.",
    stationsInSelectedArea: "Stations in the Selected Area",
    explainSortOptions: "Explain Sort Options",
    explainSortOptionsHint: "Shows or hides an explanation for each sort mode",
    distanceDesc: "Shows the Nearest Stations First.",
    priceDesc: "Shows the Lowest Matching Fuel Price First.",
    convenienceDesc:
      "Prioritizes the Best Overall Choice Using Distance, Price, Freshness, and Practicality.",
    selectSuggestedPlace: "Select a Suggested Place Before Refreshing the Map.",
    unableToResolveTypedLocation: "Unable To Resolve the Typed Location",
    geolocationUnavailable: "Geolocation Is Not Available in This Browser",
    currentLocation: "Current Location",
    unableToGetCurrentLocation: "Unable To Get Your Current Location",
    mapView: "Map View",
    nativeMapPreview: "Map Preview",
    nativeMapPlaceholder:
      "Native Map Support Will Be Added Later. The Web App Currently Uses a Web-Only MapLibre Implementation.",
    stationsInAreaCount: "Stations in the Selected Area",
    kmRange: "Km Range",
    you: "You",
    stationMarker: "Station Marker",
    yourPosition: "Your Position",
    loadingPrices: "Loading Prices…",
    noPricesAvailable: "No Prices Available",
    unknownPlace: "Unknown Place",
    searchFailed: "Search Failed",
    analyticsConsentTitle: "Help Us Improve PienoSmart",
    analyticsConsentBody:
      "Allow privacy-friendly session analytics so we can understand where people click, scroll, and get stuck. We use this only to improve the product experience.",
    analyticsAccept: "Allow Analytics",
    analyticsDecline: "Not Now",
    analyticsPreferences: "Analytics Preferences",
    analyticsPreferencesHint: "Review or change your analytics consent choice.",
  },
  it: {
    navNearby: "Vicino",
    navProfiles: "Profili",
    navTrips: "Viaggi",
    navFavorites: "Preferiti",
    openMenu: "Apri Menu",
    closeMenu: "Chiudi Menu",
    language: "Lingua",
    english: "English",
    italian: "Italiano",
    shellValueLine:
      "Meglio di un semplice elenco prezzi: confronta i distributori per distanza, aggiornamento, convenienza e contesto di viaggio.",
    homeTitle: "La Migliore Scelta per Fare Rifornimento, Non Solo il Distributore Più Economico",
    profilesTitle: "I Profili Rendono i Suggerimenti Più Intelligenti",
    profilesSubtitle:
      "Salva Ora le Preferenze di Carburante e Servizio Così lo Stesso Profilo Potrà Guidare i Suggerimenti Vicini e di Percorso.",
    tripsTitle: "La Pianificazione dei Viaggi È la Prossima Superficie Principale del Prodotto",
    tripsSubtitle: "Questa Sezione Trasformerà il Rifornimento Lungo Percorso in un Flusso di Decisione di Primo Livello.",
    tripsBody:
      "Questa Schermata È il Segnaposto per il Pianificatore di Rifornimento Basato sul Percorso. Dà all'Applicazione Web una Struttura Informativa Chiara Già Ora, Anche Prima che il Flusso Completo dei Viaggi Arrivi su Questo Branch.",
    favoritesTitle: "I Preferiti Terranno Vicini i Tuoi Distributori di Fiducia",
    favoritesSubtitle:
      "Questa Sezione Raccoglierà i Distributori Salvati e Renderà Più Rapide le Decisioni Vicine e di Viaggio.",
    favoritesBody:
      "Le Fondamenta del Backend Sono Già Pronte. Il Prossimo Passo Qui È il Flusso dei Distributori Salvati e i Suggerimenti Consapevoli dei Preferiti.",
    vehicleProfiles: "Profili Veicolo",
    profileManagerSubtitle:
      "Questi profili personalizzano i valori predefiniti dei suggerimenti per carburante e modalità di servizio.",
    profileName: "Nome Profilo",
    consumption: "Consumo (L/100Km)",
    tankCapacity: "Capacità Serbatoio (Litri)",
    fuelType: "Carburante",
    preferredServiceMode: "Modalità di Servizio Preferita",
    willBecomeDefault: "Diventerà il Predefinito",
    createAsSecondaryProfile: "Crea come Profilo Secondario",
    createVehicleProfile: "Crea Profilo Veicolo",
    creating: "Creazione…",
    savedProfiles: "Profili Salvati",
    noSavedProfilesYet: "Nessun Profilo Salvato.",
    delete: "Elimina",
    default: "Predefinito",
    stationDetails: "Dettagli Distributore",
    close: "Chiudi",
    freshness: "Aggiornamento",
    noTimestamp: "Nessun Orario",
    stationDetail: "Dettaglio Distributore",
    stationDetailSubtitle: "Vedi tutti i prezzi correnti e il livello di aggiornamento prima di decidere dove fermarti.",
    missingStationId: "Id Distributore Mancante",
    unableToLoadStation: "Impossibile Caricare il Distributore",
    unnamedStation: "Distributore Senza Nome",
    noAddressAvailable: "Nessun Indirizzo Disponibile",
    noPrice: "Nessun Prezzo",
    priceUnavailable: "Prezzo Non Disponibile",
    searchPlaceholder: "Cerca Città o Via",
    area: "Area",
    searchExample: "Esempio: Via Roma, Napoli",
    searchingPlaces: "Ricerca Luoghi…",
    sort: "Ordina",
    fuel: "Carburante",
    moreFilters: "Più Filtri",
    hideFilters: "Nascondi Filtri",
    vehicleProfile: "Profilo Veicolo",
    manualFilters: "Filtri Manuali",
    usingProfileDefaults: "Uso dei Valori Predefiniti del Profilo",
    serviceMode: "Modalità di Servizio",
    any: "Qualsiasi",
    viewportHint: "Sposta o Ingrandisci la Mappa per Cambiare l'Area di Ricerca.",
    locating: "Localizzazione…",
    useMyLocation: "Usa la Mia Posizione",
    search: "Cerca",
    searchSummary: "Riepilogo Ricerca",
    notSelected: "Non Selezionata",
    results: "Risultati",
    summaryHint: "Usa i Filtri a Sinistra, Poi Confronta i Risultati nella Mappa e nell'Elenco Qui Sotto.",
    nearbyStations: "Distributori Vicini",
    nearbyEmpty: "Esegui una Ricerca per Vedere i Distributori Vicini e i Suggerimenti di Convenienza.",
    stationsInSelectedArea: "Distributori nell'Area Selezionata",
    explainSortOptions: "Spiega le Opzioni di Ordinamento",
    explainSortOptionsHint: "Mostra o nasconde una spiegazione per ogni modalità di ordinamento",
    distanceDesc: "Mostra Prima i Distributori Più Vicini.",
    priceDesc: "Mostra Prima il Prezzo Più Basso per il Carburante Corrispondente.",
    convenienceDesc:
      "Dà Priorità alla Migliore Scelta Complessiva Usando Distanza, Prezzo, Aggiornamento e Praticità.",
    selectSuggestedPlace: "Seleziona un Luogo Suggerito Prima di Aggiornare la Mappa.",
    unableToResolveTypedLocation: "Impossibile Risolvere la Posizione Digitata",
    geolocationUnavailable: "La Geolocalizzazione Non È Disponibile in Questo Browser",
    currentLocation: "Posizione Corrente",
    unableToGetCurrentLocation: "Impossibile Ottenere la Posizione Corrente",
    mapView: "Vista Mappa",
    nativeMapPreview: "Anteprima Mappa",
    nativeMapPlaceholder:
      "Il Supporto Nativo della Mappa Sarà Aggiunto Più Avanti. L'Applicazione Web Usa Attualmente un'Implementazione MapLibre Solo Web.",
    stationsInAreaCount: "Distributori nell'Area Selezionata",
    kmRange: "Km di Raggio",
    you: "Tu",
    stationMarker: "Marcatore Distributore",
    yourPosition: "La Tua Posizione",
    loadingPrices: "Caricamento Prezzi…",
    noPricesAvailable: "Nessun Prezzo Disponibile",
    unknownPlace: "Luogo Sconosciuto",
    searchFailed: "Ricerca Fallita",
    analyticsConsentTitle: "Aiutaci a Migliorare PienoSmart",
    analyticsConsentBody:
      "Consenti analisi di sessione rispettose della privacy così possiamo capire dove le persone cliccano, scorrono e si bloccano. Le usiamo solo per migliorare l'esperienza del prodotto.",
    analyticsAccept: "Consenti Analytics",
    analyticsDecline: "Non Ora",
    analyticsPreferences: "Preferenze Analytics",
    analyticsPreferencesHint: "Rivedi o modifica la tua scelta sul consenso analytics.",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLocale(): Locale {
  if (typeof navigator !== "undefined") {
    const preferred = navigator.languages?.[0] ?? navigator.language;
    if (preferred?.toLowerCase().startsWith("it")) {
      return "it";
    }
  }
  return "en";
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "it") {
      setLocaleState(stored);
      return;
    }
    const detected = detectLocale();
    setLocaleState(detected);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, nextLocale);
        }
      },
      t: (key) => translations[locale][key],
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function translateFuelType(locale: Locale, fuelType: FuelType) {
  const labels: Record<Locale, Record<FuelType, string>> = {
    en: {
      benzina: "Petrol",
      diesel: "Diesel",
      gpl: "LPG",
      metano: "CNG",
      gnl: "LNG",
      hvo: "HVO",
      altro: "Other",
    },
    it: {
      benzina: "Benzina",
      diesel: "Diesel",
      gpl: "GPL",
      metano: "Metano",
      gnl: "GNL",
      hvo: "HVO",
      altro: "Altro",
    },
  };
  return labels[locale][fuelType];
}

export function translateServiceMode(locale: Locale, serviceMode: ServiceMode | "") {
  const labels: Record<Locale, Record<ServiceMode | "", string>> = {
    en: {
      "": "Any",
      self: "Self",
      servito: "Attended",
      unknown: "Unknown",
    },
    it: {
      "": "Qualsiasi",
      self: "Self",
      servito: "Servito",
      unknown: "Sconosciuto",
    },
  };
  return labels[locale][serviceMode];
}

export function translateSort(locale: Locale, sort: NearbySort) {
  const labels: Record<Locale, Record<NearbySort, string>> = {
    en: {
      distance: "Distance",
      price: "Price",
      convenience: "Convenience",
    },
    it: {
      distance: "Distanza",
      price: "Prezzo",
      convenience: "Convenienza",
    },
  };
  return labels[locale][sort];
}

export function translateFreshness(locale: Locale, freshness: FreshnessStatus) {
  const labels: Record<Locale, Record<FreshnessStatus, string>> = {
    en: {
      fresh: "Fresh",
      stale: "Stale",
      unknown: "Unknown",
    },
    it: {
      fresh: "Aggiornato",
      stale: "Vecchio",
      unknown: "Sconosciuto",
    },
  };
  return labels[locale][freshness];
}
