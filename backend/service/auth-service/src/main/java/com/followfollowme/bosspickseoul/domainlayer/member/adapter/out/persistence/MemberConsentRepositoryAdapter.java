package com.followfollowme.bosspickseoul.domainlayer.member.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.out.persistence.entity.MemberConsentEntity;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.out.persistence.repository.MemberConsentRepository;
import com.followfollowme.bosspickseoul.domainlayer.member.application.mapper.MemberConsentMapper;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberConsentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MemberConsentRepositoryAdapter implements MemberConsentRepositoryPort {

    private final MemberConsentRepository memberConsentRepository;
    private final MemberConsentMapper memberConsentMapper;

    @Override
    public List<MemberConsent> saveAll(List<MemberConsent> consents) {
        List<MemberConsentEntity> entities = consents.stream()
            .map(memberConsentMapper::toEntityFromDomain)
            .toList();
        return memberConsentRepository.saveAll(entities).stream()
            .map(memberConsentMapper::toDomainFromEntity)
            .toList();
    }
}
