package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.repository.custom;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.entity.PolicyEntity;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.repository.PolicyRepository;
import com.followfollowme.bosspickseoul.domainlayer.policy.domain.enums.PolicySupportType;
import com.followfollowme.bosspickseoul.persistence.config.QuerydslConfigurer;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

/**
 * 동적 조건 조립과 정렬을 실제 스키마에 질의해 확인한다.
 *
 * <p>QueryDSL 커스텀 구현은 컴파일로 검증되지 않는다. 조건을 빼먹거나 정렬 방향을 뒤집어도
 * 빌드는 통과하고 결과만 조용히 틀린다. 그래서 슬라이스 테스트로 못 박는다.
 */
@DataJpaTest
@Import(QuerydslConfigurer.class)
class PolicyCustomRepositoryImplTest {

    private static final LocalDate BASE_DATE = LocalDate.of(2026, 8, 26);
    private static final String GANGNAM = "11680";
    private static final String FOOD = "CS1";

    @Autowired
    private PolicyRepository policyRepository;

    @BeforeEach
    void setUp() {
        policyRepository.deleteAll();
    }

    @Test
    @DisplayName("조건을 생략하면 신청 가능한 정책을 모두 조회한다")
    void noConditionReturnsEveryOpenPolicy() {
        save(1L, null, null, BASE_DATE.plusDays(10));
        save(2L, GANGNAM, FOOD, BASE_DATE.plusDays(20));

        List<PolicyEntity> found = policyRepository.findRecommendations(null, null, BASE_DATE, 10);

        assertThat(found).extracting(PolicyEntity::getId).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    @DisplayName("신청 기간이 지난 정책과 아직 시작하지 않은 정책은 제외한다")
    void excludesClosedAndNotYetOpenPolicies() {
        save(1L, null, null, BASE_DATE.minusDays(1));                                   // 마감 지남
        save(2L, null, null, BASE_DATE.plusDays(10));                                   // 기간 안
        policyRepository.save(
            entity(3L, null, null, BASE_DATE.plusDays(5), BASE_DATE.plusDays(20)));     // 시작 전
        policyRepository.save(entity(4L, null, null, null, null));                      // 상시 모집

        List<PolicyEntity> found = policyRepository.findRecommendations(null, null, BASE_DATE, 10);

        assertThat(found).extracting(PolicyEntity::getId).containsExactlyInAnyOrder(2L, 4L);
    }

    @Test
    @DisplayName("자치구를 지정하면 그 자치구 전용 정책과 지역 제한 없는 정책이 함께 나온다")
    void districtConditionIncludesNationwidePolicies() {
        save(1L, GANGNAM, null, BASE_DATE.plusDays(10));
        save(2L, null, null, BASE_DATE.plusDays(10));
        save(3L, "11110", null, BASE_DATE.plusDays(10));

        List<PolicyEntity> found = policyRepository.findRecommendations(GANGNAM, null, BASE_DATE, 10);

        assertThat(found).extracting(PolicyEntity::getId).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    @DisplayName("업종을 지정하면 그 업종 정책과 전업종 정책이 함께 나온다")
    void serviceCategoryConditionIncludesAllCategoryPolicies() {
        save(1L, null, FOOD, BASE_DATE.plusDays(10));
        save(2L, null, null, BASE_DATE.plusDays(10));
        save(3L, null, "CS2", BASE_DATE.plusDays(10));

        List<PolicyEntity> found = policyRepository.findRecommendations(null, FOOD, BASE_DATE, 10);

        assertThat(found).extracting(PolicyEntity::getId).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    @DisplayName("정렬은 자치구 전용 -> 마감 임박순 -> 상시 모집 순이다")
    void ordersDistrictSpecificThenNearestDeadlineThenAlwaysOpen() {
        save(1L, null, null, null);                          // 전국 + 상시 모집 -> 마지막
        save(2L, null, null, BASE_DATE.plusDays(30));        // 전국 + 기한 있음
        save(3L, null, null, BASE_DATE.plusDays(5));         // 전국 + 마감 임박
        save(4L, GANGNAM, null, BASE_DATE.plusDays(60));     // 자치구 전용 -> 가장 앞
        save(5L, GANGNAM, null, null);                       // 자치구 전용 + 상시 모집

        List<PolicyEntity> found = policyRepository.findRecommendations(GANGNAM, null, BASE_DATE, 10);

        assertThat(found).extracting(PolicyEntity::getId).containsExactly(4L, 5L, 3L, 2L, 1L);
    }

    @Test
    @DisplayName("limit 이 조회 건수를 자른다")
    void limitCapsTheResultSize() {
        save(1L, null, null, BASE_DATE.plusDays(10));
        save(2L, null, null, BASE_DATE.plusDays(20));
        save(3L, null, null, BASE_DATE.plusDays(30));

        assertThat(policyRepository.findRecommendations(null, null, BASE_DATE, 2)).hasSize(2);
    }

    private void save(long id, String districtCode, String serviceCategoryCode, LocalDate applyEndAt) {
        policyRepository.save(entity(id, districtCode, serviceCategoryCode, null, applyEndAt));
    }

    private PolicyEntity entity(
        long id, String districtCode, String serviceCategoryCode, LocalDate applyStartAt, LocalDate applyEndAt
    ) {
        return PolicyEntity.builder()
            .id(id)
            .title("정책 " + id)
            .organization("서울시")
            .supportType(PolicySupportType.SUBSIDY)
            .targetSummary("소상공인")
            .supportContent("지원 내용")
            .districtCode(districtCode)
            .serviceCategoryCode(serviceCategoryCode)
            .applyStartAt(applyStartAt)
            .applyEndAt(applyEndAt)
            .detailUrl("https://example.test/" + id)
            .build();
    }
}
