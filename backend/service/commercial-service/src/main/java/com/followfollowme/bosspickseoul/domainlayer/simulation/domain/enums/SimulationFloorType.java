package com.followfollowme.bosspickseoul.domainlayer.simulation.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SimulationFloorType implements CodeNameDescribable {

    FIRST_FLOOR("1층", "1층 매장 기준 임대료를 적용합니다."),
    OTHER("1층 외", "지하·2층 이상 등 1층 외 매장 기준 임대료를 적용합니다.");

    private final String displayName;
    private final String description;
}
