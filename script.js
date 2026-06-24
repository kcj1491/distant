const buoyNameInput = document.getElementById("buoyName");
const limitDistanceInput = document.getElementById("limitDistance");

const baseLatInput = document.getElementById("baseLat");
const baseLonInput = document.getElementById("baseLon");
const currentLatInput = document.getElementById("currentLat");
const currentLonInput = document.getElementById("currentLon");

const calculateBtn = document.getElementById("calculateBtn");
const sampleBtn = document.getElementById("sampleBtn");
const resetBtn = document.getElementById("resetBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const summaryDistance = document.getElementById("summaryDistance");
const summaryNm = document.getElementById("summaryNm");
const summaryBearing = document.getElementById("summaryBearing");
const summaryStatus = document.getElementById("summaryStatus");
const summaryStatusText = document.getElementById("summaryStatusText");

const distanceMeter = document.getElementById("distanceMeter");
const distanceNm = document.getElementById("distanceNm");
const bearingText = document.getElementById("bearing");
const limitView = document.getElementById("limitView");

const resultBadge = document.getElementById("resultBadge");
const gaugeCircle = document.getElementById("gaugeCircle");
const gaugeDistance = document.getElementById("gaugeDistance");
const message = document.getElementById("message");

const basePreview = document.getElementById("basePreview");
const currentPreview = document.getElementById("currentPreview");

const historyTable = document.getElementById("historyTable");

let history = JSON.parse(localStorage.getItem("buoyDashboardHistory")) || [];

function toRad(degree) {
  return degree * Math.PI / 180;
}

function toDeg(radian) {
  return radian * 180 / Math.PI;
}

function parseCoordinate(input) {
  if (!input) return NaN;

  let text = String(input).trim().toUpperCase();

  if (text === "") return NaN;

  let sign = 1;

  if (/[SW]/.test(text)) {
    sign = -1;
  }

  text = text
    .replace(/[NSEW]/g, "")
    .replace(/도/g, " ")
    .replace(/분/g, " ")
    .replace(/초/g, " ")
    .replace(/[°'"]/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = text
    .split(" ")
    .filter(part => part !== "")
    .map(Number);

  if (parts.some(Number.isNaN)) {
    return NaN;
  }

  let degree = 0;
  let minute = 0;
  let second = 0;

  if (parts.length === 1) {
    degree = Math.abs(parts[0]);
    sign = parts[0] < 0 ? -1 : sign;
  } else if (parts.length === 2) {
    degree = Math.abs(parts[0]);
    minute = parts[1];
  } else if (parts.length === 3) {
    degree = Math.abs(parts[0]);
    minute = parts[1];
    second = parts[2];
  } else {
    return NaN;
  }

  if (minute < 0 || minute >= 60) return NaN;
  if (second < 0 || second >= 60) return NaN;

  return sign * (degree + minute / 60 + second / 3600);
}

function formatDMS(decimalDegree, type) {
  const direction =
    type === "lat"
      ? decimalDegree >= 0 ? "N" : "S"
      : decimalDegree >= 0 ? "E" : "W";

  const absolute = Math.abs(decimalDegree);
  const degree = Math.floor(absolute);
  const minuteFloat = (absolute - degree) * 60;
  const minute = Math.floor(minuteFloat);
  const second = (minuteFloat - minute) * 60;

  return `${degree}° ${String(minute).padStart(2, "0")}' ${second.toFixed(2)}" ${direction}`;
}

function isValidLatitude(lat) {
  return lat >= -90 && lat <= 90;
}

function isValidLongitude(lon) {
  return lon >= -180 && lon <= 180;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lon1);
  const λ2 = toRad(lon2);

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);

  const bearing = toDeg(Math.atan2(y, x));

  return (bearing + 360) % 360;
}

function getDirectionName(bearing) {
  if (bearing >= 337.5 || bearing < 22.5) return "북";
  if (bearing >= 22.5 && bearing < 67.5) return "북동";
  if (bearing >= 67.5 && bearing < 112.5) return "동";
  if (bearing >= 112.5 && bearing < 157.5) return "남동";
  if (bearing >= 157.5 && bearing < 202.5) return "남";
  if (bearing >= 202.5 && bearing < 247.5) return "남서";
  if (bearing >= 247.5 && bearing < 292.5) return "서";
  return "북서";
}

function validateInputs(baseLat, baseLon, currentLat, currentLon, limitDistance) {
  if (
    Number.isNaN(baseLat) ||
    Number.isNaN(baseLon) ||
    Number.isNaN(currentLat) ||
    Number.isNaN(currentLon) ||
    Number.isNaN(limitDistance)
  ) {
    alert("좌표 또는 허용 이출거리 입력 형식을 확인하세요.");
    return false;
  }

  if (!isValidLatitude(baseLat) || !isValidLatitude(currentLat)) {
    alert("위도는 -90부터 90 사이여야 합니다.");
    return false;
  }

  if (!isValidLongitude(baseLon) || !isValidLongitude(currentLon)) {
    alert("경도는 -180부터 180 사이여야 합니다.");
    return false;
  }

  if (limitDistance < 0) {
    alert("허용 이출거리는 0 이상이어야 합니다.");
    return false;
  }

  return true;
}

function updateGauge(distance, limitDistance, isOverLimit) {
  let percent = 0;

  if (limitDistance > 0) {
    percent = Math.min(distance / limitDistance, 1);
  }

  const degree = percent * 360;
  const color = isOverLimit ? "#ef4444" : "#22c55e";

  gaugeCircle.style.background = `conic-gradient(${color} ${degree}deg, #e2e8f0 ${degree}deg)`;
  gaugeDistance.textContent = distance.toFixed(1);
}

function setStatusUI(isOverLimit, buoyName, distance, limitDistance) {
  const statusCard = document.querySelector(".status-card");

  statusCard.classList.remove("safe", "warning", "wait");
  resultBadge.classList.remove("safe", "warning", "wait");
  message.classList.remove("safe", "warning");

  if (isOverLimit) {
    summaryStatus.textContent = "초과";
    summaryStatusText.textContent = "허용 이출거리를 초과했습니다.";
    resultBadge.textContent = "초과";
    resultBadge.classList.add("warning");
    statusCard.classList.add("warning");
    message.classList.add("warning");
    message.textContent = `${buoyName}의 이출거리는 ${distance.toFixed(2)}m입니다. 허용 기준 ${limitDistance}m를 초과했으므로 현장 확인이 필요합니다.`;
  } else {
    summaryStatus.textContent = "정상";
    summaryStatusText.textContent = "허용 이출거리 이내입니다.";
    resultBadge.textContent = "정상";
    resultBadge.classList.add("safe");
    statusCard.classList.add("safe");
    message.classList.add("safe");
    message.textContent = `${buoyName}의 이출거리는 ${distance.toFixed(2)}m입니다. 허용 기준 이내입니다.`;
  }
}

function calculateDrift() {
  const buoyName = buoyNameInput.value.trim() || "이름 없는 등부표";
  const limitDistance = Number(limitDistanceInput.value);

  const baseLat = parseCoordinate(baseLatInput.value);
  const baseLon = parseCoordinate(baseLonInput.value);
  const currentLat = parseCoordinate(currentLatInput.value);
  const currentLon = parseCoordinate(currentLonInput.value);

  const isValid = validateInputs(
    baseLat,
    baseLon,
    currentLat,
    currentLon,
    limitDistance
  );

  if (!isValid) return;

  const distance = calculateDistance(baseLat, baseLon, currentLat, currentLon);
  const nauticalMile = distance / 1852;
  const bearing = calculateBearing(baseLat, baseLon, currentLat, currentLon);
  const direction = getDirectionName(bearing);
  const isOverLimit = distance > limitDistance;

  const distanceText = `${distance.toFixed(2)} m`;
  const nmText = `${nauticalMile.toFixed(4)} NM`;
  const bearingValueText = `${bearing.toFixed(1)}° ${direction}`;
  const limitText = `${limitDistance} m`;

  summaryDistance.textContent = distanceText;
  summaryNm.textContent = nmText;
  summaryBearing.textContent = bearingValueText;

  distanceMeter.textContent = distanceText;
  distanceNm.textContent = nmText;
  bearingText.textContent = bearingValueText;
  limitView.textContent = limitText;

  basePreview.textContent = `${formatDMS(baseLat, "lat")} / ${formatDMS(baseLon, "lon")}`;
  currentPreview.textContent = `${formatDMS(currentLat, "lat")} / ${formatDMS(currentLon, "lon")}`;

  updateGauge(distance, limitDistance, isOverLimit);
  setStatusUI(isOverLimit, buoyName, distance, limitDistance);

  const record = {
    time: new Date().toLocaleString(),
    buoyName,
    distance: distance.toFixed(2),
    nauticalMile: nauticalMile.toFixed(4),
    bearing: bearing.toFixed(1),
    direction,
    status: isOverLimit ? "초과" : "정상"
  };

  history.unshift(record);

  if (history.length > 10) {
    history.pop();
  }

  localStorage.setItem("buoyDashboardHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  historyTable.innerHTML = "";

  if (history.length === 0) {
    historyTable.innerHTML = `
      <tr>
        <td colspan="6" class="empty">최근 계산 기록이 없습니다.</td>
      </tr>
    `;
    return;
  }

  history.forEach(record => {
    const tr = document.createElement("tr");

    const statusClass = record.status === "초과" ? "status-warning" : "status-safe";

    tr.innerHTML = `
      <td>${record.time}</td>
      <td>${record.buoyName}</td>
      <td>${record.distance} m</td>
      <td>${record.nauticalMile} NM</td>
      <td>${record.bearing}° ${record.direction}</td>
      <td class="${statusClass}">${record.status}</td>
    `;

    historyTable.appendChild(tr);
  });
}

function fillSampleData() {
  buoyNameInput.value = "부산항 A-12 등부표";
  limitDistanceInput.value = 50;

  baseLatInput.value = `35° 05' 48.12" N`;
  baseLonInput.value = `129° 02' 21.84" E`;

  currentLatInput.value = `35° 05' 49.20" N`;
  currentLonInput.value = `129° 02' 23.28" E`;
}

function resetForm() {
  buoyNameInput.value = "";
  limitDistanceInput.value = 50;

  baseLatInput.value = "";
  baseLonInput.value = "";
  currentLatInput.value = "";
  currentLonInput.value = "";

  summaryDistance.textContent = "-";
  summaryNm.textContent = "-";
  summaryBearing.textContent = "-";
  summaryStatus.textContent = "대기";
  summaryStatusText.textContent = "좌표 입력 전입니다.";

  distanceMeter.textContent = "-";
  distanceNm.textContent = "-";
  bearingText.textContent = "-";
  limitView.textContent = "-";

  gaugeDistance.textContent = "-";
  gaugeCircle.style.background = "conic-gradient(#94a3b8 0deg, #e2e8f0 0deg)";

  resultBadge.textContent = "대기";
  resultBadge.className = "badge wait";

  const statusCard = document.querySelector(".status-card");
  statusCard.className = "summary-card status-card wait";

  message.textContent = "좌표를 입력한 뒤 계산 버튼을 누르세요.";
  message.className = "message";

  basePreview.textContent = "-";
  currentPreview.textContent = "-";
}

function clearHistory() {
  const confirmed = confirm("최근 계산 기록을 모두 삭제할까요?");

  if (!confirmed) return;

  history = [];
  localStorage.removeItem("buoyDashboardHistory");
  renderHistory();
}

calculateBtn.addEventListener("click", calculateDrift);
sampleBtn.addEventListener("click", fillSampleData);
resetBtn.addEventListener("click", resetForm);
clearHistoryBtn.addEventListener("click", clearHistory);

renderHistory();