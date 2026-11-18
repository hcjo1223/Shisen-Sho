/**
 * 결과 카드 공유 — 클리어 기록을 canvas 이미지 카드로 그려 Web Share로 보낸다.
 * (모바일에서는 공유 시트에서 카카오톡 등을 고를 수 있다)
 */

export const SHARE_URL = 'https://hcjo1223.github.io/Shisen-Sho/';

export interface ShareInfo {
  /** 카드 상단 라벨, 예: '🗓️ 오늘의 챌린지 11/18' 또는 '🌸 보통 난이도' */
  title: string;
  elapsedText: string;
  isBest: boolean;
  hintsUsed: number;
  maxCombo: number;
  /** 일일 챌린지 연속 일수 (일반 모드면 생략) */
  streak?: number;
  /** 카드 장식용 이모지 몇 개 */
  emojis: string[];
}

interface CardColors {
  background: string;
  card: string;
  accent: string;
  onAccent: string;
  text: string;
  muted: string;
  border: string;
}

/**
 * 테마 토큰(light-dark() 포함)을 실제 색으로 바꾼다.
 * 테마가 적용된 트리 안에 임시 요소를 넣고 계산된 색을 읽는다.
 */
function resolveTokenColors(host: Element): CardColors {
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  host.appendChild(probe);
  const read = (token: string, fallback: string) => {
    probe.style.color = fallback;
    probe.style.color = `var(${token}, ${fallback})`;
    return getComputedStyle(probe).color || fallback;
  };
  const colors: CardColors = {
    background: read('--color-background-body', 'rgb(255, 244, 239)'),
    card: read('--color-background-card', 'rgb(255, 253, 251)'),
    accent: read('--color-accent', 'rgb(242, 104, 90)'),
    onAccent: read('--color-on-accent', 'rgb(255, 255, 255)'),
    text: read('--color-text-primary', 'rgb(74, 52, 48)'),
    muted: read('--color-text-secondary', 'rgb(124, 101, 97)'),
    border: read('--color-border', 'rgb(231, 205, 196)'),
  };
  probe.remove();
  return colors;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function readFont(host: Element, token: string, fallback: string): string {
  const value = getComputedStyle(host).getPropertyValue(token).trim();
  return value || fallback;
}

/** 결과 카드를 PNG Blob으로 그린다. */
export async function renderShareCard(
  info: ShareInfo,
  host: Element = document.body,
): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas를 사용할 수 없어요');

  const colors = resolveTokenColors(host);
  const heading = readFont(host, '--font-family-heading', '"Jua", sans-serif');
  const body = readFont(host, '--font-family-body', '"Gowun Dodum", sans-serif');
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  // 배경
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, W, H);

  // 흩뿌린 이모지 장식
  ctx.globalAlpha = 0.22;
  ctx.font = `88px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const spots: Array<[number, number]> = [
    [110, 130], [970, 150], [90, 1220], [990, 1210], [540, 1260], [980, 690], [100, 700],
  ];
  spots.forEach(([x, y], i) => {
    const emoji = info.emojis[i % Math.max(info.emojis.length, 1)] ?? '🍓';
    ctx.fillText(emoji, x, y);
  });
  ctx.globalAlpha = 1;

  // 카드
  const cx = 90;
  const cy = 200;
  const cw = W - 180;
  const ch = 900;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, cx, cy, cw, ch, 56);
  ctx.fillStyle = colors.card;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = colors.border;
  ctx.stroke();

  // 앱 이름
  ctx.fillStyle = colors.accent;
  ctx.font = `64px ${heading}`;
  ctx.fillText('말랑 사천성', W / 2, cy + 110);

  // 모드
  ctx.fillStyle = colors.muted;
  ctx.font = `44px ${body}`;
  ctx.fillText(info.title, W / 2, cy + 190);

  // 대표 이모지
  ctx.font = `150px ${EMOJI_FONT}`;
  ctx.fillText(info.isBest ? '🏆' : '🎉', W / 2, cy + 340);

  // 클리어 시간
  ctx.fillStyle = colors.text;
  ctx.font = `150px ${heading}`;
  ctx.fillText(info.elapsedText, W / 2, cy + 520);

  if (info.isBest) {
    const label = '최고 기록!';
    ctx.font = `40px ${heading}`;
    const tw = ctx.measureText(label).width + 64;
    roundRect(ctx, W / 2 - tw / 2, cy + 600, tw, 72, 36);
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.fillStyle = colors.onAccent;
    ctx.fillText(label, W / 2, cy + 637);
  }

  // 세부 기록
  const stats: Array<[string, string]> = [
    ['💡 힌트', `${info.hintsUsed}회`],
    ['🔥 최대 콤보', `${info.maxCombo}`],
  ];
  if (typeof info.streak === 'number') {
    stats.push(['🗓️ 연속', `${info.streak}일`]);
  }
  const colW = cw / stats.length;
  stats.forEach(([label, value], i) => {
    const x = cx + colW * i + colW / 2;
    ctx.fillStyle = colors.muted;
    ctx.font = `36px ${body}`;
    ctx.fillText(label, x, cy + 760);
    ctx.fillStyle = colors.text;
    ctx.font = `56px ${heading}`;
    ctx.fillText(value, x, cy + 830);
  });

  // 링크
  ctx.fillStyle = colors.muted;
  ctx.font = `34px ${body}`;
  ctx.fillText(SHARE_URL.replace(/^https:\/\//, ''), W / 2, cy + ch + 90);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요'))),
      'image/png',
    );
  });
}

export function shareText(info: ShareInfo): string {
  const parts = [
    `말랑 사천성 ${info.title} 클리어! ${info.isBest ? '🏆' : '🎉'}`,
    `⏱ ${info.elapsedText} · 💡 힌트 ${info.hintsUsed}회 · 🔥 콤보 ${info.maxCombo}`,
  ];
  if (typeof info.streak === 'number') parts.push(`🗓️ ${info.streak}일 연속 도전 중`);
  return parts.join('\n');
}

export type ShareOutcome = 'shared' | 'downloaded' | 'copied' | 'cancelled';

/**
 * 이미지 카드 공유 → (파일 공유 미지원) 텍스트 공유 → 이미지 저장 + 텍스트 복사 순으로 시도한다.
 */
export async function shareResult(
  info: ShareInfo,
  host?: Element,
): Promise<ShareOutcome> {
  const text = shareText(info);
  let blob: Blob | null = null;
  try {
    blob = await renderShareCard(info, host);
  } catch {
    blob = null;
  }

  try {
    if (blob && typeof navigator.share === 'function') {
      const file = new File([blob], 'malang-shisen-result.png', {type: 'image/png'});
      if (navigator.canShare?.({files: [file]})) {
        await navigator.share({files: [file], text: `${text}\n${SHARE_URL}`});
        return 'shared';
      }
    }
    if (typeof navigator.share === 'function') {
      await navigator.share({title: '말랑 사천성', text, url: SHARE_URL});
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    // 공유 실패 시 아래 대체 경로로 진행
  }

  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'malang-shisen-result.png';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  try {
    await navigator.clipboard?.writeText(`${text}\n${SHARE_URL}`);
    return blob ? 'downloaded' : 'copied';
  } catch {
    return blob ? 'downloaded' : 'cancelled';
  }
}
