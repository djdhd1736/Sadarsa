
// 게임 로직 전체 삽입 (생략 부분 없이)
const symbolData = {
  "복귀콜": "assets/symbols/복귀콜.jpeg",
  "보너스": "assets/symbols/보너스.jpeg",
  "진상콜": "assets/symbols/진상콜.jpeg",
  "착변콜": "assets/symbols/착변콜.jpeg",
  "콜마너": "assets/symbols/콜마너.jpeg",
  "맞춤콜": "assets/symbols/맞춤콜.jpeg",
  "경유콜": "assets/symbols/경유콜.jpeg",
  "카카오": "assets/symbols/카카오.jpeg",
  "로지": "assets/symbols/로지.jpeg",
  "티맵": "assets/symbols/티맵.jpeg"
};
const symbols = Object.keys(symbolData);
const roundCosts = {1:0,2:20000,3:100000,4:300000,5:1000000};

let coins = 5000;
let freespins = 0;
let round = 1;
let spinCount = 0;
let auto = false;
let activeItemEffects = [];

const spinSound = document.getElementById("spinSound");
const stopSound = document.getElementById("stopSound");
const winSound = document.getElementById("winSound");

function highlightWinningSymbols(indices) {
  document.querySelectorAll('.slot-symbol').forEach(el => el.classList.remove('win'));
  indices.forEach(i => {
    const el = document.querySelector(`.slot-symbol[data-index='${i}']`);
    if (el) el.classList.add('win');
  });
}

function updateStats() {
  document.getElementById("coins").textContent = coins;
  document.getElementById("freespins").textContent = freespins;
  document.getElementById("round").textContent = round;
}

function toggleAuto() {
  auto = !auto;
  document.getElementById("autotext").textContent = auto ? "ON" : "OFF";
  if (auto) handleSpin();
}

function selectItem() {
  const itemPool = [
    { name:"복귀콜 확률 +5%", type:"probability", symbol:"복귀콜", boost:0.05 },
    { name:"진상콜 등장 -50%", type:"probability", symbol:"진상콜", boost:-0.5 },
    { name:"착변 보상 +50%", type:"reward", symbol:"착변콜", multiplier:1.5 },
    { name:"보너스 프리턴 +1", type:"freespin", symbol:"보너스", bonus:1 }
  ];
  let msg = `라운드 ${round} 아이템 선택\n`;
  itemPool.forEach((it, i) => msg += `${i+1}. ${it.name}\n`);
  const pick = parseInt(prompt(msg));
  const chosen = itemPool[pick-1];
  if (chosen) {
    activeItemEffects.push(chosen);
    document.getElementById("item-effect").textContent = `아이템: ${chosen.name}`;
  }
}

function handleSpin() {
  spinSound.currentTime = 0;
  spinSound.play();
  if (spinCount === 0) {
    const cost = roundCosts[round] || 0;
    if (coins < cost) return alert(`라운드 ${round} 진입 실패. 코인 부족`);
    coins -= cost;
    selectItem();
  }

  if (freespins > 0) freespins--;
  else if (coins >= 1000) coins -= 1000;
  else {
    auto = false;
    const name = prompt("코인이 부족합니다. 닉네임을 입력해주세요:");
    document.getElementById("ranking").innerHTML = `<h3>${name}님의 최종 코인: ${coins.toLocaleString()}원 (코인 부족으로 종료)</h3>`;
    return;
  }

  spinCount++;
  updateStats();

  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  let result = [];

  for (let i = 0; i < 25; i++) {
    let pool = [...symbols];
    activeItemEffects.forEach(eff => {
      if (eff.type === "probability" && Math.random() < Math.abs(eff.boost)) {
        if (eff.boost > 0) pool.push(eff.symbol);
        else pool = pool.filter(s => s !== eff.symbol);
      }
    });
    const sym = pool[Math.floor(Math.random()*pool.length)];
    result.push(sym);

    const cell = document.createElement("div");
    cell.className = "slot-cell";
    const img = document.createElement("img");
    img.className = "slot-symbol"; img.dataset.index = i;
    img.src = symbolData[sym];
    img.dataset.sym = sym;
    cell.appendChild(img);
    grid.appendChild(cell);
  }

  evaluate(result);
}

function evaluate(arr) {
  let total = 0;
  const lines = [];

  for (let i = 0; i < 5; i++) lines.push(arr.slice(i*5, i*5+5));
  for (let i = 0; i < 5; i++) lines.push([arr[i],arr[i+5],arr[i+10],arr[i+15],arr[i+20]]);
  lines.push([arr[0],arr[6],arr[12],arr[18],arr[24]]);
  lines.push([arr[4],arr[8],arr[12],arr[16],arr[20]]);

  let bonusCount = 0;
  let highlightIndices = [];

  lines.forEach((line, lineIdx) => {
    const count = {};
    line.forEach(sym => count[sym] = (count[sym]||0)+1);
    for (let sym in count) {
      if (count[sym] >= 3) {
        let base = sym==="복귀콜"?2000 : sym==="보너스"?1000 : sym==="진상콜"?-1000 : 800;
        let mult = count[sym]===3?2 : count[sym]===4?3 : 4;
        activeItemEffects.forEach(eff => {
          if (eff.type === "reward" && eff.symbol === sym) mult *= eff.multiplier;
          if (eff.type === "freespin" && eff.symbol === sym) freespins += eff.bonus;
        });
        if (sym === "보너스") bonusCount++;
        const offset = lineIdx < 5 ? lineIdx * 5 : lineIdx < 10 ? lineIdx - 5 : lineIdx === 10 ? 0 : 4;
        for (let j = 0; j < 5; j++) {
          const i = lineIdx < 5 ? offset + j : lineIdx < 10 ? offset + j * 5 : lineIdx === 10 ? j * 6 : (4 - j) * 4 + j;
          if (arr[i] === sym) highlightIndices.push(i);
        }
        total += base * mult;
      }
    }
  });

  coins += total;
  updateStats();
  document.getElementById("result").textContent = total > 0 ? `당첨 ${total} 코인!` : "꽝입니다!";
  highlightWinningSymbols(highlightIndices);
  stopSound.currentTime = 0;
  stopSound.play();
  if (total > 0) { winSound.currentTime = 0; winSound.play(); }

  if (spinCount === 10) {
    spinCount = 0;
    round++;
    if (round > 5) {
      const name = prompt("최종 닉네임 입력:");
      document.getElementById("ranking").innerHTML = `<h3>${name}님의 최종 코인: ${coins.toLocaleString()}원</h3><button onclick="location.reload()">재시작</button>`;
      return;
    }
  }
  if (auto) setTimeout(handleSpin, 1500);
}

updateStats();
