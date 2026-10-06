package com.followfollowme.bosspickseoul.domainlayer.member.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.out.persistence.entity.MemberConsentEntity;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MemberConsentMapper {

    // 엔티티 -> 도메인
    MemberConsent toDomainFromEntity(MemberConsentEntity entity);

    // 도메인 -> 엔티티
    MemberConsentEntity toEntityFromDomain(MemberConsent domain);
}
