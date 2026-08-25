package com.followfollowme.bosspickseoul.domainlayer.policy.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.policy.application.info.PolicyRecommendationInfo;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.port.out.PolicyRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.policy.domain.model.Policy;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class PolicyQueryProcessor {

    /**
     * 업종 코드(`CS100001`)에서 대분류로 쓸 접두어 길이. `CS1`(음식), `CS2`(서비스) 처럼 앞 3자리가 대분류다.
     * 정책은 세부 업종까지 나누지 않고 대분류 단위로 대상을 지정하므로 여기서 잘라 쓴다.
     */
    private static final int SERVICE_CATEGORY_PREFIX_LENGTH = 3;

    private final PolicyRepositoryPort policyRepositoryPort;

    public PolicyRecommendationInfo getRecommendations(String districtCode, String serviceCode, int limit) {
        String categoryCode = toServiceCategoryCode(serviceCode);
        String normalizedDistrictCode = StringUtils.hasText(districtCode) ? districtCode : null;
        LocalDate baseDate = LocalDate.now();

        List<Policy> policies =
            policyRepositoryPort.findRecommendations(normalizedDistrictCode, categoryCode, baseDate, limit);

        return PolicyRecommendationInfo.of(normalizedDistrictCode, categoryCode, policies);
    }

    /**
     * 업종 코드를 대분류 접두어로 줄인다. 값이 없거나 접두어를 만들 만큼 길지 않으면
     * null 을 돌려 "업종 조건 없음"으로 조회한다. 짧은 값을 그대로 조건에 넣으면
     * 아무 정책도 매칭되지 않아 빈 목록이 되는데, 그건 사용자에게 도움이 안 된다.
     */
    private String toServiceCategoryCode(String serviceCode) {
        if (!StringUtils.hasText(serviceCode) || serviceCode.length() < SERVICE_CATEGORY_PREFIX_LENGTH) {
            return null;
        }
        return serviceCode.substring(0, SERVICE_CATEGORY_PREFIX_LENGTH);
    }
}
