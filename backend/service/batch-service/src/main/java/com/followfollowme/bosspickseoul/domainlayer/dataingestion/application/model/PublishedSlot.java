package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;

/** 활성 릴리스 포인터가 가리키는 게시 슬롯 하나. {@code acceptedCount} 는 그 릴리스가 dataset_fact 에 넣은 행 수다. */
public record PublishedSlot(Quarter period, String runId, long acceptedCount) {
}
