# 라즈베리파이 ARM64 호환 JRE 21
FROM ibm-semeru-runtimes:open-21-jre-jammy

# Jenkins 에서 사전 빌드된 JAR 복사 (`./gradlew :service:auth-service:bootJar` 산출물)
ARG JAR_FILE=./build/libs/auth-service-*.jar
COPY ${JAR_FILE} /app/auth-service.jar

# 컨테이너 메모리 인식 + heap 70% 상한, 시간대 / 프로파일 환경변수 주입
ENTRYPOINT ["sh", "-c", "java \
  -Duser.timezone=$TIME_ZONE \
  -Dspring.profiles.active=$SPRING_PROFILES_ACTIVE \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=70.0 \
  -XX:InitialRAMPercentage=30.0 \
  -jar /app/auth-service.jar"]
