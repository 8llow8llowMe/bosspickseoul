package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialDistrictAverageIncomeItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialIncomeProvenanceItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialDistrictAverageIncomeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeProvenanceInfo;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

/**
 * 자치구 평균 소득(대체)과 그 출처 메타 변환. 소비 출처({@link CommercialExpenseProvenancePresenter})와 나눈 이유는 원천과
 * 기준 단위(분기 대 기준일)가 달라 항목 모양이 다르기 때문이다. (이슈 #415)
 */
@Component
public class CommercialIncomeProvenancePresenter {

    public CommercialDistrictAverageIncomeItem toCommercialDistrictAverageIncomeItem(CommercialDistrictAverageIncomeInfo info) {
        if (info == null) {
            return null;
        }
        return CommercialDistrictAverageIncomeItem.builder()
            .amount(info.amount())
            .provenance(toCommercialIncomeProvenanceItem(info.provenance()))
            .build();
    }

    /** 값이 없을 때도 어느 원천을 찾았는지 전해야 하므로 출처는 비우지 않는다. 기준일은 ISO 날짜 문자열로 내린다. */
    public CommercialIncomeProvenanceItem toCommercialIncomeProvenanceItem(CommercialIncomeProvenanceInfo info) {
        if (info == null) {
            return null;
        }
        return CommercialIncomeProvenanceItem.builder()
            .scope(info.scope().toMetadata())
            .scopeCode(info.scopeCode())
            .scopeName(info.scopeName())
            .sourceId(info.source().getDatasetId())
            .sourceLabel(info.source().getLabel())
            .sourceUrl(info.source().getUrl())
            .referenceDate(info.referenceDate() == null ? null : DateTimeFormatter.ISO_LOCAL_DATE.format(info.referenceDate()))
            .disclaimer(info.disclaimer())
            .build();
    }
}
