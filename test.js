import DottedMap, { getMapJSON } from 'dotted-map';

import DottedMapWithoutCountries from 'dotted-map/without-countries';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';

// Test 1: Basic world map creation
console.log('Test 1: Basic world map creation...');
const worldMap = new DottedMap({ height: 60, grid: 'diagonal' });
const worldSvg = worldMap.getSVG({
  radius: 0.22,
  color: '#423B38',
  shape: 'circle',
  backgroundColor: '#020300',
});
assert(worldSvg.startsWith('<svg'), 'SVG should start with <svg tag');
assert(worldSvg.includes('circle'), 'SVG should contain circle elements');
assert.equal(worldMap.image.height, 60, 'Image height should be 60');
assert(worldMap.image.width > 0, 'Image width should be auto-computed');
console.log('  PASS');

// Test 2: Country-filtered map
console.log('Test 2: Country-filtered map...');
const franceMap = new DottedMap({
  height: 60,
  grid: 'diagonal',
  countries: ['FRA'],
});
const franceSvg = franceMap.getSVG({ radius: 0.22, color: '#999' });
assert(franceSvg.includes('<svg'), 'France SVG should be valid');
console.log('  PASS');

// Test 3: Region-filtered map
console.log('Test 3: Region-filtered map...');
const europeMap = new DottedMap({
  height: 60,
  grid: 'diagonal',
  region: { lat: { min: 32, max: 60 }, lng: { min: -12, max: 40 } },
});
const europeSvg = europeMap.getSVG({
  radius: 0.22,
  color: '#999',
  shape: 'circle',
  backgroundColor: 'white',
});
assert(europeSvg.includes('<svg'), 'Europe SVG should be valid');
console.log('  PASS');

// Test 4: addPin and getPin
console.log('Test 4: addPin and getPin...');
const pinMap = new DottedMap({ height: 60, grid: 'diagonal' });
const pin = pinMap.addPin({
  lat: 40.73061,
  lng: -73.935242,
  svgOptions: { color: '#d6ff79', radius: 0.4 },
});
assert(pin !== undefined, 'Pin should be returned');
assert(typeof pin.x === 'number', 'Pin should have numeric x');
assert(typeof pin.y === 'number', 'Pin should have numeric y');
const gotPin = pinMap.getPin({ lat: 40.73061, lng: -73.935242 });
assert(gotPin !== undefined, 'getPin should return a pin');
console.log('  PASS');

// Test 5: getPoints
console.log('Test 5: getPoints...');
const points = pinMap.getPoints();
assert(Array.isArray(points), 'getPoints should return an array');
assert(points.length > 0, 'Points array should not be empty');
console.log('  PASS');

// Test 6: getMapJSON
console.log('Test 6: getMapJSON...');
const jsonStr = getMapJSON({ height: 30, grid: 'vertical' });
const parsed = JSON.parse(jsonStr);
assert(typeof parsed.points === 'object', 'JSON should have points');
assert(typeof parsed.width === 'number', 'JSON should have width');
assert(typeof parsed.height === 'number', 'JSON should have height');
console.log('  PASS');

// Test 7: DottedMapWithoutCountries with precomputed map
console.log('Test 7: DottedMapWithoutCountries with precomputed map...');
const precomputed = new DottedMapWithoutCountries({
  map: JSON.parse(jsonStr),
});
const precomputedSvg = precomputed.getSVG({
  radius: 0.22,
  color: '#423B38',
  shape: 'circle',
});
assert(precomputedSvg.includes('<svg'), 'Precomputed SVG should be valid');
assert.equal(
  precomputed.image.height,
  30,
  'Precomputed image height should be 30',
);
console.log('  PASS');

// Test 8: Hexagon shape
console.log('Test 8: Hexagon shape...');
const hexSvg = europeMap.getSVG({
  radius: 0.5,
  color: '#333',
  shape: 'hexagon',
});
assert(
  hexSvg.includes('polyline'),
  'Hexagon SVG should contain polyline elements',
);
console.log('  PASS');

// Test 9: Multiple pins at same location (issue #15)
console.log('Test 9: Multiple pins at same location...');
const multiPinMap = new DottedMap({ height: 70 });
multiPinMap.addPin({
  lat: 25.7617,
  lng: -80.1918,
  svgOptions: { color: 'rgba(229,38,40, 0.2)', radius: 1.5 },
});
multiPinMap.addPin({
  lat: 25.7617,
  lng: -80.1918,
  svgOptions: { color: 'rgba(229,38,40, 0.5)', radius: 1.1 },
});
multiPinMap.addPin({
  lat: 25.7617,
  lng: -80.1918,
  svgOptions: { color: '#E52628', radius: 0.55 },
});
const multiPinSvg = multiPinMap.getSVG({
  radius: 0.22,
  color: 'rgba(255,255,255, 0.6)',
  shape: 'circle',
});
const pinMatches = multiPinSvg.match(/r="1\.5"/g);
assert(
  pinMatches && pinMatches.length === 1,
  'Should have 1 circle with r=1.5',
);
const pinMatches2 = multiPinSvg.match(/r="1\.1"/g);
assert(
  pinMatches2 && pinMatches2.length === 1,
  'Should have 1 circle with r=1.1',
);
const pinMatches3 = multiPinSvg.match(/r="0\.55"/g);
assert(
  pinMatches3 && pinMatches3.length === 1,
  'Should have 1 circle with r=0.55',
);
console.log('  PASS');

