/**
 * README 아키텍처 다이어그램 생성기.
 *
 *   cd docs/diagrams && npm install && npm run build
 *
 * docs/images/{architecture,infrastructure}.png 를 2배 해상도로 다시 만든다.
 * 애플리케이션과 무관한 문서 전용 도구라 의존성을 이 디렉터리에 격리한다.
 */
import * as si from 'simple-icons';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../images');
fs.mkdirSync(OUT, { recursive: true });

const FONT = 'Segoe UI, Malgun Gothic, sans-serif';
const C = {
  bg: '#FFFFFF',
  panel: '#F1F5F9',
  panelBorder: '#CBD5E1',
  panelTitle: '#475569',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  title: '#0F172A',
  sub: '#64748B',
  arrow: '#94A3B8',
  arrowText: '#475569',
  accent: '#2563EB',
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function icon(name, x, y, size, override) {
  const ic = si['si' + name];
  if (!ic) return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="#CBD5E1"/>`;
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})"><path d="${ic.path}" fill="${override || '#' + ic.hex}"/></g>`;
}

function person(x, y, size, color = '#334155') {
  const s = size / 24;
  const d =
    'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.7-8 6v2h16v-2c0-3.3-3.6-6-8-6z';
  return `<g transform="translate(${x},${y}) scale(${s})"><path d="${d}" fill="${color}"/></g>`;
}

function panel({ x, y, w, h, title, accent = C.panelBorder, fill = C.panel }) {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${fill}" stroke="${accent}" stroke-width="1.5"/>
  ${title ? `<text x="${x + 22}" y="${y + 30}" font-family="${FONT}" font-size="15" font-weight="700" fill="${C.panelTitle}" letter-spacing="0.4">${esc(title)}</text>` : ''}`;
}

function card({ x, y, w, h, ic, icColor, title, sub, badge }) {
  const iconSize = 28;
  const iy = y + (h - iconSize) / 2;
  const tx = x + 20 + iconSize + 16;
  const hasSub = Boolean(sub);
  const ty = hasSub ? y + h / 2 - 2 : y + h / 2 + 6;
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${C.card}" stroke="${C.cardBorder}" stroke-width="1.5"/>
  ${ic ? icon(ic, x + 20, iy, iconSize, icColor) : person(x + 20, iy, iconSize)}
  <text x="${tx}" y="${ty}" font-family="${FONT}" font-size="15" font-weight="700" fill="${C.title}">${esc(title)}</text>
  ${hasSub ? `<text x="${tx}" y="${ty + 19}" font-family="${FONT}" font-size="12" fill="${C.sub}">${esc(sub)}</text>` : ''}
  ${badge ? pill(x + w - 14 - textW(badge, 11) - 20, y + 12, badge) : ''}`;
}

function textW(s, size) {
  let w = 0;
  for (const ch of String(s)) w += /[가-힣]/.test(ch) ? size : size * 0.55;
  return w;
}

function pill(x, y, label, color = '#EFF6FF', textColor = '#1D4ED8') {
  const w = textW(label, 11) + 20;
  return `<rect x="${x}" y="${y}" width="${w}" height="21" rx="10.5" fill="${color}"/>
  <text x="${x + w / 2}" y="${y + 15}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600" fill="${textColor}">${esc(label)}</text>`;
}

function arrow(x1, y1, x2, y2, { dashed = false, label, labelSide = 'right' } = {}) {
  const d = dashed ? ' stroke-dasharray="6 5"' : '';
  let lbl = '';
  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const w = textW(label, 12) + 16;
    const lx = labelSide === 'right' ? mx + 10 : mx - w - 10;
    lbl = `<rect x="${lx}" y="${my - 11}" width="${w}" height="22" rx="6" fill="#FFFFFF" opacity="0.95"/>
    <text x="${lx + w / 2}" y="${my + 4}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${C.arrowText}">${esc(label)}</text>`;
  }
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.arrow}" stroke-width="2.2"${d} marker-end="url(#ah)"/>${lbl}`;
}

const DEFS = `<defs>
  <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${C.arrow}"/>
  </marker>
</defs>`;

function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${DEFS}
  <rect width="${w}" height="${h}" fill="${C.bg}"/>
  ${body}
