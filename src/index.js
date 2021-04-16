import proj4 from 'proj4';
import inside from '@turf/boolean-point-in-polygon';
import geojsonWorld from './countries.geo.json';

// TODO
// [ ] Handle prefill cache →
//   [ ] Method to export a cache
//   [ ] Method to import a cache
// [ ] Make two exports: one with countries, one without (reduce bundle size)

const geojsonByCountry = geojsonWorld.features.reduce((countries, feature) => {
  countries[feature.id] = feature;
  return countries;
}, {});

const geojsonToMultiPolygons = (geojson) => {
  const coordinates = geojson.features.reduce(
    (poly, feature) =>
      poly.concat(feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates),
    [],
  );
  return { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates } };
};

const CACHE = {};

const DEFAULT_WORLD_REGION = {
  lat: { min: -56, max: 71 },
  lng: { min: -179, max: 179 },
};

const computeGeojsonBox = (geojson) => {
  const { type, features, geometry, coordinates } = geojson;
  if (type === 'FeatureCollection') {
    const boxes = features.map(computeGeojsonBox);
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
  } else if (type == 'Feature') {
    return computeGeojsonBox(geometry);
  } else if (type === 'MultiPolygon') {
    return computeGeojsonBox({ type: 'Polygon', coordinates: coordinates.flat() });
  } else if (type == 'Polygon') {
    const coords = coordinates.flat();
    const latitudes = coords.map(([_lng, lat]) => lat);
    const longitudes = coords.map(([lng, _lat]) => lng);

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
    throw new Error(`Unknown geojson type ${type}`);
  }
};

function DottedMap({ height = 0, width = 0, countries = [], region, grid = 'vertical', avoidOuterPins = false }) {
  if (height <= 0 && width <= 0) {
    throw new Error('height or width is required');
  }

  let geojson = geojsonWorld;
  if (countries.length > 0) {
    geojson = {
      type: 'FeatureCollection',
      features: countries.map((country) => geojsonByCountry[country]),
    };
    if (!region) {
      region = computeGeojsonBox(geojson);
    }
  } else if (!region) {
    region = DEFAULT_WORLD_REGION;
  }

  const poly = geojsonToMultiPolygons(geojson);

  const cacheKey = [JSON.stringify(region), grid, height, width, JSON.stringify(countries)].join(' ');

  const [X_MIN, Y_MIN] = proj4(proj4.defs('GOOGLE'), [region.lng.min, region.lat.min]);
  const [X_MAX, Y_MAX] = proj4(proj4.defs('GOOGLE'), [region.lng.max, region.lat.max]);
  const X_RANGE = X_MAX - X_MIN;
  const Y_RANGE = Y_MAX - Y_MIN;

  if (width <= 0) {
    width = Math.round((height * X_RANGE) / Y_RANGE);
  } else if (height <= 0) {
    height = Math.round((width * Y_RANGE) / X_RANGE);
  }

  const points = { ...CACHE[cacheKey] } || {};
  const ystep = grid === 'diagonal' ? Math.sqrt(3) / 2 : 1;

  if (!CACHE[cacheKey]) {
    for (let y = 0; y * ystep < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const localx = y % 2 === 0 && grid === 'diagonal' ? x + 0.5 : x;
        const localy = y * ystep;

        const pointGoogle = [(localx / width) * X_RANGE + X_MIN, Y_MAX - (localy / height) * Y_RANGE];
        const wgs84Point = proj4(proj4.defs('GOOGLE'), proj4.defs('WGS84'), pointGoogle);

        if (inside(wgs84Point, poly)) {
          points[[x, y].join(';')] = { x: localx, y: localy };
        }
      }
    }

    CACHE[cacheKey] = { ...points };
  }

  return {
    addPin({ lat, lng, data, svgOptions }) {
      const [googleX, googleY] = proj4(proj4.defs('GOOGLE'), [lng, lat]);
      if (avoidOuterPins) {
        const wgs84Point = proj4(proj4.defs('GOOGLE'), proj4.defs('WGS84'), [googleX, googleY]);
        if (!inside(wgs84Point, poly)) return;
      }
      let [rawX, rawY] = [(width * (googleX - X_MIN)) / X_RANGE, (height * (Y_MAX - googleY)) / Y_RANGE];
      const y = Math.round(rawY / ystep);
      if (y % 2 === 0 && grid === 'diagonal') {
        rawX -= 0.5;
      }
      const x = Math.round(rawX);
      let [localx, localy] = [x, Math.round(y) * ystep];
      if (y % 2 === 0 && grid === 'diagonal') {
        localx += 0.5;
      }

      const point = { x: localx, y: localy, data, svgOptions };

      points[[x, y].join(';')] = point;

      return point;
    },
    getPoints() {
      return Object.values(points);
    },
    getSVG({ shape = 'circle', color = 'current', backgroundColor = 'transparent', radius = 0.5 }) {
      const getPoint = ({ x, y, svgOptions = {} }) => {
        const pointRadius = svgOptions.radius || radius;
        if (shape === 'circle') {
          return `<circle cx="${x}" cy="${y}" r="${pointRadius}" fill="${svgOptions.color || color}" />`;
        } else if (shape === 'hexagon') {
          const sqrt3radius = Math.sqrt(3) * pointRadius;

          const polyPoints = [
            [x + sqrt3radius, y - pointRadius],
            [x + sqrt3radius, y + pointRadius],
            [x, y + 2 * pointRadius],
            [x - sqrt3radius, y + pointRadius],
            [x - sqrt3radius, y - pointRadius],
            [x, y - 2 * pointRadius],
          ];

          return `<polyline points="${polyPoints.map((point) => point.join(',')).join(' ')}" fill="${
            svgOptions.color || color
          }" />`;
        }
      };

      return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: ${backgroundColor}">
        ${Object.values(points).map(getPoint).join('\n')}
      </svg>`;
    },
    image: {
      region,
      width,
      height,
    },
  };
}

export default DottedMap;
