package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;

/**
 * 판단 하나. {@code period} 는 판단 대상 분기이고, 분기를 정하기 전에 멈췄으면 null 이다.
 * {@code detail} 은 운영자용 영어 요약이며 비밀값을 담지 않는다.
 */
public record DatasetRefreshSlot(Dataset dataset, Quarter period, DatasetRefreshResult result, String detail) {
}
