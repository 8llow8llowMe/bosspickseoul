package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.repository.PolicyRepository;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.mapper.PolicyMapper;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.port.out.PolicyRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.policy.domain.model.Policy;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PolicyRepositoryAdapter implements PolicyRepositoryPort {

    private final PolicyRepository policyRepository;
    private final PolicyMapper policyMapper;

    @Override
    public List<Policy> findRecommendations(
        String districtCode, String serviceCategoryCode, LocalDate baseDate, int limit
    ) {
        return policyRepository
            .findRecommendations(districtCode, serviceCategoryCode, baseDate, limit)
            .stream()
            .map(policyMapper::toDomain)
            .toList();
    }
}
