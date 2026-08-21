package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out;

public interface MailSendPort {

    void sendVerificationCode(String email, String code);

    void sendAlreadyRegisteredNotice(String email);
}
