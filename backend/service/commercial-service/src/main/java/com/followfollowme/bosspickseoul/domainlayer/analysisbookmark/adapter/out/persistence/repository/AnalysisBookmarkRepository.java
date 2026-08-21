package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.entity.AnalysisBookmarkEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisBookmarkRepository extends JpaRepository<AnalysisBookmarkEntity, Long> {

    boolean existsByMemberIdAndPayloadHash(Long memberId, String payloadHash);

    Page<AnalysisBookmarkEntity> findAllByMemberIdOrderByCreatedAtDesc(Long memberId, Pageable pageable);
}
