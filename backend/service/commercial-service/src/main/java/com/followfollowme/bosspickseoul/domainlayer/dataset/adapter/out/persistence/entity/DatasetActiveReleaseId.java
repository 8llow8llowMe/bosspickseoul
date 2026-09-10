package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 활성 release 슬롯 (dataset, period_code, spatial_version, schema_version). */
@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class DatasetActiveReleaseId implements Serializable {

    @Column(length = 64, nullable = false)
    private String dataset;

    @Column(length = 5, nullable = false)
    private String periodCode;

    @Column(length = 64, nullable = false)
    private String spatialVersion;

    @Column(length = 64, nullable = false)
    private String schemaVersion;
}
