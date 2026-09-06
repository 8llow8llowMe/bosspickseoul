package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialSourcePort;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/** Input geometry must already be reprojected to WGS84 longitude/latitude. */
public class SpatialGeoJsonSourceAdapter implements SpatialSourcePort {
    private static final int MAX_BYTES = 64 * 1024 * 1024;
    private final ObjectMapper mapper;
    private final Path archiveDirectory;

    public SpatialGeoJsonSourceAdapter(ObjectMapper mapper, Path rawDirectory) {
        this.mapper = mapper.copy().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION);
        this.archiveDirectory = rawDirectory.toAbsolutePath().normalize().resolve("spatial");
    }

    @Override
    public SpatialSnapshot read(Path sourceFile) {
        try {
            byte[] bytes;
            try (InputStream stream = Files.newInputStream(sourceFile)) {
                bytes = stream.readNBytes(MAX_BYTES + 1);
            }
            require(bytes.length <= MAX_BYTES, "Spatial input exceeds 64 MiB");
            String checksum = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
            JsonNode root;
            try (JsonParser parser = mapper.createParser(bytes)) {
                root = mapper.readTree(parser);
                require(parser.nextToken() == null, "Trailing content after GeoJSON");
            }
            require(root != null && "FeatureCollection".equals(root.path("type").asText()), "Expected FeatureCollection");
            require(!root.has("crs"), "Reproject to WGS84 and remove legacy GeoJSON crs first");
            String version = text(root, "spatialVersion");
            require(version.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,63}"), "Invalid spatialVersion");
            Instant updatedAt = Instant.parse(text(root, "sourceUpdatedAt"));
            Map<SpatialAreaType, Integer> counts = new EnumMap<>(SpatialAreaType.class);
            for (SpatialAreaType type : SpatialAreaType.values()) {
                JsonNode value = root.path("expectedCounts").path(type.name());
                require(value.isIntegralNumber() && value.canConvertToInt() && value.intValue() > 0,
                    "Positive expectedCounts required for " + type);
                counts.put(type, value.intValue());
            }
            JsonNode features = root.path("features");
            require(features.isArray(), "features must be an array");
            List<SpatialArea> areas = new ArrayList<>();
            for (JsonNode feature : features) {
                require("Feature".equals(feature.path("type").asText()), "Expected Feature");
                JsonNode properties = feature.path("properties");
                JsonNode geometry = feature.path("geometry");
                geometry(geometry);
                JsonNode parent = properties.path("parentCode");
                require(parent.isMissingNode() || parent.isNull() || parent.isTextual(), "parentCode must be text or null");
                areas.add(new SpatialArea(SpatialAreaType.valueOf(text(properties, "areaType")),
                    text(properties, "areaCode"), text(properties, "areaName"),
                    parent.isTextual() ? parent.textValue() : null, mapper.writeValueAsString(geometry)));
            }
            archive(bytes, checksum);
            return new SpatialSnapshot(version, checksum, updatedAt, counts, areas);
        } catch (IOException e) {
            throw new IllegalArgumentException("Cannot read or archive spatial source", e);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private void archive(byte[] bytes, String checksum) throws IOException {
        Files.createDirectories(archiveDirectory);
        Path archive = archiveDirectory.resolve(checksum + ".geojson");
        if (Files.exists(archive)) {
            verifyArchive(archive, bytes);
            return;
        }
        Path temporary = Files.createTempFile(archiveDirectory, "spatial-", ".tmp");
        try {
            Files.write(temporary, bytes);
            try {
                // The complete file is exposed in one move; no replacement is permitted.
                Files.move(temporary, archive);
            } catch (FileAlreadyExistsException e) {
                verifyArchive(archive, bytes);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    private void verifyArchive(Path archive, byte[] bytes) throws IOException {
        require(Files.size(archive) == bytes.length && Arrays.equals(Files.readAllBytes(archive), bytes),
            "Existing spatial raw archive is corrupt");
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        require(value.isTextual() && !value.textValue().isBlank(), "Missing text field: " + field);
        return value.textValue();
    }

    private void geometry(JsonNode geometry) {
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

    private void polygon(JsonNode polygon) {
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

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }
}
