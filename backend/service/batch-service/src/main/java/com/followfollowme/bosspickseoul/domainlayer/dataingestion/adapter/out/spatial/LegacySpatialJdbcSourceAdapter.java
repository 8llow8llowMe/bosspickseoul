package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialArea;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSourceRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.AreaScope;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Builds a spatial snapshot from the legacy 20233 tables the services already read, so quarterly imports
 * can be validated and published before a 2024 standard-unit geometry file exists.
 *
 * <p>{@code area_boundary.boundary_geo_json} holds a bare ring ({@code [[lng,lat],...]}) rather than a
 * GeoJSON geometry; it is wrapped as a Polygon and closed if the source left it open. Parents come from
 * {@code commercial_region_mapping} for commercial areas and from the five-digit district prefix for
 * administrative dongs. The checksum covers every emitted area, so the same tables yield the same version.
 */
public class LegacySpatialJdbcSourceAdapter implements SpatialSourcePort {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final String qualifier;

    /**
     * @param schema schema holding the legacy tables, or blank for the batch's own schema. These tables
     *               belong to the district service, so a commercial-schema batch must name it.
     */
    public LegacySpatialJdbcSourceAdapter(JdbcTemplate jdbc, ObjectMapper mapper, String schema) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        String trimmed = schema == null ? "" : schema.strip();
        // Interpolated into SQL, so it can never be free text.
        if (!trimmed.isEmpty() && !trimmed.matches("[A-Za-z0-9_]{1,64}"))
            throw new IllegalArgumentException("Invalid legacy spatial schema name");
        this.qualifier = trimmed.isEmpty() ? "" : trimmed + ".";
    }

    @Override
    public SpatialSnapshot read(SpatialSourceRequest request) {
        if (request.kind() != SpatialSourceRequest.Kind.LEGACY) throw new IllegalArgumentException("Legacy source only handles LEGACY requests");
        Map<String, String> commercialParents = new HashMap<>();
        for (Map<String, Object> row : jdbc.queryForList(
                "SELECT DISTINCT commercial_code, administration_code FROM " + qualifier + "commercial_region_mapping")) {
            String previous = commercialParents.put(text(row, "commercial_code"), text(row, "administration_code"));
            if (previous != null) throw new IllegalArgumentException("Commercial area mapped to two dongs: " + text(row, "commercial_code"));
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT area_type, area_code, area_name, boundary_geo_json FROM " + qualifier + "area_boundary ORDER BY area_type, area_code");
        if (rows.isEmpty()) throw new IllegalArgumentException("No rows in " + qualifier + "area_boundary; set batch.dataset-source.legacy-spatial-schema");
        List<SpatialArea> areas = new ArrayList<>(rows.size());
        Map<AreaScope, Integer> counts = new EnumMap<>(AreaScope.class);
        MessageDigest digest = sha256();
        for (Map<String, Object> row : rows) {
            AreaScope type = AreaScope.valueOf(text(row, "area_type"));
            String code = text(row, "area_code");
            String parent = switch (type) {
                case DISTRICT -> null;
                case ADMINISTRATION -> code.length() >= 5 ? code.substring(0, 5) : null;
                case COMMERCIAL -> commercialParents.get(code);
            };
            if (type == AreaScope.COMMERCIAL && parent == null)
                throw new IllegalArgumentException("Commercial area has no commercial_region_mapping row: " + code);
            String geometry = geometry(text(row, "boundary_geo_json"), type, code);
            SpatialArea area = new SpatialArea(type, code, text(row, "area_name"), parent, geometry);
            areas.add(area);
            counts.merge(type, 1, Integer::sum);
            digest.update((type + "|" + code + "|" + area.areaName() + "|" + parent + "|" + geometry + "\n").getBytes(StandardCharsets.UTF_8));
        }
        return new SpatialSnapshot(request.spatialVersion(), HexFormat.of().formatHex(digest.digest()),
                request.sourceUpdatedAt(), counts, areas);
    }

    private String geometry(String stored, AreaScope type, String code) {
        try {
            JsonNode node = mapper.readTree(stored);
            JsonNode geometry;
            if (node.isObject()) {
                geometry = node;
            } else if (node.isArray() && !node.isEmpty() && node.get(0).isArray() && node.get(0).path(0).isNumber()) {
                geometry = polygon(mapper.createArrayNode().add(closedRing((ArrayNode) node)));
            } else if (node.isArray() && !node.isEmpty() && node.get(0).isArray() && node.get(0).path(0).isArray()) {
                ArrayNode rings = mapper.createArrayNode();
                for (JsonNode ring : node) rings.add(closedRing((ArrayNode) ring));
                geometry = polygon(rings);
            } else {
                throw new IllegalArgumentException("Unrecognised boundary_geo_json for " + type + "/" + code);
            }
            GeoJsonGeometry.validate(geometry);
            return mapper.writeValueAsString(geometry);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid boundary_geo_json for " + type + "/" + code);
        }
    }

    private ObjectNode polygon(ArrayNode rings) {
        ObjectNode geometry = mapper.createObjectNode();
        geometry.put("type", "Polygon");
        geometry.set("coordinates", rings);
        return geometry;
    }

    private ArrayNode closedRing(ArrayNode ring) {
        if (ring.size() >= 3 && !ring.get(0).equals(ring.get(ring.size() - 1))) ring.add(ring.get(0).deepCopy());
        return ring;
    }

    private static String text(Map<String, Object> row, String column) {
        Object value = row.get(column);
        if (value == null) throw new IllegalArgumentException("Legacy spatial row has null " + column);
        return value.toString();
    }

    private static MessageDigest sha256() {
        try { return MessageDigest.getInstance("SHA-256"); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 unavailable", e); }
    }
}
