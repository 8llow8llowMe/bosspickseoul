package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 팩트 테이블에서 읽을 공간 스냅샷. 요청 파라미터가 아니라 배포 설정이다.
 */
@Component
public class DatasetSpatialVersion {

    public static final String DEFAULT = "legacy-20233";

    private final String value;

    public DatasetSpatialVersion(@Value("${DATASET_SPATIAL_VERSION:legacy-20233}") String value) {
        this.value = value == null || value.isBlank() ? DEFAULT : value;
    }

    public String value() {
        return value;
    }
}
