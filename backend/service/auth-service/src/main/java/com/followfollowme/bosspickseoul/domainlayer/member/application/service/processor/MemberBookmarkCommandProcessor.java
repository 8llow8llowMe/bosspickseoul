package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.BookmarkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.BookmarkException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberBookmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberBookmarkCommandProcessor {

    private final MemberBookmarkRepositoryPort memberBookmarkRepositoryPort;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public MemberBookmarkInfo addBookmark(
        long memberId,
        MemberBookmarkTargetType targetType,
        String targetCode,
        String targetName
    ) {
        if (memberBookmarkRepositoryPort.existsByMemberIdAndTargetTypeAndTargetCode(memberId, targetType, targetCode)) {
            throw new BookmarkException(BookmarkErrorCode.DUPLICATE_BOOKMARK);
        }
        MemberBookmarkInfo info = MemberBookmarkInfo.builder()
            .id(snowflakeIdGenerator.generateId())
            .memberId(memberId)
            .targetType(targetType)
            .targetCode(targetCode)
            .targetName(targetName)
            .createdAt(LocalDateTime.now())
            .build();
        return memberBookmarkRepositoryPort.save(info);
    }

    public void removeBookmark(long bookmarkId, long memberId) {
        if (!memberBookmarkRepositoryPort.existsByIdAndMemberId(bookmarkId, memberId)) {
            throw new BookmarkException(BookmarkErrorCode.NOT_FOUND_BOOKMARK);
        }
        memberBookmarkRepositoryPort.deleteByIdAndMemberId(bookmarkId, memberId);
    }
}
