package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import java.util.List;
import java.util.Locale;

public enum Dataset {
    SALES_COMMERCIAL("VwsmTrdarSelngQq", "COMMERCIAL", "TRDAR_CD", true, List.of("THSMON_SELNG_AMT")),
    STORE_COMMERCIAL("VwsmTrdarStorQq", "COMMERCIAL", "TRDAR_CD", true, List.of("STOR_CO")),
    FOOT_TRAFFIC_COMMERCIAL("VwsmTrdarFlpopQq", "COMMERCIAL", "TRDAR_CD", false, List.of("TOT_FLPOP_CO")),
    CHANGE_COMMERCIAL("VwsmTrdarIxQq", "COMMERCIAL", "TRDAR_CD", false, List.of("TRDAR_CHNGE_IX")),
    POPULATION_COMMERCIAL("VwsmTrdarRepopQq", "COMMERCIAL", "TRDAR_CD", false, List.of("TOT_REPOP_CO")),
    FACILITY_COMMERCIAL("VwsmTrdarFcltyQq", "COMMERCIAL", "TRDAR_CD", false, List.of("VIATR_FCLTY_CO")),
    CONSUMPTION_COMMERCIAL("", "COMMERCIAL", "TRDAR_CD", false, List.of("EXPNDTR_TOTAMT")),
    SALES_ADMINISTRATION("VwsmAdstrdSelngW", "ADMINISTRATION", "ADSTRD_CD", true, List.of("THSMON_SELNG_AMT")),
    STORE_ADMINISTRATION("VwsmAdstrdStorW", "ADMINISTRATION", "ADSTRD_CD", true, List.of("STOR_CO")),
    CONSUMPTION_ADMINISTRATION("VwsmAdstrdNcmCnsmpW", "ADMINISTRATION", "ADSTRD_CD", false, List.of("EXPNDTR_TOTAMT")),
    SALES_DISTRICT("VwsmSignguSelngW", "DISTRICT", "SIGNGU_CD", true, List.of("THSMON_SELNG_AMT")),
    STORE_DISTRICT("VwsmSignguStorW", "DISTRICT", "SIGNGU_CD", true, List.of("STOR_CO")),
    FOOT_TRAFFIC_DISTRICT("VwsmSignguFlpopW", "DISTRICT", "SIGNGU_CD", false, List.of("TOT_FLPOP_CO")),
    CONSUMPTION_DISTRICT("VwsmSignguNcmCnsmpW", "DISTRICT", "SIGNGU_CD", false, List.of("EXPNDTR_TOTAMT"));

    private final String service;
    private final String areaType;
    private final String areaField;
    private final boolean industry;
    private final List<String> requiredMetrics;

    Dataset(String service, String areaType, String areaField, boolean industry, List<String> requiredMetrics) {
        this.service = service;
        this.areaType = areaType;
        this.areaField = areaField;
        this.industry = industry;
        this.requiredMetrics = requiredMetrics;
    }

    public String service() { return service; }
    public String areaType() { return areaType; }
    public String areaField() { return areaField; }
    public boolean industry() { return industry; }
    public List<String> requiredMetrics() { return requiredMetrics; }

    public static Dataset parse(String value) {
        return valueOf(value.toUpperCase(Locale.ROOT));
    }
}

