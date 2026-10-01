package com.followfollowme.bosspickseoul.shared.enums;

import java.util.List;

/**
 * 파일로 내려받아 적재하는 외부 원천의 식별자와 헤더 계약.
 *
 * <p>batch-service 는 운영자가 받은 원본 파일의 헤더를 {@link #headers()} 와 순서까지 대조하고, 하나라도 다르면 적재하지
 * 않는다. commercial-service 는 같은 {@link #sourceId()} 를 지표의 출처 식별자로 응답에 싣는다(이슈 #415). 공유 모듈에 두는
 * 이유는 {@link DatasetKey} 와 같다 — 서비스마다 복사하면 원천이 재게시됐을 때 배치만 고쳐지고 조회 쪽은 죽은 ID 를 계속 인용한다.
 *
 * <p><b>{@link DatasetKey} 에 넣지 않는다.</b> {@code DatasetKey} 는 서울 열린데이터광장 분기 Open API 데이터셋 15종이고,
 * batch-service 의 {@code Dataset} 과 이름이 전수 일치해야 한다({@code DatasetTest} 가 고정). 여기 상수를 더하면 {@code Dataset}
 * 에도 짝이 생겨야 하고, 그 순간 분기 적재·자동 최신화·운영 스크립트가 이 원천을 분기 데이터셋으로 다룬다. 이 원천은 분기가
 * 아니라 연 1회 스냅샷이고, Open API 서비스명이 없으며, 사람이 내려받은 파일로만 들어온다. 성격이 달라 계약을 나눈다.
 */
public enum FileDatasetKey {

    /**
     * 국민연금공단 「자격 시군구 신고 평균소득월액」(공공데이터포털 파일데이터 3046077). 지역가입자(사업장 가입자가 아닌 18~60세
     * 국내 거주자)의 신고 기준소득월액을 시군구별로 평균한 값이고, 매년 12월 기준으로 연 1회 갱신된다. 시군구는 시도와 붙은
     * 이름({@code 서울특별시종로구})으로만 온다.
     */
    NPS_DISTRICT_AVERAGE_INCOME("data.go.kr:3046077", List.of("기준년월", "시군구", "평균소득월액"));

    private final String sourceId;
    private final List<String> headers;

    FileDatasetKey(String sourceId, List<String> headers) {
        this.sourceId = sourceId;
        this.headers = headers;
    }

    /** 원천 식별자 정본. {@code <포털>:<데이터셋 번호>} 형식이다. 조회 서비스가 출처로 인용하는 값과 같아야 한다. */
    public String sourceId() {
        return sourceId;
    }

    /** 원본 파일의 헤더. 순서까지 계약이다. 원천이 컬럼을 바꾸면 조용히 다른 값을 읽지 않도록 적재가 멈춘다. */
    public List<String> headers() {
        return headers;
    }
}
