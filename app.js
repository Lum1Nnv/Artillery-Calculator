window.artilleryDb = {};

window.registerWeapon = function (weaponName, rawData) {
    const db = window.artilleryDb;
    db[weaponName] = {};

    const blocks = rawData.split(']');
    for (let block of blocks) {
        if (!block.trim()) continue;

        const parts = block.split('[');
        if (parts.length < 2) continue;

        const headerTokens = parts[0].trim().split(/\s+/);
        const tableText = parts[1];

        if (headerTokens.length >= 3) {
            const traj = headerTokens[0];
            const charge = headerTokens[1];
            const proj = headerTokens.slice(2).join(' ');

            if (!db[weaponName][proj]) db[weaponName][proj] = {};
            if (!db[weaponName][proj][traj]) db[weaponName][proj][traj] = {};

            const rows = [];
            const regex = /\(([^)]+)\)/g;
            let match;
            while ((match = regex.exec(tableText)) !== null) {
                rows.push(match[1].split(',').map(n => parseFloat(n.trim())));
            }

            db[weaponName][proj][traj][charge] = rows;
        }
    }
};

const weaponSel = document.getElementById('weaponSelect');
const projSel = document.getElementById('projSelect');
const trajSel = document.getElementById('trajSelect');
const chargeSel = document.getElementById('chargeSelect');

function initSelectors() {
    weaponSel.innerHTML = '';
    Object.keys(window.artilleryDb).forEach(w => weaponSel.add(new Option(w, w)));
    weaponSel.onchange = updateProj;
    updateProj();
}

function updateProj() {
    projSel.innerHTML = '';
    const weapon = window.artilleryDb[weaponSel.value];
    if (weapon) {
        Object.keys(weapon).forEach(p => projSel.add(new Option(p, p)));
    }
    projSel.onchange = updateTraj;
    updateTraj();
}

function updateTraj() {
    trajSel.innerHTML = '';
    const weapon = window.artilleryDb[weaponSel.value];
    const proj = weapon ? weapon[projSel.value] : null;
    if (proj) {
        Object.keys(proj).forEach(t => trajSel.add(new Option(t, t)));
    }
    trajSel.onchange = updateCharge;
    updateCharge();
}

function updateCharge() {
    chargeSel.innerHTML = '';
    const weapon = window.artilleryDb[weaponSel.value];
    const proj = weapon ? weapon[projSel.value] : null;
    const traj = proj ? proj[trajSel.value] : null;
    if (traj) {
        Object.keys(traj).forEach(c => chargeSel.add(new Option(c, c)));
    }
}

window.addEventListener('DOMContentLoaded', initSelectors);

const offsets = { gun: { x: 0, y: 0 }, target: { x: 0, y: 0 } };

function setupGridSensor(containerId, dotId, textId, offsetKey) {
    const container = document.getElementById(containerId);
    const dot = document.getElementById(dotId);
    const txt = document.getElementById(textId);

    function updatePos(e) {
        const rect = container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let x = clientX - rect.left;
        let y = clientY - rect.top;

        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));

        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;
        dot.style.left = `${pctX}%`;
        dot.style.top = `${pctY}%`;

        const offsetX = Math.round(((x / rect.width) * 100) - 50);
        const offsetY = Math.round(-(((y / rect.height) * 100) - 50));

        offsets[offsetKey] = { x: offsetX, y: offsetY };
        txt.innerText = `X: ${offsetX > 0 ? '+' + offsetX : offsetX}, Y: ${offsetY > 0 ? '+' + offsetY : offsetY}`;
    }

    container.addEventListener('mousedown', (e) => { updatePos(e); container.onmousemove = updatePos; });
    window.addEventListener('mouseup', () => container.onmousemove = null);
    container.addEventListener('touchstart', (e) => { e.preventDefault(); updatePos(e); }, { passive: false });
    container.addEventListener('touchmove', (e) => { e.preventDefault(); updatePos(e); }, { passive: false });
}

function toggleFullscreen(containerId) {
    const container = document.getElementById(containerId);
    const overlay = document.getElementById('overlay');
    if (container.classList.contains('fullscreen')) {
        closeAllFullscreen();
    } else {
        container.classList.add('fullscreen');
        overlay.classList.add('active');
    }
}

function closeAllFullscreen() {
    document.querySelectorAll('.tactical-grid-container').forEach(el => el.classList.remove('fullscreen'));
    document.getElementById('overlay').classList.remove('active');
}

