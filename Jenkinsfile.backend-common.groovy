Map<String, String> resolveGitContext() {
    String requestedTargetBranch = params.TARGET_BRANCH?.trim()
    String requestedPrSha = params.PR_SHA?.trim()
    String requestedPrNumber = params.PR_NUMBER?.trim()

    String effectiveTargetBranch = requestedTargetBranch
    if (!effectiveTargetBranch) {
        effectiveTargetBranch = env.CHANGE_TARGET?.trim() ?: env.BRANCH_NAME
    }

    String deployEnv = 'none'
    if (effectiveTargetBranch == 'main') {
        deployEnv = 'prod'
    } else if (effectiveTargetBranch == 'develop') {
        deployEnv = 'dev'
    }

    return [
        requestedTargetBranch: requestedTargetBranch ?: '',
        effectiveTargetBranch: effectiveTargetBranch ?: '',
        requestedPrSha      : requestedPrSha ?: '',
        requestedPrNumber   : requestedPrNumber ?: '',
        deployEnv           : deployEnv
    ]
}

void checkoutSource() {
    if (params.PR_SHA?.trim()) {
        echo "명시적으로 지정한 PR 커밋 SHA를 체크아웃합니다: ${params.PR_SHA}"
        checkout([
            $class: 'GitSCM',
            branches: [[name: params.PR_SHA.trim()]],
            userRemoteConfigs: scm.userRemoteConfigs,
            extensions: [
                [$class: 'SubmoduleOption', recursiveSubmodules: true, parentCredentials: true]
            ]
        ])
        return
    }

    echo '멀티브랜치 파이프라인의 기본 SCM 컨텍스트로 체크아웃합니다.'
    checkout([
        $class: 'GitSCM',
        branches: scm.branches,
        userRemoteConfigs: scm.userRemoteConfigs,
        extensions: [
            [$class: 'SubmoduleOption', recursiveSubmodules: true, parentCredentials: true]
        ]
    ])
}

Map<String, Object> resolveVaultSpec(Map<String, String> config, Map<String, String> ctx) {
    String projectSlug = params.PROJECT_SLUG?.trim() ?: 'bosspickseoul'
    String vaultSecretRoot = params.VAULT_SECRET_ROOT?.trim() ?: "kv/${projectSlug}/backend"
    String vaultSecretPath = "${vaultSecretRoot}/${ctx.deployEnv}/${config.serviceGroup}/${config.serviceName}"
    Integer engineVersion = (params.VAULT_ENGINE_VERSION ?: '2') as Integer

    return [
        configuration: [
            vaultCredentialId: params.VAULT_CREDENTIAL_ID?.trim(),
            engineVersion    : engineVersion
        ],
        secrets: [[
            path        : vaultSecretPath,
            engineVersion: engineVersion,
            secretValues: [[
                envVar    : 'VAULT_ENV_FILE_CONTENT',
                vaultKey  : params.VAULT_ENV_KEY?.trim() ?: 'env_file',
                isRequired: true
            ]]
        ]],
        path: vaultSecretPath
    ]
}

