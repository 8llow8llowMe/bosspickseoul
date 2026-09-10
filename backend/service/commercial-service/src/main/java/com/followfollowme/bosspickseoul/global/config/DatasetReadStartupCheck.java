package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetActiveReleaseRepository;
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

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.readEnabled()) {
            log.info("dataset read path disabled; legacy fact tables serve every period");
            return;
        }
        try {
            long slots = datasetActiveReleaseRepository.count();
            log.info("dataset read path enabled spatialVersion={} schemaVersion={} readFromPeriod={} activeSlots={}",
                properties.spatialVersion(), properties.schemaVersion(), properties.readFromPeriod(), slots);
        } catch (DataAccessException exception) {
            throw new IllegalStateException(
                "app.dataset.read-enabled=true but dataset_active_release is not readable; apply quarterly-dataset-schema.sql first",
                exception);
        }
    }
}
