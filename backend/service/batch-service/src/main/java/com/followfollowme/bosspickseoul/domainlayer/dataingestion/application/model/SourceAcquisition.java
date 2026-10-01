package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.util.Collections;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * 게시 없이 받아 둔 원천. {@code rawLocation} 은 ARCHIVE 재생이 읽는 {@code page-<start>.json} 디렉터리이고,
 * {@code rowsByQuarter} 는 그 페이지들의 {@code STDR_YYQU_CD} 별 행 수다. 분기 인자를 무시하는 데이터셋은
 * 여러 분기가, 존중하는 데이터셋은 요청 분기 하나가 들어 있다. 비어 있으면 원천에 아직 행이 없다.
 * 쓴 API 호출 수는 여기 싣지 않는다. 호출자가 넘긴 {@link ApiCallBudget} 이 재시도까지 센다.
 */
public record SourceAcquisition(String rawLocation, SortedMap<Quarter, Long> rowsByQuarter, long sourceTotal) {
    public SourceAcquisition {
        rowsByQuarter = Collections.unmodifiableSortedMap(new TreeMap<>(rowsByQuarter));
    }
}
