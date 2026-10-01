package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

/** 자동 최신화가 데이터셋·분기 하나에 내린 판단. 로그·메트릭({@code result} 태그)에 이 이름이 그대로 나간다. */
public enum DatasetRefreshResult {
    /** 공간 스냅샷이 READY 가 아니어서 run 전체를 멈췄다. */
    SPATIAL_NOT_READY,
    /** 게시된 분기가 하나도 없다. 첫 분기는 수동 CLI 로 올린다. */
    NO_BASELINE,
    /** 원천이 끊긴 데이터셋이라 다음 분기를 게시할 수 없다. API 를 부르지 않는다. */
    DISCONTINUED,
    /** 후보 분기가 {@code automation-from}(기본 20234) 앞이다. 레거시 분기를 덮지 않도록 API 를 부르지 않는다. 수동 백필 대상이다. */
    BELOW_AUTOMATION_FLOOR,
    /** 최근 실패 후 쿨다운 중이다. */
    COOLDOWN,
    /** 이번 run 의 API 호출 예산이 모자라거나, 데이터셋당 분기 상한({@code max-quarters-per-run})을 재이관이 다 썼다. 실패가 아니다. */
    BUDGET,
    /** 원천에 다음 분기가 아직 없다. */
    NOT_PUBLISHED_YET,
    /** 원천 합계가 지난번과 같아 받지 않았다. */
    UNCHANGED,
    /** 행 수가 고정값 또는 직전 분기 대비 허용 오차를 벗어났다. 게시하지 않는다. */
    IMPLAUSIBLE,
    /** publish=false 라 dry-run 까지만 통과했다. */
    WOULD_PUBLISH,
    /** 사실 적재와 typed 이관까지 끝났다. */
    PUBLISHED,
    /** 사실은 게시했지만 typed 이관이 실패했다. 쿨다운 없이 다음 run 의 재이관이 이관만 다시 한다. */
    PUBLISHED_NOT_PROJECTED,
    /** 게시돼 있는데 typed 행 수가 맞지 않던 슬롯을 이관했다. */
    PROJECTED,
    /** 같은 슬롯을 publish=false 라 dry-run 이관만 했다. */
    WOULD_PROJECT,
    /** Job 실패 또는 원천 오류. */
    FAILED
}
