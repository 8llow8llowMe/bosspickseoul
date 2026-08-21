package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.entity.AnalysisBookmarkEntity;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.repository.AnalysisBookmarkRepository;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.AnalysisBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query.AnalysisBookmarkPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisBookmarkRepositoryAdapter implements AnalysisBookmarkRepositoryPort {

    private final AnalysisBookmarkRepository analysisBookmarkRepository;

    @Override
    public AnalysisBookmark save(AnalysisBookmark bookmark) {
        return toDomain(analysisBookmarkRepository.save(toEntity(bookmark)));
    }

    @Override
    public boolean existsByMemberIdAndPayloadHash(long memberId, String payloadHash) {
        return analysisBookmarkRepository.existsByMemberIdAndPayloadHash(memberId, payloadHash);
    }

    @Override
    public Optional<AnalysisBookmark> findById(long bookmarkId) {
        return analysisBookmarkRepository.findById(bookmarkId).map(this::toDomain);
    }

    @Override
    public void deleteById(long bookmarkId) {
        analysisBookmarkRepository.deleteById(bookmarkId);
    }

    @Override
    public AnalysisBookmarkPageQueryResult findAllByMemberId(long memberId, int page, int size) {
        Page<AnalysisBookmarkEntity> entities =
            analysisBookmarkRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId, PageRequest.of(page, size));
        return AnalysisBookmarkPageQueryResult.builder()
            .bookmarks(entities.getContent().stream().map(this::toDomain).toList())
            .page(entities.getNumber())
            .size(entities.getSize())
            .totalElements(entities.getTotalElements())
            .totalPages(entities.getTotalPages())
            .build();
    }

    private AnalysisBookmarkEntity toEntity(AnalysisBookmark bookmark) {
        return AnalysisBookmarkEntity.builder()
            .id(bookmark.id())
            .memberId(bookmark.memberId())
            .shareType(bookmark.shareType())
            .payload(bookmark.payload())
            .payloadHash(bookmark.payloadHash())
            .bookmarkName(bookmark.bookmarkName())
            .createdAt(bookmark.createdAt())
            .build();
    }

    private AnalysisBookmark toDomain(AnalysisBookmarkEntity entity) {
        return AnalysisBookmark.builder()
            .id(entity.getId())
            .memberId(entity.getMemberId())
            .shareType(entity.getShareType())
            .payload(entity.getPayload())
            .payloadHash(entity.getPayloadHash())
            .bookmarkName(entity.getBookmarkName())
            .createdAt(entity.getCreatedAt())
            .build();
    }
}
