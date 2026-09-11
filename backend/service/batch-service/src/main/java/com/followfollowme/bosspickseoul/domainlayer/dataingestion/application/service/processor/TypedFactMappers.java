package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.Map;

/**
 * CHANGE_COMMERCIAL 이외 14종의 payload → INSERT 컬럼 배열.
 * 배열 순서는 {@code TypedFactProjectionJdbcAdapter} INSERT 와 같아야 한다.
 */
public final class TypedFactMappers {

    private TypedFactMappers() {
    }

    public static Object[] columns(Dataset dataset, FactRow fact, String periodCode, String spatialVersion) {
        Map<String, String> fields = fact.fields();
        TypedPayload.requirePeriod(fields, periodCode);
        TypedPayload.requireAll(fields, dataset.requiredMetrics());
        return switch (dataset) {
            case CHANGE_COMMERCIAL -> throw new IllegalArgumentException("CHANGE_COMMERCIAL uses ChangeCommercialTypedMapper");
            case FOOT_TRAFFIC_COMMERCIAL -> footTrafficCommercial(fact, fields, periodCode, spatialVersion);
            case POPULATION_COMMERCIAL -> populationCommercial(fact, fields, periodCode, spatialVersion);
            case FACILITY_COMMERCIAL -> facilityCommercial(fact, fields, periodCode, spatialVersion);
            case CONSUMPTION_COMMERCIAL -> consumptionCommercial(fact, fields, periodCode, spatialVersion);
            case STORE_COMMERCIAL -> storeCommercial(fact, fields, periodCode, spatialVersion);
            case SALES_COMMERCIAL -> salesCommercial(fact, fields, periodCode, spatialVersion);
            case FOOT_TRAFFIC_DISTRICT -> footTrafficDistrict(fact, fields, periodCode, spatialVersion);
            case CONSUMPTION_DISTRICT -> consumptionDistrict(fact, fields, periodCode, spatialVersion);
            case CHANGE_DISTRICT -> changeDistrict(fact, fields, periodCode, spatialVersion);
            case STORE_DISTRICT -> storeDistrict(fact, fields, periodCode, spatialVersion);
            case SALES_DISTRICT -> salesDistrict(fact, fields, periodCode, spatialVersion);
            case CONSUMPTION_ADMINISTRATION -> consumptionAdministration(fact, fields, periodCode, spatialVersion);
            case STORE_ADMINISTRATION -> storeAdministration(fact, fields, periodCode, spatialVersion);
            case SALES_ADMINISTRATION -> salesAdministration(fact, fields, periodCode, spatialVersion);
        };
    }

    private static String serviceCode(FactRow fact, Map<String, String> fields) {
        if (fact.serviceCode() != null && !fact.serviceCode().isBlank()) {
            return fact.serviceCode();
        }
        return TypedPayload.text(fields, "SVC_INDUTY_CD");
    }

    private static Object[] commercialHead(FactRow fact, Map<String, String> fields, String periodCode, String spatialVersion) {
        return new Object[] {
            periodCode, spatialVersion, fact.areaCode(),
            TypedPayload.text(fields, "TRDAR_SE_CD"),
            TypedPayload.text(fields, "TRDAR_SE_CD_NM"),
            TypedPayload.text(fields, "TRDAR_CD_NM")
        };
    }

    private static Object[] footTrafficMetrics(Map<String, String> fields) {
        return new Object[] {
            TypedPayload.longValue(fields, "TOT_FLPOP_CO"),
            TypedPayload.longValue(fields, "ML_FLPOP_CO"),
            TypedPayload.longValue(fields, "FML_FLPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_10_FLPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_20_FLPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_30_FLPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_40_FLPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_50_FLPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_60_ABOVE_FLPOP_CO"),
            TypedPayload.longValue(fields, "TMZON_00_06_FLPOP_CO"),
            TypedPayload.longValue(fields, "TMZON_06_11_FLPOP_CO"),
            TypedPayload.longValue(fields, "TMZON_11_14_FLPOP_CO"),
            TypedPayload.longValue(fields, "TMZON_14_17_FLPOP_CO"),
            TypedPayload.longValue(fields, "TMZON_17_21_FLPOP_CO"),
            TypedPayload.longValue(fields, "TMZON_21_24_FLPOP_CO"),
            TypedPayload.longValue(fields, "MON_FLPOP_CO"),
            TypedPayload.longValue(fields, "TUES_FLPOP_CO"),
            TypedPayload.longValue(fields, "WED_FLPOP_CO"),
            TypedPayload.longValue(fields, "THUR_FLPOP_CO"),
            TypedPayload.longValue(fields, "FRI_FLPOP_CO"),
            TypedPayload.longValue(fields, "SAT_FLPOP_CO"),
            TypedPayload.longValue(fields, "SUN_FLPOP_CO")
        };
    }

