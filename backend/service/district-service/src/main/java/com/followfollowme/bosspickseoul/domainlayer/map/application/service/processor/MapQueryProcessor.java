package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.AreaBoundaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.model.AreaBoundary;
import com.followfollowme.bosspickseoul.global.properties.MapViewportProperties;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MapQueryProcessor {

    private final AreaBoundaryRepositoryPort areaBoundaryRepositoryPort;
    private final ObjectMapper objectMapper;
    private final MapViewportProperties mapViewportProperties;

    /**
     * 타입 + 뷰포트 바운딩 박스로 영역 경계를 조회한다.
     *
     * <p>DB 트랜잭션 경계를 여기에 둔다. 상위 Facade 에 걸면 commercial-service Feign 호출을
     * 기다리는 동안에도 커넥션을 잡고 있게 된다.
     */
    @Transactional(readOnly = true)
    public List<AreaBoundaryInfo> getAreaCoords(AreaType areaType, double lngSW, double latSW, double lngNE, double latNE) {
        // 1. 바운딩 박스 범위 검증
        if (lngSW > lngNE || latSW > latNE) {
            throw new MapException(MapErrorCode.VIEWPORT_INVALID);
        }

        // 2. 타입 + 바운딩 박스 기준 영역 조회
        // 상한 + 1 건만 읽어 넘치는지 판정한다. 폴리곤 JSON 을 전량 읽고 파싱한 뒤에 막는 것이 아니라
        // 읽는 양 자체를 여기서 끊는다.
        int maxAreas = maxAreasOf(areaType);
        List<AreaBoundary> areas = areaBoundaryRepositoryPort
            .findAllByAreaTypeAndBoundingBox(areaType, lngSW, latSW, lngNE, latNE, maxAreas + 1);
        if (areas.size() > maxAreas) {
            throw new MapException(MapErrorCode.VIEWPORT_TOO_MANY_AREAS);
        }

        // 3. Domain -> Info 변환
        return areas.stream()
            .map(areaBoundary -> AreaBoundaryInfo.from(
                areaBoundary,
                toBoundaryCoords(areaBoundary.boundaryGeoJson())
            ))
            .toList();
    }

    // AreaType 별 상한 선택은 여기가 소유한다. MapViewportProperties 가 AreaType 을 알면
    // global 패키지가 domainlayer 를 역참조하게 된다.
    private int maxAreasOf(AreaType areaType) {
        return switch (areaType) {
            case DISTRICT -> mapViewportProperties.maxDistrictAreas();
            case ADMINISTRATION -> mapViewportProperties.maxAdministrationAreas();
            case COMMERCIAL -> mapViewportProperties.maxCommercialAreas();
        };
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
