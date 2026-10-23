/* GRINCHIN v3 · K2 · 3D. Один WebGL-контекст на страницу → window.GV.gl (движок) и window.GV.g (знак G в hero).
   Сцены движка: 'g' — новая рубленая G со стрелкой (grinchin_new.svg, путь M203.1,342.8…, экструзия),
   'sign' — дорожный знак ONE WAY or ANOTHER на столбе, 'roll' — рулон фирменной ленты на асфальте.
   Сцены sign/roll ведёт scenes.js; они строятся, только если включены осью (data-brand="sign", data-roll="on")
   и их блок подошёл к экрану.

   Техника (уроки v1 → v2, R2 §2.1):
   · three.js 0.186.1 импортируется в Web Worker; рендер в OffscreenCanvas. В воркере ОДИН контекст WebGL,
     а показ — через «bitmaprenderer»-холсты в каждой сцене: кадр рендерится, transferToImageBitmap() →
     transferFromImageBitmap() прямо в холст сцены. Холсты лежат в разметке и прокручиваются вместе
     со страницей (без «плавания» относительно контента), контекст при этом один.
   · Импорт three и компиляция шейдеров (compileAsync) идут во время прелоадера; G не ждут — до готовности
     в #g3d стоит SVG того же контура, подмена — перекрёстным затуханием.
   · Нет WebGL в OffscreenCanvas (Safari < 17) → тот же движок на главном потоке в requestIdleCallback,
     кадр копируется в холсты сцен через drawImage. Программный WebGL (SwiftShader/llvmpipe) или нет WebGL
     вообще, reduced-motion, слабое устройство → SVG-знак и статичные кадры сцен.
   · Рендер — только при изменении позы и только если сцена видна (IntersectionObserver). В покое 0 кадров.
     Один общий цикл (gsap.ticker, без него — rAF), сглаживание по dt: x += (t−x)·(1−e^(−λ·dt)).
   · DPR ≤ 2, буфер — по реальному прямоугольнику сцены.
   · Вид «как у v1» без тяжёлого MeshPhysical+PMREM: matcap запечён из материала v1 (img/3d/_bake.html →
     m-*.jpg), в рантайме — дешёвый MeshMatcapMaterial. Ось data-g: lime (гладкий лак), tape (скотч:
     сатин + нормаль-карта полос и заломов + тон полос), black (чёрный глянец, лаймовый торец).
   Отладка: ?nogl — без WebGL; ?glmain — WebGL на главном потоке; ?soft — разрешить программный WebGL. */
