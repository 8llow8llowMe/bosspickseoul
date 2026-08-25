package com.followfollowme.bosspickseoul.domainlayer.policy.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.policy.application.info.PolicyRecommendationInfo;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.port.out.PolicyRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.policy.domain.model.Policy;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class PolicyQueryProcessorTest {

    private final RecordingPolicyRepositoryPort port = new RecordingPolicyRepositoryPort();
    private final PolicyQueryProcessor processor = new PolicyQueryProcessor(port);

    @Test
    void 업종코드는_앞_3자리_대분류로_줄여_조회한다() {
        processor.getRecommendations("11680", "CS100001", 5);

        assertThat(port.serviceCategoryCode).isEqualTo("CS1");
        assertThat(port.districtCode).isEqualTo("11680");
        assertThat(port.limit).isEqualTo(5);
    }

    @Test
    void 업종코드가_없으면_업종_조건_없이_조회한다() {
        processor.getRecommendations("11680", null, 5);

        assertThat(port.serviceCategoryCode).isNull();
    }

    @Test
    void 업종코드가_대분류보다_짧으면_조건에서_제외한다() {
        // 짧은 값을 그대로 조건에 넣으면 아무 정책도 매칭되지 않아 빈 목록이 된다.
        processor.getRecommendations("11680", "CS", 5);

        assertThat(port.serviceCategoryCode).isNull();
    }

    @Test
    void 빈_문자열_자치구는_null_로_정규화한다() {
        // 프론트가 필터를 비우면 빈 문자열이 오는데, 그대로 두면 어떤 자치구와도 일치하지 않는다.
        PolicyRecommendationInfo info = processor.getRecommendations("  ", "CS100001", 5);

        assertThat(port.districtCode).isNull();
        assertThat(info.districtCode()).isNull();
    }

    @Test
    void 조회_결과와_사용한_조건을_함께_담아_반환한다() {
        PolicyRecommendationInfo info = processor.getRecommendations("11680", "CS100001", 5);

        assertThat(info.districtCode()).isEqualTo("11680");
        assertThat(info.serviceCategoryCode()).isEqualTo("CS1");
        assertThat(info.policies()).hasSize(1);
    }

    /** 포트에 전달된 인자를 기록해 두고 고정 결과를 돌려주는 스텁. */
    private static final class RecordingPolicyRepositoryPort implements PolicyRepositoryPort {

        private String districtCode;
        private String serviceCategoryCode;
        private int limit;

        @Override
        public List<Policy> findRecommendations(
            String districtCode, String serviceCategoryCode, LocalDate baseDate, int limit
        ) {
            this.districtCode = districtCode;
            this.serviceCategoryCode = serviceCategoryCode;
            this.limit = limit;
            return List.of(Policy.builder().id(1L).title("테스트 정책").build());
        }
    }
}
