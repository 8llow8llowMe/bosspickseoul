package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query;

import java.util.List;

/**
 * 커서 페이지네이션 조회 결과.
 *
 * <p>out 포트가 Spring Data {@code Slice} 를 그대로 돌려주면 application 계층이 영속성
 * 프레임워크 타입에 묶인다. 커서 목록에 필요한 건 "이번 페이지 내용"과 "다음 페이지 존재 여부"
 * 둘뿐이라, 그 둘만 담은 계약을 두고 변환은 adapter 안에서 끝낸다.
 */
public record SliceQueryResult<T>(

    List<T> content,

    boolean hasNext
) {

    public SliceQueryResult {
        content = (content == null) ? List.of() : List.copyOf(content);
    }

    public static <T> SliceQueryResult<T> of(List<T> content, boolean hasNext) {
        return new SliceQueryResult<>(content, hasNext);
    }
}
