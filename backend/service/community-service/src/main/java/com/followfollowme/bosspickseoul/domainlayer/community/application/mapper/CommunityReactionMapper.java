package com.followfollowme.bosspickseoul.domainlayer.community.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityCommentLikeEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostLikeEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityReportEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityCommentLike;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPostLike;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CommunityReactionMapper {

    CommunityPostLike toDomainFromEntity(CommunityPostLikeEntity entity);

    CommunityPostLikeEntity toEntityFromDomain(CommunityPostLike like);

    CommunityCommentLike toDomainFromEntity(CommunityCommentLikeEntity entity);

    CommunityCommentLikeEntity toEntityFromDomain(CommunityCommentLike like);

    CommunityReport toDomainFromEntity(CommunityReportEntity entity);

    CommunityReportEntity toEntityFromDomain(CommunityReport report);
}
