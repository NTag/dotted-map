const fs = require('fs');
const proj4 = require('proj4');
const inside = require('point-in-geopolygon');

const geojsonWorld = JSON.parse(fs.readFileSync('./countries.geo.json', { encoding: 'utf8' }));
const geojsonByCountry = geojsonWorld.features.reduce((countries, feature) => {
  countries[feature.id] = feature;
  return countries;
}, {});

const DEFAULT_WORLD_REGION = {
  lat: { min: -65, max: 78 },
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

function DottedMap({ height = 0, width = 0, countries = [], region }) {
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

  const [X_MIN, Y_MIN] = proj4(proj4.defs('GOOGLE'), [region.lng.min, region.lat.min]);
  const [X_MAX, Y_MAX] = proj4(proj4.defs('GOOGLE'), [region.lng.max, region.lat.max]);
  const X_RANGE = X_MAX - X_MIN;
  const Y_RANGE = Y_MAX - Y_MIN;

  if (width <= 0) {
    width = Math.round((height * X_RANGE) / Y_RANGE);
  } else if (height <= 0) {
    height = Math.round((width * Y_RANGE) / X_RANGE);
  }

  const points = {};

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const pointGoogle = [(x / width) * X_RANGE + X_MIN, Y_MAX - (y / height) * Y_RANGE];
      const wgs84Point = proj4(proj4.defs('GOOGLE'), proj4.defs('WGS84'), pointGoogle);
      if (inside.feature(geojson, wgs84Point) !== -1) {
        points[[x, y].join(';')] = { x, y };
      }
    }
  }

  return {
    addPin({ lat, lng, data, svgOptions }) {
      const [rawX, rawY] = proj4(proj4.defs('GOOGLE'), [lng, lat]);
      const [x, y] = [Math.round((width * (rawX - X_MIN)) / X_RANGE), Math.round((height * (Y_MAX - rawY)) / Y_RANGE)];
      points[[x, y].join(';')] = { x, y, data, svgOptions };
    },
    getPoints() {
      return Object.values(points);
    },
    getSVG({ shape, color = 'current', backgroundColor, radius = 0.5 }) {
      return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${Object.values(points)
          .map(
            ({ x, y, svgOptions = {} }) =>
              `<circle cx="${x}" cy="${y}" r="${svgOptions.radius || radius}" fill="${svgOptions.color || color}" />`,
          )
          .join('\n')}
      </svg>`;
    },
  };
}

module.exports = DottedMap;
