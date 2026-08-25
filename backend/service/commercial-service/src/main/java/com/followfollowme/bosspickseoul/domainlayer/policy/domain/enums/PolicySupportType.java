package com.followfollowme.bosspickseoul.domainlayer.policy.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 소상공인 지원 정책의 지원 유형.
 *
 * <p>기관마다 표기가 제각각이라 수집 단계에서 이 5종으로 정규화한다.
 * 화면 필터와 배지에 그대로 쓰이므로 새 유형을 늘리기보다 기존 유형에 매핑하는 것을 우선한다.
 */
@Getter
@RequiredArgsConstructor
public enum PolicySupportType {

    FUNDING("자금", "융자, 보증, 이차보전 등 금전 지원"),
    SUBSIDY("보조금", "반환 의무가 없는 직접 지원금"),
    EDUCATION("교육", "창업 교육, 컨설팅, 멘토링"),
    FACILITY("시설", "임차료, 인테리어, 설비 지원"),
    MARKETING("판로", "홍보, 온라인 입점, 마케팅 지원");

    private final String displayName;
    private final String description;
}
