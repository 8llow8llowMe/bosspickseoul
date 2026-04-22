package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.preview.CommercialComparePreviewInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialComparisonQuery;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
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
            .insightOneLiner(buildInsightOneLiner(full, headline))
            .build();
    }

    private String buildInsightOneLiner(CommercialComparisonInfo full, List<ComparisonMetricInfo> headline) {
        CodeNameDescriptionMetadata recommended = full.recommendedSide();
        if (recommended == null || "TIE".equals(recommended.code())) {
            return "두 상권이 전반적으로 비슷한 경쟁력을 보입니다.";
        }

        String winnerCode = recommended.code();
        String winnerName = resolveWinnerName(winnerCode, full.left(), full.right());

        Optional<ComparisonMetricInfo> topMetric = headline.stream()
            .filter(m -> m.winnerSide() != null && winnerCode.equals(m.winnerSide().code()))
            .max(Comparator.comparingDouble(m -> Math.abs(m.diffRate())));

        if (topMetric.isPresent() && Math.abs(topMetric.get().diffRate()) > 0.01) {
            long diffPct = Math.round(Math.abs(topMetric.get().diffRate() * 100));
            return "%s이(가) %s 기준 %d%% 우위입니다.".formatted(winnerName, topMetric.get().label(), diffPct);
        }
        return "%s이(가) 종합 지표 기준으로 더 유리한 상권입니다.".formatted(winnerName);
    }

    private String resolveWinnerName(
        String winnerCode, CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right
    ) {
        if ("LEFT".equals(winnerCode)) {
            return left != null ? left.commercialName() : "좌측 상권";
        }
        return right != null ? right.commercialName() : "우측 상권";
    }

    private void addIfPresent(List<ComparisonMetricInfo> target, List<ComparisonMetricInfo> source, int index) {
        if (source != null && source.size() > index) {
            target.add(source.get(index));
        }
    }
}
