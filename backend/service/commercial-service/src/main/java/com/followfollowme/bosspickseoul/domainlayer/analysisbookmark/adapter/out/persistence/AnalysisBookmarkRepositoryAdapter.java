package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.entity.AnalysisBookmarkEntity;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.repository.AnalysisBookmarkRepository;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.mapper.AnalysisBookmarkMapper;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.AnalysisBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query.AnalysisBookmarkPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisBookmarkRepositoryAdapter implements AnalysisBookmarkRepositoryPort {

    private final AnalysisBookmarkRepository analysisBookmarkRepository;
    private final AnalysisBookmarkMapper analysisBookmarkMapper;

    @Override
    public AnalysisBookmark save(AnalysisBookmark bookmark) {
        return analysisBookmarkMapper.toDomainFromEntity(
            analysisBookmarkRepository.save(analysisBookmarkMapper.toEntityFromDomain(bookmark)));
    }

    @Override
    public Optional<AnalysisBookmark> findByMemberIdAndPayloadHash(long memberId, String payloadHash) {
        return analysisBookmarkRepository.findByMemberIdAndPayloadHash(memberId, payloadHash)
            .map(analysisBookmarkMapper::toDomainFromEntity);
    }

    @Override
    public long countByMemberId(long memberId) {
        return analysisBookmarkRepository.countByMemberId(memberId);
    }

    @Override
    public int deleteByIdAndMemberId(long bookmarkId, long memberId) {
        return analysisBookmarkRepository.deleteByIdAndMemberId(bookmarkId, memberId);
    }

    @Override
    public int updateBookmarkName(long bookmarkId, long memberId, String bookmarkName) {
        return analysisBookmarkRepository.updateBookmarkName(bookmarkId, memberId, bookmarkName);
    }

    @Override
    public AnalysisBookmarkPageQueryResult findAllByMemberId(long memberId, ShareTargetType shareType, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<AnalysisBookmarkEntity> entities = shareType == null
            ? analysisBookmarkRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(memberId, pageRequest)
            : analysisBookmarkRepository.findAllByMemberIdAndShareTypeOrderByCreatedAtDescIdDesc(memberId, shareType, pageRequest);
        return AnalysisBookmarkPageQueryResult.builder()
            .bookmarks(entities.getContent().stream().map(analysisBookmarkMapper::toDomainFromEntity).toList())
            .page(entities.getNumber())
            .size(entities.getSize())
            .totalElements(entities.getTotalElements())
            .totalPages(entities.getTotalPages())
            .build();
    }
}
