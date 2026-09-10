package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetActiveReleaseEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetActiveReleaseId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.persistence.config.QuerydslConfigurer;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

/**
 * JSON payload 매핑과 run_id 접두 조회를 실제 스키마(H2)에 질의해 확인한다.
 *
 * <p>운영에서는 {@code dataset_*} 테이블을 배치 DDL 이 만들고 Hibernate 스키마 도구가 건너뛴다
 * ({@code DatasetSchemaFilterProvider}). 이 슬라이스는 그 필터를 Hibernate 기본값으로 되돌려 H2 에 테이블을 만들게 한다.
 */
@DataJpaTest
@Import(QuerydslConfigurer.class)
@TestPropertySource(properties =
    "spring.jpa.properties.hibernate.hbm2ddl.schema_filter_provider=org.hibernate.tool.schema.internal.DefaultSchemaFilterProvider")
class DatasetFactRepositoryTest {

    private static final String RUN_20241 = "change-commercial-20241-001";
    private static final String RUN_20242 = "change-commercial-20242-001";

    @Autowired
    private DatasetFactRepository datasetFactRepository;

    @Autowired
    private DatasetActiveReleaseRepository datasetActiveReleaseRepository;

    @Autowired
    private TestEntityManager entityManager;

    @BeforeEach
    void setUp() {
        datasetFactRepository.deleteAll();
        datasetActiveReleaseRepository.deleteAll();
    }

    @Test
    @DisplayName("JSON payload 가 문자열 맵으로 왕복된다")
    void payloadRoundTripsAsStringMap() {
        persist(RUN_20241, "3110008", "", Map.of("TRDAR_CHNGE_IX", "HH", "OPR_SALE_MT_AVRG", "31", "TOT_FLPOP_CO", "503135509"));
        entityManager.flush();
        entityManager.clear();

        DatasetFactEntity found = datasetFactRepository
            .findByIdRunIdAndIdAreaCodeAndIdServiceCode(RUN_20241, "3110008", "").orElseThrow();

        assertThat(found.getPayload()).containsEntry("TRDAR_CHNGE_IX", "HH").containsEntry("TOT_FLPOP_CO", "503135509");
        assertThat(found.getId().getServiceCode()).isEmpty();
    }

    @Test
    @DisplayName("run_id 를 고정한 채 상권 코드 목록으로 벌크 조회한다")
    void bulkLookupByAreaCodesWithinOneRun() {
        persist(RUN_20241, "3110008", "", Map.of("TRDAR_CHNGE_IX", "HH"));
        persist(RUN_20241, "3110009", "", Map.of("TRDAR_CHNGE_IX", "LL"));
        persist(RUN_20242, "3110008", "", Map.of("TRDAR_CHNGE_IX", "HL"));  // 다른 run 은 섞이지 않아야 한다
        entityManager.flush();
        entityManager.clear();

        List<DatasetFactEntity> found = datasetFactRepository
            .findAllByIdRunIdAndIdAreaCodeInAndIdServiceCode(RUN_20241, List.of("3110008", "3110009", "3110999"), "");

        assertThat(found).extracting(fact -> fact.getId().getAreaCode()).containsExactlyInAnyOrder("3110008", "3110009");
        assertThat(found).extracting(fact -> fact.getPayload().get("TRDAR_CHNGE_IX")).containsExactlyInAnyOrder("HH", "LL");
    }

    @Test
    @DisplayName("여러 run 을 한 상권으로 조회해 분기 시계열을 만든다")
    void lookupAcrossRunsForOneArea() {
        persist(RUN_20241, "3110008", "", Map.of("STDR_YYQU_CD", "20241"));
        persist(RUN_20242, "3110008", "", Map.of("STDR_YYQU_CD", "20242"));
        persist(RUN_20242, "3110009", "", Map.of("STDR_YYQU_CD", "20242"));
        entityManager.flush();
        entityManager.clear();

        List<DatasetFactEntity> found = datasetFactRepository
            .findAllByIdRunIdInAndIdAreaCodeAndIdServiceCode(List.of(RUN_20241, RUN_20242), "3110008", "");

        assertThat(found).extracting(fact -> fact.getPayload().get("STDR_YYQU_CD")).containsExactlyInAnyOrder("20241", "20242");
    }

    @Test
    @DisplayName("활성 release 슬롯은 복합 키로 단건 조회되고 run_id 가 null 일 수 있다")
    void activeReleaseSlotLookup() {
        DatasetActiveReleaseId slot = new DatasetActiveReleaseId("CHANGE_COMMERCIAL", "20241", "legacy-20233", "seoul-v1");
        DatasetActiveReleaseId emptySlot = new DatasetActiveReleaseId("CHANGE_COMMERCIAL", "20242", "legacy-20233", "seoul-v1");
        entityManager.persist(DatasetActiveReleaseEntity.builder().id(slot).runId(RUN_20241).build());
        entityManager.persist(DatasetActiveReleaseEntity.builder().id(emptySlot).runId(null).build());
        entityManager.flush();
        entityManager.clear();

        assertThat(datasetActiveReleaseRepository.findById(slot)).map(DatasetActiveReleaseEntity::getRunId).contains(RUN_20241);
        assertThat(datasetActiveReleaseRepository.findById(emptySlot)).map(DatasetActiveReleaseEntity::getRunId).isEmpty();
    }

    private void persist(String runId, String areaCode, String serviceCode, Map<String, String> payload) {
        entityManager.persist(DatasetFactEntity.builder()
            .id(new DatasetFactId(runId, areaCode, serviceCode))
            .payload(payload)
            .build());
    }
}
