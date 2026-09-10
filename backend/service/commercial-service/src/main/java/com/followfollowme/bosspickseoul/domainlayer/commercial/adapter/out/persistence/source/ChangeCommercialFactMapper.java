package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.support.FactPayload;

/**
 * {@code CHANGE_COMMERCIAL}(서울 API {@code VwsmTrdarIxQq}) payload → {@link ChangeCommercial}.
 *
 * <p>컬럼 코드는 {@code seoul/csv-header-aliases.csv} 의 정본과 같다. 서울 전체 평균({@code SU_OPR_SALE_MT_AVRG},
 * {@code SU_CLS_SALE_MT_AVRG}) 은 레거시 테이블에도 없어 읽지 않는다. 데이터셋 행에는 surrogate id 가 없으므로 {@code id} 는 0 이다
 * (소비자는 상권 코드로만 식별한다).
 */
final class ChangeCommercialFactMapper {

    static final String PERIOD = "STDR_YYQU_CD";
    static final String CLASSIFICATION_CODE = "TRDAR_SE_CD";
    static final String CLASSIFICATION_NAME = "TRDAR_SE_CD_NM";
    static final String COMMERCIAL_CODE = "TRDAR_CD";
    static final String COMMERCIAL_NAME = "TRDAR_CD_NM";
    static final String INDICATOR_CODE = "TRDAR_CHNGE_IX";
    static final String INDICATOR_NAME = "TRDAR_CHNGE_IX_NM";
    static final String OPENED_MONTHS = "OPR_SALE_MT_AVRG";
    static final String CLOSED_MONTHS = "CLS_SALE_MT_AVRG";

    private ChangeCommercialFactMapper() {
    }

    /** {@code requestedPeriod} 는 payload 에 분기 코드가 없을 때의 폴백이다 (release 슬롯이 이미 그 분기다). */
    static ChangeCommercial toDomain(DatasetFactEntity fact, String requestedPeriod) {
        FactPayload payload = new FactPayload(fact.getPayload());
        String periodCode = payload.textOrNull(PERIOD);
        return ChangeCommercial.builder()
            .id(0L)
            .periodCode(periodCode == null ? requestedPeriod : periodCode)
            .commercialClassificationCode(payload.text(CLASSIFICATION_CODE))
            .commercialClassificationName(payload.text(CLASSIFICATION_NAME))
            .commercialCode(fact.getId().getAreaCode())
            .commercialName(payload.text(COMMERCIAL_NAME))
            .changeIndicatorCode(payload.textOrNull(INDICATOR_CODE))
            .changeIndicatorName(payload.textOrNull(INDICATOR_NAME))
            .averageOpenedMonths(payload.intOrNull(OPENED_MONTHS))
            .averageClosedMonths(payload.intOrNull(CLOSED_MONTHS))
            .build();
    }
}
