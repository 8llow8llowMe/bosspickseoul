package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

/**
 * 서울 Open API 호출 예산. 자동 최신화 run 1회에 하나를 만들어 모든 데이터셋이 나눠 쓴다(키당 하루 1,000회).
 *
 * <p>원천 어댑터가 HTTP 시도마다(재시도 포함) {@link #spend()} 를 먼저 부른다. 그래서 탐지·수집이 중간에 예외로 끝나도
 * {@link #used()} 가 실제로 나간 호출 수와 같다. 탐지와 수집 사이에 원천 합계가 늘어도 상한을 넘겨 부르지 않는다.
 * run 안에서만 쓰고 스레드 간에 공유하지 않는다.
 */
public final class ApiCallBudget {

    private final int limit;
    private int used;

    private ApiCallBudget(int limit) {
        if (limit < 0) {
            throw new IllegalArgumentException("API call budget must be >= 0");
        }
        this.limit = limit;
    }

    public static ApiCallBudget of(int limit) {
        return new ApiCallBudget(limit);
    }

    /** 상한이 없는 예산. 수동 CLI 의 API 적재 세션처럼 자동 최신화 예산 밖에서 부를 때 쓴다. */
    public static ApiCallBudget unlimited() {
        return new ApiCallBudget(Integer.MAX_VALUE);
    }

    /** 호출 1회를 쓴다. 남은 호출이 없으면 부르지 말라는 뜻으로 {@link Exhausted} 를 던진다. HTTP 시도 직전에 부른다. */
    public void spend() {
        if (used >= limit) {
            throw new Exhausted(limit);
        }
        used++;
    }

    public int used() {
        return used;
    }

    public int remaining() {
        return limit - used;
    }

    /** 예산을 다 써서 원천 호출을 멈췄다. 원천 오류가 아니므로 호출자는 실패가 아니라 예산 부족으로 다룬다. */
    public static final class Exhausted extends IllegalStateException {
        Exhausted(int limit) {
            super("Seoul API call budget exhausted (limit=" + limit + ")");
        }
    }
}
