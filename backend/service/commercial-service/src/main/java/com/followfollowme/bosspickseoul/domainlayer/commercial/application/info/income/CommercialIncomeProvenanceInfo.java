package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.IncomeScopeType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.IncomeSourceDataset;
import java.time.LocalDate;
import lombok.Builder;

/**
 * 소득 지표의 출처 메타. 값을 <b>실제로 어디서, 어느 기준일로</b> 가져왔는지를 응답과 LLM 프롬프트가 같은 문장으로 쓰게 한다.
 * (이슈 #415)
 *
 * <p>소비 출처({@link CommercialExpenseProvenanceInfo})는 기준이 분기라 {@code effectivePeriodCode} 를 들지만, 이 원천은 연 1회
 * 스냅샷이라 같은 자리에 기준일({@code referenceDate})을 든다. 기준일은 여기 한 곳에만 둔다.
 */
@Builder
public record CommercialIncomeProvenanceInfo(
    IncomeScopeType scope,
    String scopeCode,
    String scopeName,
    LocalDate referenceDate,
    String disclaimer
) {

    /** 자치구 대체. 면책 문장에 자치구 이름과 기준일이 박힌다. */
    public static CommercialIncomeProvenanceInfo ofDistrictProxy(String districtCode, String districtName, LocalDate referenceDate) {
        return CommercialIncomeProvenanceInfo.builder()
            .scope(IncomeScopeType.DISTRICT_PROXY)
            .scopeCode(districtCode)
            .scopeName(districtName)
            .referenceDate(referenceDate)
            .disclaimer(IncomeScopeType.DISTRICT_PROXY.disclaimer(districtName, referenceDate))
            .build();
    }

    /**
     * 값이 없다. 영역·기준일을 비우고 사유만 전한다. 필드를 통째로 빼지 않는 이유는 소비와 같다 — 화면이 「데이터 없음」 줄을
     * 지우지 않고 사유를 보여 줘야 한다.
     */
    public static CommercialIncomeProvenanceInfo unavailable() {
        return CommercialIncomeProvenanceInfo.builder()
            .scope(IncomeScopeType.UNAVAILABLE)
            .disclaimer(IncomeScopeType.UNAVAILABLE.disclaimer(null, null))
            .build();
    }

    public IncomeSourceDataset source() {
        return scope.source();
    }
}
