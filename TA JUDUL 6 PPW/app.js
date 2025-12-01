const API_KEY = "066aa05366ef10326c6f2e5ba45048fa";

const $ = id => document.getElementById(id);
const searchInput = $("searchInput");
const suggestions = $("suggestions");
const statusEl = $("status");
const btnRefresh = $("btnRefresh");
const btnUnit = $("btnUnit");
const btnTheme = $("btnTheme");

const currentCard = $("currentCard");
const placeName = $("placeName");
const localTime = $("localTime");
const weatherIcon = $("weatherIcon");
const tempVal = $("tempVal");
const descEl = $("desc");
const humidityEl = $("humidity");
const windEl = $("wind");
const forecastRow = $("forecastRow");

const btnSaveFav = $("btnSaveFav");
const favList = $("favList");
const btnClearFav = $("btnClearFav");


let state = {
  lat: -6.2088,
  lon: 106.8456,
  name: "Jakarta, ID",
  units: "metric" 
};

const delay = ms => new Promise(r => setTimeout(r, ms));
function setStatus(text, err=false){
  statusEl.textContent = text;
  statusEl.style.color = err ? "crimson" : "";
}
function toTemp(v){ return state.units === "metric" ? `${Math.round(v)}°C` : `${Math.round(v)}°F`; }
function toWind(v){ return state.units === "metric" ? `${Math.round(v * 3.6)} km/h` : `${Math.round(v)} mph`; }
function debounce(fn, ms=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function saveLast(){ localStorage.setItem("wd_last", JSON.stringify({lat: state.lat, lon: state.lon, name: state.name, units: state.units})); }
function loadLast(){ const s = JSON.parse(localStorage.getItem("wd_last") || "null"); if(s){ state.lat = s.lat; state.lon = s.lon; state.name = s.name; state.units = s.units || state.units; btnUnit.textContent = state.units === "metric" ? "°C" : "°F"; } }

async function geocode(q){
  if(!q) return [];
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${API_KEY}`;
  try{
    const r = await fetch(url);
    if(!r.ok) return [];
    return await r.json();
  }catch(e){ return []; }
}

async function fetchCurrent(lat, lon){
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${state.units}&appid=${API_KEY}`;
  const r = await fetch(url);
  if(!r.ok) throw new Error("Current weather fetch failed");
  return await r.json();
}
async function fetchForecast(lat, lon){
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${state.units}&appid=${API_KEY}`;
  const r = await fetch(url);
  if(!r.ok) throw new Error("Forecast fetch failed");
  return await r.json();
}

function renderCurrent(cur){
  placeName.textContent = state.name;
  localTime.textContent = new Date().toLocaleString();
  tempVal.textContent = toTemp(cur.main.temp);
  descEl.textContent = (cur.weather && cur.weather[0] && cur.weather[0].description) ? capitalize(cur.weather[0].description) : "";
  humidityEl.textContent = `${cur.main.humidity}%`;
  windEl.textContent = toWind(cur.wind.speed);

  if(cur.weather && cur.weather[0] && cur.weather[0].icon){
    weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${cur.weather[0].icon}@2x.png" alt="${cur.weather[0].description}">`;
  } else {
    weatherIcon.textContent = "—";
  }
  currentCard.classList.remove("hidden");
}

function renderForecast(fc){
 
  const days = {};
  fc.list.forEach(item=>{
    const date = item.dt_txt.split(" ")[0];
    if(!days[date]) days[date] = [];
    days[date].push(item);
  });

  forecastRow.innerHTML = "";
  Object.keys(days).slice(0,5).forEach(date=>{
    const arr = days[date];
    const temps = arr.map(x => x.main.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
   
    const mid = arr[Math.floor(arr.length/2)];
    const icon = mid && mid.weather && mid.weather[0] ? mid.weather[0].icon : null;

    const label = new Date(date).toLocaleDateString(undefined, {weekday:"short", day:"numeric", month:"short"});
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="d">${label}</div>
      ${ icon ? `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="">` : `<div style="height:48px"></div>` }
      <div class="t">${toTemp(max)} / ${toTemp(min)}</div>
    `;
    forecastRow.appendChild(card);
  });
}


async function loadWeather(lat, lon, prettyName){
  try{
    setStatus("Mengambil data...");
    const [cur, fc] = await Promise.all([fetchCurrent(lat, lon), fetchForecast(lat, lon)]);
    state.lat = lat; state.lon = lon; if(prettyName) state.name = prettyName;
    saveLast();
    renderCurrent(cur);
    renderForecast(fc);
    setStatus("Data berhasil dimuat");
  }catch(err){
    console.error(err);
    setStatus("Gagal memuat data. Periksa API key / koneksi.", true);
  }
}

const handleSearch = debounce(async ()=>{
  const q = searchInput.value.trim();
  if(!q){ suggestions.classList.add("hidden"); return; }
  suggestions.classList.remove("hidden");
  suggestions.innerHTML = `<div class="muted small" style="padding:10px">Mencari...</div>`;
  const res = await geocode(q);
  if(!res || !res.length){ suggestions.innerHTML = `<div class="muted small" style="padding:10px">Tidak ditemukan</div>`; return; }
  suggestions.innerHTML = "";
  res.forEach(loc=>{
    const name = `${loc.name}${loc.state ? ", "+loc.state : ""}, ${loc.country}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggest-item";
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.padding = "10px";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.textAlign = "left";
    btn.textContent = name;
    btn.addEventListener("click", ()=>{ loadWeather(loc.lat, loc.lon, name); searchInput.value = name; suggestions.classList.add("hidden"); });
    suggestions.appendChild(btn);
  });
}, 300);

searchInput.addEventListener("input", handleSearch);
document.addEventListener("click", (e)=>{ if(!suggestions.contains(e.target) && e.target !== searchInput) suggestions.classList.add("hidden"); });


function renderFav(){
  const fav = JSON.parse(localStorage.getItem("wd_fav") || "[]");
  favList.innerHTML = "";
  if(!fav.length){ favList.innerHTML = "<div class='muted small'>Belum ada favorite</div>"; return; }
  fav.forEach(f=>{
    const el = document.createElement("div");
    el.className = "fav-item";
    el.textContent = f.name;
    el.addEventListener("click", ()=> loadWeather(f.lat, f.lon, f.name));
    favList.appendChild(el);
  });
}

btnSaveFav.addEventListener("click", ()=>{
  const fav = JSON.parse(localStorage.getItem("wd_fav") || "[]");
  const id = `${state.lat.toFixed(4)},${state.lon.toFixed(4)}`;
  if(fav.find(x=>x.id===id)){ alert("Sudah ada di favorite"); return; }
  fav.push({id, name: state.name, lat: state.lat, lon: state.lon});
  localStorage.setItem("wd_fav", JSON.stringify(fav));
  renderFav();
});

btnClearFav.addEventListener("click", ()=>{
  if(!confirm("Hapus semua favorite?")) return;
  localStorage.removeItem("wd_fav");
  renderFav();
});

btnTheme.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  btnTheme.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
});

btnUnit.addEventListener("click", ()=>{
  state.units = state.units === "metric" ? "imperial" : "metric";
  btnUnit.textContent = state.units === "metric" ? "°C" : "°F";
  loadWeather(state.lat, state.lon, state.name);
});

btnRefresh.addEventListener("click", ()=> loadWeather(state.lat, state.lon, state.name));


function capitalize(s){ return s ? s.split(" ").map(p=>p[0].toUpperCase()+p.slice(1)).join(" ") : ""; }

(function init(){
  loadLast();
  renderFav();
  loadWeather(state.lat, state.lon, state.name);
})();
