import { GROUP_COLOURS, KIND_LETTER, type StageClass, type TypeGroup } from './labels';
import type { AssetKind } from './schema';

// Marker icons are drawn on a canvas, so the map needs no sprite or font server.
const SCALE = 2;

function canvas(size: number) {
  const el = document.createElement('canvas');
  el.width = el.height = size * SCALE;
  const ctx = el.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  return { el, ctx };
}

export const RED = '#d4351c';

export function schemeIcon(group: TypeGroup, stage: StageClass): HTMLCanvasElement {
  const size = 30;
  const { el, ctx } = canvas(size);
  const c = size / 2;
  const colour = GROUP_COLOURS[group];
  const circle = (r: number) => {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
  };
  if (stage === 'risk') {
    circle(13.5);
    ctx.fillStyle = '#fff';
    ctx.fill();
    circle(12);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  circle(9);
  ctx.fillStyle = '#fff';
  ctx.fill();
  if (stage === 'early') {
    circle(6.5);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 3.5;
    ctx.stroke();
  } else {
    circle(7.5);
    ctx.fillStyle = colour;
    ctx.fill();
  }
  if (stage === 'complete') {
    ctx.beginPath();
    ctx.moveTo(c - 3.5, c + 0.2);
    ctx.lineTo(c - 1, c + 2.8);
    ctx.lineTo(c + 3.8, c - 2.6);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  return el;
}

const ASSET_STYLE: Record<AssetKind, { fill: string; text: string; border: string }> = {
  university: { fill: '#0b0c0c', text: '#ffffff', border: '#ffffff' },
  catapult: { fill: '#ffdd00', text: '#0b0c0c', border: '#0b0c0c' },
  research: { fill: '#ffffff', text: '#0b0c0c', border: '#0b0c0c' },
};

/** Connected Places Catapult: a wider green badge reading "CPC". */
export function cpcIcon(): HTMLCanvasElement {
  const w = 34;
  const h = 22;
  const el = document.createElement('canvas');
  el.width = w * SCALE;
  el.height = h * SCALE;
  const ctx = el.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, w - 1, h - 1, 5);
  ctx.fill();
  ctx.fillStyle = '#00703c';
  ctx.beginPath();
  ctx.roundRect(2.5, 2.5, w - 5, h - 5, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CPC', w / 2, h / 2 + 0.5);
  return el;
}

export function assetIcon(kind: AssetKind): HTMLCanvasElement {
  const size = 22;
  const { el, ctx } = canvas(size);
  const style = ASSET_STYLE[kind];
  ctx.fillStyle = style.border;
  ctx.beginPath();
  ctx.roundRect(1, 1, size - 2, size - 2, 4);
  ctx.fill();
  ctx.fillStyle = style.fill;
  ctx.beginPath();
  ctx.roundRect(2.5, 2.5, size - 5, size - 5, 2.5);
  ctx.fill();
  ctx.fillStyle = style.text;
  ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(KIND_LETTER[kind], size / 2, size / 2 + 0.5);
  return el;
}

export function toImageData(el: HTMLCanvasElement): ImageData {
  return el.getContext('2d')!.getImageData(0, 0, el.width, el.height);
}

export const ICON_PIXEL_RATIO = SCALE;
