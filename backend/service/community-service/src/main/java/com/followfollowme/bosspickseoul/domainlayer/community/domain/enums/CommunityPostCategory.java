package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import java.util.Locale;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 게시글 말머리(주제 분류). 선택 값이라 말머리 없는 글은 null 로 둔다 — 기존 글도 null 이며, 어느 값으로 채워도 사실이 아니다.
 *
 * <p>앞의 셋은 FE 작성 도움 칩(질문해요·경험 나눠요·같이 해요)에 그대로 대응한다.
 */
@Getter
@RequiredArgsConstructor
public enum CommunityPostCategory implements CodeNameDescribable {

    QUESTION("질문"),
    EXPERIENCE("경험 공유"),
    TOGETHER("같이 해요"),
    NEWS("동네 소식");

    private final String displayName;

    public static CommunityPostCategory from(String value) {
        try {
            return CommunityPostCategory.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new CommunityException(CommunityErrorCode.INVALID_POST_CATEGORY);
        }
    }

    /** 선택 입력용 — null/blank 면 null(작성·수정은 말머리 없음, 목록 필터는 전체), 값이 있으면 {@link #from(String)} 과 같다. */
    public static CommunityPostCategory fromNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return from(value);
    }
}
