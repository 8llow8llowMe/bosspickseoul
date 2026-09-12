package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.model.AreaBoundary;
import java.util.List;

public interface AreaBoundaryRepositoryPort {

    /**
     * 타입 + 바운딩 박스로 영역을 조회한다.
     *
     * @param limit 읽어 올 최대 행 수. 상한 판정을 호출자가 하려면 넘치는지 확인할 1건이 더 필요하므로
     *              보통 상한 + 1 을 넘긴다. Pageable 은 어댑터 안쪽 구현 수단이라 포트 계약에 두지 않는다.
     */
    List<AreaBoundary> findAllByAreaTypeAndBoundingBox(AreaType areaType, double minLng, double minLat, double maxLng, double maxLat, int limit);
}
