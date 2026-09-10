package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetActiveReleaseRepository;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetFactRepository;
import com.followfollowme.bosspickseoul.global.properties.DatasetReadProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;

/**
 * {@code app.dataset.read-enabled=true} 인데 {@code dataset_active_release} 를 읽을 수 없으면 기동을 멈춘다.
 * 배치 DDL 이 적용되지 않은 스키마에 플래그만 켜면 첫 사용자가 500 을 보게 되므로, 구성 오류는 기동 단계에서 드러낸다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DatasetReadStartupCheck implements ApplicationRunner {

    private final DatasetReadProperties properties;
    private final DatasetActiveReleaseRepository datasetActiveReleaseRepository;
    private final DatasetFactRepository datasetFactRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.readEnabled()) {
            log.info("dataset read path disabled; legacy fact tables serve every period");
            return;
        }
        try {
            long slots = datasetActiveReleaseRepository.count();
            // 두 테이블은 같은 DDL 파일에서 오지만 부분 적용(권한·스키마 오지정)이 가능하다. 값 없는 PK 단건 조회로 존재만 확인한다.
            datasetFactRepository.findByIdRunIdAndIdAreaCodeAndIdServiceCode("__startup_probe__", "", DatasetFactId.NO_SERVICE);
            log.info("dataset read path enabled spatialVersion={} schemaVersion={} readFromPeriod={} activeSlots={}",
                properties.spatialVersion(), properties.schemaVersion(), properties.readFromPeriod(), slots);
        } catch (DataAccessException exception) {
            throw new IllegalStateException(
                "app.dataset.read-enabled=true but dataset_active_release / dataset_fact are not readable; apply quarterly-dataset-schema.sql first",
                exception);
        }
    }
}
