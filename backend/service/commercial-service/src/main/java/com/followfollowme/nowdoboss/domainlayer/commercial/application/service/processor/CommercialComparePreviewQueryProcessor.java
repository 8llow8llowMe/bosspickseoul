package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.preview.CommercialComparePreviewInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialComparisonQuery;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialComparePreviewQueryProcessor {

    private final CommercialComparisonQueryProcessor commercialComparisonQueryProcessor;

    public CommercialComparePreviewInfo getPreview(CommercialComparisonQuery query) {
        CommercialComparisonInfo full = commercialComparisonQueryProcessor.compareCommercials(query);

        List<ComparisonMetricInfo> headline = new ArrayList<>(6);
        addIfPresent(headline, full.salesMetrics(), 0);
        addIfPresent(headline, full.footTrafficMetrics(), 0);
        addIfPresent(headline, full.storeMetrics(), 0);
        addIfPresent(headline, full.storeMetrics(), 2);
        addIfPresent(headline, full.storeMetrics(), 3);
        addIfPresent(headline, full.spendingMetrics(), 0);

        return CommercialComparePreviewInfo.builder()
            .left(full.left())
            .right(full.right())
            .recommendedSide(full.recommendedSide())
            .headlineMetrics(headline)
            .build();
    }

    private void addIfPresent(List<ComparisonMetricInfo> target, List<ComparisonMetricInfo> source, int index) {
        if (source != null && source.size() > index) {
            target.add(source.get(index));
        }
    }
}
