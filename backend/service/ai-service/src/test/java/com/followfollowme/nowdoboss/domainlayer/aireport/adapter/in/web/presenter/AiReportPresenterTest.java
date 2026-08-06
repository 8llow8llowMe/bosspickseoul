package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import org.junit.jupiter.api.Test;

class AiReportPresenterTest {

    private final AiReportPresenter presenter = new AiReportPresenter();

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
            .isEqualTo(AiReportJobType.COMMERCIAL.getProgressMessages());
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
