package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.support;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import feign.FeignException;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

@Component
public class InternalResponseSupport {

    public <T> T unwrap(Response<T> response) {
        if (response == null || response.dataHeader() == null || !response.dataHeader().success()) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }

        T dataBody = response.dataBody();
        if (dataBody == null) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }

        return dataBody;
    }

    public <T> T requestAndUnwrap(Supplier<Response<T>> requester) {
        try {
            return unwrap(requester.get());
        } catch (FeignException exception) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE, exception);
        }
    }
}
