package com.followfollowme.nowdoboss.domainlayer.category.domain.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ServiceType implements CodeNameDescribable {

    RESTAURANT("외식업", "음식점·카페·주점 등 음식과 음료를 조리해 판매하는 업종 분류입니다."),
    ACADEMY("교육", "학원·교습소 등 교육 서비스를 제공하는 업종 분류입니다."),
    LEISURE("여가/오락", "노래방·PC방 등 여가와 오락 활동을 제공하는 업종 분류입니다."),
    SERVICE("서비스", "미용실·세탁소 등 생활 편의 서비스를 제공하는 업종 분류입니다."),
    RETAIL("소매업", "편의점·슈퍼마켓·의류점 등 상품을 판매하는 업종 분류입니다."),
    HOUSEHOLDS("생활용품", "가구·조명·철물 등 생활용품을 판매하는 업종 분류입니다.");

    private final String displayName;
    private final String description;
}
