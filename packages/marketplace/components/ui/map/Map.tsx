"use client";

import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { MapContext } from "./context";

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

type MapStyleOption = string | MapLibreGL.StyleSpecification;

export type MapProps = {
  children?: ReactNode;
  /** Custom map styles for light and dark themes. Overrides the default Carto styles. */
  styles?: {
    light?: MapStyleOption;
    dark?: MapStyleOption;
  };
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

function DefaultLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex gap-1">
        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function Map({ children, styles, ...props }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const { resolvedTheme } = useTheme();

  const mapStyles = useMemo(
    () => ({
      dark: styles?.dark ?? defaultStyles.dark,
      light: styles?.light ?? defaultStyles.light,
    }),
    [styles]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const mapStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;

    const mapInstance = new MapLibreGL.Map({
      container: containerRef.current,
      style: mapStyle,
      renderWorldCopies: false,
      attributionControl: {
        compact: true,
      },
      ...props,
    });

    const styleDataHandler = () => setIsStyleLoaded(true);
    const loadHandler = () => setIsLoaded(true);

    mapInstance.on("load", loadHandler);
    mapInstance.on("styledata", styleDataHandler);
    mapRef.current = mapInstance;

    return () => {
      mapInstance.off("load", loadHandler);
      mapInstance.off("styledata", styleDataHandler);
      mapInstance.remove();
      mapRef.current = null;
      setIsLoaded(false);
      setIsStyleLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map initialization should only run once on mount
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      setIsStyleLoaded(false);
      mapRef.current.setStyle(
        resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light,
        { diff: true }
      );
    }
  }, [resolvedTheme, mapStyles]);

  const isLoading = !isLoaded || !isStyleLoaded;

  const contextValue = useMemo(
    () => ({
      map: mapRef.current,
      isLoaded: isLoaded && isStyleLoaded,
    }),
    [isLoaded, isStyleLoaded]
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative w-full h-full">
        {isLoading && <DefaultLoader />}
        {/* SSR-safe: children render only when map exists on client */}
        {mapRef.current && children}
      </div>
    </MapContext.Provider>
  );
}
