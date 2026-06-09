"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveLocation } from "@/lib/use-active-location";

export interface LocationWeatherPlace {
  lat: number;
  lon: number;
  label: string;
}

export interface LocationWeather {
  temp: number;
  high: number;
  low: number;
  code: number;
}

/** Per-tenant weather from the active location's geocoded city (Open-Meteo). */
export function useLocationWeather(): {
  place: LocationWeatherPlace | null;
  weather: LocationWeather | null;
  loading: boolean;
} {
  const { locationId, locations } = useActiveLocation();
  const activeLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  );

  const [place, setPlace] = useState<LocationWeatherPlace | null>(null);
  const [weather, setWeather] = useState<LocationWeather | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPlace(null);
    setWeather(null);

    const city = activeLocation?.city?.trim();
    const state = activeLocation?.state?.trim();
    const country = activeLocation?.country?.trim();
    if (!city) return;

    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({
          name: city,
          count: "10",
          language: "en",
          format: "json",
        });
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
        );
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        const results: Array<{
          latitude: number;
          longitude: number;
          name?: string;
          admin1?: string;
          country_code?: string;
          country?: string;
        }> = Array.isArray(j?.results) ? j.results : [];
        if (results.length === 0) return;

        const match =
          (state &&
            results.find((x) => x.admin1?.toLowerCase() === state.toLowerCase())) ||
          (country &&
            results.find(
              (x) =>
                x.country?.toLowerCase() === country.toLowerCase() ||
                x.country_code?.toLowerCase() === country.toLowerCase(),
            )) ||
          results[0];

        const labelParts = [match.name ?? city];
        if (state) labelParts.push(state);
        else if (match.admin1) labelParts.push(match.admin1);

        const nextPlace = {
          lat: match.latitude,
          lon: match.longitude,
          label: labelParts.join(", "),
        };
        if (cancelled) return;
        setPlace(nextPlace);

        const forecast = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${nextPlace.lat}&longitude=${nextPlace.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`,
        );
        if (!forecast.ok) return;
        const fj = await forecast.json();
        if (cancelled) return;
        setWeather({
          temp: Math.round(fj.current?.temperature_2m ?? 0),
          code: fj.current?.weather_code ?? 0,
          high: Math.round(fj.daily?.temperature_2m_max?.[0] ?? 0),
          low: Math.round(fj.daily?.temperature_2m_min?.[0] ?? 0),
        });
      } catch {
        /* hide widget when geo fails */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeLocation?.city, activeLocation?.state, activeLocation?.country]);

  return { place, weather, loading };
}
