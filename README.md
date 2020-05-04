# dotted-map-generator

## Specs

```js
const map = new DottedMap({
  height,
  width, // (one of both if enough)
  countries: ['FRA', 'DEU'] // if not present, whole world is used
  region: { lat: {min, max}, lng: {min, max} }, // if not present, it fits the countries or the world
})

// → it will cache the points array
DottedMap.clearCache()

map.addPin({
  lat,
  lng,
  svgOptions: { color, radius },
  data, // whatever you want
})

map.getPoints(): [{ x, y, data }]

map.getSVG({
  shape: 'circle' | 'hexagon' | 'square', // custom path is possible
  color,
  backgroundColor, // transparent is possible
  radius: 0.5,
})
```
