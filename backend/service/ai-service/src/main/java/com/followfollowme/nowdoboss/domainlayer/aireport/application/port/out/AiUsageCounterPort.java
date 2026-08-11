package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiUsageMeta;

public interface AiUsageCounterPort {

    void record(Long memberId, AiUsageMeta usage);

    /**
     * 당일 리포트 생성 요청 1건을 소비한다. 상한을 넘지 않았으면 {@code true}, 넘었으면 {@code false}.
     *
     * <p>카운터 저장소(Redis) 장애 시에는 fail-open 으로 {@code true} 를 반환한다 — 상세 근거는
     * 구현체({@code RedisAiUsageCounterAdapter}) 주석 참고.
     */
    boolean tryConsumeDailyQuota(long memberId);
}
