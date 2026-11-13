(function () {
  // Skala penggaris: 1 cm = 3.2 px, rentang 0 cm s.d. 180 cm
  const PX_PER_CM = 3.2;
  const MAX_CM = 180;
  const MIN_CM = 0;
  const STAGE_HEIGHT_PX = (MAX_CM - MIN_CM) * PX_PER_CM;
  const PEDESTAL_HEIGHT_PX = 82;

  const BULAN_INDO = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // State Aplikasi
  let selectedMembers = new Set();
  let compareSelectMode = false;
  let showGuideLines = true;
  let currentView = "ruler";

  // Hitung Zodiak otomatis dari tanggal lahir
  function getZodiac(dateStr) {
    const [, mStr, dStr] = dateStr.split("-");
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);

    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return { name: "Aries", icon: "♈" };
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return { name: "Taurus", icon: "♉" };
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return { name: "Gemini", icon: "♊" };
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return { name: "Cancer", icon: "♋" };
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return { name: "Leo", icon: "♌" };
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return { name: "Virgo", icon: "♍" };
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return { name: "Libra", icon: "♎" };
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return { name: "Scorpio", icon: "♏" };
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return { name: "Sagitarius", icon: "♐" };
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return { name: "Capricorn", icon: "♑" };
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return { name: "Aquarius", icon: "♒" };
    return { name: "Pisces", icon: "♓" };
  }

  // Hitung umur presisi (Tahun, Bulan, Hari) & total hari hidup
  function calculatePrecisionAge(birthDateStr) {
    const today = new Date();
    const [by, bm, bd] = birthDateStr.split("-").map(Number);
    const birthDate = new Date(by, bm - 1, bd);

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      days += prevMonthDays;
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const diffMs = today.setHours(0, 0, 0, 0) - birthDate.setHours(0, 0, 0, 0);
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      years,
      months,
      days,
      totalDays,
      shortText: `${years} thn ${months} bln ${days} hr`,
      fullText: `${years} Tahun, ${months} Bulan, ${days} Hari`
    };
  }

  // Hitung hitung mundur ulang tahun berikutnya
  function getNextBirthdayCountdown(birthDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [, bm, bd] = birthDateStr.split("-").map(Number);

    let nextBday = new Date(today.getFullYear(), bm - 1, bd);
    if (nextBday < today) {
      nextBday = new Date(today.getFullYear() + 1, bm - 1, bd);
    }

    const diffDays = Math.round((nextBday - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hari ini berulang tahun! 🎉";
    return `${diffDays} hari lagi`;
  }

  function formatTanggalIndo(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${d} ${BULAN_INDO[m - 1]} ${y}`;
  }

  // Enrich data awal
  const enrichedMembers = MEMBERS_DATA.map((m) => ({
    ...m,
    zodiac: getZodiac(m.tanggalLahir),
    age: calculatePrecisionAge(m.tanggalLahir),
    formattedBirth: formatTanggalIndo(m.tanggalLahir),
    nextBday: getNextBirthdayCountdown(m.tanggalLahir)
  }));

  // DOM Elements
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const teamFilter = document.getElementById("teamFilter");
  const genFilter = document.getElementById("genFilter");
  const zodiacFilter = document.getElementById("zodiacFilter");
  const toggleGuideLines = document.getElementById("toggleGuideLines");
  const toggleCompareSelect = document.getElementById("toggleCompareSelect");
  const btnResetFilters = document.getElementById("btnResetFilters");
  const pickerDrawer = document.getElementById("pickerDrawer");
  const pickerChips = document.getElementById("pickerChips");
  const btnClearSelection = document.getElementById("btnClearSelection");
  const selectedCountEl = document.getElementById("selectedCount");

  const rulerAxis = document.getElementById("rulerAxis");
  const rulerGridLines = document.getElementById("rulerGridLines");
  const lineupContainer = document.getElementById("lineupContainer");
  const cardsGrid = document.getElementById("cardsGrid");

  const btnViewRuler = document.getElementById("btnViewRuler");
  const btnViewCards = document.getElementById("btnViewCards");
  const rulerView = document.getElementById("rulerView");
  const cardsView = document.getElementById("cardsView");

  const memberModal = document.getElementById("memberModal");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");

  // Populate Filter Generasi
  function initGenerationFilter() {
    const gens = [...new Set(enrichedMembers.map((m) => m.generasi))].sort((a, b) => a - b);
    gens.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = `Generasi ${g}`;
      genFilter.appendChild(opt);
    });
  }

  // Render Picker Chips untuk Mode Pilih Member
  function initPickerChips() {
    const sortedAlpha = [...enrichedMembers].sort((a, b) => a.panggilan.localeCompare(b.panggilan));
    pickerChips.innerHTML = "";
    sortedAlpha.forEach((m) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "picker-chip";
      chip.textContent = `${m.panggilan} (${m.tinggi}cm)`;
      chip.dataset.nickname = m.panggilan;
      chip.addEventListener("click", () => {
        if (selectedMembers.has(m.panggilan)) {
          selectedMembers.delete(m.panggilan);
          chip.classList.remove("selected");
        } else {
          selectedMembers.add(m.panggilan);
          chip.classList.add("selected");
        }
        selectedCountEl.textContent = selectedMembers.size;
        renderApp();
      });
      pickerChips.appendChild(chip);
    });
  }

  // Bangun Penggaris di Sisi Kiri & Garis Bantu Horizontal
  function buildRuler() {
    const totalHeight = STAGE_HEIGHT_PX + PEDESTAL_HEIGHT_PX;
    rulerAxis.style.height = `${totalHeight}px`;
    rulerGridLines.style.height = `${STAGE_HEIGHT_PX}px`;

    rulerAxis.innerHTML = "";
    rulerGridLines.innerHTML = "";

    for (let cm = MIN_CM; cm <= MAX_CM; cm += 5) {
      const bottomPx = (cm - MIN_CM) * PX_PER_CM + PEDESTAL_HEIGHT_PX;
      const isMajor = cm % 10 === 0;

      const tick = document.createElement("div");
      tick.className = `ruler-tick ${isMajor ? "major" : "minor"}`;
      tick.style.bottom = `${bottomPx}px`;
      if (isMajor) {
        tick.innerHTML = `<span>${cm} cm</span>`;
      }
      rulerAxis.appendChild(tick);

      if (showGuideLines && cm >= 100) {
        const line = document.createElement("div");
        line.className = `grid-line ${isMajor ? "major" : ""}`;
        line.style.bottom = `${(cm - MIN_CM) * PX_PER_CM}px`;
        rulerGridLines.appendChild(line);
      }
    }
  }

  // Filter & Sort Logic
  function getFilteredAndSortedMembers() {
    const query = searchInput.value.trim().toLowerCase();
    const team = teamFilter.value;
    const gen = genFilter.value;
    const zodiac = zodiacFilter.value;
    const sortBy = sortSelect.value;

    let list = enrichedMembers.filter((m) => {
      if (compareSelectMode && selectedMembers.size > 0) {
        if (!selectedMembers.has(m.panggilan)) return false;
      }
      if (query && !m.nama.toLowerCase().includes(query) && !m.panggilan.toLowerCase().includes(query)) {
        return false;
      }
      if (team !== "ALL" && m.team !== team) return false;
      if (gen !== "ALL" && String(m.generasi) !== gen) return false;
      if (zodiac !== "ALL" && m.zodiac.name !== zodiac) return false;
      return true;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case "height-desc":
          return b.tinggi - a.tinggi || a.panggilan.localeCompare(b.panggilan);
        case "height-asc":
          return a.tinggi - b.tinggi || a.panggilan.localeCompare(b.panggilan);
        case "age-desc": // Tertua ke Termuda (totalDays terbesar)
          return b.age.totalDays - a.age.totalDays;
        case "age-asc": // Termuda ke Tertua
          return a.age.totalDays - b.age.totalDays;
        case "gen-asc":
          return a.generasi - b.generasi || a.panggilan.localeCompare(b.panggilan);
        case "gen-desc":
          return b.generasi - a.generasi || a.panggilan.localeCompare(b.panggilan);
        case "name-asc":
        default:
          return a.panggilan.localeCompare(b.panggilan);
      }
    });

    return list;
  }

  // Update Statistik Header
  function updateStats(list) {
    document.getElementById("statCount").textContent = `${list.length} Member`;

    if (list.length === 0) {
      document.getElementById("statAvgHeight").textContent = "-";
      document.getElementById("statMinMaxHeight").textContent = "-";
      document.getElementById("statAvgAge").textContent = "-";
      return;
    }

    const heights = list.map((m) => m.tinggi);
    const avgHeight = (heights.reduce((acc, v) => acc + v, 0) / heights.length).toFixed(1);
    const maxH = Math.max(...heights);
    const minH = Math.min(...heights);

    const avgDays = list.reduce((acc, m) => acc + m.age.totalDays, 0) / list.length;
    const avgYears = Math.floor(avgDays / 365.25);
    const avgMonths = Math.floor((avgDays % 365.25) / 30.44);

    document.getElementById("statAvgHeight").textContent = `${avgHeight} cm`;
    document.getElementById("statMinMaxHeight").textContent = `${maxH} cm / ${minH} cm`;
    document.getElementById("statAvgAge").textContent = `${avgYears} thn ${avgMonths} bln`;
  }

  // Render View 1: Lineup Penggaris
  function renderRulerStage(list) {
    buildRuler();
    lineupContainer.style.height = `${STAGE_HEIGHT_PX + PEDESTAL_HEIGHT_PX}px`;
    lineupContainer.innerHTML = "";

    if (list.length === 0) {
      lineupContainer.innerHTML = `<div style="padding: 60px; font-weight: 700; color: #6b7280;">Tidak ada member yang sesuai dengan filter saat ini.</div>`;
      return;
    }

    list.forEach((m) => {
      const figureHeightPx = (m.tinggi - MIN_CM) * PX_PER_CM;

      const stand = document.createElement("div");
      stand.className = "member-stand";
      stand.title = `${m.nama} (${m.tinggi} cm • ${m.age.fullText})`;

      stand.innerHTML = `
        <div class="height-badge-top">${m.tinggi} cm</div>
        <div class="member-figure-box" style="height: ${figureHeightPx}px;">
          <img src="${m.image}" alt="${m.panggilan}" loading="lazy"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="silhouette-fallback" style="display: none;">
            <span class="sil-icon">🎤</span>
            <span class="sil-file">${m.image}</span>
          </div>
        </div>
        <div class="member-pedestal team-${m.team}" style="height: ${PEDESTAL_HEIGHT_PX}px;">
          <div class="pedestal-name">${m.panggilan}</div>
          <div class="pedestal-meta">${m.team} • Gen ${m.generasi}</div>
          <div class="pedestal-age">${m.age.years} thn ${m.age.months} bln</div>
        </div>
      `;

      stand.addEventListener("click", () => openMemberModal(m));
      lineupContainer.appendChild(stand);
    });
  }

  // Render View 2: Kartu Detail & Umur Presisi
  function renderCardsGrid(list) {
    cardsGrid.innerHTML = "";

    if (list.length === 0) {
      cardsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding:40px; color:#6b7280; font-weight:700;">Tidak ada member yang sesuai filter.</p>`;
      return;
    }

    list.forEach((m, index) => {
      const card = document.createElement("div");
      card.className = "member-card";
      card.innerHTML = `
        <div class="card-top-banner">
          <span class="card-rank-badge">#${index + 1}</span>
          <span class="card-team-pill bg-${m.team}">${m.team}</span>
          <img src="${m.image}" alt="${m.panggilan}" loading="lazy"
               onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22140%22><rect width=%22120%22 height=%22140%22 rx=%2216%22 fill=%22%23ffe4e6%22/><text x=%2250%25%22 y=%2252%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2236%22>🎤</text></svg>'" />
        </div>
        <div class="card-content">
          <div class="card-nickname">${m.panggilan}</div>
          <div class="card-fullname">${m.nama}</div>
          <div class="card-specs">
            <div class="spec-box full-width">
              <span class="spec-label">Usia Presisi Hari Ini</span>
              <span class="spec-val">${m.age.fullText}</span>
            </div>
            <div class="spec-box">
              <span class="spec-label">Tinggi Badan</span>
              <span class="spec-val">${m.tinggi} cm</span>
            </div>
            <div class="spec-box">
              <span class="spec-label">Generasi</span>
              <span class="spec-val">Gen ${m.generasi}</span>
            </div>
            <div class="spec-box">
              <span class="spec-label">Tanggal Lahir</span>
              <span class="spec-val">${m.formattedBirth}</span>
            </div>
            <div class="spec-box">
              <span class="spec-label">Zodiak</span>
              <span class="spec-val">${m.zodiac.icon} ${m.zodiac.name}</span>
            </div>
          </div>
        </div>
      `;
      card.addEventListener("click", () => openMemberModal(m));
      cardsGrid.appendChild(card);
    });
  }

  // Modal Detail Member
  function openMemberModal(m) {
    modalBody.innerHTML = `
      <div class="modal-hero">
        <img src="${m.image}" alt="${m.panggilan}"
             onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22160%22><rect width=%22120%22 height=%22160%22 rx=%2216%22 fill=%22rgba(255,255,255,0.2)%22/><text x=%2250%25%22 y=%2252%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2242%22>🎤</text></svg>'" />
        <div class="modal-hero-info">
          <span class="brand-badge" style="margin-bottom:6px;">TEAM ${m.team.toUpperCase()} • GEN ${m.generasi}</span>
          <h2>${m.panggilan}</h2>
          <p>${m.nama}</p>
        </div>
      </div>
      <div class="modal-details">
        <div class="spec-box full-width">
          <span class="spec-label">Usia Presisi (Tahun, Bulan, Hari)</span>
          <span class="spec-val" style="font-size:1rem;">${m.age.fullText}</span>
        </div>
        <div class="spec-box">
          <span class="spec-label">Tinggi Badan</span>
          <span class="spec-val">${m.tinggi} cm</span>
        </div>
        <div class="spec-box">
          <span class="spec-label">Tanggal Lahir</span>
          <span class="spec-val">${m.formattedBirth}</span>
        </div>
        <div class="spec-box">
          <span class="spec-label">Zodiak</span>
          <span class="spec-val">${m.zodiac.icon} ${m.zodiac.name}</span>
        </div>
        <div class="spec-box">
          <span class="spec-label">Ulang Tahun Berikutnya</span>
          <span class="spec-val">${m.nextBday}</span>
        </div>
        <div class="spec-box full-width">
          <span class="spec-label">Total Hari Hidup / Path File PNG</span>
          <span class="spec-val">${m.age.totalDays.toLocaleString("id-ID")} hari • <code>${m.image}</code></span>
        </div>
      </div>
    `;
    memberModal.classList.remove("hidden");
  }

  // Main Render Orchestrator
  function renderApp() {
    const filteredList = getFilteredAndSortedMembers();
    updateStats(filteredList);

    if (currentView === "ruler") {
      renderRulerStage(filteredList);
    } else {
      renderCardsGrid(filteredList);
    }
  }

  // Event Listeners
  [searchInput, sortSelect, teamFilter, genFilter, zodiacFilter].forEach((el) => {
    el.addEventListener("input", renderApp);
    el.addEventListener("change", renderApp);
  });

  toggleGuideLines.addEventListener("change", (e) => {
    showGuideLines = e.target.checked;
    renderApp();
  });

  toggleCompareSelect.addEventListener("change", (e) => {
    compareSelectMode = e.target.checked;
    pickerDrawer.classList.toggle("hidden", !compareSelectMode);
    renderApp();
  });

  btnClearSelection.addEventListener("click", () => {
    selectedMembers.clear();
    selectedCountEl.textContent = "0";
    document.querySelectorAll(".picker-chip").forEach((c) => c.classList.remove("selected"));
    renderApp();
  });

  btnResetFilters.addEventListener("click", () => {
    searchInput.value = "";
    sortSelect.value = "height-desc";
    teamFilter.value = "ALL";
    genFilter.value = "ALL";
    zodiacFilter.value = "ALL";
    selectedMembers.clear();
    selectedCountEl.textContent = "0";
    document.querySelectorAll(".picker-chip").forEach((c) => c.classList.remove("selected"));
    renderApp();
  });

  btnViewRuler.addEventListener("click", () => {
    currentView = "ruler";
    btnViewRuler.classList.add("active");
    btnViewCards.classList.remove("active");
    rulerView.classList.remove("hidden");
    cardsView.classList.add("hidden");
    renderApp();
  });

  btnViewCards.addEventListener("click", () => {
    currentView = "cards";
    btnViewCards.classList.add("active");
    btnViewRuler.classList.remove("active");
    cardsView.classList.remove("hidden");
    rulerView.classList.add("hidden");
    renderApp();
  });

  modalClose.addEventListener("click", () => memberModal.classList.add("hidden"));
  memberModal.addEventListener("click", (e) => {
    if (e.target === memberModal) memberModal.classList.add("hidden");
  });

  // Inisialisasi
  initGenerationFilter();
  initPickerChips();
  renderApp();
})();