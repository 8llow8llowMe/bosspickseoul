package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import java.util.function.Supplier;

/**
 * 분기 종속 데이터 부재만 골라 삼키는 조회 보조. 비교·프로필·소비 출처 세 Processor 가 같은 판정을 쓴다.
 *
 * <p>예전에는 {@code CommercialQueryProcessor} 의 static 메서드였는데, 다른 Processor 가
 * {@code CommercialQueryProcessor.} 접두어로 불러 쓰면서 "조회 Processor" 와 "공용 유틸" 두 역할이 한 클래스에
 * 섞였다. Processor 는 애플리케이션 로직을 담는 자리이므로(architecture-guide §3) 공용 판정은 support 로 뺀다.
 */
public final class CommercialQuietFetchSupport {

    private CommercialQuietFetchSupport() {
    }

    /**
     * 분기 종속 데이터 부재(404 {@link CommercialException})만 null 로 흡수한다. 그 외 예외는 전파한다.
     *
     * <p>{@code catch (CommercialException)} 으로 통째로 잡으면 503(INTERNAL_SERVICE_UNAVAILABLE)과
     * 400(요청 오류)까지 "데이터 없음"으로 뭉개져, 지역 서비스 장애가 지표 하나 빠진 정상 응답으로 보인다.
     *
     * <p><b>호출부에 트랜잭션을 걸지 않는다.</b> 여기서 삼킨 예외가 참여 중인 트랜잭션에서 올라온 것이면
     * Spring 이 그 트랜잭션을 rollback-only 로 표시하고, 삼켰는데도 상위 커밋이
     * {@code UnexpectedRollbackException} 으로 깨진다. 이 판정을 쓰는 유스케이스가 Facade 트랜잭션을 떼고 있는
     * 이유 중 하나다.
     */
    public static <T> T fetchOrNullWhenNotFound(Supplier<T> fetcher) {
        try {
            return fetcher.get();
        } catch (CommercialException exception) {
            if (exception.isNotFound()) {
                return null;
            }
            throw exception;
        }
    }
}