(() => {
  'use strict';
  const GV = (window.GV = window.GV || {});
  if (GV.g && GV.g.v === 3) return;
  const D = document, R = D.documentElement, W = window;

  /* ═════════════════════ ДАННЫЕ ═════════════════════ */
  // новая G со стрелкой — путь №5 из v3/logo/grinchin_new.svg (viewBox 0 0 379 393), без перерисовки
  const P_G = 'M203.1,342.8c0,0-42.6-21.1-63.8-31.6c-5.1,4-10,7.7-15.6,12.1c-22.8-36.9-44.3-74.1-66.3-111.5c3.9-9.2,7.8-18.4,11.7-27.6c6.7-15.8,13.4-31.6,20.3-47.3c1.1-2.6,2.7-5.1,4.6-7.1c18.1-18.6,36.3-37.1,54.7-55.5c1.9-1.9,4.5-3.6,7.1-4.4c45-14.3,90-28.5,135-42.7c1.7-0.5,3.5-0.9,5.4-1.4c0,7-2.5,88.1-2.5,88.1l-64.5,23.2l13.5-22.3l-97.1,33.5l-34.7,47.3l65.1,77.6l62.8-53.9l-44.7-16.5l107.8-42.9l-2.3,105.5l-25.6-25.5L203.1,342.8z';
  const G_VB = '40 6 290 352';            // рамка контура G для SVG-фолбэка (bbox ≈57..306 × 14..343 + поле)
  // новый логотип GRiNCHiN — logo_p1.svg (стр. 1 Grinchin2.pdf), пути; рамка — LOGO_BOX
  const LOGO = ['M1770 527.7C1766.3 538.7 1763.2 548.8 1759.5 558.6C1746.4 593.5 1725 622.4 1696.4 646.1C1665.8 671.4 1630.6 687.3 1592.6 697.6C1559.6 706.5 1525.8 710.1 1491.7 710.5C1440.4 711 1389.3 707.4 1338.3 702C1294.1 697.4 1250 692.4 1205.5 691.5C1155.2 690.4 1105 696.1 1056.2 708.4C1028.9 715.4 1002.2 724.3 977.3 738.1C971.5 741.3 965.9 744.9 959.8 748.5C956.1 745.9 952.1 743.1 948 740.4C928 727.5 906 719.3 883.2 712.8C840.7 701 797 694.1 752.9 692.2C715.4 690.4 678.1 692.7 640.8 696.1C601.4 699.8 562 704.2 522.5 707.3C478.7 710.7 434.8 712.3 390.9 708.7C346.1 705 303.4 694 263.6 672.8C225 652.3 193.9 623.7 172.6 585.2C163.6 569.1 156.9 551.8 152.4 533.9C152 532 151.3 530.2 150.5 528.5C146.2 541.9 143.8 569.9 143.8 569.9C143.8 569.9 140.2 551.6 139.1 542.4C134.9 506.5 137.3 470.7 143.8 435.3C151.9 391.2 181.5 304.3 182.3 302.3C201.7 353 220.8 402.8 239.8 452.7C239.6 452.8 205.6 414.6 188.1 394.5C186.7 398.6 185.6 401.6 184.8 404.6C172.1 452.5 176.6 498.7 199 543C214.5 573.5 236.9 597.4 265.7 615.8C294.4 634.1 325.7 645 358.9 651.5C387.2 656.8 416.1 659.5 444.9 659.6C481 659.8 517 659.2 553.1 658.4C586 657.7 619 655.7 651.9 655C686.6 654.3 721.3 655.3 755.8 659.8C801.4 665.8 846.1 675.9 888.8 693.9C908.1 701.9 926.2 712.3 941.7 726.6C948.2 732.7 954 739.7 960.4 746.6C961.9 744.5 963.7 742.1 965.5 739.7C976.4 725.9 990.2 715.7 1005.2 706.9C1030.6 692.1 1058.2 682.7 1086.5 675.2C1114 667.7 1142.1 662.2 1170.4 658.9C1202.7 655.5 1235.2 654.1 1267.6 654.9C1300.8 655.6 1333.9 657.1 1367 658.3C1412.1 659.9 1457.2 661.3 1502.2 658.5C1537.8 656.3 1572.9 651.3 1606.6 639.1C1638.4 627.6 1666.9 610.8 1690.3 586.2C1718.3 556.7 1734.5 521.3 1740.2 481.1C1744.1 454.1 1741.3 427.6 1734.1 401.5C1733.7 399.7 1733 397.9 1732.1 395.1C1713.8 414.1 1697.6 433.8 1681.2 453.5L1680.1 452.9L1737.6 302C1738.6 304.6 1739.3 306.2 1739.9 308C1754.3 348.4 1767.4 389.2 1775.4 431.4C1780.7 459.8 1783.8 488.5 1782.8 517.4C1782.3 533.8 1781 550.1 1776.8 566.1C1776.5 567.4 1776 568.7 1775.4 569.9C1774.4 555.9 1773.5 542.1 1770 527.7ZM1770 527.7',
    'M768.2 367.1C768.2 367.1 847.7 452.2 887 495.6L879.3 495.6C883.3 504.5 910.9 538 922.7 548.3C922.6 531.2 921.2 515.1 920.3 498.9C919.3 482.4 918 465.9 916.7 449.4C915.5 433.1 914.1 416.9 912.7 400.2L968.2 422.1C969.9 505.9 973.6 589.4 978.6 674L897.9 611.8L902.5 606.9C873.2 567.1 813.2 484 813.2 484L819.2 638.6L762.9 604.2ZM768.2 367.1',
    'M1618.6 371.1L1660.4 391.2L1657.2 589.3L1520.3 463.8C1520.3 463.8 1522.8 534.2 1523.9 569.4C1524 572.3 1525.4 575.2 1526.5 578C1527.4 579.9 1528.5 581.6 1529.6 583.2L1463.8 617.7C1465 604.5 1466.4 592 1467.3 579.5C1472.3 508.2 1474.7 436.9 1474.3 365.5C1474.3 359.9 1474.3 354.3 1474.3 348.1C1517.5 381.3 1548.3 416.9 1591.3 451.6L1582.2 451.6C1593.4 469.1 1603.7 484.1 1618.7 498.5ZM1618.6 371.1',
    'M722.5 626.1L600.8 604.4L604.6 596.8L542.8 537.9C542.8 537.9 544.1 570.5 545.7 586.8L486.5 625.7C490.7 585.9 491.8 546.7 492.8 507.6C493.7 468.5 490.4 389.5 490.4 389.5C490.4 389.5 544.8 396.1 570.1 398.5C591.5 400.5 634.5 402.3 634.5 402.3L667.5 439.3L656.9 489.9L592.4 521.4ZM543 498.1C565.8 488.8 587.6 478.5 609.3 467.8C607.5 459.5 604.7 451.4 600.8 443.9L543 437.4ZM543 498.1',
    'M381.5 616.2L323.8 587.6L309.8 598.5C289.2 565.2 269.8 531.5 249.9 497.8C253.4 489.5 256.9 481.2 260.5 472.9C266.6 458.6 272.6 444.3 278.7 430.1C279.8 427.8 281.2 425.6 283 423.7C299.4 406.9 315.9 390.2 332.5 373.5C334.2 371.7 336.4 370.3 338.8 369.5C379.5 356.5 420.2 343.7 460.9 330.9C462.4 330.4 464 330.1 465.7 329.6C465.7 335.9 463.5 409.3 463.5 409.3L405.2 430.2L417.5 410L329.6 440.4L298.3 483.1L357.1 553.2L413.9 504.5L373.5 489.5L470.9 450.8L468.9 546.2L445.8 523.2ZM381.5 616.2',
    'M1136.5 448.6C1136.5 448.6 1120.4 438.2 1109.3 430.8C1107.1 429.4 1105.5 430.3 1103.7 431.3C1085.2 441.2 1049 463 1044.9 465.8C1043.8 466.5 1042.9 467.5 1042.3 468.8C1041.7 470 1041.5 471.4 1041.8 472.7C1042.4 491.9 1041.4 552.3 1041.4 552.3L1069.9 593.9L1135.6 567.8L1115.7 548.8L1177.1 526.9C1177.1 526.9 1166.3 586.5 1160.9 615C1124.1 625.8 1086.3 633.1 1051 649.6C1044.6 641.9 1038.1 634.5 1031.9 626.7C1019.7 611.2 1007.5 595.5 995.5 579.8C994.3 578 993.7 575.9 993.7 573.7C993.1 563.1 992.9 552.6 992.6 542C992 523.9 991.4 505.8 991 487.7C990.9 485 991.3 482.3 992.1 479.7C998.4 460.4 1011.2 421.9 1011.2 421.9C1011.2 421.9 1121.1 362.7 1122.3 362.4C1140.6 380.5 1175.3 419.3 1175.3 419.3L1168.8 447.1L1128.7 461.5ZM1136.5 448.6',
    'M1312 519.1C1289.5 523.5 1267.3 529.2 1245.5 536L1245.5 600.1C1245.5 600.1 1186.9 620.1 1187 619.7C1190.7 608.3 1191 596.5 1191.9 584.8C1194.8 542.6 1196.1 500.2 1195 457.9C1194.6 445.2 1193.1 416.4 1193.1 416.4L1252.1 406.3C1252.1 406.3 1248.1 423.2 1247.8 430.9C1247.1 449 1246.4 467.1 1245.6 485.1C1245.5 486.8 1245.6 488.4 1245.6 490.7L1311.3 472.6C1311.3 470.6 1311.3 468.7 1311.3 466.9C1310.6 447.1 1309.9 427.4 1309 407.6C1308.6 404 1307.9 400.5 1306.9 397.1C1306.5 395.1 1305.8 393.2 1304.9 390.2L1371.8 412C1364.7 423 1365.3 434.9 1365 446.6C1364.5 469.5 1363.6 492.4 1364.3 515.2C1365.1 541.8 1367.3 568.4 1369.1 594.9C1369.4 599.1 1370.7 603.2 1371.6 607.8C1351.4 607.4 1312 616.8 1312 616.8ZM1312 519.1',
    'M734.7 398.9C734.7 398.9 737.3 543.5 742.1 616.4C734.9 610.7 693.4 577.2 693.4 577.2L689.5 415.1ZM734.7 398.9',
    'M743 392.3L697.4 336.4C694.2 358.8 691.2 373.4 688 395.3L713 386.4ZM743 392.3',
    'M1396.1 419.5C1410.7 414.3 1424.3 409.5 1440.6 403.6L1440.6 585.4L1391.2 612.5C1392.8 550.4 1394.4 481.3 1396.1 419.5ZM1396.1 419.5',
    'M1451.1 398.1C1436 379.5 1421 361.1 1405.6 342.2C1402.4 364.6 1399.3 379.2 1396.2 401L1421.2 392.1ZM1451.1 398.1'];
  const LOGO_BOX = [134.9, 302, 1783.8, 748.5];
  const URL3 = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.1/three.module.min.js';
  const URL3B = 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js';   // запасной CDN: сбой сети не должен гасить 3D
  const TAPE = { lime: '{{asset:img/tape/lime-strip.webp}}', black: '{{asset:img/tape/black-strip.webp}}' };   // те же полосы, что кладёт roll.js
  const MC = { lime: '{{asset:img/3d/m-lime.jpg}}', tape: '{{asset:img/3d/m-tape.jpg}}', side: '{{asset:img/3d/m-side.jpg}}', black: '{{asset:img/3d/m-black.jpg}}' };

  const Q = new URLSearchParams(location.search);
  const SHOT = R.dataset.shot === '1' || Q.get('shot') === '1';
  const mq = (s) => (W.matchMedia ? W.matchMedia(s) : { matches: false, addEventListener() {} });
  const RMQ = mq('(prefers-reduced-motion: reduce)');
  const FINEQ = mq('(hover: hover) and (pointer: fine)');
  const NARROWQ = mq('(max-width: 767px)');
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const damp = (x, t, l, dt) => x + (t - x) * (1 - Math.exp(-l * dt));
  const eo3 = (t) => 1 - Math.pow(1 - t, 3);
  const now = () => performance.now();
  const idle = (f, to) => (W.requestIdleCallback ? W.requestIdleCallback(f, { timeout: to || 1500 }) : setTimeout(f, 60));
  const abs = (u) => { try { return new URL(u, location.href).href; } catch (e) { return u; } };
  const matOf = () => { const m = R.dataset.g; return m === 'lime' || m === 'black' || m === 'tape' ? m : 'tape'; };

  /* ═════════════════════ АРТ: процедурные текстуры (воркер и главный поток) ═════════════════════
     Самодостаточная функция: в воркер уходит её исходник. Шрифтов нет — буквы знака нарисованы штрихами
     по скелету (как трафарет дорожного знака), граффити — тем же способом «от руки». */
  function ART(cv2d, LOGO, BOX) {
    const TAU = Math.PI * 2, LIME = '#8ED308';
    const rng = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
    let LP = null;
    const logo = (g, x, y, h, col) => {
      if (!LP) LP = LOGO.map((d) => new Path2D(d));
      const s = h / (BOX[3] - BOX[1]);
      g.save(); g.translate(x, y); g.scale(s, s); g.translate(-BOX[0], -BOX[1]); g.fillStyle = col; LP.forEach((p) => g.fill(p)); g.restore();
      return (BOX[2] - BOX[0]) * s;
    };
    const LOGO_AR = (BOX[2] - BOX[0]) / (BOX[3] - BOX[1]);
    // дорожный шрифт: скелет в рамке [0,w]×[0,1], штрих sw; верх и низ срезаны рамкой — плоские, как у знаков
    const SL = {
      O: { w: 0.6, d(g, w, s) { const h = s / 2, r = w / 2 - h; g.moveTo(h, h + r); g.arc(w / 2, h + r, r, Math.PI, 0); g.lineTo(w - h, 1 - h - r); g.arc(w / 2, 1 - h - r, r, 0, Math.PI); g.closePath(); } },
      N: { w: 0.56, d(g, w, s) { const h = s / 2; g.moveTo(h, 1.3); g.lineTo(h, -0.3); g.moveTo(w - h, 1.3); g.lineTo(w - h, -0.3); g.moveTo(h * 0.6, -0.05); g.lineTo(w - h * 0.6, 1.05); } },
      E: { w: 0.48, d(g, w, s) { const h = s / 2; g.moveTo(h, -0.3); g.lineTo(h, 1.3); g.moveTo(0, h); g.lineTo(w, h); g.moveTo(0, 1 - h); g.lineTo(w, 1 - h); g.moveTo(0, 0.5); g.lineTo(w * 0.84, 0.5); } },
      W: { w: 0.9, d(g, w) { g.moveTo(0.03, -0.3); g.lineTo(w * 0.265, 1.2); g.lineTo(w * 0.5, 0.2); g.lineTo(w * 0.735, 1.2); g.lineTo(w - 0.03, -0.3); } },
      A: { w: 0.64, d(g, w) { g.moveTo(-0.08, 1.35); g.lineTo(w / 2, -0.3); g.lineTo(w + 0.08, 1.35); g.moveTo(w * 0.2, 0.7); g.lineTo(w * 0.8, 0.7); } },
      Y: { w: 0.64, d(g, w) { g.moveTo(-0.02, -0.3); g.lineTo(w / 2, 0.56); g.lineTo(w + 0.02, -0.3); g.moveTo(w / 2, 0.5); g.lineTo(w / 2, 1.3); } },
    };
    function signWord(g, word, cx, y, cap, sw, tr) {
      let wsum = 0; for (const ch of word) wsum += SL[ch].w + tr; wsum -= tr;
      let x = cx - (wsum * cap) / 2;
      for (const ch of word) {
        const L = SL[ch];
        g.save(); g.translate(x, y); g.scale(cap, cap);
        g.beginPath(); g.rect(0, 0, L.w, 1); g.clip();
        g.lineWidth = sw; g.lineJoin = 'miter'; g.miterLimit = 12; g.lineCap = 'butt';
        g.beginPath(); L.d(g, L.w, sw); g.stroke(); g.restore();
        x += (L.w + tr) * cap;
      }
    }
    // граффити «от руки»: скелеты, круглые концы
    const GL = {
      O: { w: 0.56, d(g, w) { g.ellipse(w / 2, 0.5, w / 2, 0.5, 0, 0, TAU); } },
      R: { w: 0.5, d(g, w) { g.moveTo(0, 1); g.lineTo(0, 0); g.lineTo(w * 0.5, 0); g.quadraticCurveTo(w, 0, w, 0.26); g.quadraticCurveTo(w, 0.52, w * 0.5, 0.52); g.lineTo(0, 0.52); g.moveTo(w * 0.32, 0.52); g.lineTo(w, 1); } },
      A: { w: 0.56, d(g, w) { g.moveTo(0, 1); g.lineTo(w / 2, 0); g.lineTo(w, 1); g.moveTo(w * 0.2, 0.64); g.lineTo(w * 0.8, 0.64); } },
      N: { w: 0.52, d(g, w) { g.moveTo(0, 1); g.lineTo(0, 0); g.lineTo(w, 1); g.lineTo(w, 0); } },
      T: { w: 0.5, d(g, w) { g.moveTo(0, 0); g.lineTo(w, 0); g.moveTo(w / 2, 0); g.lineTo(w / 2, 1); } },
      H: { w: 0.5, d(g, w) { g.moveTo(0, 0); g.lineTo(0, 1); g.moveTo(w, 0); g.lineTo(w, 1); g.moveTo(0, 0.5); g.lineTo(w, 0.5); } },
      E: { w: 0.44, d(g, w) { g.moveTo(w, 0); g.lineTo(0, 0); g.lineTo(0, 1); g.lineTo(w, 1); g.moveTo(0, 0.5); g.lineTo(w * 0.8, 0.5); } },
    };
    function sprayWord(g, word, x, y, cap, sw, tr, r) {
      const pos = []; let cx = x;
      for (const ch of word) {
        const L = GL[ch], dy = (r() - 0.5) * 0.12 * cap, rot = (r() - 0.5) * 0.12, k = 0.94 + r() * 0.14;
        pos.push([L, cx, y + dy, rot, k]); cx += (L.w + tr) * cap * k;
      }
      const pass = (col, lw, ox, oy, blur) => {
        g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
        if (blur) { g.shadowColor = col; g.shadowBlur = blur; }
        for (const [L, lx, ly, rot, k] of pos) {
          g.save(); g.translate(lx + ox, ly + oy); g.rotate(rot); g.transform(1, 0, -0.18, 1, 0, 0); g.scale(cap * k, cap * k);
          g.lineWidth = lw; g.beginPath(); L.d(g, L.w); g.stroke(); g.restore();
        }
        g.restore();
      };
      pass('#1d3300', sw, cap * 0.05, cap * 0.06, 0);           // тень-объём баллона
      pass(LIME, sw, 0, 0, cap * 0.12);                          // напыление с ореолом
      pass('#c9f56b', sw * 0.32, -cap * 0.03, -cap * 0.035, 0);  // блик
      g.save(); g.fillStyle = LIME; g.strokeStyle = LIME; g.lineCap = 'round';   // подтёки
      for (const [L, lx, ly, , k] of pos) {
        const n = 1 + ((r() * 2.2) | 0);
        for (let j = 0; j < n; j++) {
          const px = lx + r() * L.w * cap * k - 0.18 * cap, py = ly + cap * (0.92 + r() * 0.06), len = cap * (0.15 + r() * 0.55), lw = cap * (0.035 + r() * 0.03);
          g.lineWidth = lw; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + len); g.stroke();
          g.beginPath(); g.arc(px, py + len, lw * 0.85, 0, TAU); g.fill();
        }
      }
      g.restore();
      return cx - x;
    }
    const W_ = 768, H_ = 972;
    const rrect = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    // лицевая сторона знака: световозвращающая плёнка, рамка, ONE WAY, стрелка (dir −1 ←, +1 →)
    function signFace(dir) {
      const c = cv2d(W_, H_), g = c.getContext('2d'), r = rng(31 + dir);
      g.fillStyle = '#f2f2ec'; g.fillRect(0, 0, W_, H_);
      for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '120,120,110'},${0.04 + r() * 0.06})`; g.fillRect(r() * W_, r() * H_, 2 + r() * 3, 2 + r() * 3); }
      const gr = g.createLinearGradient(0, 0, W_, H_); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(0.55, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.07)');
      g.fillStyle = gr; g.fillRect(0, 0, W_, H_);
      g.strokeStyle = '#0c0c0c'; g.lineWidth = 20; g.beginPath(); rrect(g, 30, 30, W_ - 60, H_ - 60, 40); g.stroke();
      signWord(g, 'ONE', W_ / 2, 112, 196, 0.17, 0.11);
      signWord(g, 'WAY', W_ / 2, 362, 196, 0.17, 0.08);
      g.save(); g.translate(W_ / 2, 778); g.scale(dir > 0 ? 1 : -1, 1); g.fillStyle = '#0c0c0c';
      g.beginPath(); g.moveTo(300, 0); g.lineTo(150, -104); g.lineTo(150, -40); g.lineTo(-300, -40); g.lineTo(-300, 40); g.lineTo(150, 40); g.lineTo(150, 104); g.closePath(); g.fill(); g.restore();
      g.globalCompositeOperation = 'multiply';                  // грязь у краёв — знак стоит на улице
      for (let k = 0; k < 40; k++) { const x = r() * W_, y = r() < 0.5 ? r() * 90 : H_ - r() * 90; g.fillStyle = `rgba(150,140,120,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(x, y, 10 + r() * 60, 4 + r() * 16, r() * 3, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      return c;
    }
    // граффити OR ANOTHER: альфа = покрытие × «фронт баллона» (слева направо, рваный край) → проявление через alphaTest
    function graffiti() {
      const c = cv2d(W_, H_), g = c.getContext('2d'), r = rng(77);
      g.save(); g.rotate(-0.1);
      sprayWord(g, 'OR', 70, 548, 74, 0.2, 0.16, r);
      sprayWord(g, 'ANOTHER', 92, 616, 112, 0.19, 0.1, r);
      g.restore();
      const m = cv2d(W_, H_), mg = m.getContext('2d');
      const lg = mg.createLinearGradient(40, 0, W_ - 40, 0); lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(1, 'rgba(0,0,0,.14)');
      mg.fillStyle = lg; mg.fillRect(0, 0, W_, H_);
      mg.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 160; k++) { mg.fillStyle = `rgba(0,0,0,${r() * 0.08})`; mg.beginPath(); mg.arc(r() * W_, 500 + r() * 300, 6 + r() * 26, 0, TAU); mg.fill(); }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-over';
      return c;
    }
    // оборот: оцинковка, болты, стикер GRiNCHiN, кусок фирменной ленты
    function signBack() {
      const c = cv2d(W_, H_), g = c.getContext('2d'), r = rng(5);
      const gr = g.createLinearGradient(0, 0, W_, H_); gr.addColorStop(0, '#c2c5c7'); gr.addColorStop(0.45, '#8e9396'); gr.addColorStop(1, '#adb1b4');
      g.fillStyle = gr; g.fillRect(0, 0, W_, H_);
      for (let y = 0; y < H_; y += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,40,40'},${r() * 0.05})`; g.fillRect(0, y, W_, 1); }
      for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.12})`; g.lineWidth = 1; const x = r() * W_, y = r() * H_; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 160, y + (r() - 0.5) * 30); g.stroke(); }
      for (const y of [150, H_ - 150]) { g.fillStyle = '#5d6164'; g.beginPath(); g.arc(W_ / 2, y, 16, 0, TAU); g.fill(); g.fillStyle = '#c9cccd'; g.beginPath(); g.arc(W_ / 2 - 3, y - 3, 7, 0, TAU); g.fill(); }
      // стикер — слева от столба (столб и хомуты по центру закрыли бы логотип), лента — справа наискось
      g.save(); g.translate(W_ * 0.245, H_ * 0.36); g.rotate(-0.1);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-146, -48, 300, 104);
      g.fillStyle = '#f4f3f3'; g.fillRect(-150, -54, 300, 104);
      g.fillStyle = '#0b0b0b'; g.fillRect(-141, -45, 282, 86);
      const lh = 66, lw = lh * LOGO_AR; logo(g, -lw / 2, -lh / 2 - 2, lh, LIME);
      g.restore();
      g.save(); g.translate(W_ * 0.74, H_ * 0.66); g.rotate(-1.05);    // лента
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-206, -34, 420, 78);
      g.fillStyle = LIME; g.fillRect(-210, -40, 420, 78);
      g.fillStyle = 'rgba(30,60,0,.35)'; g.fillRect(-210, -40, 420, 3); g.fillRect(-210, 35, 420, 3);
      const lh2 = 46; let x = -196; while (x < 190) x += logo(g, x, -lh2 / 2 - 1, lh2, 'rgba(11,11,11,.88)') + 36;
      for (let k = 0; k < 14; k++) { g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.35)' : 'rgba(0,40,0,.3)'; g.lineWidth = 1 + r(); const px = -200 + r() * 400; g.beginPath(); g.moveTo(px, -40); g.lineTo(px + (r() - 0.5) * 30, 38); g.stroke(); }
      g.restore();
      return c;
    }
    // фирменная лента: лайм, логотипы чёрным, продольные волокна и непрокрас
    function tapeStrip(reps, w, h) {
      const c = cv2d(w, h), g = c.getContext('2d'), r = rng(3);
      g.fillStyle = LIME; g.fillRect(0, 0, w, h);
      const step = w / reps, lh = Math.min(h * 0.6, (step * 0.84) / LOGO_AR);
      for (let k = 0; k < reps; k++) logo(g, k * step + (step - lh * LOGO_AR) / 2, (h - lh) / 2, lh, '#0b0b0b');
      for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.025 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 40 + r() * 400, 1 + r() * 2.5); }
      g.fillStyle = 'rgba(40,70,0,.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
      return c;
    }
    // торец рулона: слои ленты кольцами (лайм — светлые/тёмные полосы, чёрная — блики плёнки)
    function rollFace(N, kind) {
      const c = cv2d(N, N), g = c.getContext('2d'), h = N / 2, blk = kind === 'black';
      g.fillStyle = blk ? '#141514' : '#7cb806'; g.fillRect(0, 0, N, N);
      for (let k = 0; k < 70; k++) {
        g.strokeStyle = blk ? (k % 4 ? 'rgba(255,255,255,.05)' : 'rgba(142,211,8,.16)') : (k % 3 ? 'rgba(20,45,0,.16)' : 'rgba(225,255,160,.3)');
        g.lineWidth = 1.1; g.beginPath(); g.arc(h, h, h * (0.42 + k * 0.0083), 0, TAU); g.stroke();
      }
      return c;
    }
    // скотч: полосы внахлёст + заломы → высота → нормали (Собель); тайлится
    function tapeNormal(N, seed, crease) {
      const c = cv2d(N, N), g = c.getContext('2d', { willReadFrequently: true }), r = rng(seed);
      g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
      let y = 0;
      while (y < N) {
        const hh = Math.min(N - y, N * (0.12 + r() * 0.14)), v = (112 + r() * 36) | 0;
        g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, N, hh);
        g.fillStyle = 'rgb(92,92,92)'; g.fillRect(0, y + hh - 1.5, N, 1.5); g.fillStyle = 'rgb(176,176,176)'; g.fillRect(0, y, N, 1);
        y += hh;
      }
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (let k = 0; k < crease; k++) {
        let px = r() * N, py = r() * N, a = r() * TAU; const pts = [[px, py]];
        const segs = 2 + ((r() * 3) | 0), len = N * (0.02 + r() * 0.07);
        for (let j = 0; j < segs; j++) { a += (r() - 0.5) * 1.5; px += Math.cos(a) * len; py += Math.sin(a) * len; pts.push([px, py]); }
        g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)'; g.lineWidth = 0.7 + r() * 1.4;
        for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.beginPath(); pts.forEach(([qx, qy], j) => (j ? g.lineTo(qx + ox, qy + oy) : g.moveTo(qx + ox, qy + oy))); g.stroke(); }
      }
      const src = g.getImageData(0, 0, N, N).data, out = g.createImageData(N, N), d = out.data, S = 2.6;
      const Hh = (x, yy) => src[((((yy + N) % N) * N) + ((x + N) % N)) * 4] / 255;
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
        const dx = (Hh(xx + 1, yy) - Hh(xx - 1, yy)) * S, dy = (Hh(xx, yy + 1) - Hh(xx, yy - 1)) * S, l = Math.hypot(dx, dy, 1), i4 = (yy * N + xx) * 4;
        d[i4] = (-dx / l * 0.5 + 0.5) * 255; d[i4 + 1] = (dy / l * 0.5 + 0.5) * 255; d[i4 + 2] = (1 / l * 0.5 + 0.5) * 255; d[i4 + 3] = 255;
      }
      g.putImageData(out, 0, 0);
      return c;
    }
    // тон скотча (умножается на matcap): полосы чуть светлее/темнее, тёмные кромки
    function tapeTint(N, seed) {
      const c = cv2d(N, N), g = c.getContext('2d'), r = rng(seed);
      g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, N, N);
      let y = 0;
      while (y < N) { const hh = Math.min(N - y, N * (0.12 + r() * 0.14)); g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,30,0'},${0.05 + r() * 0.08})`; g.fillRect(0, y, N, hh); g.fillStyle = 'rgba(0,40,0,.13)'; g.fillRect(0, y + hh - 1.5, N, 1.5); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y, N, 1); y += hh; }
      return c;
    }
    return { signFace, graffiti, signBack, tapeStrip, rollFace, tapeNormal, tapeTint, logo, LOGO_AR, rng };
  }

  /* ═════════════════════ ДВИЖОК WebGL (воркер или главный поток) ═════════════════════ */
  function ENGINE(T, canvas, o) {
    const TAU = Math.PI * 2;
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const cv2d = (w, h) => {   // на главном потоке — обычный холст: OffscreenCanvas как источник текстуры в старом Safari ненадёжен
      if (!o.dom && typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
      const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
    };
    const A = ART(cv2d, o.LOGO, o.LOGO_BOX);
    const renderer = new T.WebGLRenderer({
      canvas, antialias: !!o.aa, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: !!o.strict, preserveDrawingBuffer: false, stencil: false,
    });
    try {   // программный WebGL: компиляция замораживает GPU-процесс (а с ним композитинг страницы) → SVG
      const g = renderer.getContext(), di = g.getExtension('WEBGL_debug_renderer_info');
      const rn = String(di ? g.getParameter(di.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER));
      if (!o.soft && /swiftshader|llvmpipe|softpipe|basic render|software|microsoft basic/i.test(rn)) throw new Error('software-gl: ' + rn);
    } catch (e) { if (/software-gl/.test(e.message)) { renderer.dispose(); throw e; } }
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const ctex = (c, srgb, rep) => {
      const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace;
      if (rep) t.wrapS = t.wrapT = T.RepeatWrapping;
      t.anisotropy = maxAniso; return t;
    };
    const SC = {};
    let frames = 0, curW = 0, curH = 0, lostCb = null;
    try { canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (lostCb) lostCb(); }, false); } catch (e) { /* noop */ }

    // ── парсер SVG-пути → THREE.Shape[] (M/L/H/V/C/Q/Z, абс./отн.), ось Y вверх ──
    function shapes(d) {
      const tk = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
      const out = []; let s = null, cmd = '', i = 0, x = 0, y = 0, sx = 0, sy = 0;
      const n = () => +tk[i++], P = (px, py) => [px, -py];
      while (i < tk.length) {
        if (/[a-zA-Z]/.test(tk[i])) cmd = tk[i++];
        const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
        if (C === 'Z') { if (s) s.closePath(); x = sx; y = sy; continue; }
        if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; s = new T.Shape(); out.push(s); s.moveTo(...P(x, y)); cmd = rel ? 'l' : 'L'; }
        else if (C === 'L') { x = ox + n(); y = oy + n(); s.lineTo(...P(x, y)); }
        else if (C === 'H') { x = ox + n(); s.lineTo(...P(x, y)); }
        else if (C === 'V') { y = oy + n(); s.lineTo(...P(x, y)); }
        else if (C === 'C') { const a = [ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n()]; s.bezierCurveTo(...P(a[0], a[1]), ...P(a[2], a[3]), ...P(a[4], a[5])); x = a[4]; y = a[5]; }
        else if (C === 'Q') { const a = [ox + n(), oy + n(), ox + n(), oy + n()]; s.quadraticCurveTo(...P(a[0], a[1]), ...P(a[2], a[3])); x = a[2]; y = a[3]; }
        else i++;
      }
      return out;
    }
    async function loadMC(url) {   // matcap → холст (flipY у холста надёжен везде, у ImageBitmap — нет)
      const b = await (await fetch(url)).blob(), bmp = await createImageBitmap(b);
      const c = cv2d(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0); if (bmp.close) bmp.close();
      return ctex(c, true);
    }

    /* ── сцена G ── */
    async function buildG() {
      const geo = new T.ExtrudeGeometry(shapes(o.P_G), {
        depth: 62, curveSegments: 4, bevelEnabled: true, bevelThickness: 8, bevelSize: 4.6, bevelSegments: o.lite ? 2 : 3,
      });
      geo.computeBoundingBox();
      const bb = geo.boundingBox, c = new T.Vector3(); bb.getCenter(c); geo.translate(-c.x, -c.y, -c.z);
      const k = 2 / (bb.max.y - bb.min.y); geo.scale(k, k, k);
      const hw = ((bb.max.x - bb.min.x) * k) / 2, hd = ((bb.max.z - bb.min.z) * k) / 2;
      const scene = new T.Scene(), group = new T.Group(); group.rotation.order = 'YXZ';
      const mesh = new T.Mesh(geo); group.add(mesh); scene.add(group);
      const cam = new T.PerspectiveCamera(24, 1, 0.1, 40);
      const mats = {}, mcs = {};
      const mc = async (n) => mcs[n] || (mcs[n] = await loadMC(o.mc[n]));
      let nrm = null, tint = null;
      async function mat(name) {
        if (mats[name]) return mats[name];
        let face, side;
        if (name === 'black') {
          face = new T.MeshMatcapMaterial({ matcap: await mc('black') });
          side = new T.MeshMatcapMaterial({ matcap: await mc('lime') });
        } else if (name === 'tape') {
          if (!nrm) {
            // полосы скотча ложатся наискось, как на ленточных буквах; крупнее — не «доски»
            nrm = ctex(A.tapeNormal(o.lite ? 256 : 512, 20261023, o.lite ? 120 : 240), false, true);
            tint = ctex(A.tapeTint(256, 20261023), true, true);
            for (const t of [nrm, tint]) { t.repeat.set(1 / 230, 1 / 230); t.rotation = 0.42; }
          }
          face = new T.MeshMatcapMaterial({ matcap: await mc('tape'), map: tint, normalMap: nrm, normalScale: new T.Vector2(0.85, 0.85) });
          side = new T.MeshMatcapMaterial({ matcap: await mc('side'), normalMap: nrm, normalScale: new T.Vector2(0.35, 0.35) });
        } else {
          face = new T.MeshMatcapMaterial({ matcap: await mc('lime') });
          side = new T.MeshMatcapMaterial({ matcap: await mc('side') });
        }
        return (mats[name] = [face, side]);
      }
      mesh.material = await mat(o.mat || 'tape');
      return {
        scene, cam,
        async setMat(name) { mesh.material = await mat(name); },
        apply(p, aspect) {
          group.rotation.set(p.rx || 0, p.ry || 0, 0);
          group.scale.setScalar(p.s || 1);
          const t = Math.tan((cam.fov * Math.PI) / 360), m = 1.16;
          cam.aspect = aspect;
          const dist = Math.max(m / t, (Math.max(hw, 0.82) * m) / (t * aspect)) + hd;
          cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
        },
      };
    }

    /* ── сцена знака ONE WAY or ANOTHER ── */
    async function buildSign() {
      const scene = new T.Scene();
      scene.add(new T.HemisphereLight('#ffffff', '#2c3324', 1.7));
      const sun = new T.DirectionalLight('#ffffff', 2.3); sun.position.set(-2.4, 3, 5); scene.add(sun);
      const back = new T.DirectionalLight('#e8ffd0', 1.1); back.position.set(2, 1.2, -5); scene.add(back);
      const PW = 1.5, PH = 1.9, RAD = 0.1;
      const sh = new T.Shape(); sh.moveTo(-PW / 2 + RAD, -PH / 2); sh.lineTo(PW / 2 - RAD, -PH / 2); sh.quadraticCurveTo(PW / 2, -PH / 2, PW / 2, -PH / 2 + RAD);
      sh.lineTo(PW / 2, PH / 2 - RAD); sh.quadraticCurveTo(PW / 2, PH / 2, PW / 2 - RAD, PH / 2); sh.lineTo(-PW / 2 + RAD, PH / 2); sh.quadraticCurveTo(-PW / 2, PH / 2, -PW / 2, PH / 2 - RAD);
      sh.lineTo(-PW / 2, -PH / 2 + RAD); sh.quadraticCurveTo(-PW / 2, -PH / 2, -PW / 2 + RAD, -PH / 2);
      const plate = new T.ShapeGeometry(sh, 6), P = plate.attributes.position, UV = plate.attributes.uv;
      for (let k = 0; k < P.count; k++) UV.setXY(k, P.getX(k) / PW + 0.5, P.getY(k) / PH + 0.5);
      const big = o.lite ? 0.75 : 1;
      const sc = (c) => { if (big >= 1) return c; const d = cv2d((c.width * big) | 0, (c.height * big) | 0); d.getContext('2d').drawImage(c, 0, 0, d.width, d.height); return d; };
      const tL = ctex(sc(A.signFace(-1)), true), tR = ctex(sc(A.signFace(1)), true), tB = ctex(sc(A.signBack()), true), tG = ctex(sc(A.graffiti()), true);
      const faceM = new T.MeshStandardMaterial({ map: tL, roughness: 0.5, metalness: 0 });
      const front = new T.Mesh(plate, faceM); front.position.z = 0.0135;
      const grM = new T.MeshStandardMaterial({ map: tG, roughness: 0.62, alphaTest: 0.99 });
      const gr = new T.Mesh(plate, grM); gr.position.z = 0.0145; gr.visible = false;
      const backM = new T.MeshStandardMaterial({ map: tB, roughness: 0.42, metalness: 0.35 });
      const bk = new T.Mesh(plate, backM); bk.rotation.y = Math.PI; bk.position.z = -0.0135;
      const edgeG = new T.ExtrudeGeometry(sh, { depth: 0.024, bevelEnabled: false, curveSegments: 6 });
      const edge = new T.Mesh(edgeG, new T.MeshStandardMaterial({ color: '#a2a6a9', metalness: 0.7, roughness: 0.35 })); edge.position.z = -0.012; edge.scale.set(0.998, 0.998, 1);
      const steel = new T.MeshStandardMaterial({ color: '#8d9194', metalness: 0.75, roughness: 0.42 });
      const post = new T.Mesh(new T.BoxGeometry(0.085, 6, 0.085), steel); post.position.set(0, -2.2, -0.068);
      const clampG = new T.BoxGeometry(0.2, 0.05, 0.12);
      const cl1 = new T.Mesh(clampG, steel); cl1.position.set(0, PH * 0.34, -0.06);
      const cl2 = new T.Mesh(clampG, steel); cl2.position.set(0, -PH * 0.34, -0.06);
      const sign = new T.Group(); sign.add(edge, front, gr, bk, post, cl1, cl2); scene.add(sign);
      // при compileAsync граффити должно быть видимым, иначе его программа соберётся на первом кадре оборота
      gr.visible = true;
      const cam = new T.PerspectiveCamera(28, 1, 0.1, 60);
      return {
        scene, cam,
        apply(p, aspect) {
          sign.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
          const fl = !!p.flip; if (faceM.map !== (fl ? tR : tL)) faceM.map = fl ? tR : tL;
          gr.visible = fl && (p.g || 0) > 0.005;
          grM.alphaTest = Math.max(0.05, 1 - (p.g || 0) * 0.95);
          cam.aspect = aspect;
          const t = Math.tan((cam.fov * Math.PI) / 360), hh = 1.32, hw = 1.0;   // пластина ≈ 72 % высоты кадра
          const dist = Math.max(hh / t, hw / (t * aspect));
          cam.position.set(0, 0.12, dist); cam.lookAt(0, -0.02, 0); cam.updateProjectionMatrix();
          sign.position.set(0, 0.06 + (p.y || 0), 0);
        },
      };
    }

    /* ── сцена рулона ленты (v3.1): один рулон на плоскости страницы, без фона и асфальта ──
       Мир = CSS-пиксели экрана: x вправо, y вверх (= −y экрана), z — к зрителю; страница — плоскость z=0.
       Камера «как глаз над всем окном» (fov узкий), а холст рулона — только кусок кадра вокруг него (setViewOffset):
       перспектива честная — у края экрана виден торец, обращённый к центру. Поза p (её шлёт roll.js):
       x,y — точка касания на экране; vw,vh — окно; cs — сторона холста (CSS px); hd — курс (0 вправо, π/2 вниз);
       R — радиус намотки; w — ширина ленты; rc — радиус шпули; sp — угол качения; tip — 0 стоит, 1 лёг на торец;
       mat — 'lime'|'black'; sh — сила тени (0 — рулон ещё в воздухе). */
    async function buildRoll() {
      const scene = new T.Scene();
      scene.add(new T.HemisphereLight('#ffffff', '#3a3a3a', 1.35));
      const sun = new T.DirectionalLight('#ffffff', 2.4); sun.position.set(-0.55, 0.75, 1); scene.add(sun);   // свет сверху-слева, как тени интерфейса
      const rim = new T.DirectionalLight('#eaffc4', 0.6); rim.position.set(0.7, -0.4, 0.6); scene.add(rim);
      const lite = !!o.lite, NS = lite ? 48 : 72;
      async function img(url) {
        const b = await (await fetch(url)).blob(), bmp = await createImageBitmap(b);
        const c = cv2d(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0); if (bmp.close) bmp.close();
        return c;
      }
      // полоса ленты — та же, что лежит на странице (K3: img/tape/*-strip.webp, бесшовная по X); нет сети — процедурная
      const strip = {};
      for (const k of ['lime', 'black']) {
        let c = null;
        try { c = await img(o.tape[k]); } catch (e) { c = A.tapeStrip(4, 1024, 128); }
        const t = ctex(c, true, true); t.wrapT = T.ClampToEdgeWrapping; strip[k] = { t, ar: c.width / c.height };
      }
      const nrm = ctex(A.tapeNormal(128, 7, 30), false, true);
      const outerM = {
        lime: new T.MeshStandardMaterial({ map: strip.lime.t, roughness: 0.44, normalMap: nrm, normalScale: new T.Vector2(0.22, 0.22) }),
        black: new T.MeshStandardMaterial({ map: strip.black.t, roughness: 0.3, normalMap: nrm, normalScale: new T.Vector2(0.22, 0.22) }),
      };
      const faceM = {
        lime: new T.MeshStandardMaterial({ map: ctex(A.rollFace(lite ? 128 : 256, 'lime'), true), roughness: 0.3 }),
        black: new T.MeshStandardMaterial({ map: ctex(A.rollFace(lite ? 128 : 256, 'black'), true), roughness: 0.22, metalness: 0.1 }),
      };
      const base = new T.Group(), tiltG = new T.Group(), spin = new T.Group();
      base.add(tiltG); tiltG.add(spin); scene.add(base);
      // намотка: ось цилиндра — локальная Y (поперёк курса), курс — локальная X
      const outer = new T.Mesh(new T.CylinderGeometry(1, 1, 1, NS, 1, true), outerM.lime); spin.add(outer);
      // торцы: кольцо от шпули до радиуса намотки, внешние вершины едут с R
      const ringGeo = (sd) => {
        const g = new T.BufferGeometry(), idx = [];
        for (let i = 0; i < NS; i++) { const a = i * 2, b = a + 1, c = a + 2, d2 = a + 3; if (sd > 0) idx.push(a, c, b, b, c, d2); else idx.push(a, b, c, b, d2, c); }
        g.setAttribute('position', new T.BufferAttribute(new Float32Array((NS + 1) * 6), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array((NS + 1) * 4), 2)); g.setIndex(idx);
        g.setAttribute('normal', new T.BufferAttribute(new Float32Array((NS + 1) * 6).map((_, i) => (i % 3 === 1 ? sd : 0)), 3));
        g.userData.sd = sd; return g;
      };
      const faces = [1, -1].map((sd) => { const m = new T.Mesh(ringGeo(sd), faceM.lime); spin.add(m); return m; });
      const card = new T.MeshStandardMaterial({ color: '#b48f5c', roughness: 0.92 });
      const cardIn = new T.MeshStandardMaterial({ color: '#7a5f39', roughness: 1, side: T.BackSide });
      const core = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 40, 1, true), card); spin.add(core);
      const coreIn = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 40, 1, true), cardIn); spin.add(coreIn);
      const capG = new T.RingGeometry(0.86, 1, 40);
      const caps = [1, -1].map((sd) => { const m = new T.Mesh(capG, card); m.rotation.x = -sd * Math.PI / 2; spin.add(m); m.userData.sd = sd; return m; });
      // контактная тень — градиент на плоскости страницы (под рулоном, не поворачивается с наклоном)
      const shC = cv2d(64, 64), sg = shC.getContext('2d'), rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(0,0,0,.62)'); rg.addColorStop(0.55, 'rgba(0,0,0,.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
      const shM = new T.MeshBasicMaterial({ map: ctex(shC, false), transparent: true, depthWrite: false });
      const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), shM); shadow.position.z = 0.2; shadow.renderOrder = -1; base.add(shadow);
      const cam = new T.PerspectiveCamera(o.rollFov || 14, 1, 1, 10);
      let curMat = 'lime';
      return {
        scene, cam,
        apply(p0) {
          const p = Object.assign({ x: 60, y: 60, vw: 120, vh: 120, cs: 120, hd: Math.PI / 2, R: 40, w: 30, rc: 22, sp: 0, tip: 0, mat: 'lime', sh: 1 }, p0);
          const R = Math.max(p.R, p.rc + 0.5), w = p.w, rc = p.rc, tip = clamp01(p.tip);
          if (p.mat !== curMat && outerM[p.mat]) { curMat = p.mat; outer.material = outerM[p.mat]; faces.forEach((f) => { f.material = faceM[p.mat]; }); }
          base.position.set(p.x, -p.y, 0); base.rotation.z = -p.hd;
          // лёг на торец: поворот вокруг курса, центр опускается с R на w/2 (с лёгким «плюхом» в конце)
          const tz = tip * tip * (3 - 2 * tip);
          tiltG.rotation.x = tz * Math.PI / 2; tiltG.position.z = R + (w / 2 - R) * tz + Math.sin(tip * Math.PI) * R * 0.18;
          spin.rotation.y = p.sp;
          outer.scale.set(R, w, R);
          const st = strip[curMat]; st.t.repeat.set((TAU * R) / (w * st.ar), 1);
          core.scale.set(rc, w * 1.02, rc); coreIn.scale.set(rc * 0.86, w * 1.02, rc * 0.86);
          for (const c of caps) { c.scale.set(rc, rc, 1); c.position.y = c.userData.sd * w * 0.511; }
          for (const f of faces) {
            const g = f.geometry, pa = g.attributes.position, ua = g.attributes.uv, sd = g.userData.sd;
            for (let i = 0; i <= NS; i++) {
              const a = (i / NS) * TAU, c = Math.cos(a), s = Math.sin(a);
              pa.setXYZ(i * 2, rc * c, (sd * w) / 2, rc * s); pa.setXYZ(i * 2 + 1, R * c, (sd * w) / 2, R * s);
              ua.setXY(i * 2, 0.5 + (rc / R) * c * 0.5, 0.5 + (rc / R) * s * 0.5); ua.setXY(i * 2 + 1, 0.5 + c * 0.5, 0.5 + s * 0.5);
            }
            pa.needsUpdate = true; ua.needsUpdate = true; g.computeBoundingSphere();
          }
          const sx = R * 2.3 + (R * 2.4 - R * 2.3) * tz, sy = w * 1.5 + (R * 2.4 - w * 1.5) * tz;
          shadow.scale.set(sx, sy, 1); shM.opacity = clamp01(p.sh);
          // глаз над страницей на высоте ED; холст — кусок большого кадра вокруг рулона (setViewOffset). Глаз смещён от
          // рулона к центру экрана и вниз (p.ex, p.ey): торец и бок видны всегда, как на настоящем рулоне на столе
          const ED = p.ed || 4000, F = 6000, ex = p.ex == null ? p.vw / 2 : p.ex, ey = p.ey == null ? p.vh / 2 : p.ey;
          cam.fov = (2 * Math.atan(F / ED) * 180) / Math.PI; cam.aspect = 1;
          cam.near = Math.max(1, ED - 6 * R - 40); cam.far = ED + 20;
          cam.position.set(ex, -ey, ED); cam.rotation.set(0, 0, 0);
          cam.setViewOffset(2 * F, 2 * F, p.x - ex + F - p.cs / 2, p.y - ey + F - p.cs / 2, p.cs, p.cs);
          cam.updateProjectionMatrix();
        },
      };
    }
    const BUILD = { g: buildG, sign: buildSign, roll: buildRoll };

    async function scene(kind) {
      if (SC[kind]) return SC[kind];
      const pr = BUILD[kind](); SC[kind] = pr;
      const v = await pr;
      v.apply({ u: 0.5, ry: 0, g: 1, flip: true }, 1.6);   // граффити видно — его программа собирается сейчас, а не на первом кадре оборота
      if (renderer.compileAsync) await renderer.compileAsync(v.scene, v.cam); else renderer.compile(v.scene, v.cam);
      SC[kind] = v;
      return v;
    }
    function size(w, h) { w = Math.max(2, w | 0); h = Math.max(2, h | 0); if (w !== curW || h !== curH) { renderer.setSize(w, h, false); curW = w; curH = h; } }
    function render(kind, p, w, h) {
      const s = SC[kind]; if (!s || s.then) return false;
      size(w, h); s.apply(p, w / h); renderer.render(s.scene, s.cam); frames++;
      return true;
    }
    async function setMat(name) { const s = await scene('g'); await s.setMat(name); if (renderer.compileAsync) await renderer.compileAsync(s.scene, s.cam); }
    function info() { const r = renderer.info.render; return { frames, calls: r.calls, tris: r.triangles, programs: (renderer.info.programs || []).length, geos: renderer.info.memory.geometries, texs: renderer.info.memory.textures }; }
    return { scene, render, setMat, info, onLost: (f) => { lostCb = f; }, canvas };
  }

  // three.module.min.js импортирует НЕминифицированный ./three.core.js (+125 КБ br) — подменяем на three.core.min.js
  const WORKER_SRC = `'use strict';
const ART = ${ART.toString()};
const ENGINE = ${ENGINE.toString()};
let E = null, pend = false;
const V = new Map(), P = new Map();
const raf = self.requestAnimationFrame ? (f) => self.requestAnimationFrame(f) : (f) => setTimeout(f, 0);
function draw() {
  pend = false;
  for (const [id, q] of P) {
    const v = V.get(id); if (!v) continue;
    if (E.render(v.kind, q.p, q.w, q.h)) {
      if (v.c.width !== q.w || v.c.height !== q.h) { v.c.width = q.w; v.c.height = q.h; }
      v.x.transferFromImageBitmap(E.canvas.transferToImageBitmap());
    }
  }
  P.clear();
}
async function load1(url) {
  try {
    const r = await fetch(url); if (!r.ok) throw 0;
    const src = await r.text();
    const core = new URL('three.core.min.js', url).href, IMP = 'from"./three.core.js"';
    if (src.indexOf(IMP) < 0) throw 0;
    return await import(URL.createObjectURL(new Blob([src.split(IMP).join('from"' + core + '"')], { type: 'text/javascript' })));
  } catch (e) { return import(url); }
}
async function load(urls) {   // cdnjs → jsdelivr → ещё раз cdnjs через секунду
  let err = null;
  for (const u of [urls[0], urls[1], urls[0]]) {
    try { return await load1(u); } catch (e) { err = e; await new Promise((r) => setTimeout(r, 900)); }
  }
  throw err;
}
self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.t === 'init') {
      const probe = new OffscreenCanvas(1, 1);
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { postMessage({ t: 'nogl' }); return; }
      const T = await load(m.urls);
      E = ENGINE(T, new OffscreenCanvas(2, 2), m.o);
      E.onLost(() => postMessage({ t: 'lost' }));
      postMessage({ t: 'built' });
    } else if (!E) return;
    else if (m.t === 'view') V.set(m.id, { kind: m.kind, c: m.canvas, x: m.canvas.getContext('bitmaprenderer') });
    else if (m.t === 'scene') { await E.scene(m.kind); postMessage({ t: 'scene', kind: m.kind }); }
    else if (m.t === 'mat') { await E.setMat(m.name); postMessage({ t: 'mat', name: m.name }); }
    else if (m.t === 'pose') { P.set(m.id, m); if (!pend) { pend = true; raf(draw); } }
    else if (m.t === 'stats') postMessage({ t: 'stats', id: m.id, v: E.info() });
  } catch (e) { postMessage({ t: 'error', kind: m.kind, msg: String((e && e.message) || e) }); }
};`;

  /* ═════════════════════ ХАБ: один контекст на страницу ═════════════════════ */
  const HUB = { st: 'idle', kind: '', why: '', wait: [], scenes: {}, sceneCb: {}, renders: 0, wk: null, E: null, uid: 0, stCb: new Map(), offCb: [] };
  function weakDevice() {
    const n = navigator, c = n.connection;
    return !!((c && c.saveData) || (n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2));
  }
  const wantGL = () => !RMQ.matches && !weakDevice() && !Q.has('nogl') && !SHOT;
  function engineOpts() {
    const mc = {}; for (const k in MC) mc[k] = abs(MC[k]);
    return {
      lite: !FINEQ.matches || NARROWQ.matches, aa: Math.min(W.devicePixelRatio || 1, 2) < 2, strict: !Q.has('soft'), soft: Q.has('soft'),
      P_G, LOGO, LOGO_BOX, mc, mat: matOf(), rollFov: 10,
      tape: { lime: abs(TAPE.lime), black: abs(TAPE.black) },
    };
  }
  function hubOff(why) {
    if (HUB.st === 'off') return;
    HUB.st = 'off'; HUB.why = why || ''; GV.gl.why = HUB.why;
    if (HUB.wk) { try { HUB.wk.terminate(); } catch (e) { /* noop */ } HUB.wk = null; }
    HUB.offCb.splice(0).forEach((f) => { try { f(why); } catch (e) { /* noop */ } });
  }
  function hubOk(kind) { HUB.st = 'ok'; HUB.kind = kind; GV.gl.engine = kind; HUB.wait.splice(0).forEach((f) => f()); }
  function startHub() {
    if (HUB.st !== 'idle') return;
    if (!wantGL()) { hubOff(RMQ.matches ? 'reduced-motion' : Q.has('nogl') ? 'nogl' : SHOT ? 'shot' : 'weak'); return; }
    HUB.st = 'loading';
    const o = engineOpts();
    const canWorker = !Q.has('glmain') && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' &&
      !!(W.HTMLCanvasElement && HTMLCanvasElement.prototype.transferControlToOffscreen) && typeof ImageBitmapRenderingContext !== 'undefined';
    if (canWorker) {
      try {
        const wk = (HUB.wk = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })), { type: 'module' }));
        wk.onmessage = (ev) => {
          const m = ev.data;
          if (m.t === 'built') hubOk('worker');
          else if (m.t === 'nogl') { try { wk.terminate(); } catch (e) { /* noop */ } HUB.wk = null; startMain(o); }   // Safari < 17
          else if (m.t === 'scene') sceneDone(m.kind);
          else if (m.t === 'mat') D.dispatchEvent(new CustomEvent('grinchin:gl-mat', { detail: { name: m.name } }));
          else if (m.t === 'stats') { const cb = HUB.stCb.get(m.id); if (cb) { HUB.stCb.delete(m.id); cb(m.v); } }
          else if (m.t === 'error' || m.t === 'lost') { if (m.kind) sceneFail(m.kind, m.msg); else hubOff(m.msg || m.t); }
        };
        wk.onerror = () => hubOff('worker');
        wk.postMessage({ t: 'init', urls: [URL3, URL3B], o });
        return;
      } catch (e) { HUB.wk = null; }
    }
    startMain(o);
  }
  function startMain(o) {
    o = Object.assign({}, o, { dom: true });
    import(URL3).catch(() => import(URL3B)).then((T) => new Promise((res, rej) => idle(() => {
      try { const cv = D.createElement('canvas'); cv.width = cv.height = 2; HUB.E = ENGINE(T, cv, o); HUB.E.onLost(() => hubOff('lost')); res(); } catch (e) { rej(e); }
    }, 2500))).then(() => hubOk('main')).catch((e) => hubOff('import: ' + ((e && e.message) || e)));
  }
  function sceneDone(kind) { HUB.scenes[kind] = 'ok'; (HUB.sceneCb[kind] || []).splice(0).forEach((f) => f(true)); }
  function sceneFail(kind, msg) {
    HUB.scenes[kind] = 'fail'; (HUB.sceneCb[kind] || []).splice(0).forEach((f) => f(false, msg));
    if (/software-gl|context/i.test(msg || '')) hubOff(msg);
  }
  // запросить сцену: cb(true) — скомпилирована; cb(false, why) — WebGL нет или ошибка (рисуй фолбэк)
  function needScene(kind, cb) {
    if (HUB.scenes[kind] === 'ok') { cb(true); return; }
    if (HUB.scenes[kind] === 'fail' || HUB.st === 'off') { cb(false, HUB.why); return; }
    (HUB.sceneCb[kind] = HUB.sceneCb[kind] || []).push(cb);
    HUB.offCb.push(() => { if (HUB.scenes[kind] !== 'ok') cb(false, HUB.why); });
    if (HUB.scenes[kind]) return;
    HUB.scenes[kind] = 'wait';
    const go = () => {
      if (HUB.kind === 'worker') HUB.wk.postMessage({ t: 'scene', kind });
      else idle(() => HUB.E.scene(kind).then(() => sceneDone(kind), (e) => sceneFail(kind, String((e && e.message) || e))), 2000);
    };
    startHub();
    if (HUB.st === 'ok') go(); else if (HUB.st === 'loading') HUB.wait.push(go);
  }
  // вид — холст сцены в разметке; в воркер передаётся при первом кадре (до этого его можно убрать без следа)
  function view(kind, canvas) {
    const id = ++HUB.uid, v = { id, kind, canvas, sent: false, x2d: null };
    v.pose = (p, w, h) => {
      if (HUB.st !== 'ok' || HUB.scenes[kind] !== 'ok') return false;
      w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
      if (HUB.kind === 'worker') {
        if (!v.sent) { const off = canvas.transferControlToOffscreen(); HUB.wk.postMessage({ t: 'view', id, kind, canvas: off }, [off]); v.sent = true; }
        HUB.wk.postMessage({ t: 'pose', id, p, w, h });
      } else {
        if (!HUB.E.render(kind, p, w, h)) return false;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; v.x2d = null; }
        const x = v.x2d || (v.x2d = canvas.getContext('2d'));
        x.clearRect(0, 0, w, h); x.drawImage(HUB.E.canvas, 0, 0);
      }
      HUB.renders++;
      return true;
    };
    return v;
  }
  // общий цикл: gsap.ticker (если есть) или rAF; крутится, пока кому-то есть что двигать, затем спит
  const LOOP = { fns: new Set(), on: false, last: 0, gs: false };
  function step() {
    const t = now(), dt = clamp((t - (LOOP.last || t - 16.7)) / 1000, 0.001, 0.05); LOOP.last = t;
    let busy = false;
    for (const f of LOOP.fns) { try { if (f(dt, t)) busy = true; } catch (e) { console.warn('[3d]', e); } }
    if (!busy) { LOOP.on = false; LOOP.last = 0; if (LOOP.gs) W.gsap.ticker.remove(step); }
    else if (!LOOP.gs) requestAnimationFrame(step);
  }
  function wake() {
    if (LOOP.on) return;
    LOOP.on = true; LOOP.gs = !!(W.gsap && W.gsap.ticker);
    if (LOOP.gs) W.gsap.ticker.add(step); else requestAnimationFrame(step);
  }
  GV.gl = {
    v: 3, engine: '', why: '',
    state: () => HUB.st,
    start: startHub, needScene, view, wake,
    loop: (f) => { LOOP.fns.add(f); wake(); return () => LOOP.fns.delete(f); },
    onOff: (f) => { if (HUB.st === 'off') f(HUB.why); else HUB.offCb.push(f); },
    renders: () => HUB.renders,
    stats: () => new Promise((res) => {
      if (HUB.kind === 'worker' && HUB.wk) { const id = ++HUB.uid; HUB.stCb.set(id, res); HUB.wk.postMessage({ t: 'stats', id }); setTimeout(() => res(null), 1500); }
      else res(HUB.E ? HUB.E.info() : null);
    }),
    setMat: (name) => {
      if (HUB.st !== 'ok' || HUB.scenes.g !== 'ok') return;
      if (HUB.kind === 'worker') HUB.wk.postMessage({ t: 'mat', name });
      else HUB.E.setMat(name).then(() => D.dispatchEvent(new CustomEvent('grinchin:gl-mat', { detail: { name } })));
    },
    art: () => ART((w, h) => { const c = D.createElement('canvas'); c.width = w; c.height = h; return c; }, LOGO, LOGO_BOX),
    P_G, G_VB, LOGO, LOGO_BOX,
  };

  /* ═════════════════════ ЗНАК G в hero (#g3d) ═════════════════════
     Поведение v1: следит за курсором — только наклон (rx/ry), без поворота по Z (иначе G не читается);
     драг/свайп по знаку крутит его с инерцией и пружиной домой; на телефоне — гироскоп по кнопке.
     Рождается на месте, когда прелоадер раскрыл сайт. Прокрутка hero слегка «кладёт» знак назад. */
  const NEUTRAL = { rx: 0.08, ry: -0.24 };
  const S = {
    started: false, birthT: -1e9, mode: 'none',
    px: -1, py: -1, yaw: 0, yawV: 0, pitch: 0, drag: null, gyro: null, nodT: -1e9,
    vis: false, overlay: false, P: null, last: null, w: 0, h: 0, dpr: 1, heroTop: 0, heroH: 1, vh: 1, vw: 1, cx: 0, cy: 0,
  };
  let host = null, box = null, cv = null, gyroBtn = null, V = null;

  function build() {
    host = D.getElementById('g3d');
    if (!host) return false;
    box = host.querySelector('.g3d');
    if (box) return true;
    box = D.createElement('div');
    box.className = 'g3d'; box.dataset.mode = 'svg';
    // фолбэк: та же G, плоско, с «торцом» — сдвинутая копия под лицом
    box.innerHTML = '<span class="g3d__shadow" aria-hidden="true"></span>' +
      `<svg class="g3d__svg" viewBox="${G_VB}" aria-hidden="true" focusable="false"><path class="g3d__svg-side" d="${P_G}" transform="translate(9 11)"/><path class="g3d__svg-face" d="${P_G}"/></svg>`;
    host.appendChild(box);
    box.addEventListener('pointerdown', onDown);
    box.addEventListener('pointermove', onDrag);
    box.addEventListener('pointerup', onUp);
    box.addEventListener('pointercancel', onUp);
    return true;
  }
  function buildGyro() {
    if (gyroBtn || !box || FINEQ.matches || !W.DeviceOrientationEvent || RMQ.matches || SHOT || S.mode !== 'gl' || !S.started) return;
    gyroBtn = D.createElement('button');
    gyroBtn.type = 'button'; gyroBtn.className = 'g-gyro';
    gyroBtn.setAttribute('aria-label', 'Наклон: знак следит за наклоном телефона');
    gyroBtn.setAttribute('aria-pressed', 'false');
    gyroBtn.innerHTML = '<span class="g-gyro-i" aria-hidden="true"></span><span>наклон</span>';
    gyroBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    gyroBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (S.gyro) { W.removeEventListener('deviceorientation', onTilt); S.gyro = null; gyroBtn.setAttribute('aria-pressed', 'false'); GV.gl.wake(); return; }
      try {
        const rq = W.DeviceOrientationEvent.requestPermission;
        if (typeof rq === 'function' && (await rq.call(W.DeviceOrientationEvent)) !== 'granted') { gyroBtn.dataset.state = 'denied'; return; }
        S.gyro = { rx: 0, ry: 0 };
        W.addEventListener('deviceorientation', onTilt, { passive: true });
        gyroBtn.setAttribute('aria-pressed', 'true');
      } catch (err) { gyroBtn.dataset.state = 'denied'; }
    });
    box.appendChild(gyroBtn);
    setTimeout(() => gyroBtn && gyroBtn.classList.add('is-shown'), Math.max(0, S.birthT + 800 - now()));
  }
  function measure() {
    if (!host) return;
    const r = host.getBoundingClientRect(), sy = W.scrollY || 0;
    S.vw = R.clientWidth || innerWidth; S.vh = innerHeight;
    // размер буфера — по раскладке (offset*), а не по rect: K4 масштабирует обёртку .hx-g при прокрутке
    S.hidden = getComputedStyle(host).visibility === 'hidden';   // K4 может спрятать обёртку — тогда не рендерим
    S.w = host.offsetWidth || r.width; S.h = host.offsetHeight || r.height; S.cx = r.left + r.width / 2; S.cy = r.top + sy + r.height / 2;
    S.dpr = Math.min(W.devicePixelRatio || 1, 2);
    const hero = D.getElementById('hero');
    if (hero) { const hr = hero.getBoundingClientRect(); S.heroTop = hr.top + sy; S.heroH = Math.max(1, hr.height); }
    S.last = null; GV.gl.wake();
  }
  let mT = 0;
  const remeasure = () => { if (mT) return; mT = requestAnimationFrame(() => { mT = 0; measure(); }); };

  function onPointer(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    S.px = e.clientX; S.py = e.clientY; if (S.vis) GV.gl.wake();
  }
  function onDown(e) {
    if (S.mode !== 'gl' || e.button || (gyroBtn && gyroBtn.contains(e.target))) return;
    S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now() }; S.yawV = 0;
    try { box.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
    GV.gl.wake();
  }
  function onDrag(e) {
    const d = S.drag; if (!d || d.id !== e.pointerId) return;
    const t = now(), dx = e.clientX - d.x, dy = e.clientY - d.y, dt = Math.max(8, t - d.t) / 1000;
    d.x = e.clientX; d.y = e.clientY; d.t = t;
    S.yaw += dx * 0.011; S.yawV = damp(S.yawV, (dx * 0.011) / dt, 18, dt);
    if (e.pointerType === 'mouse') S.pitch = clamp(S.pitch + dy * 0.004, -0.35, 0.35);
    GV.gl.wake();
  }
  function onUp(e) { if (S.drag && S.drag.id === e.pointerId) { S.drag = null; GV.gl.wake(); } }
  function onTilt(e) {
    if (e.beta == null || !S.gyro) return;
    // квантуем: дрожь руки не должна держать рендер включённым
    const rx = Math.round(clamp((e.beta - 45) / 40, -1, 1) * 0.32 * 50) / 50;
    const ry = Math.round(clamp(e.gamma / 35, -1, 1) * 0.6 * 50) / 50;
    if (rx !== S.gyro.rx || ry !== S.gyro.ry) { S.gyro.rx = rx; S.gyro.ry = ry; GV.gl.wake(); }
  }

  function target(sy) {
    const T = { rx: NEUTRAL.rx, ry: NEUTRAL.ry };
    if (RMQ.matches || SHOT) return T;
    if (FINEQ.matches && S.px >= 0) {
      const dx = S.px - S.cx, dy = S.py - (S.cy - sy);
      T.ry += clamp(dx / (S.vw * 0.55), -1, 1) * 0.5;    // ≤ ±0,5 рад: буква остаётся буквой, торец — акцентом
      T.rx += clamp(dy / (S.vh * 0.55), -1, 1) * 0.3;
    }
    if (S.gyro) { T.rx += S.gyro.rx; T.ry += S.gyro.ry; }
    T.ry += S.yaw; T.rx += S.pitch;
    T.rx += clamp((sy - S.heroTop) / (S.heroH * 0.8), 0, 1) * 0.55;   // заголовок ложится на асфальт — знак отклоняется следом
    return T;
  }
  function tickG(dt, t) {
    if (!S.started || !V || S.mode !== 'gl') return false;
    const sy = W.scrollY || 0;
    if (!S.drag) {
      S.yaw += S.yawV * dt; S.yawV = damp(S.yawV, 0, 3.2, dt);
      if (Math.abs(S.yawV) < 0.6) { const home = Math.round(S.yaw / TAU) * TAU; S.yaw = damp(S.yaw, home, 4, dt); }
      S.pitch = damp(S.pitch, 0, 3, dt);
      if (Math.abs(S.yaw - Math.round(S.yaw / TAU) * TAU) < 0.002 && Math.abs(S.yawV) < 0.05) { S.yaw = 0; S.yawV = 0; }
      if (Math.abs(S.pitch) < 0.001) S.pitch = 0;
    }
    const T = target(sy);
    const P = S.P || (S.P = Object.assign({}, T));
    P.rx = damp(P.rx, T.rx, 7, dt); P.ry = damp(P.ry, T.ry, 7, dt);
    const Vp = { rx: P.rx, ry: P.ry, s: 1 };
    const tb = (t - S.birthT) / 700, birth = tb >= 0 && tb < 1;      // рождение: 0,6 → 1, доворот
    if (birth) { const k = eo3(tb); Vp.s = 0.6 + 0.4 * k; Vp.ry -= 1.25 * (1 - k); Vp.rx += 0.25 * (1 - k); }
    const tn = (t - S.nodT) / 1000, nod = tn >= 0 && tn < 1.3;       // кивок на «добавлено в корзину»
    if (nod) { const a = Math.exp(-4.5 * tn) * Math.sin(tn * 15); Vp.rx += 0.34 * a; Vp.s *= 1 + 0.05 * Math.max(0, a); }
    const anim = birth || nod || !!S.drag || S.yaw !== 0 || S.pitch !== 0;
    if (S.vis && !S.overlay && !S.hidden && S.w > 4) {          // рендер — только если поза изменилась и знак виден
      const bw = Math.round(S.w * S.dpr), bh = Math.round(S.h * S.dpr), L = S.last;
      if (!L || L.w !== bw || L.h !== bh || Math.abs(L.rx - Vp.rx) + Math.abs(L.ry - Vp.ry) + Math.abs(L.s - Vp.s) > 0.0006) {
        if (V.pose({ rx: +Vp.rx.toFixed(4), ry: +Vp.ry.toFixed(4), s: +Vp.s.toFixed(4) }, bw, bh)) S.last = { rx: Vp.rx, ry: Vp.ry, s: Vp.s, w: bw, h: bh };
      }
    }
    return anim || Math.abs(P.rx - T.rx) + Math.abs(P.ry - T.ry) > 0.0006;
  }

  function onSceneReady(ok, why) {
    if (!ok) { toSVG(why); return; }
    S.mode = 'gl'; GV.g.mode = 'gl'; S.last = null;
    if (!box) return;
    // шейдеры готовы до раскрытия — канвас рождается сам; позже — перекрёстное затухание с SVG
    if (S.started) box.classList.add('is-xfade');
    box.dataset.mode = 'gl';
    buildGyro(); GV.gl.wake();
  }
  function toSVG(why) {
    S.mode = 'svg'; GV.g.mode = 'svg'; GV.g.why = why || '';
    if (box) box.dataset.mode = 'svg';
    if (cv) { cv.remove(); cv = null; V = null; }
    if (gyroBtn) { gyroBtn.remove(); gyroBtn = null; }
  }
  function begin() {
    if (S.started || !box) return;
    S.started = true; measure();
    if (!RMQ.matches && !SHOT) { S.birthT = now(); box.classList.add('is-born'); }
    buildGyro(); GV.gl.wake();
  }
  let booted = false;
  function boot() {
    if (booted) return; booted = true;
    if (!build()) { GV.gl.start(); return; }
    measure();
    S.overlay = R.hasAttribute('data-overlay');
    box.dataset.mat = matOf();
    // data-heroimg="mascot": K4 прячет обёртку G (главный объект hero — маскот) → сцену G не строим и не рендерим
    const hidG = R.dataset.heroimg === 'mascot';
    if (hidG) { toSVG('mascot'); GV.gl.start(); }
    else if (wantGL()) {
      cv = D.createElement('canvas'); cv.className = 'g3d__cv'; cv.setAttribute('aria-hidden', 'true');
      box.appendChild(cv);
      V = GV.gl.view('g', cv);
      GV.gl.loop(tickG);
      GV.gl.needScene('g', onSceneReady);
    } else { toSVG(RMQ.matches ? 'reduced-motion' : SHOT ? 'shot' : 'off'); GV.gl.start(); }
    if (W.IntersectionObserver) new IntersectionObserver((es) => { for (const e of es) S.vis = e.isIntersecting; if (S.vis) { S.last = null; GV.gl.wake(); } }, { rootMargin: '80px' }).observe(host);
    else S.vis = true;
    W.addEventListener('pointermove', onPointer, { passive: true });
    W.addEventListener('scroll', () => { if (S.vis) GV.gl.wake(); }, { passive: true });
    W.addEventListener('resize', remeasure, { passive: true });
    W.addEventListener('load', remeasure);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(remeasure);
    if (W.ResizeObserver) new ResizeObserver(remeasure).observe(host);
    if (W.MutationObserver) new MutationObserver(() => { const o = R.hasAttribute('data-overlay'); if (o !== S.overlay) { S.overlay = o; S.last = null; GV.gl.wake(); } })
      .observe(R, { attributes: true, attributeFilter: ['data-overlay'] });
    // ось data-g переключается вживую: материал меняется в воркере, без перезагрузки
    if (GV.mode && typeof GV.mode.live === 'function') { try { GV.mode.live('g'); } catch (e) { /* noop */ } }
    D.addEventListener('grinchin:mode', (e) => {
      const d = e.detail || {}; if (d.axis !== 'g' || !box) return;
      const m = matOf(); box.dataset.mat = m;
      if (S.mode === 'gl') GV.gl.setMat(m);
    });
    D.addEventListener('grinchin:gl-mat', () => { S.last = null; GV.gl.wake(); });
    const ld = R.getAttribute('data-loader');
    if (SHOT || ld === 'off' || ld === 'done' || R.getAttribute('data-ready') === '1') begin();
    setTimeout(begin, 6000);                // прелоадер не прислал ready — не ждём вечно
  }

  D.addEventListener('grinchin:ready', () => { boot(); begin(); });
  D.addEventListener('grinchin:add', () => { if (!RMQ.matches) { S.nodT = now(); GV.gl.wake(); } });
  if (RMQ.addEventListener) RMQ.addEventListener('change', () => { if (RMQ.matches) toSVG('reduced-motion'); });

  GV.g = {
    v: 3, mode: 'none', why: '', state: S,
    renders: () => HUB.renders,
    stats: () => GV.gl.stats(),
    refresh: remeasure,
    nod: () => { S.nodT = now(); GV.gl.wake(); },
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
