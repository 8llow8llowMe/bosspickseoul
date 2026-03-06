package com.followfollowme.nowdoboss.domainlayer.map.application.service.processor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.AreaBoundaryRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.map.domain.enums.AreaType;
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
            throw new IllegalArgumentException("지도 좌표 범위가 올바르지 않습니다.");
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
            throw new IllegalStateException("영역 경계 좌표 변환 실패", e);
        }
    }
}