// Test 10: Robinson projection
console.log('Test 10: Robinson projection...');
const robinsonMap = new DottedMap({
  height: 60,
  grid: 'diagonal',
  projection: { name: 'robinson' },
});
const robinsonSvg = robinsonMap.getSVG({
  radius: 0.22,
  color: '#423B38',
  shape: 'circle',
});
assert(robinsonSvg.includes('<svg'), 'Robinson SVG should be valid');
assert(robinsonSvg.includes('circle'), 'Robinson SVG should contain circles');
// Robinson should produce a different width than mercator for the same height
assert(
  robinsonMap.image.width !== worldMap.image.width,
  'Robinson width should differ from mercator',
);
console.log('  PASS');

// Test 11: Orthographic projection with center
console.log('Test 11: Orthographic projection with center...');
const orthoMap = new DottedMap({
  height: 60,
  grid: 'diagonal',
  projection: { name: 'orthographic', center: { lat: 40, lng: -100 } },
});
const orthoSvg = orthoMap.getSVG({
  radius: 0.22,
  color: '#423B38',
  shape: 'circle',
});
assert(orthoSvg.includes('<svg'), 'Orthographic SVG should be valid');
assert(orthoSvg.includes('circle'), 'Orthographic SVG should contain circles');
// Orthographic only shows a hemisphere, so it should have fewer points than mercator
const orthoPoints = orthoMap.getPoints();
const mercatorPoints = worldMap.getPoints();
assert(
  orthoPoints.length < mercatorPoints.length,
  'Orthographic should have fewer points than mercator (shows one hemisphere)',
);
console.log('  PASS');

// Test 12: Orthographic pin on the back side of the globe
console.log('Test 12: Orthographic pin on back side returns undefined...');
const orthoMap2 = new DottedMap({
  height: 60,
  projection: { name: 'orthographic', center: { lat: 40, lng: -100 } },
});
// Delhi (77°E) is ~177° away from center (100°W), clearly on the back side
const backPin = orthoMap2.getPin({ lat: 28.6139, lng: 77.209 });
assert(backPin === undefined, 'Pin on back side of globe should be undefined');
console.log('  PASS');

// Test 13: Equal Earth projection
console.log('Test 13: Equal Earth projection...');
const equalEarthMap = new DottedMap({
  height: 60,
  grid: 'diagonal',
  projection: { name: 'equalEarth' },
});
const eeSvg = equalEarthMap.getSVG({ radius: 0.22, color: '#423B38' });
assert(eeSvg.includes('<svg'), 'Equal Earth SVG should be valid');
assert(eeSvg.includes('circle'), 'Equal Earth SVG should contain circles');
console.log('  PASS');

// Test 14: Projection with shifted center
console.log('Test 14: Robinson projection with Pacific center...');
const pacificMap = new DottedMap({
  height: 60,
  projection: { name: 'robinson', center: { lat: 0, lng: 150 } },
});
const pacificSvg = pacificMap.getSVG({ radius: 0.22, color: '#423B38' });
assert(pacificSvg.includes('<svg'), 'Pacific-centered SVG should be valid');
console.log('  PASS');

// Test 15: Precomputed map preserves projection
console.log('Test 15: Precomputed map preserves projection...');
const robinsonJson = getMapJSON({
  height: 30,
  grid: 'vertical',
  projection: { name: 'robinson' },
});
const robinsonParsed = JSON.parse(robinsonJson);
assert.deepEqual(
  robinsonParsed.projection,
  { name: 'robinson' },
  'Precomputed JSON should include projection',
);
const precomputedRobinson = new DottedMapWithoutCountries({
  map: robinsonParsed,
});
const pin2 = precomputedRobinson.addPin({
  lat: 48.8566,
  lng: 2.3522,
  svgOptions: { color: 'red', radius: 0.5 },
});
assert(pin2 !== undefined, 'Pin on precomputed Robinson map should work');
console.log('  PASS');

// Test 16: Default projection (no projection specified)
console.log('Test 16: Default projection (no projection specified)...');
const defaultMap = new DottedMap({ height: 60, grid: 'diagonal' });
const defaultSvg = defaultMap.getSVG({
  radius: 0.22,
  color: '#423B38',
  shape: 'circle',
  backgroundColor: '#020300',
});
assert(defaultSvg.includes('<svg'), 'Default SVG should be valid');
assert(defaultSvg.includes('circle'), 'Default SVG should contain circles');
assert(defaultMap.image.width > 0, 'Default map width should be auto-computed');
const defaultPin = defaultMap.addPin({
  lat: 40.73061,
  lng: -73.935242,
  svgOptions: { color: '#d6ff79', radius: 0.4 },
});
assert(defaultPin !== undefined, 'Pin on default map should work');
console.log('  PASS');

// Write test SVGs for visual inspection
fs.writeFileSync('./test.svg', robinsonSvg);
fs.writeFileSync('./test-ortho.svg', orthoSvg);
fs.writeFileSync('./test-default.svg', defaultSvg);

console.log('\nAll tests passed!');
