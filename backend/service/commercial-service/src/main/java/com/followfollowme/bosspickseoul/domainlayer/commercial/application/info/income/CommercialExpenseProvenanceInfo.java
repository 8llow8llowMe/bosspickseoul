package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseScopeType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseSourceDataset;
import lombok.Builder;

/**
 * 소비 지표의 출처 메타. 값을 <b>실제로 어디서 가져왔는지</b>를 응답과 LLM 프롬프트가 같은 문장으로 쓰게 한다.
 * (이슈 #415)
 */
@Builder
public record CommercialExpenseProvenanceInfo(
    ExpenseScopeType scope,
    String scopeCode,
    String scopeName,
    String effectivePeriodCode,
    String disclaimer
) {

    /** 상권 네이티브. 대체가 아니므로 면책은 비운다. */
    public static CommercialExpenseProvenanceInfo ofCommercial(String periodCode, String commercialCode, String commercialName) {
        return build(ExpenseScopeType.COMMERCIAL, periodCode, commercialCode, commercialName);
    }

    /** 행정동 대체. 면책 문장에 행정동 이름이 박힌다. */
    public static CommercialExpenseProvenanceInfo ofAdministrationProxy(
        String periodCode, String administrationCode, String administrationName
    ) {
        return build(ExpenseScopeType.ADMINISTRATION_PROXY, periodCode, administrationCode, administrationName);
    }

    /**
     * 사다리 3단계. 값이 없으므로 영역·기준 분기를 비우고 어느 원천이 끊겼는지만 전한다. 필드를 통째로 빼지
     * 않는 이유는 화면이 「데이터 없음」 줄을 지우지 않고 사유를 보여 줘야 하기 때문이다.
     */
    public static CommercialExpenseProvenanceInfo unavailable() {
        return CommercialExpenseProvenanceInfo.builder()
            .scope(ExpenseScopeType.UNAVAILABLE)
            .disclaimer(ExpenseScopeType.UNAVAILABLE.disclaimer(null))
            .build();
    }

    public ExpenseSourceDataset source() {
        return scope.source();
    }

    private static CommercialExpenseProvenanceInfo build(ExpenseScopeType scope, String periodCode, String code, String name) {
        return CommercialExpenseProvenanceInfo.builder()
            .scope(scope)
            .scopeCode(code)
            .scopeName(name)
            .effectivePeriodCode(periodCode)
            .disclaimer(scope.disclaimer(name))
            .build();
    }
}
