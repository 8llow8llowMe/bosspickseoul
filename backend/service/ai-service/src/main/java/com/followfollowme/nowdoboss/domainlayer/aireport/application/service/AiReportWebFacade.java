package com.followfollowme.nowdoboss.domainlayer.aireport.application.service;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor.AiReportJobProcessor;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor.AiReportProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiReportWebFacade implements AiReportWebUseCase {

    private final AiReportProcessor aiReportProcessor;
    private final AiReportJobProcessor aiReportJobProcessor;

    @Override
    public CommercialAiReportInfo getCommercialReport(String commercialCode, String serviceCode, String periodCode) {
        return aiReportProcessor.getCommercialReport(commercialCode, serviceCode, periodCode);
    }

    @Override
    public CommercialComparisonAiReportInfo getCommercialComparisonReport(CommercialComparisonAiQuery query) {
        return aiReportProcessor.getCommercialComparisonReport(query);
    }

    @Override
    public DistrictAiReportInfo getDistrictReport(String districtCode, String periodCode) {
        return aiReportProcessor.getDistrictReport(districtCode, periodCode);
    }

    @Override
    public AdministrationAiReportInfo getAdministrationReport(String administrationCode, String periodCode) {
        return aiReportProcessor.getAdministrationReport(administrationCode, periodCode);
    }

    @Override
    public AiReportSubmissionInfo submitCommercialReport(
        long memberId, String commercialCode, String serviceCode, String periodCode
    ) {
        return aiReportJobProcessor.submitCommercialReport(memberId, commercialCode, serviceCode, periodCode);
    }

    @Override
    public AiReportSubmissionInfo submitCommercialComparisonReport(long memberId, CommercialComparisonAiQuery query) {
        return aiReportJobProcessor.submitCommercialComparisonReport(memberId, query);
    }

    @Override
    public AiReportSubmissionInfo submitDistrictReport(long memberId, String districtCode, String periodCode) {
        return aiReportJobProcessor.submitDistrictReport(memberId, districtCode, periodCode);
    }

    @Override
    public AiReportSubmissionInfo submitAdministrationReport(long memberId, String administrationCode, String periodCode) {
        return aiReportJobProcessor.submitAdministrationReport(memberId, administrationCode, periodCode);
    }

    @Override
    public AiReportJobInfo getJobInfo(String jobId, long memberId) {
        return aiReportJobProcessor.getJobInfo(jobId, memberId);
    }
}
