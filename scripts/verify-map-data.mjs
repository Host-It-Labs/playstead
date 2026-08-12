import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const assetUrl = new globalThis.URL(
  '../packages/frontend/public/data/countries.geojson',
  import.meta.url,
);
const expectedSha256 = '6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f';

const source = await readFile(assetUrl);
const actualSha256 = createHash('sha256').update(source).digest('hex');

if (actualSha256 !== expectedSha256) {
  throw new Error(
    `countries.geojson checksum mismatch: expected ${expectedSha256}, received ${actualSha256}`,
  );
}

const collection = JSON.parse(source.toString('utf8'));

if (collection.type !== 'FeatureCollection' || collection.features.length !== 177) {
  throw new Error('countries.geojson is not the expected 177-feature collection');
}

for (const feature of collection.features) {
  if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) {
    throw new Error(`Unexpected geometry type: ${feature.geometry?.type}`);
  }

  if (typeof feature.properties?.ADMIN !== 'string') {
    throw new Error('Every map feature must have a Natural Earth ADMIN name');
  }
}

globalThis.console.log(
  `Verified ${collection.features.length} local map features (${actualSha256}).`,
);
