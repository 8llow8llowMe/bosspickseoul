package com.followfollowme.nowdoboss.domainlayer.member.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.out.persistence.entity.MemberBookmarkEntity;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.out.persistence.repository.MemberBookmarkRepository;
import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberBookmarkInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberBookmarkRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import com.followfollowme.nowdoboss.persistence.dto.SliceResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class MemberBookmarkRepositoryAdapter implements MemberBookmarkRepositoryPort {

    private final MemberBookmarkRepository memberBookmarkRepository;

    @Override
    public boolean existsByMemberIdAndTargetTypeAndTargetCode(
        long memberId, MemberBookmarkTargetType targetType, String targetCode
    ) {
        return memberBookmarkRepository.existsByMemberIdAndTargetTypeAndTargetCode(
            memberId, targetType, targetCode);
    }

    @Override
    public MemberBookmarkInfo save(MemberBookmarkInfo info) {
        MemberBookmarkEntity entity = MemberBookmarkEntity.builder()
            .id(info.id())
            .memberId(info.memberId())
            .targetType(info.targetType())
            .targetCode(info.targetCode())
            .targetName(info.targetName())
            .createdAt(info.createdAt())
            .build();
        MemberBookmarkEntity saved = memberBookmarkRepository.save(entity);
        return toInfo(saved);
    }

    @Override
    public boolean existsByIdAndMemberId(long bookmarkId, long memberId) {
        return memberBookmarkRepository.findByIdAndMemberId(bookmarkId, memberId).isPresent();
    }

    @Override
    @Transactional
    public void deleteByIdAndMemberId(long bookmarkId, long memberId) {
        memberBookmarkRepository.deleteByIdAndMemberId(bookmarkId, memberId);
    }

    @Override
    public SliceResponse<MemberBookmarkInfo> findBookmarks(long memberId, Long lastBookmarkId, int size) {
        PageRequest pageRequest = PageRequest.of(0, size);
        Slice<MemberBookmarkEntity> slice = lastBookmarkId == null
            ? memberBookmarkRepository.findByMemberIdOrderByIdDesc(memberId, pageRequest)
            : memberBookmarkRepository.findByMemberIdAndIdLessThanOrderByIdDesc(
                memberId, lastBookmarkId, pageRequest);
        List<MemberBookmarkInfo> contents = slice.getContent().stream()
            .map(this::toInfo)
            .toList();
        return new SliceResponse<>(contents, slice.hasNext());
    }

    private MemberBookmarkInfo toInfo(MemberBookmarkEntity entity) {
        return MemberBookmarkInfo.builder()
            .id(entity.getId())
            .memberId(entity.getMemberId())
            .targetType(entity.getTargetType())
            .targetCode(entity.getTargetCode())
            .targetName(entity.getTargetName())
            .createdAt(entity.getCreatedAt())
            .build();
    }
}
