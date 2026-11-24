// Human-Design-Typ im Browser. Übertragen aus scripts/human-design/hd_chart.py (Swiss Ephemeris),
// Ephemeride: astronomy-engine. Knoten: wahrer Mondknoten nach Meeus (Kap. 47).
(function (root) {
  const A = root.Astronomy || (typeof require !== 'undefined' ? require('astronomy-engine') : null);
  const GATE_ORDER = [41,19,13,49,30,55,37,63,22,36,25,17,21,51,42,3,27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,
    31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60];
  const C = {};
  const add = (z, gs) => gs.forEach(g => C[g] = z);
  add('Kopf',[64,61,63]); add('Ajna',[47,24,4,17,43,11]); add('Kehle',[62,23,56,35,12,45,33,8,31,20,16]);
  add('G',[1,13,25,46,2,15,10,7]); add('Herz',[21,40,26,51]); add('Sakral',[5,14,29,59,9,3,42,27,34]);
  add('Milz',[48,57,44,50,32,28,18]); add('Solarplexus',[6,37,22,36,30,55,49]); add('Wurzel',[58,38,54,53,60,52,19,39,41]);
  const CHANNELS = [[1,8],[2,14],[3,60],[4,63],[5,15],[6,59],[7,31],[9,52],[10,20],[10,34],[10,57],[11,56],[12,22],[13,33],
    [16,48],[17,62],[18,58],[19,49],[20,34],[20,57],[21,45],[23,43],[24,61],[25,51],[26,44],[27,50],[28,38],[29,46],
    [30,41],[32,54],[34,57],[35,36],[37,40],[39,55],[42,53],[47,64]];
  const MOTOREN = ['Herz','Sakral','Solarplexus','Wurzel'];
  const BODIES = ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  const norm = x => ((x % 360) + 360) % 360;
  const rad = d => d * Math.PI / 180;

  function sonne(t) { return A.SunPosition(t).elon; }
  // Wahrer (oskulierender) Mondknoten wie Swiss Ephemeris: aus Ort und Geschwindigkeit des Mondes,
  // gedreht in die Ekliptik des Datums; Knoten = Richtung von (Ekliptik-Normale × Bahndrehimpuls).
  function knoten(t) {
    const s = A.RotateState(A.Rotation_EQJ_ECT(t), A.GeoMoonState(t));
    const hx = s.y * s.vz - s.z * s.vy, hy = s.z * s.vx - s.x * s.vz;
    return norm(Math.atan2(hx, -hy) * 180 / Math.PI);
  }
  function laengen(t) {
    const L = [], s = sonne(t);
    L.push(s, norm(s + 180), A.EclipticGeoMoon(t).lon);
    const k = knoten(t); L.push(k, norm(k + 180));
    for (const b of BODIES) L.push(A.Ecliptic(A.GeoVector(b, t, true)).elon);
    return L;
  }
  function tor(lon) { return GATE_ORDER[Math.floor(norm(lon - 302) / 5.625)]; }
  function designZeit(t) {
    const ziel = norm(sonne(t) - 88);
    let u = t.AddDays(-88);
    for (let i = 0; i < 30; i++) {
      const diff = ((sonne(u) - ziel + 540) % 360) - 180;
      if (Math.abs(diff) < 1e-7) break;
      u = u.AddDays(-diff / 0.9856);
    }
    return u;
  }
  function berechne(utcDate) {
    const t = A.MakeTime(utcDate), d = designZeit(t);
    const tore = new Set([...laengen(t), ...laengen(d)].map(tor));
    const kan = CHANNELS.filter(([a, b]) => tore.has(a) && tore.has(b));
    const zentren = new Set(); const adj = {};
    for (const [a, b] of kan) {
      const ca = C[a], cb = C[b]; zentren.add(ca); zentren.add(cb);
      (adj[ca] = adj[ca] || new Set()).add(cb); (adj[cb] = adj[cb] || new Set()).add(ca);
    }
    let motorKehle = false;
    for (const m of MOTOREN) {
      if (!adj[m]) continue;
      const seen = new Set([m]), st = [m];
      while (st.length) { const c = st.pop(); if (c === 'Kehle') { motorKehle = true; break; }
        for (const n of adj[c] || []) if (!seen.has(n)) { seen.add(n); st.push(n); } }
      if (motorKehle) break;
    }
    let typ;
    if (!zentren.size) typ = 'Reflektor';
    else if (zentren.has('Sakral')) typ = motorKehle ? 'Manifestierender Generator' : 'Generator';
    else if (zentren.has('Kehle') && motorKehle) typ = 'Manifestor';
    else typ = 'Projektor';
    let aut;
    if (zentren.has('Solarplexus')) aut = 'Emotional (Solarplexus)';
    else if (zentren.has('Sakral')) aut = 'Sakral';
    else if (zentren.has('Milz')) aut = 'Milz (Splenisch)';
    else if (zentren.has('Herz')) aut = 'Herz/Ego';
    else if (zentren.has('G')) aut = 'Selbst-projiziert (G)';
    else aut = typ === 'Reflektor' ? 'Mond (lunarer Zyklus)' : 'Umgebung / Mental (keine innere Autorität)';
    return { typ, autoritaet: aut };
  }
  // Lokale Geburtszeit -> UTC über die Zeitzone des Browsers (Intl), ohne Bibliothek
  function zuUTC(datum, zeit, tz) {
    const [y, mo, d] = datum.split('-').map(Number), [h, mi] = zeit.split(':').map(Number);
    let guess = Date.UTC(y, mo - 1, d, h, mi);
    for (let i = 0; i < 3; i++) {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric',
        day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(guess));
      const g = Object.fromEntries(p.map(x => [x.type, x.value]));
      const lokal = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour, +g.minute);
      guess += Date.UTC(y, mo - 1, d, h, mi) - lokal;
    }
    return new Date(guess);
  }
  function typFuer(datum, zeit, tz) {
    if (zeit) return { ...berechne(zuUTC(datum, zeit, tz)), sicher: true };
    const probe = []; for (let h = 0; h < 24; h += 2) probe.push(berechne(zuUTC(datum, `${String(h).padStart(2, '0')}:30`, tz)));
    const z = {}; probe.forEach(p => z[p.typ] = (z[p.typ] || 0) + 1);
    const typ = Object.keys(z).sort((a, b) => z[b] - z[a])[0];
    const az = {}; probe.filter(p => p.typ === typ).forEach(p => az[p.autoritaet] = (az[p.autoritaet] || 0) + 1);
    const autoritaet = Object.keys(az).sort((a, b) => az[b] - az[a])[0];
    return { typ, autoritaet, sicher: z[typ] === probe.length, autoritaet_sicher: new Set(probe.map(p => p.autoritaet)).size === 1 };
  }
  const HD = { typFuer, berechne, zuUTC, _laengen: laengen, _design: designZeit, _A: A };
  if (typeof module !== 'undefined') module.exports = HD; else root.HD = HD;
})(typeof window !== 'undefined' ? window : globalThis);
