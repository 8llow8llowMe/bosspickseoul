package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSource;

/**
 * 국민연금 자치구 평균소득 원천. 지금은 운영자가 내려받은 CSV 파일 하나이고, 전달 경로가 바뀌어도(예: 공공데이터포털 자동변환 API)
 * 같은 모양으로 돌려주면 검증 규칙은 그대로다. 구현은 원본을 보관하고 그 바이트로 영수증을 만든다.
 */
public interface PensionIncomeSourcePort {

    /** 헤더와 모든 행을 해석하지 않은 문자열로 돌려준다. 디코딩 실패는 행을 돌려주기 전에 예외로 멈춘다. */
    PensionIncomeSource read(PensionIncomeImportRequest request);
}
