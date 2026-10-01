package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.PensionIncomeDistrict;
import lombok.Builder;

/**
 * 상권 화면·프롬프트가 쓰는 자치구 평균 소득(대체) 한 벌. 값과 출처를 함께 든다. (이슈 #415)
 *
 * <p>{@code amount} 가 {@code Long} 인 것은 의도다. 자료가 없을 때 0 으로 채우면 「소득 0원」과 「자료 없음」이 구별되지 않는다.
 */
@Builder
public record CommercialDistrictAverageIncomeInfo(
    Long amount,
    CommercialIncomeProvenanceInfo provenance
) {

    public static CommercialDistrictAverageIncomeInfo from(PensionIncomeDistrict pensionIncomeDistrict) {
        return CommercialDistrictAverageIncomeInfo.builder()
            .amount(pensionIncomeDistrict.averageMonthlyIncomeAmount())
            .provenance(CommercialIncomeProvenanceInfo.ofDistrictProxy(
                pensionIncomeDistrict.districtCode(), pensionIncomeDistrict.districtName(), pensionIncomeDistrict.referenceDate()))
            .build();
    }

    /** 값은 비우고 사유만 남긴다. */
    public static CommercialDistrictAverageIncomeInfo unavailable() {
        return CommercialDistrictAverageIncomeInfo.builder()
            .provenance(CommercialIncomeProvenanceInfo.unavailable())
            .build();
    }

    public boolean hasValue() {
        return amount != null;
    }
}
