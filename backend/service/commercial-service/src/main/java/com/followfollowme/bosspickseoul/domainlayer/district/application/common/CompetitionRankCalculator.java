package com.followfollowme.bosspickseoul.domainlayer.district.application.common;

import java.util.ArrayList;
import java.util.List;
import java.util.function.ToLongFunction;

/**
 * 정렬된 목록에 표준 경쟁 순위(standard competition ranking)를 매긴다. 같은 값은 같은 순위이고, 다음 순위는 동점자 수만큼 건너뛴다
 * (값 40, 30, 30, 10 → 1, 2, 2, 4).
 *
 * <p>QueryDSL JPA 에는 {@code RANK()} 같은 window 함수가 없어 저장소가 정렬까지만 하고 순위는 애플리케이션이 매긴다(이슈 #433).
 * 입력은 <b>값 내림차순으로 이미 정렬</b>돼 있어야 한다. 순서를 바꾸지 않으므로 동점 안의 순서(자치구 코드 오름차순)는 저장소가 정한 그대로다.
 * 앞 값보다 큰 값이 나오면 정렬 전제가 깨진 것이라 틀린 순위를 내리지 않고 {@link IllegalStateException} 을 던진다.
 */
public final class CompetitionRankCalculator {

    private CompetitionRankCalculator() {
    }

    public static <T, R> List<R> rank(List<T> sortedByValueDesc, ToLongFunction<T> value, RankedMapper<T, R> mapper) {
        List<R> ranked = new ArrayList<>(sortedByValueDesc.size());
        int rank = 0;
        long previousValue = 0L;

        for (int index = 0; index < sortedByValueDesc.size(); index++) {
            T source = sortedByValueDesc.get(index);
            long currentValue = value.applyAsLong(source);
            if (index > 0 && currentValue > previousValue) {
                throw new IllegalStateException(
                    "rank input must be sorted by value desc: index=" + index + ", previousValue=" + previousValue + ", currentValue=" + currentValue);
            }
            if (index == 0 || currentValue != previousValue) {
                rank = index + 1;
            }
            ranked.add(mapper.map(rank, source));
            previousValue = currentValue;
        }

        return List.copyOf(ranked);
    }

    /** 순위와 원본 항목으로 순위가 매겨진 결과를 만든다. */
    @FunctionalInterface
    public interface RankedMapper<T, R> {

        R map(int rank, T source);
    }
}
