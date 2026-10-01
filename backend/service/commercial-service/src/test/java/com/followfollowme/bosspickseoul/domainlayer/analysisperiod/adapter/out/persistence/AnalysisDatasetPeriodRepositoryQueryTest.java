package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.ChangeDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.ChangeDistrictRepository;
import com.followfollowme.bosspickseoul.global.config.DataJpaSliceTestConfig;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.Map;
import java.util.SortedSet;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * 적재 분기 질의 15종이 실제 스키마에 대해 성립하고, 공간 스냅샷으로 걸러 중복 없이 분기를 돌려주는지 확인한다.
 *
 * <p>정적 JPQL 은 엔티티·프로퍼티 이름이 계약이라 오타가 컴파일을 통과하고 리포지터리 빈 생성 시점에 터진다.
 * 어댑터를 실제로 올려 15개를 한 번씩 실행해 그 경로를 막는다. 필터 의미는 컬럼이 적은 {@code change_district} 로 본다 —
 * 15개 질의가 같은 모양이라 하나로 충분하고, 나머지 엔티티는 NOT NULL 컬럼이 많아 픽스처가 본문보다 길어진다.
 *
 * <p>공간 스냅샷은 env({@code DATASET_SPATIAL_VERSION})와 무관한 명시 값을 쓴다.
 */
@DataJpaTest
@ActiveProfiles(DataJpaSliceTestConfig.PROFILE)
@Import(AnalysisDatasetPeriodQueryAdapter.class)
class AnalysisDatasetPeriodRepositoryQueryTest {

    private static final String SNAPSHOT = "test-snapshot-a";
    private static final String OTHER_SNAPSHOT = "test-snapshot-b";

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ChangeDistrictRepository changeDistrictRepository;

    @Autowired
    private AnalysisDatasetPeriodQueryAdapter analysisDatasetPeriodQueryAdapter;

    @Test
    @DisplayName("요청한 공간 스냅샷의 적재 분기만 중복 없이 돌려준다")
    void returnsDistinctPeriodCodesOfTheRequestedSnapshotOnly() {
        persist("20233", SNAPSHOT, "11110");
        persist("20233", SNAPSHOT, "11140");
        persist("20261", SNAPSHOT, "11110");
        persist("20262", OTHER_SNAPSHOT, "11110");

        assertThat(changeDistrictRepository.findDistinctPeriodCodesBySpatialVersion(SNAPSHOT)).containsExactlyInAnyOrder("20233", "20261");
        assertThat(changeDistrictRepository.findDistinctPeriodCodesBySpatialVersion(OTHER_SNAPSHOT)).containsExactly("20262");
        assertThat(changeDistrictRepository.findDistinctPeriodCodesBySpatialVersion("missing-snapshot")).isEmpty();
    }

    @Test
    @DisplayName("어댑터가 15개 팩트 테이블 질의를 실제 스키마에 실행하고 데이터셋 15종을 모두 키로 돌려준다")
    void adapterRunsAllFifteenQueriesAgainstTheRealSchema() {
        persist("20261", SNAPSHOT, "11110");
        persist("20233", SNAPSHOT, "11110");

        Map<DatasetKey, SortedSet<String>> periods = analysisDatasetPeriodQueryAdapter.findPeriodCodesByDataset(SNAPSHOT);

        assertThat(periods).containsOnlyKeys(DatasetKey.values());
        assertThat(periods.get(DatasetKey.CHANGE_DISTRICT)).containsExactly("20233", "20261");
        assertThat(periods).allSatisfy((dataset, periodCodes) -> {
            if (dataset != DatasetKey.CHANGE_DISTRICT) {
                assertThat(periodCodes).as("%s", dataset).isEmpty();
            }
        });
    }

    private void persist(String periodCode, String spatialVersion, String districtCode) {
        entityManager.persistAndFlush(ChangeDistrictEntity.builder()
            .periodCode(periodCode)
            .spatialVersion(spatialVersion)
            .districtCode(districtCode)
            .districtName("종로구")
            .changeIndicatorCode("LL")
            .changeIndicatorName("다이나믹")
            .averageOpenedMonths(100)
            .averageClosedMonths(50)
            .build());
    }
}
