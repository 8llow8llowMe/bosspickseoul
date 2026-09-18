package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseProvenanceItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialExpenseProvenanceInfo;
import org.springframework.stereotype.Component;

/**
 * 소비 출처 메타 변환. {@code /income} 과 {@code /summaries/income} 두 응답이 같은 항목을 내려보내므로
 * 변환을 한 곳에 둔다 — 갈라지면 같은 상권·분기의 출처가 두 화면에서 다르게 보인다. (이슈 #415)
 */
@Component
public class CommercialExpenseProvenancePresenter {

    /** 값이 없을 때도 어느 원천이 왜 끊겼는지 전해야 하므로 출처는 비우지 않는다. */
    public CommercialExpenseProvenanceItem toCommercialExpenseProvenanceItem(CommercialExpenseProvenanceInfo info) {
        if (info == null) {
            return null;
        }
        return CommercialExpenseProvenanceItem.builder()
            .scope(info.scope().toMetadata())
            .scopeCode(info.scopeCode())
            .scopeName(info.scopeName())
            .sourceId(info.source().getDatasetId())
            .sourceLabel(info.source().getLabel())
            .sourceUrl(info.source().getUrl())
            .effectivePeriodCode(info.effectivePeriodCode())
            .disclaimer(info.disclaimer())
            .build();
    }
}
