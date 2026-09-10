package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.support.FactPayload;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;

/**
 * {@code FOOT_TRAFFIC_COMMERCIAL}(서울 API {@code VwsmTrdarFlpopQq}) payload → {@link FootTrafficCommercial}.
 * 컬럼 코드는 {@code seoul/csv-header-aliases.csv} 의 정본과 같다. 레거시 컬럼은 전부 NOT NULL 이라 모든 수치를 필수로 읽는다.
 */
final class FootTrafficCommercialFactMapper {

    static final String PERIOD = "STDR_YYQU_CD";
    static final String CLASSIFICATION_CODE = "TRDAR_SE_CD";
    static final String CLASSIFICATION_NAME = "TRDAR_SE_CD_NM";
    static final String COMMERCIAL_NAME = "TRDAR_CD_NM";

    private FootTrafficCommercialFactMapper() {
    }

    static FootTrafficCommercial toDomain(DatasetFactEntity fact, String slotPeriod) {
        FactPayload payload = new FactPayload(fact.getPayload());
        requireSlotPeriod(payload, slotPeriod);
        return FootTrafficCommercial.builder()
            .id(0L)
            .periodCode(slotPeriod)
            .commercialClassificationCode(payload.text(CLASSIFICATION_CODE))
            .commercialClassificationName(payload.text(CLASSIFICATION_NAME))
            .commercialCode(fact.getId().getAreaCode())
            .commercialName(payload.text(COMMERCIAL_NAME))
            .totalFootTraffic(payload.longValue("TOT_FLPOP_CO"))
            .maleFootTraffic(payload.longValue("ML_FLPOP_CO"))
            .femaleFootTraffic(payload.longValue("FML_FLPOP_CO"))
            .age10FootTraffic(payload.longValue("AGRDE_10_FLPOP_CO"))
            .age20FootTraffic(payload.longValue("AGRDE_20_FLPOP_CO"))
            .age30FootTraffic(payload.longValue("AGRDE_30_FLPOP_CO"))
            .age40FootTraffic(payload.longValue("AGRDE_40_FLPOP_CO"))
            .age50FootTraffic(payload.longValue("AGRDE_50_FLPOP_CO"))
            .age60PlusFootTraffic(payload.longValue("AGRDE_60_ABOVE_FLPOP_CO"))
            .footTrafficTime00To06(payload.longValue("TMZON_00_06_FLPOP_CO"))
            .footTrafficTime06To11(payload.longValue("TMZON_06_11_FLPOP_CO"))
            .footTrafficTime11To14(payload.longValue("TMZON_11_14_FLPOP_CO"))
            .footTrafficTime14To17(payload.longValue("TMZON_14_17_FLPOP_CO"))
            .footTrafficTime17To21(payload.longValue("TMZON_17_21_FLPOP_CO"))
            .footTrafficTime21To24(payload.longValue("TMZON_21_24_FLPOP_CO"))
            .mondayFootTraffic(payload.longValue("MON_FLPOP_CO"))
            .tuesdayFootTraffic(payload.longValue("TUES_FLPOP_CO"))
            .wednesdayFootTraffic(payload.longValue("WED_FLPOP_CO"))
            .thursdayFootTraffic(payload.longValue("THUR_FLPOP_CO"))
            .fridayFootTraffic(payload.longValue("FRI_FLPOP_CO"))
            .saturdayFootTraffic(payload.longValue("SAT_FLPOP_CO"))
            .sundayFootTraffic(payload.longValue("SUN_FLPOP_CO"))
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
