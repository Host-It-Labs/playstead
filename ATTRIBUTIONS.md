# Attributions

## Natural Earth

`packages/frontend/public/data/countries.geojson` contains Natural Earth
1:110m Admin 0 country boundaries. Natural Earth data is in the public domain.

- Project: <https://www.naturalearthdata.com/>
- Public-domain terms: <https://www.naturalearthdata.com/about/terms-of-use/>
- Upstream repository: <https://github.com/nvkelso/natural-earth-vector>
- Dataset release: Natural Earth 5.1.1
- Upstream path: `geojson/ne_110m_admin_0_countries.geojson`
- Last dataset commit: `9380cca83db5f9aef52d5e762765100745f84b27`
- Pinned source:
  <https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_110m_admin_0_countries.geojson>
- Vendored SHA-256:
  `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`

The vendored copy lets a default Playstead installation render Atlas Drop without
contacting a map, tile, or analytics service.

## Sentinel-2 cloudless development imagery

The local development configuration uses the EOX Sentinel-2 cloudless 2020 WMTS layer.
It contains modified Copernicus Sentinel data from 2020 and is fetched only when the
development tile URL is enabled. Production self-hosting defaults to the local
`/tiles/satellite` path instead; operators are responsible for the license and attribution
of any imagery source they configure.

- Layer: <https://s2maps.eu/>
- Provider: <https://eox.at/>
- Data programme: <https://dataspace.copernicus.eu/>

## Product inspiration

Atlas Drop is an independent implementation inspired by the map-tapping geography
game genre. Playstead is not affiliated with or endorsed by MapTap or its creators.
No MapTap source code, branding, or visual assets are included.