</svg>`;
}

function heading(x, y, main, sub) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="24" font-weight="700" fill="${C.title}">${esc(main)}</text>
  <text x="${x}" y="${y + 24}" font-family="${FONT}" font-size="13" fill="${C.sub}">${esc(sub)}</text>`;
}

/* ---------------------------------------------------------------- */
/* Diagram 1 : System Architecture                                    */
/* ---------------------------------------------------------------- */
function architecture() {
  const W = 1240;
  const PX = 30;
  const PW = W - PX * 2;
  const IX = PX + 24;
  const IW = PW - 48;
  let s = '';

  s += heading(PX, 46, 'BossPickSeoul · System Architecture', '브라우저는 백엔드를 직접 호출하지 않고 Next.js BFF를 경유한다');

  // user
  const userY = 92;
  s += card({ x: W / 2 - 120, y: userY, w: 240, h: 56, title: '사용자 브라우저', sub: null });
  s += arrow(W / 2, userY + 56, W / 2, userY + 92);

  // edge
  const edgeY = 200;
  const edgeH = 124;
  s += panel({ x: PX, y: edgeY, w: PW, h: edgeH, title: 'PUBLIC EDGE' });
  s += card({ x: IX, y: edgeY + 44, w: 460, h: 62, ic: 'Nginx', title: 'Nginx + Certbot', sub: 'HTTPS 종료 · 도메인 분기 · SSE 무버퍼 라우트' });
  const domX = IX + 496;
  s += pill(domX, edgeY + 48, 'www.bosspickseoul.com', '#DBEAFE');
  s += pill(domX + 226, edgeY + 48, 'api.bosspickseoul.com', '#DBEAFE');
  s += pill(domX, edgeY + 77, 'api-dev.bosspickseoul.com', '#DBEAFE');
  s += arrow(W / 2, edgeY + edgeH, W / 2, edgeY + edgeH + 36);

  // frontend
  const feY = 360;
  const feH = 140;
  s += panel({ x: PX, y: feY, w: PW, h: feH, title: 'FRONTEND', accent: '#93C5FD', fill: '#F0F7FF' });
  s += card({ x: IX, y: feY + 42, w: 520, h: 76, ic: 'Nextdotjs', title: 'Next.js 16 · App Router + BFF', sub: '암호화 HttpOnly 세션 · Bearer 주입 · 401 자동 재발급' });
  const chipX = IX + 552;
  const chips = [
    ['React 19', 'React'],
    ['TanStack Query', null],
    ['Zustand', null],
    ['styled-components', null],
    ['Kakao Map SDK', 'Kakao'],
    ['TypeScript 5.9', 'Typescript'],
  ];
  chips.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    s += pill(chipX + col * 250, feY + 50 + row * 28, c[0], '#FFFFFF', '#334155');
  });
  s += arrow(W / 2, feY + feH, W / 2, feY + feH + 36, { label: '서버 사이드 호출 (/api/v1/**)' });

  // backend
  const beY = 536;
  const beH = 372;
  s += panel({ x: PX, y: beY, w: PW, h: beH, title: 'BACKEND · Spring Boot 3.4.5 · Spring Cloud 2024.0.0', accent: '#86EFAC', fill: '#F2FBF5' });
  const halfW = (IW - 24) / 2;
  s += card({ x: IX, y: beY + 42, w: halfW, h: 68, ic: 'Spring', title: 'api-gateway', sub: 'JWT 1차 검증 · 라우팅 · Swagger 집계' });
  s += card({ x: IX + halfW + 24, y: beY + 42, w: halfW, h: 68, ic: 'Spring', title: 'service-discovery', sub: 'Netflix Eureka · 모든 서비스 등록' });

  const svcW = (IW - 2 * 22) / 3;
  const svcH = 84;
  const svcTop = beY + 148;
  const services = [
    ['auth-service', '인증 · 회원 · 북마크', 'Gateway 미경유'],
    ['commercial-service', '상권 분석 · 히트맵 · 공유', null],
    ['district-service', '지역 계층 · 지도 폴리곤', null],
    ['ai-service', 'LLM 리포트 · SSE', null],
    ['community-service', '게시판 · 신고 · 모더레이션', null],
    ['batch-service', '경계 좌표 적재', '내부 전용'],
  ];
  services.forEach((sv, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    s += card({
      x: IX + col * (svcW + 22),
      y: svcTop + row * (svcH + 20),
      w: svcW,
      h: svcH,
      ic: 'Springboot',
      title: sv[0],
      sub: sv[1],
      badge: sv[2],
    });
  });
  s += arrow(IX + halfW / 2, beY + 110, IX + halfW / 2, svcTop - 6);
  s += `<text x="${IX + halfW / 2 + 14}" y="${beY + 134}" font-family="${FONT}" font-size="12" fill="${C.arrowText}">lb:// 라우팅</text>`;
  s += arrow(W / 2, beY + beH, W / 2, beY + beH + 34);

  // data
  const dataY = beY + beH + 34;
  const dataH = 130;
  s += panel({ x: PX, y: dataY, w: PW, h: dataH, title: 'DATA & PLATFORM' });
  const dW = (IW - 3 * 20) / 4;
  const data = [
    ['Mysql', 'MySQL', '서비스별 스키마 분리'],
    ['Redis', 'Redis', '세션 · 캐시 · AI job'],
    ['Apachekafka', 'Kafka', '분석 이벤트 (옵션)'],
    ['Ollama', 'Ollama / OpenAI', 'qwen2.5:7b-instruct'],
  ];
  data.forEach((d, i) => {
    s += card({ x: IX + i * (dW + 20), y: dataY + 42, w: dW, h: 72, ic: d[0], title: d[1], sub: d[2] });
  });

  return svgDoc(W, dataY + dataH + 40, s);
}

