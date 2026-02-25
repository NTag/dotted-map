import proj4 from 'proj4';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { MultiPolygon } from 'geojson';
import geojsonWorld from './countries.geo.json';
import DottedMapWithoutCountries from './without-countries';
import type {
  DottedMapSettings,
  MapSettings,
  MapData,
  Region,
  Point,
  Projection,
  ProjectionName,
} from './types';

export type { DottedMapSettings, MapSettings, Region, Point, Projection, ProjectionName };
export { DottedMapWithoutCountries };

const PROJECTIONS: Record<ProjectionName, string> = {
  mercator: '+proj=merc +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  equirectangular: '+proj=eqc +lon_0={lng} +lat_ts=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  robinson: '+proj=robin +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  equalEarth: '+proj=eqearth +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  mollweide: '+proj=moll +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  miller: '+proj=mill +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  sinusoidal: '+proj=sinu +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  orthographic: '+proj=ortho +lat_0={lat} +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  gallPeters: '+proj=cea +lon_0={lng} +lat_ts=45 +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  vanDerGrinten: '+proj=vandg +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
};

const DEFAULT_PROJECTION: Projection = { name: 'mercator' };

const getProj4String = (projection: Projection = DEFAULT_PROJECTION): string => {
  const template = PROJECTIONS[projection.name];
  const lat = projection.center?.lat ?? 0;
  const lng = projection.center?.lng ?? 0;
  return template.replace('{lat}', String(lat)).replace('{lng}', String(lng));
};

const isFinitePoint = (point: number[]): boolean =>
  point.every((v) => Number.isFinite(v));

interface GeoJSONFeature {
  type: 'Feature';
  id: string;
  properties: { name: string };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

type GeoJSONGeometry =
  | GeoJSONFeatureCollection
  | GeoJSONFeature
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: 'Polygon'; coordinates: number[][][] };

const typedWorld = geojsonWorld as unknown as GeoJSONFeatureCollection;

const geojsonByCountry: Record<string, GeoJSONFeature> =
  typedWorld.features.reduce(
    (countries: Record<string, GeoJSONFeature>, feature: GeoJSONFeature) => {
      countries[feature.id] = feature;
      return countries;
    },
    {},
  );

const geojsonToMultiPolygons = (geojson: GeoJSONFeatureCollection) => {
  const coordinates = geojson.features.reduce(
    (poly: number[][][][], feature: GeoJSONFeature) =>
      poly.concat(
        feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates,
      ),
    [],
  );
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'MultiPolygon' as const, coordinates },
  };
};

const CACHE: Record<string, MapData> = {};

const DEFAULT_WORLD_REGION: Region = {
  lat: { min: -56, max: 71 },
  lng: { min: -168, max: 168 },
};

const computeGeojsonBox = (geojson: GeoJSONGeometry): Region => {
  if (geojson.type === 'FeatureCollection') {
    const boxes = (geojson as GeoJSONFeatureCollection).features.map(
      computeGeojsonBox,
    );
    return {
      lat: {
        min: Math.min(...boxes.map((box) => box.lat.min)),
        max: Math.max(...boxes.map((box) => box.lat.max)),
      },
      lng: {
        min: Math.min(...boxes.map((box) => box.lng.min)),
        max: Math.max(...boxes.map((box) => box.lng.max)),
      },
    };
  } else if (geojson.type === 'Feature') {
    return computeGeojsonBox(
      (geojson as GeoJSONFeature).geometry as GeoJSONGeometry,
    );
  } else if (geojson.type === 'MultiPolygon') {
    const mp = geojson as { type: 'MultiPolygon'; coordinates: number[][][][] };
    return computeGeojsonBox({
      type: 'Polygon',
      coordinates: mp.coordinates.flat(),
    });
  } else if (geojson.type === 'Polygon') {
    const p = geojson as { type: 'Polygon'; coordinates: number[][][] };
    const coords = p.coordinates.flat();
    const latitudes = coords.map(([_lng, lat]) => lat);
    const longitudes = coords.map(([lng]) => lng);

    return {
      lat: {
        min: Math.min(...latitudes),
        max: Math.max(...latitudes),
      },
      lng: {
        min: Math.min(...longitudes),
        max: Math.max(...longitudes),
      },
    };
  } else {
    throw new Error(
      `Unknown geojson type ${(geojson as { type: string }).type}`,
    );
  }
};

