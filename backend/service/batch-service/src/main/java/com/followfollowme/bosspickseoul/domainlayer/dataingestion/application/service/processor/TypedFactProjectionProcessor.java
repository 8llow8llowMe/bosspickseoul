package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ChangeCommercialTypedRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.TypedFactProjectionPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 활성 {@code dataset_fact} 릴리스를 기존 팩트 테이블 컬럼으로 이관한다.
 */
public class TypedFactProjectionProcessor {

    private static final Logger log = LoggerFactory.getLogger(TypedFactProjectionProcessor.class);

    private final TypedFactProjectionPort projections;

    public TypedFactProjectionProcessor(TypedFactProjectionPort projections) {
        this.projections = projections;
    }

    public ProjectionResult project(ProjectionRequest request) {
        String sourceRunId = projections.activeRunId(request).orElseThrow(() -> new IllegalStateException(
            "no PUBLISHED release for " + request.dataset() + " " + request.period().value()
                + " " + request.spatialVersion()));
        List<FactRow> facts = projections.facts(sourceRunId);
        if (facts.isEmpty()) {
            throw new IllegalStateException("active release " + sourceRunId + " has no dataset_fact rows");
        }
        int mapped = request.dataset() == Dataset.CHANGE_COMMERCIAL
            ? mapChange(request, facts)
            : mapTyped(request, facts);
        if (request.dryRun()) {
            log.info("typed projection dry-run dataset={} period={} spatialVersion={} sourceRunId={} rows={}",
                request.dataset(), request.period().value(), request.spatialVersion(), sourceRunId, mapped);
            return new ProjectionResult(sourceRunId, mapped, false);
        }
        log.info("typed projection written dataset={} period={} spatialVersion={} sourceRunId={} rows={}",
            request.dataset(), request.period().value(), request.spatialVersion(), sourceRunId, mapped);
        return new ProjectionResult(sourceRunId, mapped, true);
    }

    private int mapChange(ProjectionRequest request, List<FactRow> facts) {
        List<ChangeCommercialTypedRow> rows = new ArrayList<>(facts.size());
        for (FactRow fact : facts) {
            rows.add(ChangeCommercialTypedMapper.map(fact, request.period().value(), request.spatialVersion()));
        }
        if (request.dryRun()) {
            return rows.size();
        }
        int written = projections.replaceChangeCommercial(request, rows);
        if (written != rows.size()) {
            throw new IllegalStateException("projected " + written + " rows but mapped " + rows.size());
        }
        return written;
    }

    private int mapTyped(ProjectionRequest request, List<FactRow> facts) {
        List<Object[]> rows = new ArrayList<>(facts.size());
        for (FactRow fact : facts) {
            rows.add(TypedFactMappers.columns(
                request.dataset(), fact, request.period().value(), request.spatialVersion()));
        }
        if (request.dryRun()) {
            return rows.size();
        }
        int written = projections.replaceTyped(request, rows);
        if (written != rows.size()) {
            throw new IllegalStateException("projected " + written + " rows but mapped " + rows.size());
        }
        return written;
    }
}
