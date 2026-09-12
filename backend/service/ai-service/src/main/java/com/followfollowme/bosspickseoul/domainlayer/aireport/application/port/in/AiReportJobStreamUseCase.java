package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiReportJobSubscription;
import java.util.function.Consumer;

/**
 * SSE 스트리밍 전용 인바운드 계약.
 *
 * <p>Controller 용 {@link AiReportWebUseCase} 와 분리한 이유:
 * 스트림 수명 제어는 {@code AiReportJobStatus#isTerminal()} 이라는 도메인 술어에 의존한다.
 * 응답 DTO 의 status 는 {@code CodeNameDescriptionMetadata} 라 그 술어가 없어 문자열 비교로 퇴화하고,
 * 그 경우 스트림이 닫히지 않는 경로가 생겨 SSE 연결과 하트비트 스레드가 함께 누수된다.
 * 따라서 이 포트만 {@code Info} 를 그대로 반환하고, Controller 가 쓰는 포트는 Response 로 고정한다.
 */
public interface AiReportJobStreamUseCase {

    /**
     * 잡 소유권을 검증하고 현재 스냅샷을 돌려준다. 본인이 제출한 작업만 조회할 수 있다.
     */
    AiReportJobInfo getJobInfo(String jobId, long memberId);

    /**
     * 잡 상태 변경을 구독한다. 변경이 감지될 때마다 최신 잡 정보를 onUpdate로 전달하며,
     * 반환된 구독 핸들로 반드시 해제해야 한다. 본인이 제출한 작업만 구독할 수 있다.
     */
    AiReportJobSubscription subscribeJobUpdates(String jobId, long memberId, Consumer<AiReportJobInfo> onUpdate);
}
