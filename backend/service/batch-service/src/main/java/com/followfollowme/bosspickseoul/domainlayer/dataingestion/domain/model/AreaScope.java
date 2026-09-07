package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

/**
 * Seoul spatial reporting units, outermost first. Each unit nests inside the previous one,
 * and the source field carrying its code is fixed by the unit rather than by the dataset.
 */
public enum AreaScope {
    DISTRICT("SIGNGU_CD"),
    ADMINISTRATION("ADSTRD_CD"),
    COMMERCIAL("TRDAR_CD");

    private final String areaField;

    AreaScope(String areaField) {
        this.areaField = areaField;
    }

    public String areaField() {
        return areaField;
    }

    /** Returns null for the outermost unit. Enum constants cannot be referenced from a constructor. */
    public AreaScope parent() {
        return switch (this) {
            case DISTRICT -> null;
            case ADMINISTRATION -> DISTRICT;
            case COMMERCIAL -> ADMINISTRATION;
        };
    }
}
