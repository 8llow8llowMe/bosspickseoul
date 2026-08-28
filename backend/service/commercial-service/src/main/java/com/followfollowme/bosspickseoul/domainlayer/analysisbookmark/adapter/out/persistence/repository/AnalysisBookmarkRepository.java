package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.entity.AnalysisBookmarkEntity;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AnalysisBookmarkRepository extends JpaRepository<AnalysisBookmarkEntity, Long> {

    Optional<AnalysisBookmarkEntity> findByMemberIdAndPayloadHash(Long memberId, String payloadHash);

    long countByMemberId(Long memberId);

    /** 소유자 조건을 DELETE 에 포함해 단일 쿼리로 처리한다 (엔티티 로딩 없음). */
    @Modifying
    @Query("delete from AnalysisBookmarkEntity b where b.id = :bookmarkId and b.memberId = :memberId")
    int deleteByIdAndMemberId(Long bookmarkId, Long memberId);

    /** 소유자 조건을 UPDATE 에 포함해 단일 쿼리로 처리한다 (엔티티 로딩 없음). */
    @Modifying
    @Query("update AnalysisBookmarkEntity b set b.bookmarkName = :bookmarkName "
        + "where b.id = :bookmarkId and b.memberId = :memberId")
    int updateBookmarkName(
        Long bookmarkId,
        Long memberId,
        String bookmarkName
    );

    // createdAt 이 같은 행이 페이지 경계에서 중복/누락되지 않도록 id(Snowflake, 시간순 유니크)를 2차 정렬로 둔다.
    Page<AnalysisBookmarkEntity> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId, Pageable pageable);

    Page<AnalysisBookmarkEntity> findAllByMemberIdAndShareTypeOrderByCreatedAtDescIdDesc(
        Long memberId, ShareTargetType shareType, Pageable pageable);
}
