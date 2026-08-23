/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_SATELLITE_TILE_URL?: string;
  readonly VITE_SATELLITE_TILE_ATTRIBUTION?: string;
  readonly VITE_SATELLITE_TILE_MAX_ZOOM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
