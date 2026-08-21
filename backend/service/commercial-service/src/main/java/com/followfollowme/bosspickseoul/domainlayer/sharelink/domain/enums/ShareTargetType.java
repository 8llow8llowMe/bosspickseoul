package com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkException;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 공유 링크가 가리키는 화면 타입.
 *
 * <p>백엔드는 payload 내용을 해석하지 않으므로, 새 화면을 공유 대상으로 추가할 때는
 * 여기에 상수 하나만 추가하면 된다. 프론트엔드는 이 타입을 보고 진입 URL 템플릿을 선택한다.
 */
@Getter
@RequiredArgsConstructor
public enum ShareTargetType implements CodeNameDescribable {

    COMMERCIAL_ANALYSIS("상권 분석", "상권 상세 분석 화면"),
    DISTRICT_ANALYSIS("자치구 분석", "자치구 분석 화면"),
    ADMINISTRATION_ANALYSIS("행정동 분석", "행정동 분석 화면"),
    COMMERCIAL_COMPARISON("상권 비교", "상권 비교 분석 화면"),
    AI_REPORT("AI 리포트", "AI 분석 리포트 화면");

    private final String displayName;
    private final String description;

    public static ShareTargetType from(String value) {
        try {
            return ShareTargetType.valueOf(value.toUpperCase());
        } catch (RuntimeException exception) {
            throw new ShareLinkException(ShareLinkErrorCode.INVALID_SHARE_TARGET_TYPE);
        }
    }
}