    private static Object[] storeMetrics(Map<String, String> fields) {
        return new Object[] {
            TypedPayload.longValue(fields, "STOR_CO"),
            TypedPayload.longValue(fields, "SIMILR_INDUTY_STOR_CO"),
            TypedPayload.doubleValue(fields, "OPBIZ_RT"),
            TypedPayload.longValue(fields, "OPBIZ_STOR_CO"),
            TypedPayload.doubleValue(fields, "CLSBIZ_RT"),
            TypedPayload.longValue(fields, "CLSBIZ_STOR_CO"),
            TypedPayload.longValue(fields, "FRC_STOR_CO")
        };
    }

    private static Object[] concat(Object[]... parts) {
        int size = 0;
        for (Object[] part : parts) {
            size += part.length;
        }
        Object[] out = new Object[size];
        int index = 0;
        for (Object[] part : parts) {
            System.arraycopy(part, 0, out, index, part.length);
            index += part.length;
        }
        return out;
    }

    private static Object[] footTrafficCommercial(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(commercialHead(fact, fields, period, spatial), footTrafficMetrics(fields));
    }

    private static Object[] populationCommercial(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(commercialHead(fact, fields, period, spatial), new Object[] {
            TypedPayload.longValue(fields, "TOT_REPOP_CO"),
            TypedPayload.longValue(fields, "ML_REPOP_CO"),
            TypedPayload.longValue(fields, "FML_REPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_10_REPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_20_REPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_30_REPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_40_REPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_50_REPOP_CO"),
            TypedPayload.longValue(fields, "AGRDE_60_ABOVE_REPOP_CO")
        });
    }

    private static Object[] facilityCommercial(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(commercialHead(fact, fields, period, spatial), new Object[] {
            TypedPayload.longValue(fields, "VIATR_FCLTY_CO"),
            TypedPayload.longValue(fields, "ELESCH_CO"),
            TypedPayload.longValue(fields, "MSKUL_CO"),
            TypedPayload.longValue(fields, "HGSCHL_CO"),
            TypedPayload.longValue(fields, "UNIV_CO"),
            TypedPayload.longValue(fields, "SUBWAY_STATN_CO"),
            TypedPayload.longValue(fields, "BUS_STTN_CO")
        });
    }

    private static Object[] consumptionCommercial(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(commercialHead(fact, fields, period, spatial), new Object[] {
            TypedPayload.longOrNull(fields, "MT_AVRG_INCOME_AMT"),
            TypedPayload.intOrNull(fields, "INCOME_SCTN_CD"),
            TypedPayload.longValue(fields, "EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "FDSTFFS_EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "CLTHS_FTWR_EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "MCP_EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "LVSPL_EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "TRNSPORT_EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "LSR_EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "CLTUR_EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "EDC_EXPNDTR_TOTAMT"),
            TypedPayload.longValue(fields, "PLESR_EXPNDTR_TOTAMT")
        });
    }

    private static Object[] storeCommercial(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(commercialHead(fact, fields, period, spatial), new Object[] {
            serviceCode(fact, fields),
            TypedPayload.text(fields, "SVC_INDUTY_CD_NM"),
            null
        }, storeMetrics(fields));
    }

    private static Object[] salesCommercial(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(commercialHead(fact, fields, period, spatial), new Object[] {
            serviceCode(fact, fields),
            TypedPayload.text(fields, "SVC_INDUTY_CD_NM"),
            null,
            TypedPayload.longValue(fields, "THSMON_SELNG_AMT"),
            TypedPayload.longValue(fields, "MON_SELNG_AMT"),
            TypedPayload.longValue(fields, "TUES_SELNG_AMT"),
            TypedPayload.longValue(fields, "WED_SELNG_AMT"),
            TypedPayload.longValue(fields, "THUR_SELNG_AMT"),
            TypedPayload.longValue(fields, "FRI_SELNG_AMT"),
            TypedPayload.longValue(fields, "SAT_SELNG_AMT"),
            TypedPayload.longValue(fields, "SUN_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_00_06_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_06_11_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_11_14_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_14_17_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_17_21_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_21_24_SELNG_AMT"),
            TypedPayload.longValue(fields, "ML_SELNG_AMT"),
            TypedPayload.longValue(fields, "FML_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_10_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_20_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_30_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_40_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_50_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_60_ABOVE_SELNG_AMT"),
            TypedPayload.longValue(fields, "MON_SELNG_CO"),
            TypedPayload.longValue(fields, "TUES_SELNG_CO"),
            TypedPayload.longValue(fields, "WED_SELNG_CO"),
            TypedPayload.longValue(fields, "THUR_SELNG_CO"),
            TypedPayload.longValue(fields, "FRI_SELNG_CO"),
            TypedPayload.longValue(fields, "SAT_SELNG_CO"),
            TypedPayload.longValue(fields, "SUN_SELNG_CO"),
            TypedPayload.longValue(fields, "TMZON_00_06_SELNG_CO"),
            TypedPayload.longValue(fields, "TMZON_06_11_SELNG_CO"),
            TypedPayload.longValue(fields, "TMZON_11_14_SELNG_CO"),
            TypedPayload.longValue(fields, "TMZON_14_17_SELNG_CO"),
            TypedPayload.longValue(fields, "TMZON_17_21_SELNG_CO"),
            TypedPayload.longValue(fields, "TMZON_21_24_SELNG_CO"),
            TypedPayload.longValue(fields, "ML_SELNG_CO"),
            TypedPayload.longValue(fields, "FML_SELNG_CO")
        });
    }

