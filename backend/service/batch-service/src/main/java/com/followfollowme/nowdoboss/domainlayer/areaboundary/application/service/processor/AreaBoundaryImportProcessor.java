package com.followfollowme.nowdoboss.domainlayer.areaboundary.application.service.processor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.areaboundary.application.port.out.AreaBoundaryBulkPort;
import com.followfollowme.nowdoboss.domainlayer.areaboundary.domain.enums.AreaType;
import com.followfollowme.nowdoboss.domainlayer.areaboundary.domain.model.AreaBoundary;
import com.followfollowme.nowdoboss.global.properties.AreaBoundaryImportProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AreaBoundaryImportProcessor {

    private static final String AREA_RESOURCE_PATH = "area/%s.json";

    private final ObjectMapper objectMapper;
    private final AreaBoundaryBulkPort areaBoundaryBulkPort;
    private final AreaBoundaryImportProperties areaBoundaryImportProperties;

    public void importAreaBoundary() {
        // 1. 영역 타입별 JSON 로드 및 변환
        int districtCount = importByType(AreaType.DISTRICT);
        int administrationCount = importByType(AreaType.ADMINISTRATION);
        int commercialCount = importByType(AreaType.COMMERCIAL);

        // 2. 적재 결과 로깅
        log.info(
            "영역 좌표 적재 완료 - 자치구: {}, 행정동: {}, 상권: {}",
            districtCount,
            administrationCount,
            commercialCount
        );
    }

    private int importByType(AreaType areaType) {
        String resourceName = areaType.name().toLowerCase();
        String codeField = resourceName + "_code";
        String nameField = resourceName + "_code_name";

        JsonNode root = readRootArray(resourceName);
        List<AreaBoundary> rows = new ArrayList<>();

        for (JsonNode node : root) {
            JsonNode coordsNode = node.path("area_coords");
            if (!coordsNode.isArray() || coordsNode.isEmpty()) {
                continue;
            }

            BoundingBox bbox = extractBoundingBox(coordsNode);
            if (!bbox.valid()) {
                continue;
            }

            JsonNode centerNode = node.path("center_coords");
            if (!centerNode.isArray() || centerNode.size() < 2) {
                continue;
            }

            rows.add(AreaBoundary.builder()
                .areaType(areaType)
                .areaCode(node.path(codeField).asText())
                .areaName(node.path(nameField).asText())
                .centerLng(centerNode.get(0).asDouble())
                .centerLat(centerNode.get(1).asDouble())
                .boundaryGeoJson(coordsNode.toString())
                .bboxMinLng(bbox.minLng())
                .bboxMinLat(bbox.minLat())
                .bboxMaxLng(bbox.maxLng())
                .bboxMaxLat(bbox.maxLat())
                .build());
        }

        if (!rows.isEmpty()) {
            areaBoundaryBulkPort.upsertAll(rows);
        }

        log.info("{} 영역 좌표 적재 건수: {}", areaType.getDescription(), rows.size());
        return rows.size();
    }

    private JsonNode readRootArray(String resourceName) {
        String sourceDir = areaBoundaryImportProperties.sourceDir();
        if (sourceDir != null && !sourceDir.isBlank()) {
            Path filePath = Path.of(sourceDir, resourceName + ".json");
            try (InputStream in = Files.newInputStream(filePath)) {
                return objectMapper.readTree(in);
            } catch (IOException e) {
                throw new IllegalStateException("영역 JSON 파일 로딩 실패(경로): " + filePath, e);
            }
        }

        ClassPathResource resource = new ClassPathResource(AREA_RESOURCE_PATH.formatted(resourceName));
        try (InputStream in = resource.getInputStream()) {
            return objectMapper.readTree(in);
        } catch (IOException e) {
            throw new IllegalStateException("영역 JSON 파일 로딩 실패(classpath): " + resourceName, e);
        }
    }

    private BoundingBox extractBoundingBox(JsonNode coordsNode) {
        double minLng = Double.POSITIVE_INFINITY;
        double minLat = Double.POSITIVE_INFINITY;
        double maxLng = Double.NEGATIVE_INFINITY;
        double maxLat = Double.NEGATIVE_INFINITY;

        for (JsonNode coord : coordsNode) {
            if (!coord.isArray() || coord.size() < 2) {
                continue;
            }

            double lng = coord.get(0).asDouble();
            double lat = coord.get(1).asDouble();

            minLng = Math.min(minLng, lng);
            minLat = Math.min(minLat, lat);
            maxLng = Math.max(maxLng, lng);
            maxLat = Math.max(maxLat, lat);
        }

        return new BoundingBox(minLng, minLat, maxLng, maxLat);
    }

    private record BoundingBox(
        double minLng,
        double minLat,
        double maxLng,
        double maxLat
    ) {

        private boolean valid() {
            return Double.isFinite(minLng) && Double.isFinite(minLat)
                && Double.isFinite(maxLng) && Double.isFinite(maxLat);
        }
    }
}
