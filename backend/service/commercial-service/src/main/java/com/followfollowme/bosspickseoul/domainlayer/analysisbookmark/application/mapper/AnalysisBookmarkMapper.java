package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.entity.AnalysisBookmarkEntity;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AnalysisBookmarkMapper {

    // 엔티티 -> 도메인
    AnalysisBookmark toDomainFromEntity(AnalysisBookmarkEntity entity);

    // 도메인 -> 엔티티
    AnalysisBookmarkEntity toEntityFromDomain(AnalysisBookmark bookmark);
}
