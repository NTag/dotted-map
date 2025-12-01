import inside from "@turf/boolean-point-in-polygon";
import type GeoJSON from "geojson";
import proj4 from "proj4";
import countries from "./countries";
import type { Map, Point } from "./types";
import DottedMapWithoutCountries from "./without-countries";

const geojsonWorld = countries;

const geojsonByCountry = geojsonWorld.features.reduce(
  (countries, feature) => {
    countries[feature.id as string] = feature as GeoJSON.Feature;

    return countries;
  },
  {} as Record<string, GeoJSON.Feature>,
);

const geojsonToMultiPolygons = (
  geojson: GeoJSON.FeatureCollection,
): GeoJSON.Feature<GeoJSON.MultiPolygon> => {
  const coordinates = geojson.features.reduce(
    (poly, feature) => {
      if (feature.geometry.type === "Polygon") {
        return poly.concat([feature.geometry.coordinates]);
      }

      return poly.concat(
        (feature.geometry as GeoJSON.MultiLineString).coordinates,
      );
    },
    [] as GeoJSON.MultiPolygon["coordinates"],
  );

  return {
    type: "Feature",
    geometry: { type: "MultiPolygon", coordinates },
    properties: {},
  };
};

const CACHE = {} as Record<string, Map>;

const DEFAULT_WORLD_REGION = {
  lat: { min: -56, max: 71 },
  lng: { min: -179, max: 179 },
};

type ComputedGeojsonBox = {
  lat: { min: number; max: number };
  lng: { min: number; max: number };
}[];

const computeGeojsonBox = (geojson: GeoJSON.GeoJSON) => {
  switch (geojson.type) {
    case "FeatureCollection": {
      const boxes = geojson.features.map(
        computeGeojsonBox,
      ) as ComputedGeojsonBox;

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
    }

    case "Feature": {
      return computeGeojsonBox(geojson.geometry);
    }

    case "MultiPolygon": {
      return computeGeojsonBox({
        type: "Polygon",
        coordinates: geojson.coordinates.flat(),
      });
    }

    case "Polygon": {
      const coords = geojson.coordinates.flat();

      const latitudes = coords
        .map(([_, lat]) => lat)
        .filter(Boolean) as number[];
      const longitudes = coords
        .map(([lng, _]) => lng)
        .filter(Boolean) as number[];

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
    }

    default: {
      throw new Error(`Unknown geojson type ${geojson.type}`);
    }
  }
};

export type MapSettings = {
  height?: number;
  width?: number;
  countries?: string[];
  region?: typeof DEFAULT_WORLD_REGION;
  avoidOuterPins?: boolean;
  grid?: "vertical" | "diagonal";
};

const getMap = ({
  height = 0,
  width = 0,
  countries = [],
  region,
  grid = "vertical",
}: MapSettings = {}): Map => {
  if (height <= 0 && width <= 0) {
    throw new Error("height or width is required");
  }

  let geojson = geojsonWorld;

  if (countries.length > 0) {
    geojson = {
      type: "FeatureCollection",
      features: countries.map(
        (country) => geojsonByCountry[country] as GeoJSON.Feature,
      ),
    };
    if (!region) {
      region = computeGeojsonBox(geojson);
    }
  } else if (!region) {
    region = DEFAULT_WORLD_REGION;
  }

  const poly = geojsonToMultiPolygons(geojson);

  const [X_MIN, Y_MIN] = proj4(proj4.defs("GOOGLE") as unknown as string, [
    region.lng.min,
    region.lat.min,
  ]);

  const [X_MAX, Y_MAX] = proj4(proj4.defs("GOOGLE") as unknown as string, [
    region.lng.max,
    region.lat.max,
  ]);

  const X_RANGE = X_MAX - X_MIN;
  const Y_RANGE = Y_MAX - Y_MIN;

  if (width <= 0) {
    width = Math.round((height * X_RANGE) / Y_RANGE);
  } else if (height <= 0) {
    height = Math.round((width * Y_RANGE) / X_RANGE);
  }

  const points = {} as Record<string, Point>;
  const ystep = grid === "diagonal" ? Math.sqrt(3) / 2 : 1;

  for (let y = 0; y * ystep < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const localx = y % 2 === 0 && grid === "diagonal" ? x + 0.5 : x;
      const localy = y * ystep;

      const pointGoogle = [
        (localx / width) * X_RANGE + X_MIN,
        Y_MAX - (localy / height) * Y_RANGE,
      ];

      const wgs84Point = proj4(
        proj4.defs("GOOGLE") as unknown as string,
        proj4.defs("WGS84") as unknown as string,
        pointGoogle,
      );

      if (inside(wgs84Point, poly)) {
        points[[x, y].join(";")] = { x: localx, y: localy } as Point;
      }
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
    region,
    grid,
    height,
    width,
    ystep,
  };
};

export const getMapJSON = (props?: MapSettings) =>
  JSON.stringify(getMap(props));

const getCacheKey = ({
  height = 0,
  width = 0,
  countries = [],
  region,
  grid = "vertical",
}: MapSettings = {}) => {
  return [
    JSON.stringify(region),
    grid,
    height,
    width,
    JSON.stringify(countries),
  ].join(" ");
};

export class DottedMap extends DottedMapWithoutCountries {
  constructor({ avoidOuterPins = false, ...args }: MapSettings) {
    const cacheKey = getCacheKey(args);
    const map = CACHE[cacheKey] || getMap(args);

    super({ avoidOuterPins, map });
  }
}

export default DottedMap;
