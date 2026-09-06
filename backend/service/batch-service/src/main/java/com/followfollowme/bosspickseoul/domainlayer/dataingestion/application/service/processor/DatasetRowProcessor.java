package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

public class DatasetRowProcessor {
    private static final Set<String> CHANGE_CODES = Set.of("LL", "LH", "HL", "HH");

    public RowValidation process(ImportRequest request, SourceRow row) {
        Map<String, String> fields = row.fields();
        Dataset dataset = request.dataset();
        if (!request.period().value().equals(fields.get("STDR_YYQU_CD"))) return reject(row, "PERIOD_MISMATCH");
        String area = fields.get(dataset.areaField());
        if (area == null || !area.matches("[0-9]{5,8}")) return reject(row, "AREA_CODE_INVALID");
        String service = dataset.industry() ? fields.get("SVC_INDUTY_CD") : "";
        if (dataset.industry() && (service == null || !service.matches("CS[0-9]{6}"))) return reject(row, "SERVICE_CODE_INVALID");
        for (String field : dataset.requiredMetrics()) {
            String value = fields.get(field);
            if (value == null || value.isBlank()) return reject(row, "REQUIRED_FIELD_MISSING:" + field);
        }
        if (dataset == Dataset.CHANGE_COMMERCIAL && !CHANGE_CODES.contains(fields.get("TRDAR_CHNGE_IX"))) {
            return reject(row, "CHANGE_INDICATOR_INVALID");
        }
        // Preserve new columns and absent optional income fields. Never fabricate zero.
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            if (numeric(entry.getKey()) && entry.getValue() != null && !entry.getValue().isBlank()) {
                try {
                    BigDecimal number = new BigDecimal(entry.getValue());
                    if (number.signum() < 0 || number.precision() > 30 || number.scale() > 10) {
                        return reject(row, "NUMERIC_VALUE_INVALID:" + entry.getKey());
                    }
                } catch (NumberFormatException ignored) {
                    return reject(row, "NUMERIC_VALUE_INVALID:" + entry.getKey());
                }
            }
        }
        return new RowValidation(row, new FactRow(row.rowNumber(), area, service, fields), null);
    }

    private boolean numeric(String field) {
        return field.endsWith("_AMT") || field.endsWith("_CO") || field.endsWith("_TOTAMT")
            || field.endsWith("_RT") || field.endsWith("_AVRG");
    }

    private RowValidation reject(SourceRow row, String reason) { return new RowValidation(row, null, reason); }
}

