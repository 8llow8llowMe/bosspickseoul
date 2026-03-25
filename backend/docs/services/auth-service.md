# Auth Service Guide

## 서비스 책임

- 회원 인증, 인가, 토큰 발급/재발급, 로그아웃
- 회원 기본 정보 조회/수정

## 주요 컨텍스트

- `auth`
- `member`

## 인증 방식

- `auth-service`는 일반 Resource Server가 아니라 인증/인가 중심 보안 구성을 사용한다.
- 현재 `AuthSecurityConfigurer` 기반 구성을 따른다.

## 대표 API 패턴

- `AuthWebController`, `MemberWebController`
- `AuthWebUseCase -> AuthWebFacade`
- `MemberWebUseCase -> MemberWebFacade`

## 현재 구현 주의점

- 다른 서비스와 달리 인증 자체를 담당하므로 보안 흐름을 단순 조회 서비스처럼 취급하지 않는다.
- 토큰/쿠키/Redis 키 설계는 운영 정책과 같이 움직이므로 문서와 설정을 함께 본다.
