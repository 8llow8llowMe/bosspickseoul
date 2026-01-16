package com.followfollowme.nowdoboss.apigateway.config;

import com.followfollowme.nowdoboss.common.config.JasyptPropertiesConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import(JasyptPropertiesConfig.class)
public class ApiGatewayPropertiesConfig {

}
