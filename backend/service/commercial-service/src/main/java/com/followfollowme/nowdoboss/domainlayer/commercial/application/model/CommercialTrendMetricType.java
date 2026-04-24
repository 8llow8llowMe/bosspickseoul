package com.followfollowme.nowdoboss.domainlayer.commercial.application.model;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommercialTrendMetricType implements CodeNameDescribable {
    SALES("매출액"),
    FOOT_TRAFFIC("유동인구"),
    STORE("점포 현황");

    private final String displayName;
}