    private static Object[] footTrafficDistrict(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(new Object[] {
            period, spatial, fact.areaCode(), TypedPayload.text(fields, "SIGNGU_CD_NM")
        }, footTrafficMetrics(fields));
    }

    private static Object[] consumptionDistrict(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return new Object[] {
            period, spatial, fact.areaCode(), TypedPayload.text(fields, "SIGNGU_CD_NM"),
            TypedPayload.longValue(fields, "EXPNDTR_TOTAMT")
        };
    }

    private static Object[] changeDistrict(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return new Object[] {
            period, spatial, fact.areaCode(), TypedPayload.text(fields, "SIGNGU_CD_NM"),
            TypedPayload.text(fields, "TRDAR_CHNGE_IX"),
            TypedPayload.text(fields, "TRDAR_CHNGE_IX_NM"),
            TypedPayload.intValue(fields, "OPR_SALE_MT_AVRG"),
            TypedPayload.intValue(fields, "CLS_SALE_MT_AVRG")
        };
    }

    private static Object[] storeScopeMetrics(Map<String, String> fields) {
        return new Object[] {
            TypedPayload.longValue(fields, "STOR_CO"),
            TypedPayload.longValue(fields, "SIMILR_INDUTY_STOR_CO"),
            TypedPayload.longValue(fields, "OPBIZ_STOR_CO"),
            TypedPayload.longValue(fields, "CLSBIZ_STOR_CO"),
            TypedPayload.longValue(fields, "FRC_STOR_CO"),
            TypedPayload.doubleValue(fields, "OPBIZ_RT"),
            TypedPayload.doubleValue(fields, "CLSBIZ_RT")
        };
    }

    private static Object[] storeDistrict(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(new Object[] {
            period, spatial, fact.areaCode(), TypedPayload.text(fields, "SIGNGU_CD_NM"),
            serviceCode(fact, fields), TypedPayload.text(fields, "SVC_INDUTY_CD_NM"), null
        }, storeScopeMetrics(fields));
    }

    private static Object[] salesDistrict(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return new Object[] {
            period, spatial, fact.areaCode(), TypedPayload.text(fields, "SIGNGU_CD_NM"),
            serviceCode(fact, fields), TypedPayload.text(fields, "SVC_INDUTY_CD_NM"), null,
            TypedPayload.longValue(fields, "THSMON_SELNG_AMT"),
            TypedPayload.longValue(fields, "MON_SELNG_AMT"),
            TypedPayload.longValue(fields, "TUES_SELNG_AMT"),
            TypedPayload.longValue(fields, "WED_SELNG_AMT"),
            TypedPayload.longValue(fields, "THUR_SELNG_AMT"),
            TypedPayload.longValue(fields, "FRI_SELNG_AMT"),
            TypedPayload.longValue(fields, "SAT_SELNG_AMT"),
            TypedPayload.longValue(fields, "SUN_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_00_06_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_06_11_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_11_14_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_14_17_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_17_21_SELNG_AMT"),
            TypedPayload.longValue(fields, "TMZON_21_24_SELNG_AMT"),
            TypedPayload.longValue(fields, "ML_SELNG_AMT"),
            TypedPayload.longValue(fields, "FML_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_10_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_20_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_30_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_40_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_50_SELNG_AMT"),
            TypedPayload.longValue(fields, "AGRDE_60_ABOVE_SELNG_AMT")
        };
    }

    private static Object[] consumptionAdministration(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return new Object[] {
            period, spatial, fact.areaCode(), TypedPayload.text(fields, "ADSTRD_CD_NM"),
            TypedPayload.longValue(fields, "EXPNDTR_TOTAMT")
        };
    }

    private static Object[] storeAdministration(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return concat(new Object[] {
            period, spatial, fact.areaCode(), TypedPayload.text(fields, "ADSTRD_CD_NM"),
            serviceCode(fact, fields), TypedPayload.text(fields, "SVC_INDUTY_CD_NM"), null
        }, storeScopeMetrics(fields));
    }

    private static Object[] salesAdministration(FactRow fact, Map<String, String> fields, String period, String spatial) {
        return new Object[] {
            period, spatial, fact.areaCode(), TypedPayload.text(fields, "ADSTRD_CD_NM"),
            serviceCode(fact, fields), TypedPayload.text(fields, "SVC_INDUTY_CD_NM"), null,
            TypedPayload.longValue(fields, "THSMON_SELNG_AMT"),
            TypedPayload.longValue(fields, "MDWK_SELNG_AMT"),
            TypedPayload.longValue(fields, "WKEND_SELNG_AMT")
        };
    }
}
