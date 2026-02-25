import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import DottedMap, { getMapJSON } from './dist/index.js';
import DottedMapWithoutCountries from './dist/without-countries.js';

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
assert.equal(precomputed.image.height, 30, 'Precomputed image height should be 30');
console.log('  PASS');

// Test 8: Hexagon shape
console.log('Test 8: Hexagon shape...');
const hexSvg = europeMap.getSVG({
  radius: 0.5,
  color: '#333',
  shape: 'hexagon',
});
assert(hexSvg.includes('polyline'), 'Hexagon SVG should contain polyline elements');
console.log('  PASS');

// Write a test SVG for visual inspection
fs.writeFileSync('./test.svg', europeSvg);

console.log('\nAll tests passed!');
