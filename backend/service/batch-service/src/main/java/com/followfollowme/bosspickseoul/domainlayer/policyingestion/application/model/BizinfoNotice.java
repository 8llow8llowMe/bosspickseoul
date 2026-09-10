package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model;

/**
 * 기업마당 원천에서 정규화하기 전의 공고. JSON 필드 별칭은 adapter 가 해소한다.
 */
public record BizinfoNotice(
    String pblancId,
    String title,
    String organization,
    String detailUrl,
    String applyPeriod,
    String targetName,
    String summary,
    String category
) {
}
