# Changelog

## 3.1.0

- Add optional `projection` parameter to use alternative map projections (Robinson, Equal Earth, Orthographic, Mollweide, and more)
- Projections support an optional `center` to shift the map's center point
- Default projection remains Mercator for backward compatibility

## 3.0.0

- Allow multiple pins at the exact same location (#15)
- Rewrite internals in TypeScript and upgrade dependencies
- **Breaking:** Node 18 or higher is now required
- No other breaking changes are expected
