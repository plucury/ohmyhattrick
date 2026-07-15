(function () {
  "use strict";

  const PLAYER_SELECTOR = ".playerList .teamphoto-player";
  const DEBUG = /(?:[?&]omhDebug=1\b|#.*\bomhDebug=1\b)/.test(window.location.href);
  const TAG_STORAGE_KEY = "ohMyHattrick.playerTags.v1";
  const PLAYER_TAGS = ["Core", "Develop", "Rotation", "Sell", "Watch", "Frozen"];
  const LEGACY_TAGS = {
    "核心": "Core",
    "培养": "Develop",
    "轮换": "Rotation",
    "出售": "Sell",
    "观察": "Watch",
    "冻结": "Frozen"
  };
  const SKILL_ROW_SUFFIXES = [
    ["Keeper"],
    ["Defender"],
    ["Playmaker", "Playmaking"],
    ["Winger"],
    ["Passer"],
    ["Scorer", "Scoring"],
    ["Kicker"]
  ];
  let playerTags = {};

  function debugLog(...args) {
    if (DEBUG) {
      console.debug("[Oh My Hattrick]", ...args);
    }
  }

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

  function createTagControl(player) {
    return createTagControlForKey(playerStorageId(player));
  }

  function createTagControlForKey(key) {
    const select = document.createElement("select");
    select.className = "omh-tag-select";
    select.title = tagLabel();
    select.setAttribute("aria-label", tagLabel());

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = tagLabel();
    select.appendChild(emptyOption);

    PLAYER_TAGS.forEach((tag) => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      select.appendChild(option);
    });

    select.value = playerTagForKey(key);
    select.dataset.tag = select.value;
    select.addEventListener("change", () => {
      setPlayerTagForKey(key, select.value);
      select.dataset.tag = select.value;
    });

    return select;
  }

  function createPlayerActions(data) {
    const actions = document.createElement("div");
    actions.className = "omh-player-actions";

    const rating = createLastRatingBlock(data.player, data.originalData);
    if (rating) {
      actions.appendChild(rating);
    }
    actions.appendChild(createTagControl(data.player));

    return actions;
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

  function storageIdFromHref(href) {
    const match = href.match(/[?&](YouthPlayerID|PlayerID)=(\d+)/i);
    if (!match) {
      return "";
    }
    return `${match[1].toLowerCase()}:${match[2]}`;
  }

  function playerStorageId(player) {
    return storageIdFromHref(player.querySelector(":scope > h3 a")?.getAttribute("href") || "");
  }

  function currentPlayerStorageId() {
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
    const formAction = document.querySelector("form")?.getAttribute("action") || "";
    const playerLink = document
      .querySelector('a[href*="PlayerID="], a[href*="YouthPlayerID="]')
      ?.getAttribute("href");
    return [window.location.href, canonical, formAction, playerLink || ""].map(storageIdFromHref).find(Boolean) || "";
  }

  function normalizePlayerTags(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value)
        .map(([key, tag]) => [key, LEGACY_TAGS[tag] || tag])
        .filter(([key, tag]) => key && PLAYER_TAGS.includes(tag))
    );
  }

  function readLegacyPlayerTags() {
    try {
      return normalizePlayerTags(JSON.parse(localStorage.getItem(TAG_STORAGE_KEY) || "{}"));
    } catch (error) {
      debugLog("read legacy tags failed", error);
      return {};
    }
  }

  function extensionStorage() {
    return typeof chrome !== "undefined" ? chrome.storage?.local : null;
  }

  function loadPlayerTags() {
    const storage = extensionStorage();
    if (!storage) {
      playerTags = readLegacyPlayerTags();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      storage.get(TAG_STORAGE_KEY, (result) => {
        const error = chrome.runtime?.lastError;
        if (error) {
          debugLog("read extension tags failed", error);
        }

        const storedTags = normalizePlayerTags(result?.[TAG_STORAGE_KEY]);
        const legacyTags = readLegacyPlayerTags();
        playerTags = { ...legacyTags, ...storedTags };

        if (Object.keys(legacyTags).length) {
          writePlayerTags();
          try {
            localStorage.removeItem(TAG_STORAGE_KEY);
          } catch (removeError) {
            debugLog("remove legacy tags failed", removeError);
          }
        }

        resolve();
      });
    });
  }

  function writePlayerTags() {
    const storage = extensionStorage();
    if (storage) {
      storage.set({ [TAG_STORAGE_KEY]: playerTags }, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          debugLog("write extension tags failed", error);
        }
      });
      return;
    }

    try {
      localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(playerTags));
    } catch (error) {
      debugLog("write fallback tags failed", error);
    }
  }

  function playerTag(player) {
    return playerTagForKey(playerStorageId(player));
  }

  function playerTagForKey(key) {
    const tag = key ? playerTags[key] : "";
    return PLAYER_TAGS.includes(tag) ? tag : "";
  }

  function setPlayerTag(player, tag) {
    setPlayerTagForKey(playerStorageId(player), tag);
  }

  function setPlayerTagForKey(key, tag) {
    if (!key) {
      return;
    }

    if (PLAYER_TAGS.includes(tag)) {
      playerTags[key] = tag;
    } else {
      delete playerTags[key];
    }
    writePlayerTags();
  }

  function tagLabel() {
    return "Tag";
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
    return "Download CSV";
  }

  function copyJsonLabel() {
    return "Copy JSON";
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

  function playerExportRows(playerData) {
    return playerData.map((data) => {
      const values = {
        name: playerName(data.player),
        playerId: playerId(data.player),
        tag: playerTag(data.player)
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
  }

  function exportPlayersCsv(playerData) {
    const rows = playerExportRows(playerData);
    const columns = [];
    uniqueColumn(columns, { key: "name", label: labelFromSortOption("Firstname") || "Name" });
    uniqueColumn(columns, { key: "playerId", label: labelFromSortOption("PlayerId") || "Player ID" });
    uniqueColumn(columns, { key: "tag", label: tagLabel() });
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

  function exportPlayersJson(playerData) {
    return playerExportRows(playerData).map((row) => {
      const factValues = {};
      const skillValues = {};

      row.facts.forEach((fact) => {
        factValues[fact.label] = fact.value;
      });
      row.skills.forEach((skill) => {
        skillValues[skill.label] = {
          value: skill.value,
          level: skill.level,
          title: skill.title
        };
      });

      return {
        name: row.values.name,
        playerId: row.values.playerId,
        tag: row.values.tag,
        facts: factValues,
        skills: skillValues,
        lastMatch: {
          rating: row.values.rating,
          date: row.values.matchDate,
          position: row.values.position
        }
      };
    });
  }

  async function copyPlayersJson(playerData, button) {
    const originalText = button.textContent;
    const json = JSON.stringify(exportPlayersJson(playerData), null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
    } else {
      const input = document.createElement("textarea");
      input.value = json;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    button.textContent = `✓ ${originalText}`;
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1200);
  }

  function createToolbar(playerData) {
    const toolbar = document.createElement("div");
    toolbar.className = "omh-toolbar";

    const exportButton = document.createElement("button");
    const label = csvLabel();
    exportButton.type = "button";
    exportButton.className = "omh-toolbar-button omh-export-button";
    exportButton.textContent = label;
    exportButton.title = label;
    exportButton.setAttribute("aria-label", label);
    exportButton.addEventListener("click", () => exportPlayersCsv(playerData));

    const copyButton = document.createElement("button");
    const copyLabel = copyJsonLabel();
    copyButton.type = "button";
    copyButton.className = "omh-toolbar-button omh-copy-button";
    copyButton.textContent = copyLabel;
    copyButton.title = copyLabel;
    copyButton.setAttribute("aria-label", copyLabel);
    copyButton.addEventListener("click", () => {
      copyPlayersJson(playerData, copyButton).catch((error) => {
        debugLog("copy json failed", error);
        copyButton.textContent = copyLabel;
      });
    });

    toolbar.append(exportButton, copyButton);
    return toolbar;
  }

  function buildPlayerList(playerData) {
    const wrapper = document.createElement("div");
    wrapper.className = "omh-list-wrapper";
    wrapper.dataset.omhWrapper = "true";

    const list = document.createElement("div");
    list.className = "omh-player-list";

    playerData.forEach((data) => {
      const row = document.createElement("div");
      row.className = "omh-player-row";
      const info = data.infoRows;
      const top = document.createElement("div");
      top.className = "omh-player-top";

      top.appendChild(createPlayerCell(data.player));
      top.appendChild(createPlayerActions(data));
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

  function playerLists() {
    return Array.from(document.querySelectorAll(".playerList"));
  }

  function playerNodesFor(list) {
    return Array.from(list?.querySelectorAll(".teamphoto-player") || []);
  }

  function playerListDebugInfo(lists = playerLists()) {
    return lists.map((list, index) => ({
      index,
      enhanced: list.dataset.omhEnhanced === "true",
      observed: list.dataset.omhObserved === "true",
      players: playerNodesFor(list).length,
      classes: list.className
    }));
  }

  function findPlayerList() {
    const lists = playerLists();
    return (
      lists.find((list) => list.dataset.omhEnhanced !== "true" && playerNodesFor(list).length) ||
      lists.find((list) => playerNodesFor(list).length) ||
      lists.find((list) => list.dataset.omhEnhanced !== "true") ||
      lists[0] ||
      null
    );
  }

  function hasWrapperFor(list) {
    return Boolean(
      list?.previousElementSibling?.dataset.omhWrapper === "true" ||
        list?.parentElement?.querySelector(":scope > .omh-list-wrapper[data-omh-wrapper='true']")
    );
  }

  function isSinglePlayerPage() {
    return /\/Club\/Players\/(?:Youth)?Player\.aspx$/i.test(window.location.pathname);
  }

  function singlePlayerTagTarget() {
    const mainBody = document.querySelector("#mainBody") || document.querySelector(".main .boxBody");
    return (
      mainBody?.querySelector(".playerName h1, .transferPlayerName h1, .transferPlayerName, .playerName, h1") ||
      document.querySelector(".boxHead h2")
    );
  }

  function enhanceSinglePlayerPage() {
    if (!isSinglePlayerPage()) {
      return false;
    }
    if (document.querySelector(".omh-single-tag[data-omh-enhanced='true']")) {
      debugLog("single player tag skipped: already enhanced");
      return false;
    }

    const key = currentPlayerStorageId();
    if (!key) {
      debugLog("single player tag skipped: player id not found");
      return false;
    }

    const target = singlePlayerTagTarget();
    if (!target) {
      debugLog("single player tag skipped: target not found");
      return false;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "omh-single-tag";
    wrapper.dataset.omhEnhanced = "true";
    wrapper.appendChild(createTagControlForKey(key));

    if (/^h[1-6]$/i.test(target.tagName) || target.classList.contains("transferPlayerName")) {
      target.appendChild(wrapper);
    } else {
      target.insertAdjacentElement("afterend", wrapper);
    }

    debugLog("single player tag enhanced", { key });
    return true;
  }

  function enhanceCurrentPage() {
    if (isSinglePlayerPage()) {
      return enhanceSinglePlayerPage();
    }
    return enhanceAll();
  }

  function enhanceAll() {
    const list = findPlayerList();
    if (!list) {
      debugLog("enhance skipped: .playerList not found", {
        readyState: document.readyState,
        url: window.location.href
      });
      return false;
    }
    if (list.dataset.omhEnhanced === "true") {
      if (!hasWrapperFor(list)) {
        debugLog("enhanced list lost wrapper; rebuilding");
        delete list.dataset.omhEnhanced;
      } else {
        debugLog("enhance skipped: already enhanced");
        return false;
      }
    }

    const playerNodes = playerNodesFor(list);
    const playerData = playerNodes.map(collectPlayerData).filter(Boolean);
    if (!playerData.length || playerData.length !== playerNodes.length) {
      debugLog("enhance skipped: player data incomplete", {
        playerNodes: playerNodes.length,
        playerData: playerData.length,
        lists: playerListDebugInfo()
      });
      return false;
    }

    const wrapper = buildPlayerList(playerData);
    list.parentNode.insertBefore(wrapper, list);
    list.classList.add("omh-source-list");
    list.dataset.omhEnhanced = "true";
    debugLog("enhance complete", {
      players: playerData.length,
      lists: playerLists().length,
      wrapperDisplay: window.getComputedStyle(wrapper).display,
      wrapperVisibility: window.getComputedStyle(wrapper).visibility,
      sourceDisplay: window.getComputedStyle(list).display
    });
    return true;
  }

  function observePlayerList() {
    const list = findPlayerList();
    if (!list || list.dataset.omhObserved === "true") {
      debugLog("list observer skipped", {
        hasList: Boolean(list),
        observed: list?.dataset.omhObserved === "true"
      });
      return;
    }

    let timer = 0;
    const observer = new MutationObserver(() => {
      debugLog("player list mutated");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!hasWrapperFor(list)) {
          delete list.dataset.omhEnhanced;
          enhanceAll();
        }
      }, 100);
    });
    observer.observe(list, { childList: true, subtree: true });
    list.dataset.omhObserved = "true";
    debugLog("list observer attached");
  }

  function start() {
    debugLog("start", {
      readyState: document.readyState,
      url: window.location.href,
      hasList: Boolean(findPlayerList()),
      lists: playerLists().length,
      listDetails: playerListDebugInfo(),
      players: document.querySelectorAll(PLAYER_SELECTOR).length,
      singlePlayerPage: isSinglePlayerPage(),
      currentPlayerKey: currentPlayerStorageId()
    });

    let timer = 0;
    let observer = null;
    let enhanced = false;

    function disconnectDocumentObserver() {
      if (observer) {
        observer.disconnect();
        observer = null;
        debugLog("document observer disconnected");
      }
    }

    function attemptEnhance(reason) {
      if (enhanced) {
        return;
      }
      debugLog("attempt enhance", reason);
      if (enhanceCurrentPage()) {
        enhanced = true;
        if (!isSinglePlayerPage()) {
          observePlayerList();
        }
        disconnectDocumentObserver();
      }
    }

    observer = new MutationObserver(() => {
      debugLog("document mutated");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        attemptEnhance("document mutation");
      }, 100);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    debugLog("document observer attached");

    attemptEnhance("initial");
    window.addEventListener("load", () => attemptEnhance("window load"), { once: true });
    [250, 1000, 2500, 5000].forEach((delay) => {
      window.setTimeout(() => attemptEnhance(`delayed retry ${delay}ms`), delay);
    });
  }

  loadPlayerTags()
    .catch((error) => debugLog("load tags failed", error))
    .finally(start);
})();
