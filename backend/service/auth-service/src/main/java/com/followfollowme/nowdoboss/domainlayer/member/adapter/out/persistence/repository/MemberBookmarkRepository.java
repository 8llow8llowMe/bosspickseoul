package com.followfollowme.nowdoboss.domainlayer.member.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.out.persistence.entity.MemberBookmarkEntity;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberBookmarkRepository extends JpaRepository<MemberBookmarkEntity, Long> {

    boolean existsByMemberIdAndTargetTypeAndTargetCode(
        long memberId, MemberBookmarkTargetType targetType, String targetCode);

    Slice<MemberBookmarkEntity> findByMemberIdOrderByIdDesc(long memberId, Pageable pageable);

    Slice<MemberBookmarkEntity> findByMemberIdAndIdLessThanOrderByIdDesc(
        long memberId, long lastBookmarkId, Pageable pageable);

    void deleteByIdAndMemberId(long id, long memberId);

    Optional<MemberBookmarkEntity> findByIdAndMemberId(long id, long memberId);
}
