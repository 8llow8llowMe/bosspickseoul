package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial;

import com.fasterxml.jackson.databind.JsonNode;

/** Structural checks shared by every spatial source: WGS84 Polygon/MultiPolygon with closed rings. */
final class GeoJsonGeometry {
    private GeoJsonGeometry() {}

    static void validate(JsonNode geometry) {
        require(!geometry.has("crs"), "Geometry must use WGS84");
        JsonNode coordinates = geometry.path("coordinates");
        switch (geometry.path("type").asText()) {
            case "Polygon" -> polygon(coordinates);
            case "MultiPolygon" -> {
                require(coordinates.isArray() && !coordinates.isEmpty(), "Empty MultiPolygon");
                for (JsonNode polygon : coordinates) polygon(polygon);
            }
            default -> throw new IllegalArgumentException("Only Polygon and MultiPolygon geometry is supported");
        }
    }

    private static void polygon(JsonNode polygon) {
        require(polygon.isArray() && !polygon.isEmpty(), "Empty Polygon");
        for (JsonNode ring : polygon) {
            require(ring.isArray() && ring.size() >= 4, "Polygon ring needs at least four coordinates");
            for (JsonNode point : ring) {
                require(point.isArray() && point.size() == 2, "Coordinates must be WGS84 [longitude, latitude]");
                require(point.get(0).isNumber() && point.get(1).isNumber(), "Coordinates must be numeric");
                double longitude = point.get(0).doubleValue();
                double latitude = point.get(1).doubleValue();
                require(Double.isFinite(longitude) && Double.isFinite(latitude)
                    && longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90,
                    "Coordinate outside WGS84 range");
            }
            JsonNode first = ring.get(0);
            JsonNode last = ring.get(ring.size() - 1);
            require(first.get(0).doubleValue() == last.get(0).doubleValue()
                && first.get(1).doubleValue() == last.get(1).doubleValue(), "Polygon ring is not closed");
        }
    }

    static void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }
}