void run(Map<String, String> config) {
    properties([
        buildDiscarder(logRotator(numToKeepStr: '20')),
        disableConcurrentBuilds(),
        parameters([
            string(
                name: 'TARGET_BRANCH',
                defaultValue: '',
                description: 'PR 대상 브랜치를 수동으로 지정합니다. 비워두면 CHANGE_TARGET 또는 BRANCH_NAME을 자동으로 사용합니다.'
            ),
            string(
                name: 'PR_SHA',
                defaultValue: '',
                description: '체크아웃할 특정 PR 커밋 SHA를 직접 지정합니다. 비워두면 멀티브랜치 기본 체크아웃을 사용합니다.'
            ),
            string(
                name: 'PR_NUMBER',
                defaultValue: '',
                description: '로그 확인용 PR 번호입니다. 선택 입력입니다.'
            ),
            booleanParam(
                name: 'RUN_TESTS',
                defaultValue: true,
                description: 'bootJar 빌드 전에 해당 모듈 테스트를 먼저 실행합니다.'
            ),
            booleanParam(
                name: 'SKIP_DEPLOY',
                defaultValue: false,
                description: '배포 가능한 브랜치여도 배포를 건너뛰고 빌드만 수행합니다.'
            ),
            string(
                name: 'DEPLOY_BASE_PARENT',
                defaultValue: 'deploy',
                description: '배포 서버에서 사용자 홈 아래 사용할 상위 디렉터리입니다. 예: deploy'
            ),
            string(
                name: 'PROJECT_SLUG',
                defaultValue: 'bosspickseoul',
                description: '배포 서버 디렉터리와 Vault 경로에 사용할 프로젝트 식별자입니다.'
            ),
            string(
                name: 'DEPLOY_APP_DIR',
                defaultValue: 'backend',
                description: '프로젝트 디렉터리 아래 애플리케이션 루트 폴더명입니다.'
            ),
            string(
                name: 'VAULT_CREDENTIAL_ID',
                defaultValue: 'bosspickseoul-vault-approle',
                description: 'Jenkins 에 등록된 Vault 인증 Credential ID입니다.'
            ),
            string(
                name: 'VAULT_SECRET_ROOT',
                defaultValue: '',
                description: 'Vault KV 비밀 경로의 공통 루트입니다. 비워두면 kv/${PROJECT_SLUG}/backend 규칙을 자동 사용합니다.'
            ),
            string(
                name: 'VAULT_ENV_KEY',
                defaultValue: 'env_file',
                description: 'Vault secret 안에서 전체 env 파일 내용을 담고 있는 key 이름입니다.'
            ),
            string(
                name: 'VAULT_ENGINE_VERSION',
                defaultValue: '2',
                description: 'HashiCorp Vault KV 엔진 버전입니다. 기본값은 2입니다.'
            ),
            string(
                name: 'DEPLOY_LOCK_NAME',
                defaultValue: 'backend-1-deploy',
                description: 'backend-1 서버 배포를 직렬화할 때 사용할 Lockable Resource 이름입니다.'
            )
        ])
    ])

    Map<String, String> ctx = [:]

    stage('배포 문맥 확인') {
        node(config.buildAgentLabel) {
            try {
                deleteDir()
                checkoutSource()
                ctx = resolveGitContext()

                currentBuild.displayName = "#${env.BUILD_NUMBER} ${config.serviceName} ${env.BRANCH_NAME ?: 'n/a'}"

                echo "=== 빌드 정보 ==="
                echo "현재 브랜치: ${env.BRANCH_NAME ?: '없음'}"
                echo "서비스 그룹: ${config.serviceGroup}"
                echo "서비스 이름: ${config.serviceName}"
                echo "요청된 대상 브랜치: ${ctx.requestedTargetBranch ?: '없음'}"
                echo "실제 적용 대상 브랜치: ${ctx.effectiveTargetBranch ?: '없음'}"
                echo "PR SHA: ${ctx.requestedPrSha ?: '없음'}"
                echo "PR 번호: ${ctx.requestedPrNumber ?: '없음'}"
                echo "배포 환경 판정: ${ctx.deployEnv}"
                echo "빌드 에이전트 라벨: ${config.buildAgentLabel}"
                echo "배포 에이전트 라벨: ${config.deployAgentLabel}"
                echo "배포 경로 규칙: \$HOME/${params.DEPLOY_BASE_PARENT}/${params.PROJECT_SLUG}/${params.DEPLOY_APP_DIR}/..."
                if (ctx.deployEnv in ['dev', 'prod']) {
                    String resolvedVaultRoot = params.VAULT_SECRET_ROOT?.trim() ?: "kv/${params.PROJECT_SLUG}/backend"
                    echo "Vault 경로 규칙: ${resolvedVaultRoot}/${ctx.deployEnv}/${config.serviceGroup}/${config.serviceName}"
                }
                echo "================="
            } finally {
                deleteDir()
            }
        }
    }

    stage('JAR 빌드') {
        node(config.buildAgentLabel) {
            try {
                deleteDir()
                checkoutSource()

                dir('backend') {
                    sh 'chmod +x gradlew'

                    String gradleCommand = params.RUN_TESTS
                        ? "./gradlew :${config.modulePath}:test :${config.modulePath}:bootJar --no-daemon --parallel --build-cache --stacktrace"
                        : "./gradlew :${config.modulePath}:bootJar --no-daemon --parallel --build-cache --stacktrace"

                    sh """#!/usr/bin/env bash
set -euo pipefail
${gradleCommand}
"""
                }

                archiveArtifacts artifacts: "${config.fsPath}/build/libs/*.jar", fingerprint: true
                stash(
                    name: "bundle-${config.serviceName}",
                    includes: "${config.fsPath}/build/libs/*.jar,${config.fsPath}/${config.dockerfile},${config.fsPath}/${config.composeFile}"
                )
            } finally {
                deleteDir()
            }
        }
    }

    if (!params.SKIP_DEPLOY && ctx.deployEnv in ['dev', 'prod']) {
        stage("${ctx.deployEnv} 환경 배포") {
            lock(resource: params.DEPLOY_LOCK_NAME?.trim() ?: 'backend-1-deploy') {
                node(config.deployAgentLabel) {
                    try {
                        deleteDir()
                        unstash "bundle-${config.serviceName}"

                        Map<String, Object> vaultSpec = resolveVaultSpec(config, ctx)
                        if (!vaultSpec.configuration.vaultCredentialId) {
                            error 'Vault 인증 Credential ID가 비어 있습니다.'
                        }

                        withVault([
                            configuration: vaultSpec.configuration,
                            vaultSecrets : vaultSpec.secrets
                        ]) {
                            writeFile file: '.env.runtime', text: env.VAULT_ENV_FILE_CONTENT

                            sh """#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="\${HOME}/${params.DEPLOY_BASE_PARENT}/${params.PROJECT_SLUG}/${params.DEPLOY_APP_DIR}/${config.deploySubdir}"
mkdir -p "\${SERVICE_DIR}"
rsync -a --delete "${config.fsPath}/" "\${SERVICE_DIR}/"
install -m 600 .env.runtime "\${SERVICE_DIR}/.env.runtime"

docker network inspect 8llow8llowme-net >/dev/null 2>&1 || docker network create 8llow8llowme-net >/dev/null

cd "\${SERVICE_DIR}"
test -s .env.runtime
docker compose --env-file .env.runtime -f ${config.composeFile} config >/dev/null
docker compose --env-file .env.runtime -f ${config.composeFile} up -d --build --remove-orphans ${config.composeServiceName}-${ctx.deployEnv}

for attempt in \$(seq 1 30); do
  state="\$(docker inspect -f '{{.State.Status}}' ${config.containerNamePrefix}-${ctx.deployEnv} 2>/dev/null || true)"

  if [ "\${state}" = "running" ]; then
    docker compose -f ${config.composeFile} ps ${config.composeServiceName}-${ctx.deployEnv}
    exit 0
  fi

  if [ "\${state}" = "exited" ] || [ "\${state}" = "dead" ]; then
    docker logs --tail 200 ${config.containerNamePrefix}-${ctx.deployEnv} || true
    exit 1
  fi

  sleep 5
done

docker logs --tail 200 ${config.containerNamePrefix}-${ctx.deployEnv} || true
exit 1
"""
                        }
                    } finally {
                        deleteDir()
                    }
                }
            }
        }
    } else {
        stage('배포 생략') {
            echo "배포를 생략합니다. deployEnv=${ctx.deployEnv}, skipDeploy=${params.SKIP_DEPLOY}"
        }
    }
}

return this
