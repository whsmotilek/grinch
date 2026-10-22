/* GRINCHIN v3 · маскот (K5) → window.GV.mascot
   Ось html[data-mascot]: grinchin | kapushon | uhmyl | none.
   · grinchin — «Гринчин»: лаймовый хулиган-той (направление «Обходчик» R5, доведённое до персонажа).
     Рот — контур улыбки НОВОГО логотипа (logo_p1.svg), рожки с зазубриной как у концов улыбки, маркер, худи GRINCHIN.
     Чего у него НЕТ (и не будет): меха, хохолка-завитка, жёлто-красных глаз, тяжёлых век, длинных пальцев, санта-атрибутики.
   · kapushon — аноним в худи с рожками на капюшоне: лица нет, из темноты светятся глаза и ухмылка.
   · uhmyl — только лицо (глаза-осколки + улыбка лого).
   API: GV.mascot.mount(el, {pose, mood, char, bg}) → экземпляр {el, set(mood), react(ev), destroy()}
        GV.mascot.react(event)  — 'add' | 'subscribe' | 'empty' | 'error' | 'wave' | 'peek' | 'wink' | 'joy' | <mood>
        GV.mascot.svg(char, pose, mood) → строка SVG (листы, экспорт)
   Слоты: [data-mascot-slot="preloader|hero|404|cart|menu|footer"] монтируются сами (и те, что появятся позже).
   Поза/настроение слота можно задать атрибутами data-mascot-pose / data-mascot-mood / data-mascot-bg="light".
   Анимация: только transform/opacity внутри SVG (GSAP, если есть; иначе WAAPI). Один rAF-цикл на модуль —
   работает, только пока курсор двигается и маскот на экране. reduced-motion и ?shot=1 — статично. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var GV = (window.GV = window.GV || {});

  /* новый логотип (logo_p1.svg, стр. 1 Grinchin2.pdf): улыбка с рожками и буквы, 1649×447, целые координаты */
  var LOGO={w:1649,h:447,smile:"M1635,226C1631,237 1628,247 1624,257C1611,292 1590,320 1561,344C1531,369 1496,385 1458,396C1425,404 1391,408 1357,408C1305,409 1254,405 1203,400C1159,395 1115,390 1070,390C1020,388 970,394 921,406C894,413 867,422 842,436C836,439 831,443 825,446C821,444 817,441 813,438C793,426 771,417 748,411C706,399 662,392 618,390C580,388 543,391 506,394C466,398 427,402 388,405C344,409 300,410 256,407C211,403 168,392 129,371C90,350 59,322 38,283C29,267 22,250 17,232C17,230 16,228 16,226C11,240 9,268 9,268C9,268 5,250 4,240C0,204 2,169 9,133C17,89 46,2 47,0C67,51 86,101 105,151C105,151 71,113 53,92C52,97 51,100 50,103C37,150 42,197 64,241C80,272 102,295 131,314C159,332 191,343 224,350C252,355 281,358 310,358C346,358 382,357 418,356C451,356 484,354 517,353C552,352 586,353 621,358C666,364 711,374 754,392C773,400 791,410 807,425C813,431 819,438 825,445C827,442 829,440 830,438C841,424 855,414 870,405C896,390 923,381 952,373C979,366 1007,360 1035,357C1068,354 1100,352 1133,353C1166,354 1199,355 1232,356C1277,358 1322,359 1367,356C1403,354 1438,349 1472,337C1503,326 1532,309 1555,284C1583,255 1600,219 1605,179C1609,152 1606,126 1599,100C1599,98 1598,96 1597,93C1579,112 1563,132 1546,152L1545,151L1603,0C1604,3 1604,4 1605,6C1619,46 1632,87 1640,129C1646,158 1649,186 1648,215C1647,232 1646,248 1642,264C1642,265 1641,267 1640,268C1639,254 1638,240 1635,226Z M1635,226",letters:"M633,65C633,65 713,150 752,194L744,194C748,202 776,236 788,246C788,229 786,213 785,197C784,180 783,164 782,147C780,131 779,115 778,98L833,120C835,204 839,287 844,372L763,310L768,305C738,265 678,182 678,182L684,337L628,302Z M633,65 M1484,69L1525,89L1522,287L1385,162C1385,162 1388,232 1389,267C1389,270 1390,273 1392,276C1392,278 1394,280 1395,281L1329,316C1330,302 1331,290 1332,278C1337,206 1340,135 1339,64C1339,58 1339,52 1339,46C1382,79 1413,115 1456,150L1447,150C1458,167 1469,182 1484,196Z M1484,69 M588,324L466,302L470,295L408,236C408,236 409,268 411,285L352,324C356,284 357,245 358,206C359,166 355,88 355,88C355,88 410,94 435,96C456,98 500,100 500,100L532,137L522,188L457,219Z M408,196C431,187 453,176 474,166C472,158 470,149 466,142L408,135Z M408,196 M246,314L189,286L175,296C154,263 135,230 115,196C118,188 122,179 126,171C132,157 138,142 144,128C145,126 146,124 148,122C164,105 181,88 198,72C199,70 201,68 204,68C244,54 285,42 326,29C327,28 329,28 331,28C331,34 328,107 328,107L270,128L282,108L195,138L163,181L222,251L279,202L238,188L336,149L334,244L311,221Z M246,314 M1002,147C1002,147 985,136 974,129C972,127 970,128 969,129C950,139 914,161 910,164C909,164 908,166 907,167C907,168 906,169 907,171C907,190 906,250 906,250L935,292L1001,266L981,247L1042,225C1042,225 1031,284 1026,313C989,324 951,331 916,348C910,340 903,332 897,325C885,309 872,294 860,278C859,276 859,274 859,272C858,261 858,251 858,240C857,222 856,204 856,186C856,183 856,180 857,178C863,158 876,120 876,120C876,120 986,61 987,60C1006,78 1040,117 1040,117L1034,145L994,160Z M1002,147 M1177,217C1154,222 1132,227 1110,234L1110,298C1110,298 1052,318 1052,318C1056,306 1056,294 1057,283C1060,241 1061,198 1060,156C1060,143 1058,114 1058,114L1117,104C1117,104 1113,121 1113,129C1112,147 1111,165 1111,183C1110,185 1111,186 1111,189L1176,171C1176,169 1176,167 1176,165C1176,145 1175,125 1174,106C1174,102 1173,98 1172,95C1172,93 1171,91 1170,88L1237,110C1230,121 1230,133 1230,145C1230,168 1229,190 1229,213C1230,240 1232,266 1234,293C1234,297 1236,301 1237,306C1216,305 1177,315 1177,315Z M1177,217 M600,97C600,97 602,242 607,314C600,309 558,275 558,275L554,113Z M600,97 M608,90L562,34C559,57 556,71 553,93L578,84Z M608,90 M1261,118C1276,112 1289,108 1306,102L1306,283L1256,310C1258,248 1259,179 1261,118Z M1261,118 M1316,96C1301,78 1286,59 1271,40C1267,63 1264,77 1261,99L1286,90Z M1316,96"};

  /* ---------- утилиты ---------- */
  var uid = 0;
  function nid(p) { return "mz" + p + (++uid); }
  function P(dd, cls, ex) { return '<path d="' + dd + '" class="' + cls + '"' + (ex ? " " + ex : "") + "/>"; }
  function S(dd, w, cls, ex) { // штрих
    return '<path d="' + dd + '" class="' + cls + '" fill="none" stroke-width="' + w + '"' + (ex ? " " + ex : "") + "/>";
  }
  // «конечность»: чёрный контур + цвет поверх — гладкий безье без ручной обводки
  function limb(dd, w, cls, hi) {
    return S(dd, w + 12, "sk") + S(dd, w, "s-" + cls) + (hi ? S(dd, 6, "s-hi", 'opacity=".5" transform="translate(-' + (w * 0.22).toFixed(1) + ',-2)" stroke-dasharray="0 ' + (w * 0.9).toFixed(0) + ' 999"') : "");
  }
  function pts(a) { return a.map(function (p) { return p[0] + "," + p[1]; }).join(" "); }
  function G(inner, attrs) { return "<g" + (attrs ? " " + attrs : "") + ">" + inner + "</g>"; }
  function mirror(s) { return G(s, 'transform="translate(600,0) scale(-1,1)"'); }

  var MOODS = ["smirk", "wink", "grumpy", "joy", "sad"];

  /* ---------- рот: улыбка лого ----------
     Полоса улыбки — нижняя губа. Над ней полость: снизу верхняя кромка полосы (замер по контуру logo_p1),
     сверху — губа-дуга. Зубы — рубленая полоса с насечками (как зазубрины букв). */
  var EDGE = [[110,299],[140,320],[170,334],[200,344],[230,351],[260,355],[290,358],[320,358],[350,358],[380,358],[410,357],[440,356],[470,355],[500,354],[530,353],[560,354],[590,355],[620,358],[650,363],[680,369],[710,377],[740,387],[770,400],[800,419],[825,437],[850,418],[890,395],[920,383],[950,374],[980,367],[1010,361],[1040,357],[1070,355],[1100,353],[1130,353],[1160,354],[1190,355],[1220,356],[1250,357],[1280,358],[1310,359],[1340,358],[1370,357],[1400,354],[1430,349],[1460,342],[1490,330],[1520,314],[1540,299]];
  function qy(t, a, c, b) { return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b; }
  function lipAt(x, cx, cy) { // квадратичная губа от EDGE[0] до EDGE[last] через (cx,cy) — y по x (через t по x)
    var x0 = EDGE[0][0], x1 = EDGE[EDGE.length - 1][0], y0 = EDGE[0][1], y1 = EDGE[EDGE.length - 1][1];
    // решаем x(t)=x для квадратичной кривой численно (монотонна)
    var lo = 0, hi = 1, t = 0.5;
    for (var i = 0; i < 18; i++) { t = (lo + hi) / 2; if (qy(t, x0, cx, x1) < x) lo = t; else hi = t; }
    return qy(t, y0, cy, y1);
  }
  /* o: {band:'k'|'l', cav:'k', teeth:'w'|'l'|null, lipX, lipY, open, flip, scale, rot, tx, ty, out} */
  function mouth(cx, cy, w, mood, kind) {
    var k = w / LOGO.w, h = LOGO.h * k;
    var band = kind === "g" ? "k" : "l", teethC = kind === "k" ? "l" : "w", outline = kind !== "g";
    var lipX = 1100, lipY = -40, teeth = "top", cav = true, flip = false, sx = 1, sy = 1, rot = -2, dx = 0, dy = 0;
    if (mood === "wink") { rot = -6; lipX = 1160; lipY = -60; dx = 6; }
    if (mood === "joy") { lipX = 825; lipY = -170; sx = 1.04; sy = 1.32; dy = 4; rot = 0; }
    if (mood === "grumpy") { flip = true; sx = 0.86; lipX = 825; lipY = 250; teeth = "full"; dy = 10; }
    if (mood === "sad") { flip = true; sx = 0.66; cav = false; dy = 16; }
    var cid = nid("c"), s = "";
    var x0 = EDGE[0], x1 = EDGE[EDGE.length - 1];
    var cavD = "M" + x0[0] + "," + x0[1] + " Q" + lipX + "," + lipY + " " + x1[0] + "," + x1[1] + " L" + pts(EDGE.slice().reverse()).replace(/ /g, " L") + "Z";
    if (cav) {
      var th = "";
      if (teeth === "top") {
        var top = [], bot = [], n = 12;
        for (var i = 0; i <= 40; i++) { var xx = x0[0] + (x1[0] - x0[0]) * i / 40; top.push([xx.toFixed(0), (lipAt(xx, lipX, lipY) - 6).toFixed(0)]); }
        for (var j = n; j >= 0; j--) {
          var tx = x0[0] + (x1[0] - x0[0]) * j / n;
          bot.push([tx.toFixed(0), (lipAt(tx, lipX, lipY) + (j % 2 ? 34 : 58)).toFixed(0)]);
        }
        th = '<polygon points="' + pts(top.concat(bot)) + '" class="' + teethC + '"/>';
        for (var m = 1; m < n; m += 2) {
          var lx = x0[0] + (x1[0] - x0[0]) * m / n, ly = lipAt(lx, lipX, lipY);
          th += S("M" + lx.toFixed(0) + "," + (ly - 4).toFixed(0) + " L" + (lx + 8).toFixed(0) + "," + (ly + 40).toFixed(0), 9, "sk");
        }
        th += '<polygon points="700,392 742,390 724,352" class="' + teethC + '"/><polygon points="908,390 950,392 926,352" class="' + teethC + '"/>';
      } else if (teeth === "full") {
        th = '<rect x="0" y="0" width="1649" height="447" class="' + teethC + '"/>';
        for (var q = 1; q < 11; q++) { var qx = 140 + q * 125; th += S("M" + qx + ",200 L" + (qx + 6) + ",447", 10, "sk"); }
        th += S("M100,372 L1560,372", 9, "sk", 'opacity=".55"');
      }
      if (kind === "g" && teeth === "top") th = '<ellipse cx="900" cy="420" rx="230" ry="80" class="tg"/>' + th;
      s += P(cavD, kind === "k" ? "k cav-l" : kind === "g" ? "in o" : "k o", 'stroke-width="' + (6 / k).toFixed(0) + '"');
      s += '<clipPath id="' + cid + '"><path d="' + cavD + '"/></clipPath>' + G(th, 'clip-path="url(#' + cid + ')"');
    }
    s += P(LOGO.smile, band + (outline ? " o" : ""), outline ? 'stroke-width="' + (5 / k).toFixed(0) + '" paint-order="stroke"' : "");
    var tr = "translate(" + (cx + dx) + "," + (cy + dy) + ") rotate(" + rot + ")" + " scale(" + (k * sx).toFixed(4) + "," + (k * sy * (flip ? -0.8 : 1)).toFixed(4) + ") translate(" + (-LOGO.w / 2) + "," + (-LOGO.h / 2) + ")";
    return G(s, 'class="mz-mouth" transform="' + tr + '"');
  }

  /* ---------- глаз-осколок ----------
     side: -1 левый (для зрителя), +1 правый; локальная −x — к переносице. Веко — ровный срез, не «тяжёлое». */
  var EYE = [[-1.0, 0.05], [-0.55, -0.6], [0.6, -0.72], [1.06, -0.18], [0.72, 0.52], [-0.38, 0.62]];
  var LIDS = {
    smirk: [[-1.6, -2], [1.6, -2], [1.6, -0.6], [-1.6, 0.0]],
    grumpy: [[-1.6, -2], [1.6, -2], [1.6, -0.12], [-1.6, -0.02]],
    sad: [[-1.6, -2], [1.6, -2], [1.6, -0.1], [-1.6, -0.62]]
  };
  var BROWS = {
    smirk: [[-1.25, -0.72], [1.2, -1.38], [1.24, -1.06], [-1.2, -0.42]],
    wink: [[-1.25, -0.5], [1.2, -0.95], [1.24, -0.66], [-1.2, -0.22]],
    grumpy: [[-1.3, -0.4], [1.15, -1.5], [1.22, -1.16], [-1.24, -0.1]],
    sad: [[-1.15, -1.5], [1.2, -0.98], [1.22, -0.68], [-1.1, -1.18]],
    joy: [[-1.15, -1.32], [1.15, -1.46], [1.17, -1.16], [-1.13, -1.04]]
  };
  function eye(cx, cy, s, side, mood, kind, opt) {
    opt = opt || {};
    var sw = (kind === "k" ? 0 : 5.5) / s;
    var white = kind === "k" ? "l" : "w", lidC = kind === "g" ? "l" : "k";
    var tr = 'transform="translate(' + cx + "," + cy + ") scale(" + (s * side) + "," + s + ')"';
    var inner = "";
    if (mood === "wink" && opt.wink || mood === "joy") {
      var dd = mood === "joy" ? "M-0.95,0.32 Q0.05,-0.82 1.0,0.26" : "M-1.0,0.12 L0.0,-0.4 L1.02,0.08";
      inner = S(dd, kind === "k" ? 0.34 : 0.36, kind === "k" ? "s-l" : (kind === "u" ? "s-w" : "sk"), 'stroke-linecap="round" stroke-linejoin="round"');
      if (kind === "u") inner = S(dd, 0.58, "sk", 'stroke-linecap="round" stroke-linejoin="round"') + inner;
      return G(G(inner, tr), 'class="mz-eye"');
    }
    var cid = nid("e"), lid = LIDS[mood === "wink" ? "smirk" : mood] || null;
    var py = mood === "sad" ? 0.22 : mood === "grumpy" ? 0.16 : 0.1, px = -0.1;
    var pup = kind === "k" ? "" :
      G('<polygon points="' + pts([[px, py - 0.4], [px + 0.3, py], [px, py + 0.4], [px - 0.3, py]]) + '" class="k"/>' +
        '<rect x="' + (px - 0.02) + '" y="' + (py - 0.3) + '" width=".13" height=".13" class="w" transform="rotate(45 ' + (px + 0.04) + " " + (py - 0.24) + ')"/>', 'class="mz-pup"');
    inner += '<clipPath id="' + cid + '"><polygon points="' + pts(EYE) + '"/></clipPath>';
    inner += '<polygon points="' + pts(EYE) + '" class="' + white + '"/>';
    inner += G(pup + (lid ? '<polygon points="' + pts(lid) + '" class="' + lidC + '"/>' : ""), 'clip-path="url(#' + cid + ')"');
    if (lid && kind === "g") inner += S("M" + lid[3][0] + "," + lid[3][1] + " L" + lid[2][0] + "," + lid[2][1], sw * 1.3, "sk", 'clip-path="url(#' + cid + ')"');
    if (sw) inner += '<polygon points="' + pts(EYE) + '" fill="none" class="sk" stroke-width="' + sw.toFixed(3) + '" stroke-linejoin="miter"/>';
    return G(G(inner, tr), 'class="mz-eye"');
  }
  function brow(cx, cy, s, side, mood) {
    var b = BROWS[mood] || BROWS.smirk;
    return '<polygon points="' + pts(b) + '" class="k" transform="translate(' + cx + "," + cy + ") scale(" + (s * side) + "," + s + ')"/>';
  }

  /* лицо одного настроения: kind g | k | u */
  function face(F, mood, kind) {
    var s = "";
    if (F.brows) {
      s += brow(F.cx - F.gap, F.ey, F.es, -1, mood === "wink" ? "smirk" : mood);
      s += brow(F.cx + F.gap, F.ey, F.es, 1, mood);
    }
    s += eye(F.cx - F.gap, F.ey, F.es, -1, mood, kind);
    s += eye(F.cx + F.gap, F.ey, F.es, 1, mood, kind, { wink: true });
    s += mouth(F.cx, F.my, F.mw, mood, kind);
    return s;
  }
  function faces(F, kind, glow) {
    var s = "";
    MOODS.forEach(function (m) {
      var f = face(F, m, kind);
      // ореол строим отдельной копией (свои id у clipPath — без дублей)
      s += G((glow ? G(face(F, m, kind), 'class="mz-glow"') : "") + f, 'class="mz-mood" data-m="' + m + '"');
    });
    return G(s, 'class="mz-face"');
  }

  /* ---------- части тела (система 600×800, плечи y≈405, земля y≈786) ---------- */
  var TORSO = "M232,400 C188,404 150,416 134,448 C116,486 110,560 112,640 C112,660 124,672 144,672 L456,672 C476,672 488,660 488,640 C490,560 484,486 466,448 C450,416 412,404 368,400 Z";
  function shadow(y) { return '<ellipse cx="300" cy="' + (y || 786) + '" rx="176" ry="15" class="sh"/>'; }
  function sneaker() {
    return P("M188,756 C186,734 204,724 228,724 L282,724 C298,724 306,736 306,752 L306,762 L188,762 Z", "w o", 'stroke-width="6"') +
      S("M232,732 L252,748 M250,727 L270,743", 4.5, "sk", 'stroke-linecap="round"') +
      S("M198,748 C210,740 222,740 232,746", 3, "s-k4") +
      P("M180,758 L312,758 L312,772 C312,781 306,787 297,787 L194,787 C186,787 180,781 180,772 Z", "l o", 'stroke-width="6"') +
      S("M186,770 L306,770", 3, "s-ld");
  }
  function legs(kind) {
    var pants = "k3";
    return P("M224,646 L294,646 L291,746 C272,752 240,752 226,748 Z", pants + " o", 'stroke-width="6"') +
      P("M306,646 L376,646 L374,748 C360,752 328,752 309,746 Z", pants + " o", 'stroke-width="6"') +
      S("M244,676 C250,700 248,720 242,736 M356,676 C350,700 352,720 358,736", 3, "s-k4") +
      sneaker() + mirror(sneaker());
  }
  // худи: тело, манжета, карман; принт по персонажу
  function torso(kind) {
    var s = P(TORSO, "k2 o", 'stroke-width="7"') +
      P("M440,430 C478,470 492,560 488,640 C488,660 478,670 462,672 L446,672 C464,600 466,500 440,430 Z", "k") +
      S("M142,492 C132,540 129,598 131,636", 9, "s-k4", 'stroke-linecap="round" opacity=".85"') +
      S("M114,646 L486,646", 4.5, "sk");
    for (var i = 0; i < 25; i++) s += S("M" + (128 + i * 14.4).toFixed(1) + ",652 L" + (128 + i * 14.4).toFixed(1) + ",668", 2.4, "s-k4", 'opacity=".75"');
    s += P("M204,584 L396,584 L422,644 L178,644 Z", "k2 o", 'stroke-width="5"') +
      S("M212,594 L388,594", 2.5, "s-k4", 'stroke-dasharray="7 6"') +
      P("M396,584 L422,644 L404,644 L382,590 Z", "k", 'opacity=".7"');
    if (kind === "g") {
      // принт: новый логотип лаймом + IGNORE THE SIGNS
      s += G(P(LOGO.letters, "l") + P(LOGO.smile, "l"), 'transform="translate(206,505) scale(.114)"') +
        '<text x="300" y="574" text-anchor="middle" class="mz-tx">IGNORE THE SIGNS</text>';
    } else if (kind === "k") {
      s += G(P(LOGO.smile, "l"), 'transform="translate(330,470) scale(.06)"');
    }
    return s;
  }
  // капюшон, лежащий на плечах (Гринчин)
  function collar(bare) {
    var s = P("M150,418 C150,376 210,352 300,352 C390,352 450,376 450,418 Z", "k2 o", 'stroke-width="6"') +
      P("M152,404 C172,454 234,478 300,478 C366,478 428,454 448,404 C414,432 362,446 300,446 C238,446 186,432 152,404 Z", "k3 o", 'stroke-width="6"');
    if (bare) return s;
    return s +
      S("M272,466 C268,478 274,490 268,500", 5.5, "s-w", 'stroke-linecap="round"') +
      S("M328,466 C334,480 326,488 332,500", 5.5, "s-w", 'stroke-linecap="round"') +
      '<rect x="262" y="494" width="11" height="17" rx="2" class="l o" stroke-width="3" transform="rotate(6 268 502)"/>' +
      '<rect x="327" y="494" width="11" height="17" rx="2" class="l o" stroke-width="3" transform="rotate(-5 332 502)"/>';
  }

  /* ---------- голова Гринчина ----------
     Форма «той»: широкая гладкая «капля», без шеи. Рожки — с зазубриной, как концы улыбки лого. */
  var HEAD = "M300,94 C414,94 486,170 491,264 C496,340 468,398 416,422 C374,440 226,440 184,422 C132,398 104,340 109,264 C114,170 186,94 300,94 Z";
  function horn() {
    // рог изгибается наружу и вверх; на внутренней кромке — зазубрина, как у концов улыбки лого
    return P("M216,140 C190,126 166,100 168,66 C169,48 176,32 188,16 C190,38 194,54 204,68 L216,60 L220,84 C234,98 250,110 266,120 C248,122 230,128 216,140 Z", "ld o", 'stroke-width="6"') +
      S("M180,70 C179,56 182,44 186,34", 5, "s-ll", 'stroke-linecap="round" opacity=".75"');
  }
  var FACE_G = { cx: 300, ey: 250, gap: 66, es: 37, my: 344, mw: 262, brows: true };
  function headG() {
    return horn() + mirror(horn()) +
      P(HEAD, "l o", 'stroke-width="7"') +
      P("M420,124 C470,164 492,226 490,284 C488,350 462,398 414,422 C446,382 458,334 456,280 C454,218 444,164 420,124 Z", "ld") +
      P("M150,374 C186,414 238,428 300,428 C362,428 414,414 450,374 C428,420 372,436 300,436 C228,436 172,420 150,374 Z", "ld", 'opacity=".85"') +
      '<ellipse cx="196" cy="168" rx="46" ry="22" class="w" opacity=".42" transform="rotate(-34 196 168)"/>' +
      '<circle cx="236" cy="134" r="7" class="w" opacity=".5"/>' +
      S(HEAD, 7, "sk") +
      faces(FACE_G, "g");
  }

  /* ---------- капюшон Капюшона ---------- */
  var FACE_K = { cx: 300, ey: 252, gap: 54, es: 31, my: 322, mw: 214, brows: false };
  function hornK() {
    return P("M362,92 C390,62 410,30 414,-12 C438,26 446,78 430,122 C414,108 390,98 362,92 Z", "l o", 'stroke-width="6"') +
      P("M414,-12 C434,28 440,76 430,122 C422,116 414,110 406,106 C420,68 422,28 414,-12 Z", "ld") +
      S("M396,62 C401,52 405,40 407,28", 5, "s-ll", 'stroke-linecap="round" opacity=".6"');
  }
  function hoodK(glowId) {
    return hornK() + mirror(hornK()) +
      P("M300,62 C418,62 496,146 500,262 C504,350 470,410 410,432 C370,446 230,446 190,432 C130,410 96,350 100,262 C104,146 182,62 300,62 Z", "k2 o", 'stroke-width="7"') +
      P("M420,96 C480,140 504,220 500,290 C496,360 470,404 425,428 C460,380 470,320 466,260 C462,190 445,135 420,96 Z", "k") +
      S("M176,128 C146,165 130,210 127,256", 10, "s-k4", 'stroke-linecap="round" opacity=".85"') +
      S("M300,64 L300,138", 3, "s-k4", 'stroke-dasharray="8 6"') +
      P("M300,136 C384,136 436,200 438,274 C440,350 386,404 300,404 C214,404 160,350 162,274 C164,200 216,136 300,136 Z", "k3 o", 'stroke-width="6"') +
      P("M300,158 C370,158 414,212 416,276 C418,344 372,388 300,388 C228,388 182,344 184,276 C186,212 230,158 300,158 Z", "kk") +
      '<ellipse cx="300" cy="286" rx="112" ry="96" fill="url(#' + glowId + 'r)"/>' +
      faces(FACE_K, "k", true); // свечение — ореол обводкой, без feGaussianBlur (фильтр перерисовывается каждый кадр)
  }
  function hoodDefs(glowId) {
    return '<radialGradient id="' + glowId + 'r"><stop offset="0" class="gs" stop-opacity=".26"/><stop offset="1" class="gs" stop-opacity="0"/></radialGradient>' +
      '';
  }
  function stringsK() {
    return S("M272,398 C266,430 276,456 268,484", 6, "s-w", 'stroke-linecap="round"') +
      S("M328,398 C336,432 324,452 334,490", 6, "s-w", 'stroke-linecap="round"') +
      '<rect x="262" y="480" width="12" height="20" rx="2" class="l o" stroke-width="3" transform="rotate(8 268 490)"/>' +
      '<rect x="328" y="486" width="12" height="20" rx="2" class="l o" stroke-width="3" transform="rotate(-6 334 496)"/>';
  }

  /* ---------- Ухмыл: лицо без тела (600×340) ---------- */
  var FACE_U = { cx: 300, ey: 118, gap: 84, es: 48, my: 236, mw: 360, brows: false };

  /* ---------- руки ---------- */
  // кисть-варежка (Гринчин — лайм, Капюшон — тёмная перчатка): короткие толстые пальцы
  function handOpen(x, y, rot, c) {
    var parts = [
      '<circle cx="0" cy="8" r="27"/>',
      '<rect x="-27" y="-36" width="19" height="40" rx="9.5" transform="rotate(-14 -18 0)"/>',
      '<rect x="-9" y="-44" width="19" height="46" rx="9.5"/>',
      '<rect x="10" y="-38" width="19" height="42" rx="9.5" transform="rotate(14 19 0)"/>',
      '<rect x="18" y="-6" width="34" height="18" rx="9" transform="rotate(-28 20 4)"/>'
    ].join("");
    return G(G(parts, 'class="sk" stroke-width="11"') + G(parts, 'class="' + c + '"') +
      S("M-12,24 C-4,30 8,30 16,24", 3, c === "l" ? "s-ld" : "s-k4"), 'transform="translate(' + x + "," + y + ") rotate(" + rot + ')"');
  }
  function fist(x, y, rot, c) {
    var b = "M-30,-20 C-30,-32 -22,-38 -10,-38 L16,-38 C30,-38 34,-28 34,-14 L34,14 C34,28 26,36 12,36 L-12,36 C-26,36 -31,26 -31,12 Z";
    return G(P(b, c + " o", 'stroke-width="6"') +
      S("M-30,-12 C-14,-14 2,-14 14,-12 M-30,6 C-14,4 2,4 14,6 M-28,22 C-14,20 0,20 12,22", 3.5, "sk", 'stroke-linecap="round"') +
      P("M18,-32 C36,-38 46,-18 34,-6 C28,0 20,-4 18,-12 Z", c + " o", 'stroke-width="5"'),
      'transform="translate(' + x + "," + y + ") rotate(" + rot + ')"');
  }
  // маркер: толстый, лаймовый колпачок, бирка «G»
  function marker(x, y, rot) {
    return G('<rect x="-17" y="-72" width="34" height="132" rx="7" class="k o" stroke-width="6"/>' +
      '<rect x="-17" y="-108" width="34" height="40" rx="7" class="l o" stroke-width="6"/>' +
      '<rect x="-11" y="-104" width="7" height="30" rx="3" class="w" opacity=".45"/>' +
      '<rect x="-17" y="-28" width="34" height="26" class="w"/>' +
      '<text x="0" y="-9" text-anchor="middle" class="mz-tm">G</text>' +
      S("M-10,-64 L-10,52", 4, "s-k4", 'opacity=".9"'),
      'transform="translate(' + x + "," + y + ") rotate(" + rot + ')"');
  }
  // хват за край ленты: три пальца поверх кромки (y=0 — кромка)
  function grip(x, y, c) {
    var parts = '<rect x="-34" y="-20" width="68" height="40" rx="18"/>' +
      '<rect x="-30" y="-6" width="18" height="34" rx="9"/><rect x="-9" y="-4" width="18" height="36" rx="9"/><rect x="12" y="-6" width="18" height="34" rx="9"/>';
    return G(G(parts, 'class="sk" stroke-width="11"') + G(parts, 'class="' + c + '"') +
      S("M-12,0 L-12,22 M9,2 L9,24", 3, c === "l" ? "s-ld" : "s-k4"), 'transform="translate(' + x + "," + y + ')"');
  }

  /* ---------- лента ограждения (для «выглядывает») ---------- */
  // Векторная лента — запасной вариант вне сборки (листы, тесты). На сайте в позе peek ленты — растровые полосы K3
  // (.tape-strip--lime / --black, скан настоящего скотча) HTML-слоями вокруг SVG: см. peekHTML().
  var rasterK3 = null;
  function rasterOK() {
    if (rasterK3 === null) {
      var t = d.createElement("span"); t.className = "tape-strip tape-strip--lime"; t.style.display = "none";
      (d.body || root).appendChild(t);
      rasterK3 = !!getComputedStyle(t).getPropertyValue("--strip").trim();
      t.remove();
    }
    return rasterK3;
  }
  function tape(y, rot, fill, ink, id) {
    var word = "", n = 30;
    for (var i = 0; i < n; i++) word += '<use href="#' + id + 'w" x="' + (-3000 + i * 210) + '" y="0"/>';
    return G('<rect x="-3200" y="-34" width="7000" height="68" class="' + fill + '"/>' +
      '<rect x="-3200" y="-34" width="7000" height="9" class="w" opacity=".18"/>' +
      '<rect x="-3200" y="25" width="7000" height="9" class="k" opacity=".22"/>' +
      G(word, 'class="' + ink + '"'), 'class="mz-tape" transform="translate(300,' + y + ") rotate(" + rot + ')"');
  }
  function tapeDefs(id) {
    return '<symbol id="' + id + 'w" overflow="visible"><g transform="translate(0,-21) scale(.118) translate(-115,-28)"><path d="' + LOGO.letters + '"/></g></symbol>';
  }

  /* ---------- позы ----------
     hero  — в полный рост, маркер поднят, рисует стрелку ↗ (600×800)
     stand — в полный рост, маркер у плеча (600×800)
     wave  — по пояс, машет (600×640)
     peek  — выглядывает из-за ленты ограждения (600×560, лента уходит за края — контейнер обрезает)
     sit   — сидит, ноги свисают; линия сиденья y=694 (600×800)
     head  — голова и плечи (600×540) */
  var VB = { hero: "0 -20 600 820", stand: "0 0 600 800", wave: "0 0 600 640", peek: "0 0 600 560", sit: "0 0 600 800", head: "0 0 600 540" };
  var VBU = { peek: "0 0 600 400" };
  var SEAT = 694;

  function arms(kind, pose) {
    var c = kind === "g" ? "l" : "k3";
    var L = "", R = "";
    // правая (для зрителя) — в кармане / машет
    var pocketR = limb("M440,438 C474,470 488,520 476,560 C468,586 440,598 394,600", 54, "k2") + P("M368,584 L404,584 L398,612 L362,612 Z", "k2 o", 'stroke-width="5"');
    var pocketL = limb("M160,438 C126,470 112,520 124,560 C132,586 160,598 206,600", 54, "k2") + P("M196,584 L232,584 L238,612 L202,612 Z", "k2 o", 'stroke-width="5"');
    if (pose === "wave") {
      L = kind === "g" ? limb("M162,446 C116,458 88,494 96,528 C98,500 100,456 108,420", 52, "k2") + marker(104, 360, -8) + fist(104, 398, -6, c) : pocketL;
      R = limb("M440,448 C488,440 514,404 516,364 C518,336 520,316 522,300", 52, "k2") +
        G(handOpen(526, 262, 12, c), 'class="mz-hand"');
      return { back: "", front: L + R, waveArm: true };
    }
    if (pose === "hero") {
      L = limb("M160,446 C108,440 78,388 86,330 C90,300 96,276 104,258", 52, "k2") + marker(108, 196, 14) + fist(104, 236, 10, c);
      return { back: "", front: L + pocketR };
    }
    if (pose === "stand") {
      L = kind === "g" ? limb("M162,446 C116,458 88,494 96,528 C98,500 100,456 108,420", 52, "k2") + marker(104, 360, -8) + fist(104, 398, -6, c) : pocketL;
      return { back: "", front: L + pocketR };
    }
    if (pose === "sit") {
      L = limb("M160,446 C122,486 106,560 104,640 C104,664 106,680 110,690", 52, "k2") + fist(112, 694, 90, c);
      R = limb("M440,446 C478,486 494,560 496,640 C496,664 494,680 490,690", 52, "k2") + G(fist(0, 0, 90, c), 'transform="translate(488,694) scale(-1,1)"');
      return { back: "", front: L + R };
    }
    return { back: "", front: pocketL + pocketR }; // head
  }
  function sitLegs() {
    var one = P("M214,664 C214,640 232,628 260,628 C290,628 300,646 298,676 L294,700 C292,712 282,718 268,718 L234,718 C220,718 212,708 212,694 Z", "k3 o", 'stroke-width="6"') +
      limb("M256,710 C256,734 254,750 252,764", 50, "k3") +
      G(sneaker(), 'transform="translate(0,26) scale(1,.92)" transform-origin="250 760"');
    return one + mirror(one);
  }
  function marks(kind) { // нарисованная маркером стрелка ↗ (hero): от кончика маркера вверх-вправо, мимо знаков
    return G(S("M126,92 C178,40 262,30 336,46 C404,60 452,52 528,8", 16, "s-l", 'stroke-linecap="round"') +
      S("M478,4 L530,6 L512,54", 16, "s-l", 'stroke-linecap="round" stroke-linejoin="round"'), 'class="mz-arrow"');
  }
  function bodyG(pose, kind, gid) {
    var a = arms(kind, pose), s = "", hd = kind === "g" ? collar() + headG() : hoodK(gid) + "";
    if (pose === "peek") {
      var head = kind === "g" ? collar() + headG() : hoodK(gid);
      var c = kind === "g" ? "l" : "k3";
      var clip = nid("p");
      return '<clipPath id="' + clip + '"><rect x="-200" y="-200" width="1000" height="' + (200 + 452) + '"/></clipPath>' +
        tape(378, -4, "k", "w", gid) +
        G(G(head, 'class="mz-rise" transform="translate(0,10)"'), 'clip-path="url(#' + clip + ')"') +
        tape(462, 3, kind === "g" ? "k3" : "l", kind === "g" ? "l" : "k", gid) +
        G(grip(206, 430, c) + grip(394, 426, c), 'class="mz-grip"');
    }
    if (pose === "sit") {
      return torso(kind) + (kind === "k" ? stringsK() : "") + sitLegs() + a.front + hd;
    }
    if (pose === "head") { // значок: голова на воротнике (Гринчин) / капюшон целиком — без обрезанного торса
      return kind === "g" ? collar(true) + headG() : hoodK(gid);
    }
    s += shadow() + legs(kind) + torso(kind) + (kind === "k" ? stringsK() : "") + a.front + hd;
    if (pose === "hero") s = marks(kind) + s;
    return s;
  }
  function bodyU(pose, gid) {
    if (pose === "peek") {
      var clip = nid("p");
      return '<clipPath id="' + clip + '"><rect x="-200" y="-200" width="1000" height="' + (200 + 340) + '"/></clipPath>' +
        G(G(faces(FACE_U, "u"), 'class="mz-rise" transform="translate(0,30)"'), 'clip-path="url(#' + clip + ')"') +
        tape(366, 3, "l", "k", gid);
    }
    return faces(FACE_U, "u");
  }

  /* «выглядывает» на сайте: слои задняя лента (растр K3) → голова (SVG, двигается) → передняя лента (растр) → кисти (SVG).
     Ленты — HTML-полосы, а не узор внутри SVG: узор с картинкой перерисовывался вместе с головой — кадр 150–200 мс при CPU ×4. */
  function peekHTML(ch, mood) {
    var u = ch === "uhmyl", kind = ch === "grinchin" ? "g" : "k", gid = nid("g");
    var H = u ? 400 : 560, cut = u ? 340 : 452, ty = u ? 30 : 10, clip = nid("p"), c = kind === "g" ? "l" : "k3";
    var vb = "0 0 600 " + H, head = u ? faces(FACE_U, "u") : kind === "g" ? collar() + headG() : hoodK(gid);
    var strip = function (cls, y, rot, z) {
      return '<span class="tape-strip tape-strip--' + cls + ' mz-strip" style="top:' + (y / H * 100).toFixed(2) + "%;height:" + (68 / H * 100).toFixed(2) + "%;--r:" + rot + "deg;z-index:" + z + '"></span>';
    };
    return '<div class="mz-peek">' + (u ? "" : strip("black", 378, -4, 1)) +
      '<svg class="mz-svg mz-head" viewBox="' + vb + '" data-char="' + ch + '" data-pose="peek" data-mood="' + mood + '" overflow="visible" aria-hidden="true" focusable="false">' +
        "<defs>" + (kind === "k" && !u ? hoodDefs(gid) : "") + '<clipPath id="' + clip + '"><rect x="-200" y="-200" width="1000" height="' + (200 + cut) + '"/></clipPath></defs>' +
        G(G(head, 'class="mz-rise" transform="translate(0,' + ty + ')"'), 'clip-path="url(#' + clip + ')"') + "</svg>" +
      strip("lime", u ? 366 : 462, 3, 3) +
      (u ? "" : '<svg class="mz-hands" viewBox="' + vb + '" overflow="visible" aria-hidden="true" focusable="false">' + G(grip(206, 430, c) + grip(394, 426, c), 'class="mz-grip"') + "</svg>") +
      "</div>";
  }
  function svg(ch, pose, mood, vector) {
    ch = ch === "kapushon" || ch === "uhmyl" ? ch : "grinchin";
    pose = VB[pose] ? pose : "stand";
    mood = MOODS.indexOf(mood) >= 0 ? mood : "smirk";
    if (pose === "peek" && !vector && rasterOK()) return peekHTML(ch, mood);
    var gid = nid("g"), body, vb;
    var defs = "<defs>" + tapeDefs(gid) + (ch === "kapushon" ? hoodDefs(gid) : "") + "</defs>";
    if (ch === "uhmyl") { body = bodyU(pose, gid); vb = VBU[pose] || "0 0 600 340"; }
    else { body = bodyG(pose, ch === "grinchin" ? "g" : "k", gid); vb = pose === "head" ? (ch === "kapushon" ? "80 -24 440 480" : "84 6 432 484") : VB[pose]; }
    return '<svg class="mz-svg" viewBox="' + vb + '" data-char="' + ch + '" data-pose="' + pose + '" data-mood="' + mood +
      '" overflow="visible" aria-hidden="true" focusable="false">' + defs + body + "</svg>";
  }

  /* ======================= жизнь на странице ======================= */
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var fine = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : { matches: false };
  function still() { return mq.matches || root.dataset.shot === "1"; }
  var PRESET = { 1: "kapushon", 2: "grinchin", 3: "uhmyl", 4: "grinchin" };
  function axis() {
    var v = root.dataset.mascot;
    if (!v) { // режимы ещё не выставлены (K1) — берём из адреса, как сделает инлайн-скрипт
      try { var q = new URLSearchParams(location.search); v = q.get("mascot") || PRESET[q.get("m")] || "kapushon"; } catch (e) { v = "kapushon"; }
      root.dataset.mascot = v;
    }
    return v;
  }
  var SLOT = { preloader: ["head", "smirk"], hero: ["hero", "smirk"], "404": ["peek", "smirk"], cart: ["head", "sad"], menu: ["wave", "smirk"], footer: ["sit", "smirk"] };
  var inst = [];
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var m = e.target.__mz; if (m) { m.vis = e.isIntersecting; if (m.vis) m.fit(); } });
  }) : null;

  function gs() { return !still() && window.gsap ? window.gsap : null; }

  function Mascot(el, o) {
    o = o || {};
    var ch = o.char || axis();
    var slot0 = el.getAttribute("data-mascot-slot");
    if (ch === "none" && slot0 === "hero") ch = "grinchin"; // heroimg=mascot явно просит маскота вместо человека
    if (ch === "none") { el.hidden = true; return null; }
    if (el.__mz) el.__mz.destroy();
    var slot = el.getAttribute("data-mascot-slot") || "";
    var def = SLOT[slot] || ["stand", "smirk"];
    this.el = el; this.slot = slot; this.char = ch;
    var pose = o.pose || el.getAttribute("data-mascot-pose") || el.getAttribute("data-pose") || def[0];
    var mood = o.mood || el.getAttribute("data-mascot-mood") || def[1];
    this.pose = VB[pose] ? pose : (SLOT[pose] ? SLOT[pose][0] : def[0]); // позу можно назвать именем слота: cart, menu…
    this.mood = MOODS.indexOf(mood) >= 0 ? mood : def[1];                 // look и прочие незнакомые → базовое
    this.base = this.mood;
    el.classList.add("mz");
    el.dataset.mzChar = ch;
    if (o.bg || el.getAttribute("data-mascot-bg")) el.dataset.mzBg = o.bg || el.getAttribute("data-mascot-bg");
    el.innerHTML = svg(ch, this.pose, this.mood);
    this.svg = el.querySelector(".mz-svg");
    this.pups = Array.prototype.slice.call(this.svg.querySelectorAll(".mz-pup"));
    this.eyes = Array.prototype.slice.call(this.svg.querySelectorAll(".mz-eye"));
    this.px = 0; this.py = 0; this.tx = 0; this.ty = 0;
    this.vis = !io;
    this.fit();
    el.__mz = this;
    if (io) io.observe(el);
    inst.push(this);
  }
  // масштаб для ореола Капюшона (толщина обводки в px растёт с размером маскота)
  Mascot.prototype.fit = function () {
    var w = this.svg.getBoundingClientRect().width, vb = this.svg.viewBox.baseVal;
    if (w && vb && vb.width) this.el.style.setProperty("--mz-s", (w / vb.width).toFixed(3));
  };
  Mascot.prototype.set = function (mood) {
    if (MOODS.indexOf(mood) < 0 || mood === this.mood) return this;
    this.mood = mood;
    this.svg.setAttribute("data-mood", mood);
    var g = gs(), f = this.svg.querySelector('.mz-mood[data-m="' + mood + '"]');
    if (g && f && this.vis) g.fromTo(f, { scaleY: 0.86, transformOrigin: "50% 60%" }, { scaleY: 1, duration: 0.32, ease: "back.out(3)", overwrite: true });
    return this;
  };
  Mascot.prototype.pulse = function (mood, ms, then) { // настроение на время, потом назад
    var self = this; clearTimeout(this._t);
    this.set(mood);
    this._t = setTimeout(function () { self.set(then || self.base); }, ms || 1400);
  };
  Mascot.prototype.blink = function () {
    var g = gs(); if (!g || !this.vis || this.mood === "joy") return;
    var e = this.svg.querySelectorAll('.mz-mood[data-m="' + this.mood + '"] .mz-eye');
    g.fromTo(e, { scaleY: 1 }, { scaleY: 0.08, duration: 0.07, yoyo: true, repeat: 1, ease: "power1.in", transformOrigin: "50% 50%", overwrite: true });
  };
  Mascot.prototype.hop = function () {
    var g = gs(); if (!g || !this.vis) return;
    g.fromTo(this.svg, { y: 0 }, { y: -14, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out", overwrite: "auto" });
  };
  Mascot.prototype.wave = function () {
    var g = gs(), h = this.svg.querySelector(".mz-hand"); if (!g || !h) return;
    g.fromTo(h, { rotation: 0 }, { rotation: -22, duration: 0.16, yoyo: true, repeat: 5, ease: "sine.inOut", svgOrigin: "500 300", overwrite: true });
  };
  Mascot.prototype.peek = function () { this._peek(); };
  Mascot.prototype._peek = function () {
    var g = gs(), r = this.el.querySelector(".mz-rise"), gr = this.el.querySelector(".mz-grip"), self = this;
    if (!r) return;
    if (!g) { if (gr) gr.style.opacity = 1; return; }
    var tl = g.timeline({ defaults: { overwrite: true } });
    if (gr) tl.fromTo(gr, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.22, ease: "back.out(2)" }, 0.1);
    var y1 = this.char === "uhmyl" ? 30 : 10;
    tl.fromTo(r, { y: 300 }, { y: y1, duration: 0.55, ease: "back.out(1.4)" }, 0.2)
      .add(function () { self.lookAt(-0.9, 0.1); }, 0.85)
      .add(function () { self.lookAt(0.9, 0.1); }, 1.35)
      .add(function () { self.lookAt(0, 0); self.pulse("wink", 900, "smirk"); }, 1.85);
  };
  Mascot.prototype.lookAt = function (x, y) { this.tx = x; this.ty = y; kick(); };
  Mascot.prototype.react = function (ev) {
    switch (ev) {
      case "add": this.pulse("joy", 900, this.slot === "cart" ? "smirk" : this.base); this.hop();
        if (this.slot === "cart") this.base = "smirk";
        var s = this; setTimeout(function () { s.pulse("wink", 700, s.base); }, 950); break;
      case "subscribe": this.pulse("joy", 1800); this.hop(); break;
      case "empty": this.base = "sad"; this.set("sad"); break;
      case "error": this.pulse("grumpy", 1300); break;
      case "wave": this.pulse("joy", 1100); this.wave(); break;
      case "peek": this.peek(); break;
      case "blink": this.blink(); break;
      default: if (MOODS.indexOf(ev) >= 0) this.pulse(ev, 1200);
    }
    return this;
  };
  Mascot.prototype.destroy = function () {
    if (io) io.unobserve(this.el);
    var i = inst.indexOf(this); if (i >= 0) inst.splice(i, 1);
    this.el.__mz = null; this.el.innerHTML = "";
  };

  /* ---- глаза за курсором: один rAF, работает только пока есть что догонять ---- */
  var raf = 0, last = 0, mx = -1, my = -1;
  function kick() { if (!raf && !still()) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var k = 1 - Math.exp(-dt * 14), busy = false;
    for (var i = 0; i < inst.length; i++) {
      var m = inst[i]; if (!m.vis || !m.pups.length) continue;
      var nx = m.px + (m.tx - m.px) * k, ny = m.py + (m.ty - m.py) * k;
      if (Math.abs(nx - m.px) > 0.002 || Math.abs(ny - m.py) > 0.002) {
        busy = true; m.px = nx; m.py = ny;
        for (var j = 0; j < m.pups.length; j++) {
          // левый глаз зеркален (scale(-1,1)) — его x переворачиваем
          var flip = m.pups[j].__flip == null ? (m.pups[j].__flip = m.pups[j].closest(".mz-eye").firstChild.getAttribute("transform").indexOf("scale(-") >= 0) : m.pups[j].__flip;
          m.pups[j].setAttribute("transform", "translate(" + ((flip ? -nx : nx) * 0.36).toFixed(3) + "," + (ny * 0.22).toFixed(3) + ")");
        }
      }
    }
    if (busy) raf = requestAnimationFrame(tick);
  }
  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    for (var i = 0; i < inst.length; i++) {
      var m = inst[i]; if (!m.vis || !m.pups.length) continue;
      var r = m.svg.getBoundingClientRect();
      var ex = r.left + r.width / 2, ey = r.top + r.height * (m.pose === "peek" ? 0.4 : m.pose === "head" ? 0.45 : 0.3);
      var dx = mx - ex, dy = my - ey, L = Math.hypot(dx, dy) || 1, s = Math.min(1, L / 260);
      m.tx = dx / L * s; m.ty = dy / L * s;
    }
    kick();
  }

  /* ---- моргание: редкий таймер, только видимые ---- */
  var blinkT = 0;
  function blinkLoop() {
    blinkT = setTimeout(function () {
      if (!d.hidden) inst.forEach(function (m) { if (m.vis && Math.random() < 0.7) m.blink(); });
      blinkLoop();
    }, 2600 + Math.random() * 3400);
  }

  function each(fn, filter) { inst.slice().forEach(function (m) { if (!filter || filter(m)) fn(m); }); }

  function scan(ctx) {
    var list = (ctx || d).querySelectorAll ? (ctx || d).querySelectorAll("[data-mascot-slot]") : [];
    for (var i = 0; i < list.length; i++) if (!list[i].__mz && !list[i].hasAttribute("data-mascot-manual")) mount(list[i]);
  }
  function mount(el, o) { var m = new Mascot(el, o); return m.el ? m : null; }

  function init() {
    axis();
    scan();
    // слоты, появляющиеся позже (пустая корзина, меню) — дешёвый наблюдатель с пачкованием
    if ("MutationObserver" in window) {
      var pend = false;
      new MutationObserver(function (rs) {
        if (pend) return;
        for (var i = 0; i < rs.length; i++) {
          var a = rs[i].addedNodes;
          for (var j = 0; j < a.length; j++) {
            var n = a[j];
            if (n.nodeType === 1 && (n.hasAttribute("data-mascot-slot") || n.querySelector("[data-mascot-slot]"))) {
              pend = true; Promise.resolve().then(function () { pend = false; scan(); }); return;
            }
          }
        }
      }).observe(d.body, { childList: true, subtree: true });
    }
    var rz = 0;
    window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { each(function (m) { m.fit(); }); }, 150); });
    if (!still()) {
      if (fine.matches) window.addEventListener("pointermove", onMove, { passive: true });
      blinkLoop();
    }
    d.addEventListener("grinchin:add", function () { each(function (m) { m.react("add"); }, function (m) { return m.vis || m.slot === "cart"; }); });
    d.addEventListener("grinchin:cart", function (e) {
      var n = e.detail && e.detail.count;
      each(function (m) { if (!n) m.react("empty"); else if (m.base === "sad") { m.base = "smirk"; m.set("smirk"); } }, function (m) { return m.slot === "cart"; });
    });
    d.addEventListener("grinchin:subscribe", function () { each(function (m) { m.react("subscribe"); }, function (m) { return m.vis; }); });
    d.addEventListener("grinchin:overlay", function (e) {
      var x = e.detail || {};
      if (!x.open) return;
      if (x.name === "404") setTimeout(function () { each(function (m) { m.vis = true; m.react("peek"); }, function (m) { return m.slot === "404"; }); }, 60);
      if (x.name === "menu") setTimeout(function () { each(function (m) { m.vis = true; m.react("wave"); }, function (m) { return m.slot === "menu"; }); }, 260);
    });
    d.addEventListener("grinchin:ready", function () { each(function (m) { m.pulse("wink", 700); }, function (m) { return m.slot === "preloader"; }); });
    d.addEventListener("grinchin:mode", function (e) { // живое переключение оси (GV.mode.live('mascot'))
      var x = e.detail || {}; if (x.axis !== "mascot") return;
      root.dataset.mascot = x.value;
      var all = d.querySelectorAll("[data-mascot-slot]");
      for (var i = 0; i < all.length; i++) {
        var el = all[i], m = el.__mz, o = m ? { pose: m.pose, mood: m.base } : {};
        if (m) m.destroy();
        var hero = el.getAttribute("data-mascot-slot") === "hero", v = x.value === "none" && hero ? "grinchin" : x.value;
        el.hidden = v === "none";
        if (v !== "none" && !el.hasAttribute("data-mascot-manual")) { o.char = v; mount(el, o); }
      }
    });
    // наведение на маскота — подмигивает (desktop)
    d.addEventListener("pointerover", function (e) {
      var t = e.target.closest && e.target.closest(".mz"); if (!t || !t.__mz || t.__mzHover) return;
      t.__mzHover = 1; t.__mz.pulse("wink", 800); setTimeout(function () { t.__mzHover = 0; }, 1200);
    });
    if (GV.mode && GV.mode.live) try { GV.mode.live("mascot"); } catch (e) {}
  }

  GV.mascot = {
    mount: mount,
    react: function (ev) { each(function (m) { m.react(ev); }); },
    svg: svg, scan: scan, list: inst, LOGO: LOGO, moods: MOODS, poses: Object.keys(VB)
  };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})();
