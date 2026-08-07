package com.followfollowme.nowdoboss.domainlayer.ranking.domain.model;

import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import java.time.LocalDateTime;

/**
 * 사용자가 분석 화면을 조회했음을 나타내는 이벤트.
 * areaName 은 조회 지점에서 이름을 알 수 없으면 null 로 발행된다 (집계에는 영향 없음).
 */
public record AnalysisViewEvent(

    AnalysisAreaType areaType,

    String areaCode,

    String areaName,

    LocalDateTime occurredAt

) {

}
