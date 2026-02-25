import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/with-countries.ts',
    'without-countries': 'src/without-countries.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  external: ['proj4', '@turf/boolean-point-in-polygon'],
});
