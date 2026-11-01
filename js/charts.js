// =============================================
// FleetPro – Canvas Chart Renderer (No deps)
// =============================================

const chartRegistry = new Map();

window.addEventListener('fleetpro-theme-change', () => {
  chartRegistry.forEach(redraw => redraw());
});

function drawBarChart(canvasId, labels, datasets, options = {}) {
  chartRegistry.set(canvasId, () => drawBarChart(canvasId, labels, datasets, options));
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const theme = getComputedStyle(document.documentElement);
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width || 320;
  const H = options.height || 180;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const PAD = { top: 20, right: 16, bottom: 36, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allVals = datasets.flatMap(d => d.data);
  const maxVal = Math.max(...allVals, 1);
  const minVal = 0;
  const range = maxVal - minVal;

  // Grid lines
  ctx.strokeStyle = theme.getPropertyValue('--chart-grid-color').trim();
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = PAD.top + chartH - (i / gridLines) * chartH;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();

    // Y-axis labels
    const val = (i / gridLines) * maxVal;
    ctx.fillStyle = theme.getPropertyValue('--chart-label-color').trim();
    ctx.font = `${10 * dpr / dpr}px Inter`;
    ctx.textAlign = 'right';
    ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0), PAD.left - 6, y + 4);
  }

  const barGroupW = chartW / labels.length;
  const barPad = 4;
  const barW = (barGroupW - barPad * 2) / datasets.length - 4;

  datasets.forEach((dataset, di) => {
    dataset.data.forEach((val, i) => {
      const barH = ((val - minVal) / range) * chartH;
      const x = PAD.left + i * barGroupW + barPad + di * (barW + 4);
      const y = PAD.top + chartH - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, dataset.colorTop || 'rgba(59,130,246,0.9)');
      grad.addColorStop(1, dataset.colorBot || 'rgba(59,130,246,0.3)');
      ctx.fillStyle = grad;

      const radius = Math.min(6, barW / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    });
  });

  // X-axis labels
  ctx.fillStyle = theme.getPropertyValue('--chart-label-color').trim();
  ctx.font = `${10}px Inter`;
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    const x = PAD.left + i * barGroupW + barGroupW / 2;
    ctx.fillText(lbl, x, H - 8);
  });

  // Legend
  if (datasets.length > 1 && options.legend) {
    let lx = PAD.left;
    datasets.forEach(ds => {
      ctx.fillStyle = ds.colorTop || '#3b82f6';
      ctx.fillRect(lx, 6, 12, 8);
      ctx.fillStyle = theme.getPropertyValue('--chart-label-color').trim();
      ctx.textAlign = 'left';
      ctx.fillText(ds.label || '', lx + 16, 14);
      lx += ctx.measureText(ds.label || '').width + 36;
    });
  }
}

function drawLineChart(canvasId, labels, datasets, options = {}) {
  chartRegistry.set(canvasId, () => drawLineChart(canvasId, labels, datasets, options));
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const theme = getComputedStyle(document.documentElement);
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width || 320;
  const H = options.height || 180;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const PAD = { top: 20, right: 16, bottom: 36, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allVals = datasets.flatMap(d => d.data);
  const maxVal = Math.max(...allVals, 1);

  // Grid
  ctx.strokeStyle = theme.getPropertyValue('--chart-grid-color').trim();
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + chartH - (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
    ctx.fillStyle = theme.getPropertyValue('--chart-label-color').trim();
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    const v = (i / 4) * maxVal;
    ctx.fillText(v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0), PAD.left - 6, y + 4);
  }

  const stepX = chartW / (labels.length - 1 || 1);

  datasets.forEach(dataset => {
    const pts = dataset.data.map((v, i) => ({
      x: PAD.left + i * stepX,
      y: PAD.top + chartH - (v / maxVal) * chartH
    }));

    // Fill area
    ctx.beginPath();
    ctx.moveTo(pts[0].x, PAD.top + chartH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, PAD.top + chartH);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
    areaGrad.addColorStop(0, dataset.fill || 'rgba(59,130,246,0.2)');
    areaGrad.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Line
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = dataset.color || '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dataset.color || '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = theme.getPropertyValue('--chart-hole-color').trim();
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  // X labels
  ctx.fillStyle = theme.getPropertyValue('--chart-label-color').trim();
  ctx.font = '10px Inter';
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    ctx.fillText(lbl, PAD.left + i * stepX, H - 8);
  });
}

function drawDonutChart(canvasId, data, colors, options = {}) {
  chartRegistry.set(canvasId, () => drawDonutChart(canvasId, data, colors, options));
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const theme = getComputedStyle(document.documentElement);
  const dpr = window.devicePixelRatio || 1;
  const size = options.size || 180;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 10;
  const innerR = outerR * 0.62;
  const total = data.reduce((s, d) => s + d.value, 0);

  let startAngle = -Math.PI / 2;
  data.forEach((item, i) => {
    const slice = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    startAngle += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = theme.getPropertyValue('--chart-hole-color').trim();
  ctx.fill();

  // Center text
  if (options.centerText) {
    ctx.fillStyle = theme.getPropertyValue('--text-primary').trim();
    ctx.font = `bold ${14}px Outfit`;
    ctx.textAlign = 'center';
    ctx.fillText(options.centerText, cx, cy - 4);
    ctx.fillStyle = theme.getPropertyValue('--chart-label-color').trim();
    ctx.font = `${10}px Inter`;
    ctx.fillText(options.centerSub || '', cx, cy + 14);
  }
}