window.addEventListener('DOMContentLoaded', () => {
    setupGridSensor('gunTacticalGrid', 'gunDot', 'gunOffsetTxt', 'gun');
    setupGridSensor('targetTacticalGrid', 'targetDot', 'targetOffsetTxt', 'target');
});

function parseGrid(strX, strY, offset) {
    const cleanX = strX.replace(/\D/g, '');
    const cleanY = strY.replace(/\D/g, '');

    if (!cleanX || !cleanY) return null;

    let x = 0, y = 0;

    if (cleanX.length === 3 && cleanY.length === 3) {
        x = (parseInt(cleanX) * 100) + 50 + offset.x;
        y = (parseInt(cleanY) * 100) + 50 + offset.y;
    } else if (cleanX.length === 4 && cleanY.length === 4) {
        x = (parseInt(cleanX) * 10) + 50 + offset.x;
        y = (parseInt(cleanY) * 10) + 50 + offset.y;
    } else {
        return null;
    }
    return { x, y };
}

function interpolateRow(table, dist) {
    if (!table || table.length === 0) return null;
    if (dist < table[0][0] || dist > table[table.length - 1][0]) return null;

    for (let i = 0; i < table.length - 1; i++) {
        if (dist >= table[i][0] && dist <= table[i + 1][0]) {
            const lower = table[i];
            const upper = table[i + 1];
            const ratio = (dist - lower[0]) / (upper[0] - lower[0]);
            return lower.map((val, idx) => val + ratio * (upper[idx] - val));
        }
    }
    return null;
}