const getMap = ({
  height = 0,
  width = 0,
  countries = [] as string[],
  region,
  grid = 'vertical' as const,
  projection = DEFAULT_PROJECTION,
}: MapSettings): MapData => {
  if (height <= 0 && width <= 0) {
    throw new Error('height or width is required');
  }

  const proj4String = getProj4String(projection);

  let geojson: GeoJSONFeatureCollection = typedWorld;
  let resolvedRegion = region;

  if (countries.length > 0) {
    geojson = {
      type: 'FeatureCollection',
      features: countries.map((country) => geojsonByCountry[country]),
    };
    if (!resolvedRegion) {
      resolvedRegion = computeGeojsonBox(geojson);
    }
  } else if (!resolvedRegion) {
    resolvedRegion = DEFAULT_WORLD_REGION;
  }

  const poly = geojsonToMultiPolygons(geojson);

  // Compute projected bounding box by sampling many points along the
  // region boundary and interior. This is necessary because some
  // projections (e.g., orthographic) can't project all corners.
  const SAMPLES = 100;
  const r = resolvedRegion!;
  let X_MIN = Infinity;
  let Y_MIN = Infinity;
  let X_MAX = -Infinity;
  let Y_MAX = -Infinity;

  for (let i = 0; i <= SAMPLES; i++) {
    const frac = i / SAMPLES;
    const sampleLat = r.lat.min + frac * (r.lat.max - r.lat.min);
    const sampleLng = r.lng.min + frac * (r.lng.max - r.lng.min);

    // Sample boundary edges and a center row/column
    const candidates: [number, number][] = [
      [sampleLng, r.lat.min], // bottom edge
      [sampleLng, r.lat.max], // top edge
      [r.lng.min, sampleLat], // left edge
      [r.lng.max, sampleLat], // right edge
      [sampleLng, sampleLat], // diagonal through interior
    ];

    for (const point of candidates) {
      const [px, py] = proj4(proj4String, point);
      if (Number.isFinite(px) && Number.isFinite(py)) {
        X_MIN = Math.min(X_MIN, px);
        Y_MIN = Math.min(Y_MIN, py);
        X_MAX = Math.max(X_MAX, px);
        Y_MAX = Math.max(Y_MAX, py);
      }
    }
  }

  if (!Number.isFinite(X_MIN)) {
    throw new Error(
      'No valid projected points found for the given region and projection',
    );
  }

  const X_RANGE = X_MAX - X_MIN;
  const Y_RANGE = Y_MAX - Y_MIN;

  if (width <= 0) {
    width = Math.round((height * X_RANGE) / Y_RANGE);
  } else if (height <= 0) {
    height = Math.round((width * Y_RANGE) / X_RANGE);
  }

  const points: Record<string, Point> = {};
  const ystep = grid === 'diagonal' ? Math.sqrt(3) / 2 : 1;

  for (let y = 0; y * ystep < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const localx = y % 2 === 0 && grid === 'diagonal' ? x + 0.5 : x;
      const localy = y * ystep;

      const projected: [number, number] = [
        (localx / width) * X_RANGE + X_MIN,
        Y_MAX - (localy / height) * Y_RANGE,
      ];
      const wgs84Point = proj4(proj4String, 'WGS84', projected);

      if (
        !isFinitePoint(wgs84Point) ||
        !booleanPointInPolygon(
          wgs84Point as [number, number],
          poly as { type: 'Feature'; properties: object; geometry: MultiPolygon },
        )
      ) {
        continue;
      }

      points[[x, y].join(';')] = { x: localx, y: localy };
    }
  }

  return {
    points,
    X_MIN,
    Y_MIN,
    X_MAX,
    Y_MAX,
    X_RANGE,
    Y_RANGE,
    region: resolvedRegion!,
    grid,
    height,
    width,
    ystep,
    projection,
  };
};

export const getMapJSON = (props: MapSettings): string =>
  JSON.stringify(getMap(props));

const getCacheKey = ({
  height = 0,
  width = 0,
  countries = [] as string[],
  region,
  grid = 'vertical',
  projection = DEFAULT_PROJECTION,
}: MapSettings): string => {
  return [
    JSON.stringify(region),
    grid,
    height,
    width,
    JSON.stringify(countries),
    JSON.stringify(projection),
  ].join(' ');
};

export default class DottedMap extends DottedMapWithoutCountries {
  constructor({ avoidOuterPins = false, ...args }: DottedMapSettings) {
    const cacheKey = getCacheKey(args);
    const map = CACHE[cacheKey] || getMap(args);
    CACHE[cacheKey] = map;
    super({ avoidOuterPins, map });
  }
}
