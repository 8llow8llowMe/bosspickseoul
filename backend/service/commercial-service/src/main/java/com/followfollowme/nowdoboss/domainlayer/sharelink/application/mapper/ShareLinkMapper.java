package com.followfollowme.nowdoboss.domainlayer.sharelink.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence.entity.ShareLinkEntity;
import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.model.ShareLink;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ShareLinkMapper {

    // 엔티티 -> 도메인
    ShareLink toDomainFromEntity(ShareLinkEntity entity);

    // 도메인 -> 엔티티
    ShareLinkEntity toEntityFromDomain(ShareLink shareLink);
}
