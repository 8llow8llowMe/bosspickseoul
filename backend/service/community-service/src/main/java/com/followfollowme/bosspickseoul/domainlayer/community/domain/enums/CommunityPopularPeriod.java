package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 인기순(POPULAR) 정렬에 넣을 글의 작성 시각 기간. 최신순(LATEST)에는 쓰지 않는다.
 *
 * <p>롤링 기간이다 — 달력 주·월이 아니라 요청 시각에서 {@link #lookback} 만큼 뺀 시각이 하한이다.
 * 기준은 작성 시각(createdAt)이다. "기간 안에 받은 좋아요 수"는 좋아요 집계가 필요하고 {@code (likeCount, id)} 커서와 맞지 않아 쓰지 않는다.
 */
@Getter
@RequiredArgsConstructor
public enum CommunityPopularPeriod implements CodeNameDescribable {

    WEEK("최근 7일", Duration.ofDays(7)),
    MONTH("최근 30일", Duration.ofDays(30)),
    ALL("전체 기간", null);

    private final String displayName;

    /** 기간 길이. {@link #ALL} 은 하한이 없어 null 이다. */
    private final Duration lookback;

    /** 인기순 작성 시각 하한. {@link #ALL} 이면 null(하한 없음)이다. */
    public LocalDateTime since(LocalDateTime now) {
        return lookback == null ? null : now.minus(lookback);
    }
}
