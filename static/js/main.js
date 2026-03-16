document.addEventListener('DOMContentLoaded', function () {
  var navbar = document.getElementById('navbar');
  var navLinks = document.querySelectorAll('.nav-links a');
  var sections = document.querySelectorAll('.section, header');
  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = document.querySelector('.nav-links');

  function updateNavShadow() {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  }

  function updateActiveLink() {
    var scrollPos = window.scrollY + 100;
    var currentSection = '';

    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        currentSection = section.id;
      }
    });

    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + currentSection);
    });
  }

  window.addEventListener('scroll', function () {
    updateNavShadow();
    updateActiveLink();
  }, { passive: true });

  updateNavShadow();
  updateActiveLink();

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      navMenu.classList.toggle('open');
    });

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('open');
      });
    });

    document.addEventListener('click', function (e) {
      if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        navMenu.classList.remove('open');
      }
    });
  }

  document.querySelectorAll('.bibtex-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-target');
      var block = document.getElementById(targetId);
      if (block) {
        block.classList.toggle('open');
        btn.textContent = block.classList.contains('open') ? 'Hide BibTeX' : 'BibTeX';
      }
    });
  });

  // Generic interactive line chart renderer
  function createLineChart(cfg) {
    var canvas = document.getElementById(cfg.canvasId);
    var wrap = document.getElementById(cfg.wrapId);
    var tooltip = document.getElementById(cfg.tooltipId);
    if (!canvas || !wrap || !tooltip) return;

    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var pad = { t: 30, r: 20, b: 60, l: cfg.yLabel ? 80 : 60 };
    var pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;

    function xPx(v) { return pad.l + (v - cfg.xMin) / (cfg.xMax - cfg.xMin) * pw; }
    function yPx(v) { return pad.t + ph - (v - cfg.yMin) / (cfg.yMax - cfg.yMin) * ph; }

    function drawChart(hoverIdx) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fafbfc';
      ctx.fillRect(pad.l, pad.t, pw, ph);

      ctx.strokeStyle = '#e2e4e9'; ctx.lineWidth = 1;
      ctx.fillStyle = '#94a3b8'; ctx.font = '22px Inter, sans-serif'; ctx.textAlign = 'right';
      for (var i = 0; i < cfg.yTicks.length; i++) {
        var py = yPx(cfg.yTicks[i]);
        ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(W - pad.r, py); ctx.stroke();
        ctx.fillText(cfg.yTicks[i].toString(), pad.l - 10, py + 7);
      }

      ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8'; ctx.font = '22px Inter, sans-serif';
      for (var i = 0; i < cfg.xTicks.length; i++) {
        var px = xPx(cfg.xTicks[i]);
        ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, H - pad.b); ctx.strokeStyle = '#e2e4e9'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillText(cfg.xTickLabels[i], px, H - pad.b + 28);
      }

      ctx.fillStyle = '#64748b'; ctx.font = '24px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(cfg.xLabel, pad.l + pw / 2, H - 8);

      if (cfg.yLabel) {
        ctx.save(); ctx.fillStyle = '#64748b'; ctx.font = '24px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.translate(20, pad.t + ph / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText(cfg.yLabel, 0, 0); ctx.restore();
      }

      ctx.strokeStyle = '#e2e4e9'; ctx.lineWidth = 1;
      ctx.strokeRect(pad.l, pad.t, pw, ph);

      for (var s = 0; s < cfg.series.length; s++) {
        var ser = cfg.series[s];
        ctx.beginPath(); ctx.strokeStyle = ser.color; ctx.lineWidth = ser.dashed ? 2 : 3;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (ser.dashed) ctx.setLineDash([8, 5]); else ctx.setLineDash([]);
        for (var j = 0; j < ser.steps.length; j++) {
          var vy = Math.max(cfg.yMin, Math.min(cfg.yMax, ser.values[j]));
          if (j === 0) ctx.moveTo(xPx(ser.steps[j]), yPx(vy));
          else ctx.lineTo(xPx(ser.steps[j]), yPx(vy));
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (hoverIdx !== null) {
        var hStep = cfg.series[0].steps[hoverIdx];
        var hx = xPx(hStep);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(hx, pad.t); ctx.lineTo(hx, H - pad.b); ctx.stroke();
        ctx.setLineDash([]);

        for (var s = 0; s < cfg.series.length; s++) {
          if (hoverIdx < cfg.series[s].values.length) {
            var vy = Math.max(cfg.yMin, Math.min(cfg.yMax, cfg.series[s].values[hoverIdx]));
            ctx.beginPath(); ctx.arc(hx, yPx(vy), 6, 0, Math.PI * 2);
            ctx.fillStyle = cfg.series[s].color; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          }
        }
      }
    }

    drawChart(null);

    function getHoverIdx(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) / rect.width * W;
      var best = -1, bestDist = Infinity;
      var refSteps = cfg.series[0].steps;
      for (var i = 0; i < refSteps.length; i++) {
        var d = Math.abs(xPx(refSteps[i]) - mx);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      if (bestDist > 40) return null;
      return best;
    }

    wrap.addEventListener('mousemove', function (e) {
      var idx = getHoverIdx(e);
      if (idx === null) { tooltip.style.display = 'none'; drawChart(null); return; }
      drawChart(idx);
      var step = cfg.series[0].steps[idx];
      var html = '<div class="tt-step">Step ' + (step >= 1000 ? (step / 1000).toFixed(0) + 'k' : step) + '</div>';
      for (var s = 0; s < cfg.series.length; s++) {
        if (idx < cfg.series[s].values.length) {
          html += '<div style="color:' + cfg.series[s].color + ';font-weight:600;">' + cfg.series[s].label + ': ' + cfg.series[s].values[idx].toFixed(cfg.decimals) + '</div>';
        }
      }
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      var rect = wrap.getBoundingClientRect();
      var tx = e.clientX - rect.left + 14;
      var ty = e.clientY - rect.top - 10;
      if (tx + 150 > rect.width) tx = e.clientX - rect.left - 160;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    });

    wrap.addEventListener('mouseleave', function () {
      tooltip.style.display = 'none';
      drawChart(null);
    });
  }

  // C4 chart
  var c4Steps = [100,600,1100,1600,2100,2600,3100,3600,4100,4600,5100,5600,6100,6600,7100,7600,8100,8600,9100,9600,10000];
  createLineChart({
    canvasId: 'c4Canvas', wrapId: 'c4Chart', tooltipId: 'c4Tooltip',
    xMin: 0, xMax: 10500, yMin: 55, yMax: 75,
    xTicks: [2500, 5000, 7500, 10000], xTickLabels: ['2.5k', '5k', '7.5k', '10k'],
    yTicks: [55, 60, 65, 70, 75], xLabel: 'Steps', yLabel: 'Perplexity \u2193', decimals: 1,
    series: [
      { label: 'Sort', steps: c4Steps, values: [983.55,329.79,177.08,113.82,92.27,81.58,74.93,69.75,66.94,64.87,63.81,61.52,60.78,60.09,59.21,59.23,59.10,58.71,58.94,59.08,58.82], color: '#B2DFDB', dashed: false },
      { label: 'Set', steps: c4Steps, values: [795.68,289.49,155.18,106.89,88.75,79.94,74.38,69.16,66.93,64.94,63.60,61.80,61.30,60.77,59.97,60.04,59.98,59.56,59.81,59.92,59.85], color: '#AFCBFF', dashed: false },
      { label: 'Union', steps: c4Steps, values: [796.76,297.80,160.65,108.98,89.31,80.66,74.52,69.37,67.16,65.26,63.82,61.78,61.49,60.82,60.01,60.23,60.10,59.49,59.95,59.96,59.90], color: '#F5A9A9', dashed: false },
      { label: 'No pretrain', steps: c4Steps, values: [1068.74,457.48,309.21,203.48,146.80,109.55,93.08,83.31,77.67,73.72,71.09,67.72,66.42,64.90,63.65,63.24,62.79,62.13,62.22,62.21,62.03], color: '#A9A9A9', dashed: true }
    ]
  });

  // CodeParrot chart
  var cpSteps = [2000,4000,6000,8000,10000,12000,14000,16000,18000,20000];
  createLineChart({
    canvasId: 'cpCanvas', wrapId: 'cpChart', tooltipId: 'cpTooltip',
    xMin: 0, xMax: 21000, yMin: 5.0, yMax: 6.5,
    xTicks: [5000, 10000, 15000, 20000], xTickLabels: ['5k', '10k', '15k', '20k'],
    yTicks: [5.0, 5.5, 6.0, 6.5], xLabel: 'Steps', yLabel: 'Perplexity \u2193', decimals: 2,
    series: [
      { label: 'Set', steps: cpSteps, values: [33.09,10.12,7.38,6.32,5.86,5.72,5.47,5.30,5.21,5.15], color: '#AFCBFF', dashed: false },
      { label: 'Union', steps: cpSteps, values: [20.37,9.72,7.19,6.20,5.81,5.69,5.40,5.25,5.18,5.13], color: '#F5A9A9', dashed: false },
      { label: 'No pretrain', steps: cpSteps, values: [28.75,11.89,8.14,6.82,6.30,6.12,5.77,5.59,5.51,5.47], color: '#A9A9A9', dashed: true }
    ]
  });

  // DeepMind-Math chart
  var dmSteps = [0,6000,12000,18000,24000,30000,36000,42000,48000,50000];
  createLineChart({
    canvasId: 'dmCanvas', wrapId: 'dmChart', tooltipId: 'dmTooltip',
    xMin: 0, xMax: 52000, yMin: 25, yMax: 47.5,
    xTicks: [10000, 20000, 30000, 40000, 50000], xTickLabels: ['10k', '20k', '30k', '40k', '50k'],
    yTicks: [25, 30, 35, 40, 45], xLabel: 'Steps', yLabel: 'Accuracy (%) \u2191', decimals: 1,
    series: [
      { label: 'Union', steps: dmSteps, values: [1.1,24.9,29.7,32.9,33.9,37.4,39.3,40.7,41.9,42.7], color: '#F5A9A9', dashed: false },
      { label: 'Set', steps: dmSteps, values: [0.2,25.0,29.4,32.4,34.1,36.7,39.0,40.9,41.5,42.5], color: '#AFCBFF', dashed: false },
      { label: 'No pretrain', steps: dmSteps, values: [0.2,22.5,26.8,30.7,33.1,35.8,37.2,39.2,40.8,41.2], color: '#A9A9A9', dashed: true }
    ]
  });

  // ViT ImageNet training curve chart
  (function () {
    var canvas = document.getElementById('vitCanvas');
    var wrap = document.getElementById('vitChart');
    var tooltip = document.getElementById('vitTooltip');
    if (!canvas || !wrap || !tooltip) return;

    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var pad = { t: 30, r: 20, b: 60, l: 80 };
    var pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;

    var steps = [313,3443,6573,9703,12833,15963,19093,22223,25353,28483,31613,34743,37873,41003,44133,47263,50393,53523,56653,59783,62913,66043,69173,72303,75433,78563,81693,84823,87953,91083,93900];
    var baseAcc = [1.8,35.1,56.1,63.0,66.9,68.8,69.6,70.2,71.0,70.9,71.3,71.8,71.7,71.5,71.7,72.2,72.0,72.1,73.0,73.2,73.6,73.6,73.6,73.7,74.0,74.1,74.9,74.8,75.1,75.3,77.5];
    var procAcc = [0.4,16.4,37.6,52.5,59.9,64.8,67.8,70.0,71.6,71.9,73.0,73.1,73.4,72.9,74.3,74.6,74.9,75.3,75.9,76.3,77.0,77.3,77.0,77.4,78.0,77.9,77.8,78.5,78.3,78.3,79.2];

    var xMin = 0, xMax = 95000, yMin = 60, yMax = 80;

    function xPx(v) { return pad.l + (v - xMin) / (xMax - xMin) * pw; }
    function yPx(v) { return pad.t + ph - (v - yMin) / (yMax - yMin) * ph; }

    function drawChart(hoverIdx) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fafbfc';
      ctx.fillRect(pad.l, pad.t, pw, ph);

      // Grid
      ctx.strokeStyle = '#e2e4e9';
      ctx.lineWidth = 1;
      for (var y = yMin; y <= yMax; y += 5) {
        var py = yPx(y);
        ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(W - pad.r, py); ctx.stroke();
        ctx.fillStyle = '#94a3b8'; ctx.font = '22px Inter, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(y.toString(), pad.l - 10, py + 7);
      }

      // X ticks
      ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8'; ctx.font = '22px Inter, sans-serif';
      for (var x = 0; x <= 80000; x += 20000) {
        var px = xPx(x);
        ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, H - pad.b); ctx.strokeStyle = '#e2e4e9'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillText((x / 1000) + 'k', px, H - pad.b + 28);
      }

      // Axis labels
      ctx.fillStyle = '#64748b'; ctx.font = '24px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Training step', pad.l + pw / 2, H - 8);
      ctx.save(); ctx.translate(20, pad.t + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('ImageNet-1K Accuracy (%)', 0, 0); ctx.restore();

      // Border
      ctx.strokeStyle = '#e2e4e9'; ctx.lineWidth = 1;
      ctx.strokeRect(pad.l, pad.t, pw, ph);

      function drawLine(data, color, width) {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var i = 0; i < steps.length; i++) {
          var a = Math.max(yMin, data[i]);
          if (i === 0) ctx.moveTo(xPx(steps[i]), yPx(a));
          else ctx.lineTo(xPx(steps[i]), yPx(a));
        }
        ctx.stroke();
      }

      drawLine(baseAcc, '#A5A5A5', 4);
      drawLine(procAcc, '#d62728', 4.5);

      // Final dots
      ctx.beginPath(); ctx.arc(xPx(steps[steps.length-1]), yPx(baseAcc[baseAcc.length-1]), 6, 0, Math.PI*2);
      ctx.fillStyle = '#A5A5A5'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(xPx(steps[steps.length-1]), yPx(procAcc[procAcc.length-1]), 6, 0, Math.PI*2);
      ctx.fillStyle = '#d62728'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

      // Hover crosshair and dots
      if (hoverIdx !== null && hoverIdx >= 0 && hoverIdx < steps.length) {
        var hx = xPx(steps[hoverIdx]);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(hx, pad.t); ctx.lineTo(hx, H - pad.b); ctx.stroke();
        ctx.setLineDash([]);

        var ba = Math.max(yMin, baseAcc[hoverIdx]);
        var pa = Math.max(yMin, procAcc[hoverIdx]);
        ctx.beginPath(); ctx.arc(hx, yPx(ba), 7, 0, Math.PI*2);
        ctx.fillStyle = '#A5A5A5'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, yPx(pa), 7, 0, Math.PI*2);
        ctx.fillStyle = '#d62728'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      }
    }

    drawChart(null);

    function getHoverIdx(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) / rect.width * W;
      var best = -1, bestDist = Infinity;
      for (var i = 0; i < steps.length; i++) {
        var d = Math.abs(xPx(steps[i]) - mx);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      if (bestDist > 30) return null;
      return best;
    }

    wrap.addEventListener('mousemove', function (e) {
      var idx = getHoverIdx(e);
      if (idx === null) { tooltip.style.display = 'none'; drawChart(null); return; }
      drawChart(idx);
      var step = steps[idx];
      var bv = baseAcc[idx].toFixed(1);
      var pv = procAcc[idx].toFixed(1);
      tooltip.innerHTML = '<div class="tt-step">Step ' + (step >= 1000 ? (step/1000).toFixed(1) + 'k' : step) + '</div>'
        + '<div class="tt-proc">Procedural: ' + pv + '%</div>'
        + '<div class="tt-base">Default: ' + bv + '%</div>';
      tooltip.style.display = 'block';
      var rect = wrap.getBoundingClientRect();
      var tx = e.clientX - rect.left + 14;
      var ty = e.clientY - rect.top - 10;
      if (tx + 140 > rect.width) tx = e.clientX - rect.left - 150;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    });

    wrap.addEventListener('mouseleave', function () {
      tooltip.style.display = 'none';
      drawChart(null);
    });
  })();

  var revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }
});
