package com.followfollowme.nowdoboss.domainlayer.community.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityCommentEntity;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CommunityMapper {

    // 엔티티 -> 도메인
    CommunityPost toDomainFromEntity(CommunityPostEntity entity);

    // 도메인 -> 엔티티
    CommunityPostEntity toEntityFromDomain(CommunityPost post);

    // 엔티티 리스트 -> 도메인 리스트
    List<CommunityPost> toPostDomainListFromEntityList(List<CommunityPostEntity> entities);

    // 엔티티 -> 도메인
    CommunityComment toDomainFromEntity(CommunityCommentEntity entity);

    // 도메인 -> 엔티티
    CommunityCommentEntity toEntityFromDomain(CommunityComment comment);

    // 엔티티 리스트 -> 도메인 리스트
    List<CommunityComment> toCommentDomainListFromEntityList(List<CommunityCommentEntity> entities);
}
