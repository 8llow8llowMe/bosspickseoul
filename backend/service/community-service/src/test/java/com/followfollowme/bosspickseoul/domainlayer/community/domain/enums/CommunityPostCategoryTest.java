package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * 게시글 말머리 파싱과 표시명을 검증한다. 요청 본문(작성·수정)과 목록 필터가 같은 {@code from} 을 쓴다.
 */
class CommunityPostCategoryTest {

    @ParameterizedTest
    @CsvSource({
        "QUESTION, QUESTION",
        "question, QUESTION",
        "Experience, EXPERIENCE",
        "together, TOGETHER",
        "NEWS, NEWS"
    })
    @DisplayName("대소문자를 가리지 않고 상수명으로 파싱한다")
    void from_isCaseInsensitive(String value, CommunityPostCategory expected) {
        assertThat(CommunityPostCategory.from(value)).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"WRONG", "질문", "", "QUESTION "})
    @DisplayName("상수명이 아니면 COMMUNITY_017 로 거절한다")
    void from_invalidValue_throwsInvalidPostCategory(String value) {
        assertThatThrownBy(() -> CommunityPostCategory.from(value))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.INVALID_POST_CATEGORY);
        assertThat(CommunityErrorCode.INVALID_POST_CATEGORY.getCode()).isEqualTo("COMMUNITY_017");
    }

    @Test
    @DisplayName("선택 입력은 null·blank 면 null(말머리 없음)이고, 값이 있으면 from 과 같이 파싱·거절한다")
    void fromNullable_treatsBlankAsAbsent() {
        assertThat(CommunityPostCategory.fromNullable(null)).isNull();
        assertThat(CommunityPostCategory.fromNullable("  ")).isNull();
        assertThat(CommunityPostCategory.fromNullable("news")).isEqualTo(CommunityPostCategory.NEWS);
        assertThatThrownBy(() -> CommunityPostCategory.fromNullable("WRONG"))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.INVALID_POST_CATEGORY);
    }

    @Test
    @DisplayName("표시명과 metadata 를 내린다 — 앞의 셋은 FE 작성 도움 칩에 대응한다")
    void displayNameAndMetadata() {
        assertThat(CommunityPostCategory.QUESTION.getDisplayName()).isEqualTo("질문");
        assertThat(CommunityPostCategory.EXPERIENCE.getDisplayName()).isEqualTo("경험 공유");
        assertThat(CommunityPostCategory.TOGETHER.getDisplayName()).isEqualTo("같이 해요");
        assertThat(CommunityPostCategory.NEWS.getDisplayName()).isEqualTo("동네 소식");
        assertThat(CommunityPostCategory.TOGETHER.toMetadata())
            .isEqualTo(CodeNameDescriptionMetadata.of("TOGETHER", "같이 해요", "같이 해요"));
    }
}
