(function () {
  "use strict";

  const PLAYER_SELECTOR = ".playerList .teamphoto-player";
  const SKILL_ROW_SUFFIXES = [
    ["Keeper"],
    ["Defender"],
    ["Playmaker", "Playmaking"],
    ["Winger"],
    ["Passer"],
    ["Scorer", "Scoring"],
    ["Kicker"]
  ];

  function cleanText(value) {
    return (value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function cloneWithoutFloat(element, removeStyle = true) {
    const clone = element.cloneNode(true);
    clone.classList.remove("float_left", "float_right", "right", "left");
    if (removeStyle) {
      clone.removeAttribute("style");
    }
    clone.querySelectorAll("[class]").forEach((node) => {
      node.classList.remove("float_left", "float_right", "right", "left");
    });
    return clone;
  }

  function textFrom(element) {
    if (!element) {
      return "";
    }

    const clone = element.cloneNode(true);
    clone.querySelectorAll("script, style, img, object").forEach((node) => node.remove());
    return cleanText(clone.textContent);
  }

  function iconTitle(element) {
    const icon = element && element.querySelector("i[title], object[title], img[title]");
    return icon ? cleanText(icon.getAttribute("title")) : "";
  }

  function cellsAfterLabel(row) {
    return Array.from(row?.cells || []).slice(1);
  }

  function rowLabel(row) {
    return cleanText(row?.cells && row.cells[0] ? row.cells[0].textContent : "");
  }

  function fieldValue(row) {
    if (!row) {
      return "";
    }

    const holder = document.createElement("span");
    cellsAfterLabel(row).forEach((cell) => holder.appendChild(cell.cloneNode(true)));

    const barValue = barData(holder);
    if (barValue.text) {
      return barValue.text;
    }

    const icon = iconTitle(holder);
    const text = textFrom(holder);
    if (icon && text && !text.includes(icon)) {
      return cleanText(`${icon} ${text}`);
    }
    return text || icon || "-";
  }

  function visibleFieldText(row) {
    if (!row) {
      return "";
    }

    const holder = document.createElement("span");
    cellsAfterLabel(row).forEach((cell) => holder.appendChild(cell.cloneNode(true)));
    return textFrom(holder);
  }

  function barData(scope) {
    const bar = scope?.querySelector(".ht-bar");
    if (!bar) {
      return { denomination: "", number: "", text: "" };
    }

    const denominationNode =
      bar.querySelector(".bar-level[title]") ||
      bar.querySelector(".bar-max[title]") ||
      bar.querySelector(".bar-level .bar-denomination") ||
      bar.querySelector(".bar-max .bar-denomination");
    const denomination =
      denominationNode && denominationNode.getAttribute
        ? cleanText(denominationNode.getAttribute("title") || denominationNode.textContent)
        : "";

    const number = cleanText(scope.querySelector(".denominationNumber")?.textContent || "");
    if (denomination && number) {
      return { denomination, number, text: `${denomination}(${number})` };
    }
    return { denomination, number, text: denomination || number };
  }

  function rowBarData(row) {
    if (!row) {
      return { denomination: "", number: "", text: "" };
    }

    const holder = document.createElement("span");
    cellsAfterLabel(row).forEach((cell) => holder.appendChild(cell.cloneNode(true)));
    return barData(holder);
  }

  function indexInformationRows(table) {
    const indexed = {};
    const plainRows = [];

    Array.from(table?.rows || []).forEach((row) => {
      const id = row.id || "";

      if (id.endsWith("_trSpeciality")) {
        indexed.speciality = row;
      } else if (id.endsWith("_trForm")) {
        indexed.form = row;
      } else if (id.endsWith("_trStamina")) {
        indexed.stamina = row;
      } else {
        plainRows.push(row);
      }
    });

    indexed.age = plainRows[0];
    indexed.tsi = plainRows[1];
    indexed.salary = plainRows[2];
    return indexed;
  }

  function findSkillRow(skillsTable, suffixes) {
    const candidates = Array.isArray(suffixes) ? suffixes : [suffixes];
    return Array.from(skillsTable?.rows || []).find((row) =>
      candidates.some((suffix) => (row.id || "").endsWith(`_tr${suffix}`))
    );
  }

  function shortSkillLabel(fullLabel) {
    const tableHeaders = Array.from(document.querySelectorAll("#playersTable th[title]"));
    const matchingHeader = tableHeaders.find((header) => cleanText(header.getAttribute("title")) === fullLabel);
    const shortLabel = cleanText(matchingHeader?.textContent || "");
    return shortLabel || fullLabel;
  }

  function createLabeledValue(className, label, value, title) {
    if (!label && !value) {
      return null;
    }

    const item = document.createElement("span");
    item.className = className;
    if (title) {
      item.title = title;
    }

    const labelNode = document.createElement("span");
    labelNode.className = "omh-item-label";
    labelNode.textContent = label;

    const valueNode = document.createElement("span");
    valueNode.className = "omh-item-value";
    valueNode.textContent = value || "-";
    if (title) {
      valueNode.title = title;
    }

    item.append(labelNode, document.createTextNode(" "), valueNode);
    return item;
  }

  function createFact(label, value) {
    return createLabeledValue("omh-fact", label, value);
  }

  function createFactFromRow(row) {
    const data = rowBarData(row);
    if (data.number) {
      return createLabeledValue("omh-fact", rowLabel(row), data.number, data.denomination);
    }
    return createFact(rowLabel(row), fieldValue(row));
  }

  function factEntryFromElement(fact) {
    if (!fact) {
      return null;
    }

    const label = cleanText(fact.querySelector(".omh-item-label")?.textContent || "");
    const value = cleanText(fact.querySelector(".omh-item-value")?.textContent || "");
    if (!label && !value) {
      return null;
    }

    return { label, value, title: cleanText(fact.title || "") };
  }

  function compactAge(value) {
    const numbers = cleanText(value).match(/\d+/g);
    if (!numbers || numbers.length < 2) {
      return "";
    }

    const years = parseInt(numbers[0], 10);
    const days = parseInt(numbers[1], 10);
    if (!Number.isFinite(years) || !Number.isFinite(days)) {
      return "";
    }

    return (years + days / 112).toFixed(1);
  }

  function createAgeFact(row) {
    const original = fieldValue(row);
    return createLabeledValue("omh-fact", rowLabel(row), compactAge(original) || original, original);
  }

  function labelFromSortOption(value, fallback = "") {
    const option = document.querySelector(`select.sorting option[value="${value}"]`);
    return cleanText(option?.textContent || "") || fallback;
  }

  function numberParts(value) {
    return cleanText(value).match(/\d+/g) || [];
  }

  function createYouthAgeFact(player) {
    const summary = textFrom(player.querySelector(":scope > p"));
    const label = labelFromSortOption("Age");
    if (!summary || !label) {
      return null;
    }
    return createLabeledValue("omh-fact", label, compactAge(summary) || summary, summary);
  }

  function createYouthPromoteFact(player) {
    const summary = textFrom(player.querySelector(":scope > p"));
    const label = labelFromSortOption("CanPromoteIn");
    if (!summary || !label) {
      return null;
    }

    const numbers = numberParts(summary);
    if (numbers.length < 2) {
      return null;
    }

    return createLabeledValue("omh-fact", label, numbers[2] || "0", summary);
  }

  function createYouthInfoRows(player, skillsTable) {
    const speciality = Array.from(skillsTable?.rows || []).find((row) => (row.id || "").endsWith("_trSpeciality"));
    return {
      extraFacts: [createYouthAgeFact(player), createYouthPromoteFact(player), createFactFromRow(speciality)].filter(
        Boolean
      )
    };
  }

  function currencySymbol(currency) {
    const normalized = cleanText(currency).toUpperCase();
    if (normalized === "YUAN" || normalized === "CNY" || normalized === "RMB") {
      return "¥";
    }
    if (normalized === "EUR") {
      return "€";
    }
    if (normalized === "USD" || normalized === "DOLLAR") {
      return "$";
    }
    if (normalized === "GBP") {
      return "£";
    }
    return currency ? `${currency} ` : "";
  }

  function compactMoney(value) {
    const text = cleanText(value);
    const match = text.match(/([\d\s.,]+)\s*([A-Za-z]+)/);
    if (!match) {
      return "";
    }

    const amount = parseFloat(match[1].replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(amount)) {
      return "";
    }

    const compact = amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : String(Math.round(amount));
    return `${currencySymbol(match[2])}${compact}`;
  }

  function createSalaryFact(row) {
    const visible = visibleFieldText(row);
    return createLabeledValue("omh-fact omh-salary", rowLabel(row), compactMoney(visible) || visible, fieldValue(row));
  }

  function createPlayerFactEntries(infoRows) {
    const entries = [];

    (infoRows.extraFacts || []).forEach((fact) => {
      const entry = factEntryFromElement(fact);
      if (entry) {
        entries.push(entry);
      }
    });

    [createAgeFact(infoRows.age), createFactFromRow(infoRows.tsi), createSalaryFact(infoRows.salary)].forEach(
      (fact) => {
        const entry = factEntryFromElement(fact);
        if (entry) {
          entries.push(entry);
        }
      }
    );

    [infoRows.speciality, infoRows.form, infoRows.stamina].forEach((infoRow) => {
      const entry = factEntryFromElement(createFactFromRow(infoRow));
      if (entry) {
        entries.push(entry);
      }
    });

    return entries;
  }

  function skillLevel(row) {
    const number = cleanText(row?.querySelector(".denominationNumber")?.textContent || "");
    return parseInt(number, 10) || 0;
  }

  function skillLevelClass(level) {
    if (level >= 13) {
      return "omh-skill-elite";
    }
    if (level >= 11) {
      return "omh-skill-high";
    }
    if (level >= 9) {
      return "omh-skill-good";
    }
    if (level >= 7) {
      return "omh-skill-solid";
    }
    if (level >= 5) {
      return "omh-skill-low";
    }
    return "omh-skill-poor";
  }

  function skillDisplayLabel(fullLabel) {
    const normalized = cleanText(fullLabel);
    if (normalized.endsWith("技能")) {
      return normalized.slice(0, -2);
    }
    return shortSkillLabel(normalized);
  }

  function numericSkill(value) {
    const parsed = parseInt(cleanText(value), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function titleFrom(row, selector) {
    const node = row?.querySelector(selector);
    return node ? cleanText(node.getAttribute("title") || node.textContent) : "";
  }

  function youthSkillValue(row) {
    const value = cleanText(row?.cells?.[row.cells.length - 1]?.textContent || "").replace(/\s/g, "");
    if (!value || !value.includes("/")) {
      return { current: "", potential: "", text: "" };
    }

    const parts = value.split("/");
    const current = parts[0] || "?";
    const potential = parts[1] || "?";
    return { current, potential, text: `${current}/${potential}` };
  }

  function youthSkillData(row) {
    const value = youthSkillValue(row);
    if (!value.text) {
      return null;
    }

    const currentTitle = titleFrom(row, ".bar-level[title]");
    let potentialTitle = titleFrom(row, ".bar-cap[title]");
    if (!potentialTitle && value.current === value.potential) {
      potentialTitle = currentTitle;
    }

    const level = numericSkill(value.potential) || numericSkill(value.current);
    const title = [currentTitle, potentialTitle].filter(Boolean).join(" / ") || rowLabel(row);

    return {
      type: "youth-skill",
      label: skillDisplayLabel(rowLabel(row)),
      value: value.text,
      level,
      title
    };
  }

  function createYouthSkillRows(skillsTable) {
    return SKILL_ROW_SUFFIXES.map((suffixes) => findSkillRow(skillsTable, suffixes))
      .filter(Boolean)
      .map(youthSkillData)
      .filter(Boolean);
  }

  function createSkillEntry(skillRow) {
    const isYouthSkill = skillRow.type === "youth-skill";
    const fullLabel = isYouthSkill ? skillRow.label : rowLabel(skillRow);
    const data = isYouthSkill
      ? { denomination: skillRow.title, number: skillRow.value }
      : rowBarData(skillRow);

    return {
      label: isYouthSkill ? fullLabel : skillDisplayLabel(fullLabel),
      value: data.number || (isYouthSkill ? skillRow.value : fieldValue(skillRow)),
      level: isYouthSkill ? skillRow.level : skillLevel(skillRow),
      title: data.denomination || fullLabel
    };
  }

  function createPlayerSkillEntries(skillRows) {
    return skillRows.map(createSkillEntry).filter((entry) => entry.label || entry.value);
  }

  function createPlayerCell(player) {
    const block = document.createElement("div");
    block.className = "omh-player-cell";

    const name = document.createElement("div");
    name.className = "omh-player-name";

    const heading = player.querySelector(":scope > h3");
    if (heading) {
      Array.from(cloneWithoutFloat(heading).childNodes).forEach((node) => name.appendChild(node));
    }

    const flag = player.querySelector(":scope > span.float_right .flag") || player.querySelector(":scope > span.float_right a");
    if (flag) {
      name.appendChild(cloneWithoutFloat(flag));
    }

    const category = player.querySelector(":scope > .player-category");
    if (category) {
      name.appendChild(cloneWithoutFloat(category, false));
    }

    if (name.childNodes.length) {
      block.appendChild(name);
    }

    const summary = player.querySelector(":scope > p");
    if (summary) {
      const summaryClone = cloneWithoutFloat(summary);
      summaryClone.className = "omh-player-summary";
      block.appendChild(summaryClone);
    }

    return block;
  }

  function lastRatingData(originalData) {
    if (!originalData) {
      return { rating: "", matchDate: "", matchHref: "", position: "" };
    }

    const source = document.createElement("span");

    let current = originalData.nextSibling;
    while (current) {
      const next = current.nextSibling;
      const isEmptyText = current.nodeType === Node.TEXT_NODE && !cleanText(current.textContent);
      const isRatingLabel = current.nodeType === Node.ELEMENT_NODE && current.classList.contains("last_rating_label");
      if (!isEmptyText && !isRatingLabel) {
        source.appendChild(current.cloneNode(true));
      }
      current = next;
    }

    return {
      rating: cleanText(source.querySelector("hattrick-rating")?.getAttribute("rating") || ""),
      matchDate: cleanText(source.querySelector("a")?.textContent || ""),
      matchHref: source.querySelector("a")?.getAttribute("href") || "",
      position: cleanText(source.querySelector(".last_match_position")?.textContent || "").replace(/^\(|\)$/g, "")
    };
  }

  function createLastRatingBlock(player, originalData) {
    if (!originalData) {
      return null;
    }

    const block = document.createElement("div");
    block.className = "omh-rating-row";
    const source = document.createElement("span");
    const data = lastRatingData(originalData);

    let current = originalData.nextSibling;
    while (current) {
      const next = current.nextSibling;
      const isEmptyText = current.nodeType === Node.TEXT_NODE && !cleanText(current.textContent);
      const isRatingLabel = current.nodeType === Node.ELEMENT_NODE && current.classList.contains("last_rating_label");
      if (!isEmptyText && !isRatingLabel) {
        source.appendChild(current.cloneNode(true));
      }
      current = next;
    }

    const rating = cleanText(source.querySelector("hattrick-rating")?.getAttribute("rating") || "");
    if (data.rating || rating) {
      const score = document.createElement("span");
      score.className = "omh-rating-score";
      score.textContent = `★ ${data.rating || rating}`;
      block.appendChild(score);
    }

    const matchLink = source.querySelector("a");
    if (matchLink) {
      block.appendChild(matchLink.cloneNode(true));
    }

    const position = source.querySelector(".last_match_position");
    if (position) {
      block.appendChild(position.cloneNode(true));
    }

    if (!cleanText(block.textContent)) {
      block.textContent = "-";
    }

    return block;
  }

  function createFactsRow(infoRows) {
    const row = document.createElement("div");
    row.className = "omh-facts-row";

    (infoRows.extraFacts || []).forEach((fact) => row.appendChild(fact));

    [createAgeFact(infoRows.age), createFactFromRow(infoRows.tsi), createSalaryFact(infoRows.salary)].forEach(
      (fact) => {
        if (fact) {
          row.appendChild(fact);
        }
      }
    );
    [infoRows.speciality, infoRows.form, infoRows.stamina].forEach(
      (infoRow) => {
        const fact = createFactFromRow(infoRow);
        if (fact) {
          row.appendChild(fact);
        }
      }
    );

    return row.children.length ? row : null;
  }

  function createSkillsRow(skillRows) {
    if (!skillRows.length) {
      return null;
    }

    const row = document.createElement("div");
    row.className = "omh-skills-row";

    skillRows.forEach((skillRow) => {
      const entry = createSkillEntry(skillRow);
      const skill = createLabeledValue(
        `omh-skill ${skillLevelClass(entry.level)}`,
        entry.label,
        entry.value,
        entry.title
      );
      if (skill) {
        skill.dataset.level = String(entry.level);
        row.appendChild(skill);
      }
    });

    return row.children.length ? row : null;
  }

  function collectPlayerData(player) {
    const playerInfo = player.querySelector(".playerInfo");
    const originalData = playerInfo?.querySelector(":scope > .flex.flex-space-between");
    const infoTable = originalData?.querySelector(".transferPlayerInformation table");
    const skillsTable = originalData?.querySelector(".transferPlayerSkills table");
    const youthSkillsTable = originalData?.classList.contains("youthPlayerSkills")
      ? originalData.querySelector("table")
      : null;
    const heading = player.querySelector(":scope > h3");
    if (!heading) {
      return null;
    }

    const infoRows = infoTable
      ? indexInformationRows(infoTable)
      : youthSkillsTable
      ? createYouthInfoRows(player, youthSkillsTable)
      : {};
    const skillRows = skillsTable
      ? SKILL_ROW_SUFFIXES.map((suffixes) => findSkillRow(skillsTable, suffixes)).filter(Boolean)
      : youthSkillsTable
      ? createYouthSkillRows(youthSkillsTable)
      : [];

    return {
      player,
      originalData,
      infoRows,
      skillRows
    };
  }

  function playerName(player) {
    const link = player.querySelector(":scope > h3 a");
    return cleanText(link?.getAttribute("title") || link?.textContent || textFrom(player.querySelector(":scope > h3")));
  }

  function playerId(player) {
    const href = player.querySelector(":scope > h3 a")?.getAttribute("href") || "";
    const match = href.match(/[?&](?:PlayerID|YouthPlayerID)=(\d+)/i);
    return match ? match[1] : "";
  }

  function uniqueColumn(columns, column) {
    if (!column.label || columns.some((existing) => existing.key === column.key)) {
      return;
    }
    columns.push(column);
  }

  function ratingHeaderLabel() {
    return labelFromSortOption("LastMatchRating") || cleanText(document.querySelector(".last_rating_label")?.textContent || "");
  }

  function positionHeaderLabel() {
    const headers = Array.from(document.querySelectorAll("#playersTable thead tr:last-child th[title]"));
    const lastHeader = headers[headers.length - 1];
    return cleanText(lastHeader?.getAttribute("title") || lastHeader?.textContent || "");
  }

  function csvLabel() {
    const pageDownloadLink =
      document.querySelector("#playersTable a.download") || document.querySelector(".pageOverlayContent a.download");
    return cleanText(pageDownloadLink?.textContent || pageDownloadLink?.getAttribute("title") || "") || "CSV";
  }

  function csvCell(value) {
    const text = String(value ?? "");
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function safeFileName(value) {
    return (cleanText(value) || "players").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").slice(0, 90);
  }

  function downloadCsv(csv) {
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${safeFileName(document.querySelector("h1")?.textContent || document.title)}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportPlayersCsv(playerData) {
    const rows = playerData.map((data) => {
      const values = {
        name: playerName(data.player),
        playerId: playerId(data.player)
      };
      const facts = createPlayerFactEntries(data.infoRows);
      const skills = createPlayerSkillEntries(data.skillRows);
      const rating = lastRatingData(data.originalData);

      facts.forEach((fact) => {
        values[`fact:${fact.label}`] = fact.value;
      });
      skills.forEach((skill) => {
        values[`skill:${skill.label}`] = skill.value;
      });
      values.rating = rating.rating;
      values.matchDate = rating.matchDate;
      values.position = rating.position;

      return { values, facts, skills };
    });

    const columns = [];
    uniqueColumn(columns, { key: "name", label: labelFromSortOption("Firstname") || "Name" });
    uniqueColumn(columns, { key: "playerId", label: labelFromSortOption("PlayerId") || "Player ID" });
    rows.forEach((row) => {
      row.facts.forEach((fact) => uniqueColumn(columns, { key: `fact:${fact.label}`, label: fact.label }));
    });
    rows.forEach((row) => {
      row.skills.forEach((skill) => uniqueColumn(columns, { key: `skill:${skill.label}`, label: skill.label }));
    });
    uniqueColumn(columns, { key: "rating", label: ratingHeaderLabel() || "Rating" });
    uniqueColumn(columns, { key: "matchDate", label: labelFromSortOption("LastMatchDate") || "Match" });
    uniqueColumn(columns, { key: "position", label: positionHeaderLabel() || "Position" });

    const csvRows = [
      columns.map((column) => csvCell(column.label)).join(","),
      ...rows.map((row) => columns.map((column) => csvCell(row.values[column.key] || "")).join(","))
    ];
    downloadCsv(csvRows.join("\r\n"));
  }

  function createToolbar(playerData) {
    const toolbar = document.createElement("div");
    toolbar.className = "omh-toolbar";

    const exportButton = document.createElement("button");
    const label = csvLabel();
    exportButton.type = "button";
    exportButton.className = "omh-export-button";
    exportButton.textContent = label;
    exportButton.title = label;
    exportButton.setAttribute("aria-label", label);
    exportButton.addEventListener("click", () => exportPlayersCsv(playerData));

    toolbar.appendChild(exportButton);
    return toolbar;
  }

  function buildPlayerList(playerData) {
    const wrapper = document.createElement("div");
    wrapper.className = "omh-list-wrapper";

    const list = document.createElement("div");
    list.className = "omh-player-list";

    playerData.forEach((data) => {
      const row = document.createElement("div");
      row.className = "omh-player-row";
      const info = data.infoRows;
      const top = document.createElement("div");
      top.className = "omh-player-top";

      top.appendChild(createPlayerCell(data.player));
      const rating = createLastRatingBlock(data.player, data.originalData);
      if (rating) {
        top.appendChild(rating);
      }
      row.appendChild(top);
      [createFactsRow(info), createSkillsRow(data.skillRows)].forEach((section) => {
        if (section) {
          row.appendChild(section);
        }
      });
      list.appendChild(row);
    });

    wrapper.appendChild(createToolbar(playerData));
    wrapper.appendChild(list);
    return wrapper;
  }

  function enhanceAll() {
    const list = document.querySelector(".playerList");
    if (!list || list.dataset.omhEnhanced === "true") {
      return;
    }

    const playerData = Array.from(document.querySelectorAll(PLAYER_SELECTOR)).map(collectPlayerData).filter(Boolean);
    if (!playerData.length || playerData.length !== document.querySelectorAll(PLAYER_SELECTOR).length) {
      return;
    }

    list.parentNode.insertBefore(buildPlayerList(playerData), list);
    list.classList.add("omh-source-list");
    list.dataset.omhEnhanced = "true";
  }

  function observePlayerList() {
    const list = document.querySelector(".playerList");
    if (!list) {
      return;
    }

    let timer = 0;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(enhanceAll, 100);
    });
    observer.observe(list, { childList: true, subtree: true });
  }

  enhanceAll();
  observePlayerList();
})();
