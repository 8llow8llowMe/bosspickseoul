package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import org.junit.jupiter.api.Test;

class AiReportPresenterTest {

    private final AiReportPresenter presenter = new AiReportPresenter();

    /** 분기를 생략한 제출도 응답에서 실제로 쓴 분기를 알 수 있어야 한다(이슈 #464). 화면 라벨과 공유 payload 가 이 값을 쓴다. */
    @Test
    void toSubmissionResponse_carriesTheResolvedPeriodCode() {
        assertThat(presenter.toSubmissionResponse(AiReportSubmissionInfo.accepted(AiReportJobType.DISTRICT, "20261", "J1")).periodCode())
            .isEqualTo("20261");
    }

    @Test
    void toJobStatusResponse_inFlight_includesJobTypeProgressMessages() {
        AiReportJobInfo info = AiReportJobInfo.builder()
            .jobId("J1")
            .jobType(AiReportJobType.COMMERCIAL)
            .status(AiReportJobStatus.RUNNING)
            .build();

        AiReportJobStatusResponse response = presenter.toJobStatusResponse(info);

        assertThat(response.progressMessages())
            .isNotEmpty()
            .isEqualTo(AiReportProgressMessages.of(AiReportJobType.COMMERCIAL));
    }

    @Test
    void toJobStatusResponse_terminal_omitsProgressMessages() {
        AiReportJobInfo info = AiReportJobInfo.builder()
            .jobId("J1")
            .jobType(AiReportJobType.COMMERCIAL)
            .status(AiReportJobStatus.COMPLETED)
            .build();

        AiReportJobStatusResponse response = presenter.toJobStatusResponse(info);

        assertThat(response.progressMessages()).isNull();
    }
}