/* ---------------------------------------------------------------- */
/* Diagram 2 : Infrastructure & CI/CD                                 */
/* ---------------------------------------------------------------- */
function infrastructure() {
  const W = 1240;
  const PX = 30;
  const PW = W - PX * 2;
  const IX = PX + 24;
  const IW = PW - 48;
  let s = '';

  s += heading(PX, 46, 'BossPickSeoul · Infrastructure & CI/CD', '별도 Infra 레포에서 Docker Compose 기반 IaC로 관리한다');

  // CI/CD band
  const ciY = 82;
  const ciH = 150;
  s += panel({ x: PX, y: ciY, w: PW, h: ciH, title: 'CI/CD PIPELINE', accent: '#FDBA74', fill: '#FFF7ED' });
  const steps = [
    ['Github', 'GitHub', 'push · webhook'],
    ['Jenkins', 'Jenkins Controller', '파이프라인 제어'],
    ['Gradle', 'builder-backend', 'gradle test · bootJar'],
    ['Vault', 'HashiCorp Vault', 'AppRole · KV v2'],
    ['Docker', 'deploy agent', '.env.runtime · compose'],
  ];
  const stW = (IW - 4 * 34) / 5;
  steps.forEach((st, i) => {
    const x = IX + i * (stW + 34);
    s += card({
      x,
      y: ciY + 46,
      w: stW,
      h: 78,
      ic: st[0],
      icColor: st[0] === 'Vault' ? '#B8860B' : undefined,
      title: st[1],
      sub: st[2],
    });
    if (i < steps.length - 1) s += arrow(x + stW + 4, ciY + 85, x + stW + 30, ciY + 85);
  });
  s += `<text x="${IX}" y="${ciY + 142}" font-family="${FONT}" font-size="12" fill="${C.sub}">노드 라벨은 역할 + 환경 기준으로 분리한다 · builder-backend / deploy-backend-dev / deploy-backend-prod</text>`;

  // hosts
  const hostY = 258;
  s += `<text x="${PX}" y="${hostY - 8}" font-family="${FONT}" font-size="15" font-weight="700" fill="${C.panelTitle}" letter-spacing="0.4">SERVER TOPOLOGY</text>`;

  const hosts = [
    {
      title: 'public edge',
      sub: 'Nginx 호스트',
      items: [['Nginx', 'Nginx + Certbot', 'HTTPS · 도메인 라우팅']],
    },
    {
      title: 'main-server · 192.168.0.11',
      sub: 'dev 환경 (포트 6XXX)',
      items: [
        ['Springboot', 'Backend dev', '8개 서비스 compose'],
        ['Mysql', 'MySQL', 'dev / prod 공용'],
        ['Redis', 'Redis master', 'Sentinel 1'],
      ],
    },
    {
      title: 'backend-1 · 192.168.0.13',
      sub: 'prod 환경 (포트 9XXX)',
      items: [
        ['Springboot', 'Backend prod', '8개 서비스 compose'],
        ['Redis', 'Redis replica', 'Sentinel 2'],
      ],
    },
    {
      title: 'ai-host · 192.168.0.10',
      sub: '미니PC (Ryzen 7 8845HS)',
      items: [
        ['Jenkins', 'Jenkins', 'controller + builder'],
        ['Vault', 'Vault', '배포 시크릿 원본'],
        ['Ollama', 'Ollama', 'Vulkan iGPU 가속'],
        ['Apachekafka', 'Kafka', 'KRaft 3 브로커'],
      ],
    },
    {
      title: 'monitoring · 192.168.0.14',
      sub: '관측 스택',
      items: [
        ['Prometheus', 'Prometheus', 'actuator · node_exporter'],
        ['Grafana', 'Grafana', '대시보드 6종'],
        ['Grafana', 'Loki', 'Promtail 로그 수집'],
      ],
    },
    {
      title: 'storage',
      sub: '오브젝트 스토리지 · Redis quorum',
      items: [
        ['Minio', 'MinIO', 'S3 호환 오브젝트 스토리지'],
        ['Redis', 'Redis replica', 'Sentinel 3'],
      ],
    },
  ];

  const cols = 3;
  const hw = (IW - 2 * 24) / cols;
  const bodyH = (h) => 60 + h.items.length * 66 - 8 + 14;
  const rowTop = [hostY + 12, 0];
  rowTop[1] =
    rowTop[0] +
    Math.max(...hosts.slice(0, cols).map(bodyH)) +
    26;

  hosts.forEach((h, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = IX + col * (hw + 24);
    const by = rowTop[row];
    const bh = bodyH(h);
    s += panel({ x: bx, y: by, w: hw, h: bh, title: null, accent: '#CBD5E1', fill: '#F8FAFC' });
    s += `<text x="${bx + 18}" y="${by + 28}" font-family="${FONT}" font-size="14" font-weight="700" fill="${C.title}">${esc(h.title)}</text>
    <text x="${bx + 18}" y="${by + 47}" font-family="${FONT}" font-size="11.5" fill="${C.sub}">${esc(h.sub)}</text>`;
    h.items.forEach((it, j) => {
      s += card({
        x: bx + 14,
        y: by + 60 + j * 66,
        w: hw - 28,
        h: 58,
        ic: it[0],
        icColor: it[0] === 'Vault' ? '#B8860B' : undefined,
        title: it[1],
        sub: it[2],
      });
    });
  });

  const notesY = rowTop[1] + Math.max(...hosts.slice(cols).map(bodyH)) + 26;
  const notes = [
    'Nginx 는 api / api-dev 도메인을 각각 prod(9000) · dev(6000) 게이트웨이로 프록시한다',
    'Jenkins 는 Vault 에서 읽은 시크릿을 .env.runtime 으로 만들어 dev · prod 배포 서버에 전달한다',
    'Redis 는 main-server 가 master, backend-1 · storage 가 replica 이며 Sentinel 3노드 quorum 2 로 failover 한다',
    'Prometheus 는 각 서버의 actuator 와 node_exporter 를 scrape 하고, 로그는 Promtail 이 Loki 로 push 한다',
  ];
  s += panel({ x: PX, y: notesY, w: PW, h: 42 + notes.length * 24, title: null, accent: '#CBD5E1' });
  notes.forEach((n, i) => {
    s += `<circle cx="${IX + 5}" cy="${notesY + 31 + i * 24}" r="3" fill="${C.arrow}"/>
    <text x="${IX + 18}" y="${notesY + 35 + i * 24}" font-family="${FONT}" font-size="12.5" fill="#334155">${esc(n)}</text>`;
  });

  return svgDoc(W, notesY + 42 + notes.length * 24 + 34, s);
}

/* ---------------------------------------------------------------- */
function write(name, svg) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: 2 },
    font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
  });
  fs.writeFileSync(`${OUT}/${name}.png`, r.render().asPng());
  console.log(`${name}: ok`);
}

write('architecture', architecture());
write('infrastructure', infrastructure());
