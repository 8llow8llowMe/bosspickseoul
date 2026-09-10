package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

/** {@code change_commercial} 한 행. 서울 API 컬럼을 서비스 엔티티 컬럼으로 펼친 결과다. */
public record ChangeCommercialTypedRow(
    String periodCode,
    String spatialVersion,
    String commercialCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialName,
    String changeIndicatorCode,
    String changeIndicatorName,
    Integer averageOpenedMonths,
    Integer averageClosedMonths
) {
}
