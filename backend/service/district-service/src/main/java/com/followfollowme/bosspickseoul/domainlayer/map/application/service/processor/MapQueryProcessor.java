package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.AreaBoundaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MapQueryProcessor {

    private final AreaBoundaryRepositoryPort areaBoundaryRepositoryPort;
    private final ObjectMapper objectMapper;

    public List<AreaBoundaryInfo> getAreaCoords(
        AreaType areaType,
        double lngSW,
        double latSW,
        double lngNE,
        double latNE
    ) {
        // 1. 바운딩 박스 범위 검증
        if (lngSW > lngNE || latSW > latNE) {
            throw new MapException(MapErrorCode.VIEWPORT_INVALID);
        }

        // 2. 타입 + 바운딩 박스 기준 영역 조회
        // 3. Domain -> Info 변환
        return areaBoundaryRepositoryPort.findAllByAreaTypeAndBoundingBox(areaType, lngSW, latSW, lngNE, latNE)
            .stream()
            .map(areaBoundary -> AreaBoundaryInfo.from(
                areaBoundary,
                toBoundaryCoords(areaBoundary.boundaryGeoJson())
            ))
            .toList();
    }

    private List<List<Double>> toBoundaryCoords(String boundaryGeoJson) {
        try {
            return objectMapper.readValue(boundaryGeoJson, new TypeReference<>() {
            });
        } catch (Exception e) {
            throw new MapException(MapErrorCode.AREA_BOUNDARY_PARSE_FAILED, e);
        }
    }
}
