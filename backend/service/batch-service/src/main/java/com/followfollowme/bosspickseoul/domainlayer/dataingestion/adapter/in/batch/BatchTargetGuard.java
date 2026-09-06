package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import java.net.URI;
import java.util.Arrays;
import java.util.Locale;

public final class BatchTargetGuard {
    private BatchTargetGuard() {}

    public static void verify(String explicitUrl, String configuredUrl, String allowedSchemas) {
        if (explicitUrl == null || explicitUrl.isBlank() || !explicitUrl.equals(configuredUrl)) {
            throw new IllegalArgumentException("BATCH_DB_URL must explicitly match the configured datasource");
        }
        try {
            if (!explicitUrl.startsWith("jdbc:mysql://")) throw new IllegalArgumentException();
            URI target = URI.create(explicitUrl.substring(5));
            String path = target.getPath();
            if (target.getHost() == null || target.getUserInfo() != null || target.getFragment() != null
                || path == null || !path.matches("/[a-zA-Z0-9_]+")) throw new IllegalArgumentException();
            String schema = path.substring(1);
            if (schema.toLowerCase(Locale.ROOT).contains("prod") || allowedSchemas == null
                || Arrays.stream(allowedSchemas.split(",")).map(String::trim).noneMatch(schema::equals)) throw new IllegalArgumentException();
        } catch (IllegalArgumentException ignored) {
            // Never put the datasource URI (which may contain secrets) in the exception.
            throw new IllegalArgumentException("Target must be a MySQL schema explicitly allowed by BATCH_ALLOWED_SCHEMAS; production schemas are forbidden");
        }
    }
}