document.getElementById('calcBtn').addEventListener('click', () => {
    const gunX = document.getElementById('gunX').value;
    const gunY = document.getElementById('gunY').value;
    const targetX = document.getElementById('targetX').value;
    const targetY = document.getElementById('targetY').value;

    const gunAlt = parseFloat(document.getElementById('gunAlt').value) || 0;
    const targetAlt = parseFloat(document.getElementById('targetAlt').value) || 0;

    const gunPos = parseGrid(gunX, gunY, offsets.gun);
    const targetPos = parseGrid(targetX, targetY, offsets.target);

    if (!gunPos || !targetPos) {
        alert("Координаты X и Y должны состоять из 3 или 4 цифр каждая!");
        return;
    }

    const dx = targetPos.x - gunPos.x;
    const dy = targetPos.y - gunPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let az = Math.atan2(dx, dy) * (6400 / (2 * Math.PI));
    if (az < 0) az += 6400;

    const trajObj = window.artilleryDb[weaponSel.value]?.[projSel.value]?.[trajSel.value];
    if (trajObj) {
        let validChargeFound = false;
        Array.from(chargeSel.options).forEach(opt => {
            const table = trajObj[opt.value];
            if (table && dist >= table[0][0] && dist <= table[table.length - 1][0]) {
                opt.disabled = false;
                if (chargeSel.value === opt.value) validChargeFound = true;
            } else {
                opt.disabled = true;
            }
        });

        if (!validChargeFound) {
            const firstValid = Array.from(chargeSel.options).find(o => !o.disabled);
            if (firstValid) {
                chargeSel.value = firstValid.value;
            } else {
                document.getElementById('resAzimuth').innerText = Math.round(az);
                document.getElementById('resElevation').innerText = "OUT";
                document.getElementById('resDistance').innerText = Math.round(dist);
                document.getElementById('resTof').innerText = "---";
                return;
            }
        }
    }

    const table = trajObj[chargeSel.value];
    const row = interpolateRow(table, dist);

    if (!row) {
        document.getElementById('resAzimuth').innerText = Math.round(az);
        document.getElementById('resElevation').innerText = "OUT";
        document.getElementById('resDistance').innerText = Math.round(dist);
        document.getElementById('resTof').innerText = "---";
        return;
    }

    // === ДЕСТРУКТУРИЗАЦИЯ 12-КОЛОНОЧНОЙ ТАБЛИЦЫ ===
    // Столбцы [6]-[11] — это поправки ДАЛЬНОСТИ в МЕТРАХ, а не элевации!
    // Алгоритм: вычисляем эффективную дальность (R-eff), затем ищем элевацию для неё.
    const [
        _range,           // [0]  Дистанция (Range)
        _baseElev,        // [1]  Базовая элевация (не используем напрямую)
        _deltaElev,       // [2]  Поправка элевации на 100м перепада высоты
        _deltaTof,        // [3]  Поправка TOF на 100м перепада высоты
        _baseTof,         // [4]  Базовое время полета
        _windAzimuth,     // [5]  Азимут ветра — ИГНОРИРУЕМ
        _windHead,        // [6]  Встречный ветер (м) — range correction
        _windTail,        // [7]  Попутный ветер (м) — range correction
        tempDecCorr,      // [8]  Температура DEC: поправка дальности (м) за 1°C ниже 15°C
        tempIncCorr,      // [9]  Температура INC: поправка дальности (м) за 1°C выше 15°C
        densDecCorr,      // [10] Плотность DEC: поправка дальности (м) за 1% ниже стандарта
        densIncCorr       // [11] Плотность INC: поправка дальности (м) за 1% выше стандарта
    ] = row;

    // === СЧИТЫВАЕМ ИНПУТЫ ===
    const envTemp = parseFloat(document.getElementById('envTemp').value) || 15;
    const envPress = parseFloat(document.getElementById('envPress').value) || 1013;

    // === 1. ПОПРАВКА ДАЛЬНОСТИ НА ТЕМПЕРАТУРУ (эффект пороха на дульную скорость) ===
    let tempRangeCorr = 0;
    if (envTemp < 15) {
        tempRangeCorr = (15 - envTemp) * tempDecCorr;   // row[8] > 0 → добавляет дальность
    } else if (envTemp > 15) {
        tempRangeCorr = (envTemp - 15) * tempIncCorr;   // row[9] < 0 → убавляет дальность
    }

    // === 2. ПОПРАВКА ДАЛЬНОСТИ НА ПЛОТНОСТЬ ВОЗДУХА (температура + давление → аэродинамика) ===
    const tempKelvin = envTemp + 273.15;
    const stdTempKelvin = 288.15; // 15°C
    const densityRatio = (envPress / 1013) * (stdTempKelvin / tempKelvin);
    const densityPct = (densityRatio - 1) * 100; // отклонение в процентах

    let densityRangeCorr = 0;
    if (densityPct > 0) {
        densityRangeCorr = densityPct * densIncCorr;    // row[11] > 0 → плотнее, снаряд не долетает
    } else if (densityPct < 0) {
        densityRangeCorr = Math.abs(densityPct) * densDecCorr; // row[10] < 0 → разреженнее, перелёт
    }

    // === 3. ЭФФЕКТИВНАЯ ДАЛЬНОСТЬ ===
    const effRange = dist + tempRangeCorr + densityRangeCorr;

    // === 4. ИНТЕРПОЛИРУЕМ ТАБЛИЦУ ПО R-eff ===
    const effRow = interpolateRow(table, effRange);

    if (!effRow) {
        // R-eff вышел за границы таблицы — показываем OUT
        document.getElementById('resAzimuth').innerText = Math.round(az);
        document.getElementById('resElevation').innerText = "OUT";
        document.getElementById('resDistance').innerText = Math.round(dist);
        document.getElementById('resTof').innerText = "---";
        return;
    }

    const baseElev = effRow[1];
    const deltaElev = effRow[2];
    const deltaTof = effRow[3];
    const baseTof = effRow[4];

    // === 5. ПОПРАВКА ЭЛЕВАЦИИ НА ВЫСОТУ ===
    const hDiff = targetAlt - gunAlt;
    let elevHDiff = -(hDiff / 100) * deltaElev;

    // Кастомный костыль для MT-12 Rapira: в игре баллистика кривая и 
    // требует поправку на высоту примерно в 64/102 (~0.627) раз меньше геометрической.
    if (weaponSel.value === "MT-12_Rapira") {
        elevHDiff *= (64 / 102);
    }

    // === ФИНАЛЬНЫЙ РАСЧЕТ ===
    const finalElev = baseElev + elevHDiff;
    const finalTof = baseTof - (hDiff / 100) * deltaTof;

    // === ВЫВОД В DOM ===
    document.getElementById('resAzimuth').innerText = Math.round(az);
    document.getElementById('resElevation').innerText = Math.round(finalElev);
    document.getElementById('resDistance').innerText = Math.round(dist);
    document.getElementById('resTof').innerText = finalTof.toFixed(1);
});