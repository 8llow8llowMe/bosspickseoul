package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.support.FactPayload;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;

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

    static ChangeCommercial toDomain(DatasetFactEntity fact, String slotPeriod) {
        FactPayload payload = new FactPayload(fact.getPayload());
        requireSlotPeriod(payload, slotPeriod);
        return ChangeCommercial.builder()
            .id(0L)
            .periodCode(slotPeriod)
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

    /**
     * 분기의 정본은 라우터가 고른 release 슬롯이다(dataset_active_release → dataset_release 가 FK 로 강제한다). payload 의
     * {@code STDR_YYQU_CD} 는 그 사실을 확인하는 용도로만 쓴다. 다르면 배치 검증을 통과했을 수 없는 행이므로 fail-closed 한다 —
     * 트렌드가 분기 코드로 맵을 만들 때 중복 키 500 이나 조용한 결손으로 새지 않게.
     */
    private static void requireSlotPeriod(FactPayload payload, String slotPeriod) {
        String payloadPeriod = payload.textOrNull(PERIOD);
        if (payloadPeriod != null && !payloadPeriod.equals(slotPeriod)) {
            throw new DatasetException(DatasetErrorCode.PAYLOAD_FIELD_INVALID);
        }
    }
}
