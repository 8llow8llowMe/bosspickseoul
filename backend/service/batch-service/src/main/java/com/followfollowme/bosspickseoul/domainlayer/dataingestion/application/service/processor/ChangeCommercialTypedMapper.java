package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ChangeCommercialTypedRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.Map;

/**
 * {@code CHANGE_COMMERCIAL} payload → {@code change_commercial} 컬럼.
 * 필수 키는 {@link Dataset#CHANGE_COMMERCIAL} 의 행 검증 계약과 같다.
 */
public final class ChangeCommercialTypedMapper {

    static final String PERIOD = "STDR_YYQU_CD";
    static final String CLASSIFICATION_CODE = "TRDAR_SE_CD";
    static final String CLASSIFICATION_NAME = "TRDAR_SE_CD_NM";
    static final String COMMERCIAL_NAME = "TRDAR_CD_NM";
    static final String INDICATOR_CODE = "TRDAR_CHNGE_IX";
    static final String INDICATOR_NAME = "TRDAR_CHNGE_IX_NM";
    static final String OPENED_MONTHS = "OPR_SALE_MT_AVRG";
    static final String CLOSED_MONTHS = "CLS_SALE_MT_AVRG";

    private ChangeCommercialTypedMapper() {
    }

    public static ChangeCommercialTypedRow map(FactRow fact, String periodCode, String spatialVersion) {
        Map<String, String> fields = fact.fields();
        TypedPayload.requirePeriod(fields, periodCode);
        TypedPayload.requireAll(fields, Dataset.CHANGE_COMMERCIAL.requiredMetrics());
        return new ChangeCommercialTypedRow(
            periodCode,
            spatialVersion,
            fact.areaCode(),
            TypedPayload.text(fields, CLASSIFICATION_CODE),
            TypedPayload.text(fields, CLASSIFICATION_NAME),
            TypedPayload.text(fields, COMMERCIAL_NAME),
            TypedPayload.textOrNull(fields, INDICATOR_CODE),
            TypedPayload.textOrNull(fields, INDICATOR_NAME),
            TypedPayload.intOrNull(fields, OPENED_MONTHS),
            TypedPayload.intOrNull(fields, CLOSED_MONTHS)
        );
    }
}
