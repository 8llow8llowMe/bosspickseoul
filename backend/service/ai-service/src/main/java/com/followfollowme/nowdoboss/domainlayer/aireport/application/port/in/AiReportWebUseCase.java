package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AiReportJobSubscription;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import java.util.function.Consumer;

public interface AiReportWebUseCase {

    AiReportSubmissionInfo submitCommercialReport(long memberId, String commercialCode, String serviceCode, String periodCode);

    AiReportSubmissionInfo submitCommercialComparisonReport(long memberId, CommercialComparisonAiQuery query);

    AiReportSubmissionInfo submitDistrictReport(long memberId, String districtCode, String periodCode);

    AiReportSubmissionInfo submitAdministrationReport(long memberId, String administrationCode, String periodCode);

    AiReportJobInfo getJobInfo(String jobId, long memberId);

    /**
     * 잡 상태 변경을 구독한다. 변경이 감지될 때마다 최신 잡 정보를 onUpdate로 전달하며,
     * 반환된 구독 핸들로 반드시 해제해야 한다. 본인이 제출한 작업만 구독할 수 있다.
     */
    AiReportJobSubscription subscribeJobUpdates(String jobId, long memberId, Consumer<AiReportJobInfo> onUpdate);
}
