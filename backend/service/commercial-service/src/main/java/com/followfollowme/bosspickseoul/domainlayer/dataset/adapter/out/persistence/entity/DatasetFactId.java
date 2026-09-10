package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** {@code dataset_fact} 의 복합 키 (run_id, area_code, service_code). 업종 차원이 없는 데이터셋은 service_code 가 빈 문자열이다. */
@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class DatasetFactId implements Serializable {

    @Column(length = 64, nullable = false)
    private String runId;

    @Column(length = 32, nullable = false)
    private String areaCode;

    @Column(length = 32, nullable = false)
    private String serviceCode;
}
