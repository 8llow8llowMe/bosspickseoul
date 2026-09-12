package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.cache;

/**
 * AI 리포트 캐시 키의 스키마 버전 카탈로그.
 *
 * <p>키 스키마는 Redis 어댑터만의 관심사이므로 application 계층으로 올리지 않고 어댑터 패키지에 둔다.
 * 버전 세그먼트가 포맷 문자열 안에 박혀 있으면 값이 조용히 바뀌고 이력도 남지 않으므로,
 * 버전을 올리는 행위가 diff 한 줄로 드러나도록 상수로 분리한다.
 *
 * <p><b>버전을 올리면 배포 직후 전 사용자가 캐시 미스를 맞고 LLM 호출이 한꺼번에 몰린다.</b>
 * 계정당 일일 사용량 상한(30회)이 캐시 워밍업에 소모되므로, 올리기 전에
 * {@code backend/docs/services/ai-service.md} 의 "AI 리포트 캐시 무효화 런북" 을 읽고 판단한다.
 *
 * <p>값을 바꿀 때는 아래 각 상수의 주석에 "언제·왜 올렸는지" 를 반드시 한 줄 추가한다.
 */
public final class AiReportCacheKeyVersion {

    /**
     * 상권 리포트 키({@code ...:ai:report:commercial:{version}:{commercialCode}:{serviceCode}:{periodCode}}) 버전.
     *
     * <p>v2 (2026-04-09, 커밋 {@code 6922881a} "상권 비교·히트맵 및 AI 리포트 확장"): 상권 드래프트에
     * 추천 업종·피해야 할 영업시간·타깃 연령대·타깃 성별·운영 팁 5개 필드가 추가되어, 그 이전에 캐시된 스냅샷은
     * 새 응답 계약을 만족하지 못했다.
     *
     * <p>키 문자열 {@code ai:report:commercial:v1} 은 이력에 존재하지 않는다 — 최초 키는 버전 세그먼트가 없는
     * {@code ai:report:commercial:{commercialCode}:...} 였고(커밋 {@code 9fd62c02}), 위 커밋이 세그먼트를 새로
     * 끼우면서 곧바로 v2 를 붙였다. 즉 "세그먼트 없는 키" 가 사실상의 v1 이다. (git 이력으로 확인한 사실이다.)
     */
    public static final String COMMERCIAL = "v2";

    /**
     * 상권 비교 리포트 키({@code ...:ai:report:commercial-comparison:{version}:{left}:{right}:{serviceCode}:{periodCode}}) 버전.
     *
     * <p>v1 (2026-04-17, 커밋 {@code 0979c215} "상권 비교 고도화 및 비교 AI 리포트 정리"): 비교 리포트 캐시가
     * 처음 도입될 때부터 버전 세그먼트를 달고 태어났다. 아직 올린 적이 없다.
     */
    public static final String COMMERCIAL_COMPARISON = "v1";

    /**
     * 자치구 리포트 키({@code ...:ai:report:district:{version}:{districtCode}:{periodCode}}) 버전.
     *
     * <p>v1 (2026-09-12): 원래 버전 세그먼트가 없어 무효화 선택지 자체가 없었다(수동 SCAN + DEL 외에 방법이 없었다).
     * 다른 두 키와 모양을 맞추고 앞으로의 무효화 수단을 확보하기 위해 세그먼트를 새로 부여했다.
     *
     * <p>이 도입은 일회성 캐시 무효화를 수반한다 — 배포 시점의 기존 무버전 키는 미아가 되고 새 키로는 한 번씩 미스가 난다.
     * 감당 가능하다고 판단한 근거: (1) 캐시 TTL 이 24시간이라 미아 키가 쌓이지 않고 하루면 자연 소멸한다,
     * (2) 자치구·행정동 리포트는 상권 리포트보다 호출량이 적어 미스 폭이 작다,
     * (3) 이미 이 파일을 건드리고 있는 지금이 세그먼트를 끼우는 가장 싼 시점이다.
     */
    public static final String DISTRICT = "v1";

    /**
     * 행정동 리포트 키({@code ...:ai:report:administration:{version}:{administrationCode}:{periodCode}}) 버전.
     *
     * <p>v1 (2026-09-12): 도입 배경과 일회성 무효화를 감당 가능하다고 본 근거는 {@link #DISTRICT} 와 동일하다.
     */
    public static final String ADMINISTRATION = "v1";

    private AiReportCacheKeyVersion() {
    }
}
