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

const distanceMeter = document.getElementById("distanceMeter");
const distanceNm = document.getElementById("distanceNm");
const bearingText = document.getElementById("bearing");
const statusText = document.getElementById("status");
const message = document.getElementById("message");
const historyList = document.getElementById("historyList");

let history = JSON.parse(localStorage.getItem("buoyHistory")) || [];

function toRad(degree) {
  return degree * Math.PI / 180;
}

function toDeg(radian) {
  return radian * 180 / Math.PI;
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
    alert("모든 좌표와 허용 이출거리를 입력하세요.");
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

function calculateDrift() {
  const buoyName = buoyNameInput.value.trim() || "이름 없는 등부표";

  const limitDistance = Number(limitDistanceInput.value);
  const baseLat = Number(baseLatInput.value);
  const baseLon = Number(baseLonInput.value);
  const currentLat = Number(currentLatInput.value);
  const currentLon = Number(currentLonInput.value);

  const isValid = validateInputs(
    baseLat,
    baseLon,
    currentLat,
    currentLon,
    limitDistance
  );

  if (!isValid) return;

  const distance = calculateDistance(baseLat, baseLon, currentLat, currentLon);
  const bearing = calculateBearing(baseLat, baseLon, currentLat, currentLon);
  const nauticalMile = distance / 1852;
  const direction = getDirectionName(bearing);

  const isOverLimit = distance > limitDistance;

  distanceMeter.textContent = `${distance.toFixed(2)} m`;
  distanceNm.textContent = `${nauticalMile.toFixed(4)} NM`;
  bearingText.textContent = `${bearing.toFixed(1)}° ${direction}`;

  if (isOverLimit) {
    statusText.textContent = "초과";
    message.textContent = `${buoyName}의 이출거리가 허용 기준 ${limitDistance}m를 초과했습니다. 현장 확인이 필요합니다.`;
    message.className = "message warning";
  } else {
    statusText.textContent = "정상";
    message.textContent = `${buoyName}의 이출거리가 허용 기준 이내입니다.`;
    message.className = "message safe";
  }

  const record = {
    buoyName,
    distance: distance.toFixed(2),
    nauticalMile: nauticalMile.toFixed(4),
    bearing: bearing.toFixed(1),
    direction,
    status: isOverLimit ? "초과" : "정상",
    time: new Date().toLocaleString()
  };

  history.unshift(record);

  if (history.length > 10) {
    history.pop();
  }

  localStorage.setItem("buoyHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = `<li class="empty">최근 계산 기록이 없습니다.</li>`;
    return;
  }

  history.forEach(record => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${record.buoyName}</strong><br />
      이출거리: ${record.distance}m / ${record.nauticalMile}NM<br />
      방위각: ${record.bearing}° ${record.direction}<br />
      상태: ${record.status}<br />
      시간: ${record.time}
    `;

    historyList.appendChild(li);
  });
}

function fillSampleData() {
  buoyNameInput.value = "부산항 A-12 등부표";
  limitDistanceInput.value = 50;

  baseLatInput.value = 35.096700;
  baseLonInput.value = 129.039400;

  currentLatInput.value = 35.097000;
  currentLonInput.value = 129.039800;
}

function resetForm() {
  buoyNameInput.value = "";
  limitDistanceInput.value = 50;

  baseLatInput.value = "";
  baseLonInput.value = "";
  currentLatInput.value = "";
  currentLonInput.value = "";

  distanceMeter.textContent = "-";
  distanceNm.textContent = "-";
  bearingText.textContent = "-";
  statusText.textContent = "-";

  message.textContent = "좌표를 입력한 뒤 계산 버튼을 누르세요.";
  message.className = "message";
}

function clearHistory() {
  const confirmed = confirm("최근 계산 기록을 모두 삭제할까요?");

  if (!confirmed) return;

  history = [];
  localStorage.removeItem("buoyHistory");
  renderHistory();
}

calculateBtn.addEventListener("click", calculateDrift);
sampleBtn.addEventListener("click", fillSampleData);
resetBtn.addEventListener("click", resetForm);
clearHistoryBtn.addEventListener("click", clearHistory);

renderHistory();