let data = {};
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const gridContainer = document.getElementById("grid");
let currentPopupCellId = null;

// Load data.json and initialize
fetch('data.json')
    .then(res => res.json())
    .then(jsonData => {
        data = jsonData;
        generateCategoryCheckboxes();
        generateGrid();
        updateGridColors();
    });

// ------------------------- GRID -------------------------
function countVisibleWords(cellData, activeCategories, hideInappropriate, hideCommonWords) {
    if (!cellData || !cellData.words) return 0;

    let count = 0;

    cellData.words.forEach(word => {
        const isCommon = word.categories.length === 0;

        const visible = (!hideInappropriate || !word.inappropriate) &&
                        (!hideCommonWords || !isCommon) &&
                        (word.categories.length === 0 || word.categories.some(cat => activeCategories.includes(cat)));

        if (visible) count++;
    });

    return count;
}

function generateGrid() {
    gridContainer.innerHTML = "";
    const table = document.createElement("table");

    const hideCommon = document.getElementById("hideCommonWords")?.checked || false;
    const hideInappropriate = document.getElementById("hideInappropriate")?.checked || false;

    const activeCategories = Array.from(document.querySelectorAll(".categoryCheckbox"))
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // ----------------- HEADER ROW (top) -----------------
    const headerRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.id = "cornerHeader";

    // Count total visible words in the whole grid
    let totalCount = 0;
    alphabet.forEach(row => {
        alphabet.forEach(col => {
            totalCount += countVisibleWords(
                data[row + col],
                activeCategories,
                hideInappropriate,
                hideCommon
            );
        });
    });
    corner.title = totalCount + " words";
    headerRow.appendChild(corner);

    alphabet.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        th.dataset.col = col;

        // Count words in column (excluding header)
        let count = 0;
        alphabet.forEach(row => {
            count += countVisibleWords(
                data[row + col],
                activeCategories,
                hideInappropriate,
                hideCommon
            );
        });

        th.title = count + " words";

        // Add popup only if header_col_X has words
        const headerData = data["header_col_" + col];
        if (headerData && headerData.words.length > 0) {
            th.style.cursor = "pointer";
            th.addEventListener("click", () => openPopup("header_col_" + col));
        }

        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // ----------------- ROWS -----------------
    alphabet.forEach(row => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.textContent = row;
        th.dataset.row = row;

        // Count words in row (excluding header)
        let count = 0;
        alphabet.forEach(col => {
            count += countVisibleWords(
                data[row + col],
                activeCategories,
                hideInappropriate,
                hideCommon
            );
        });

        th.title = count + " words";

        // Add popup only if header_row_X has words
        const headerData = data["header_row_" + row];
        if (headerData && headerData.words.length > 0) {
            th.style.cursor = "pointer";
            th.addEventListener("click", () => openPopup("header_row_" + row));
        }

        tr.appendChild(th);

        alphabet.forEach(col => {
            const cellId = row + col;
            const td = document.createElement("td");
            td.dataset.cell = cellId;
            td.textContent = cellId;

            const cellData = data[cellId];

            // Tooltip for normal cells
            const visibleCount = countVisibleWords(
                cellData,
                activeCategories,
                hideInappropriate,
                hideCommon
            );
            td.title = visibleCount + " words";

            if (!cellData || cellData.words.length === 0) {
                td.classList.add("empty");
                td.style.backgroundColor = "#ff4c4c";
            } else if (hideCommon) {
                const hasActiveWord = cellData.words.some(word =>
                    word.categories.length > 0 &&
                    word.categories.some(cat => activeCategories.includes(cat)) &&
                    (!hideInappropriate || !word.inappropriate)
                );

                if (hasActiveWord) {
                    td.classList.remove("empty");
                    td.style.backgroundColor = "#4da6ff";
                } else {
                    td.classList.remove("empty");
                    td.style.backgroundColor = "";
                }
            } else {
                let visibleWords = 0;
                let hiddenWords = 0;

                cellData.words.forEach(word => {
                    const visible = (!hideInappropriate || !word.inappropriate) &&
                                    (word.categories.length === 0 || word.categories.some(cat => activeCategories.includes(cat)));
                    if (visible) visibleWords++;
                    else hiddenWords++;
                });

                if (visibleWords === 0 && hiddenWords === 0) {
                    td.classList.add("empty");
                    td.style.backgroundColor = "#ff4c4c";
                } else if (visibleWords === 0 && hiddenWords > 0) {
                    td.classList.remove("empty");
                    td.style.backgroundColor = "#ffeb99";
                } else {
                    td.classList.remove("empty");
                    const intensity = Math.log(visibleWords + 1) / Math.log(30);
                    const colorValue = Math.floor(255 - intensity * 200);
                    td.style.backgroundColor = `rgb(${colorValue}, 255, ${colorValue})`;
                }
            }

            td.addEventListener("click", () => openPopup(cellId));
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    gridContainer.appendChild(table);
}

// ------------------------- POPUP -------------------------
function openPopup(cellId) {
    // ✅ Store the real cell ID globally
    currentPopupCellId = cellId;

    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    const title = document.getElementById("popupTitle");
    const content = document.getElementById("popupContent");

    const hideInappropriate = document.getElementById("hideInappropriate").checked;
    const originalToggle = document.getElementById("showInappropriate");

    // Remove old listeners and clone the checkbox
    originalToggle.replaceWith(originalToggle.cloneNode(true));
    const showInappropriateToggle = document.getElementById("showInappropriate");

    // Set disabled / checked based on hideInappropriate
    if (hideInappropriate) {
        showInappropriateToggle.checked = false;
        showInappropriateToggle.disabled = false;
    } else {
        showInappropriateToggle.checked = true;
        showInappropriateToggle.disabled = true;
    }

    // -------------------------------
    // Display title (UI only)
    // -------------------------------
    title.textContent = cellId.startsWith("header_row_")
        ? cellId.replace("header_row_", "") + "_"
        : cellId.startsWith("header_col_")
            ? "_" + cellId.replace("header_col_", "")
            : cellId;

    content.innerHTML = "";

    const cellData = data[cellId];

    function renderWordList() {
        content.innerHTML = "";

        if (!cellData || cellData.words.length === 0) {
            content.innerHTML = "<li><em>No words</em></li>";
            return;
        }

        const activeCategories = Array.from(document.querySelectorAll(".categoryCheckbox"))
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        const showInappropriate = showInappropriateToggle.checked;

        cellData.words.forEach(word => {

            // HEADER CELLS
            if (cellId.startsWith("header_row_") || cellId.startsWith("header_col_")) {
                if (word.inappropriate && !showInappropriate) return;
            } else {
                const hideCommonWords = document.getElementById("hideCommonWords").checked;

                if (word.inappropriate && !showInappropriate) return;
                if (hideCommonWords && word.categories.length === 0) return;
                if (word.categories.length > 0 && !word.categories.some(cat => activeCategories.includes(cat))) return;
            }

            const li = document.createElement("li");
            li.textContent = word.text;
            content.appendChild(li);
        });
    }

    // Attach listener AFTER setup
    showInappropriateToggle.onchange = renderWordList;

    // Initial render
    renderWordList();

    popup.style.display = "block";
    overlay.style.display = "block";

    // Reset scroll AFTER showing popup
    content.scrollTop = 0;
    content.scrollLeft = 0;
}

function closePopup() {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    const showInappropriateToggle = document.getElementById("showInappropriate");

    popup.style.display = "none";
    overlay.style.display = "none";

    // Reset scroll position
    const content = document.getElementById("popupContent");
    content.scrollTop = 0;
    content.scrollLeft = 0;

    // Reset only if hideInappropriate is checked
    if (document.getElementById("hideInappropriate").checked) {
        showInappropriateToggle.checked = false;
    } else {
        showInappropriateToggle.checked = true;
        showInappropriateToggle.disabled = true;
    }
}

// ------------------------- HEATMAP / COLORS -------------------------
function updateGridColors() {

    const activeCategories = Array.from(document.querySelectorAll(".categoryCheckbox"))
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const hideInappropriate = document.getElementById("hideInappropriate").checked;
    const hideCommonWords = document.getElementById("hideCommonWords").checked;

    // --------------------------------------------------
    // Find the maximum number of visible words in any cell
    // --------------------------------------------------

    let maxVisibleWords = 0;

    Object.values(data).forEach(cell => {
        if (!cell || !cell.words) return;

        let count = 0;

        cell.words.forEach(word => {

            const isCommon = word.categories.length === 0;

            const visible = (!hideInappropriate || !word.inappropriate) &&
                            (!hideCommonWords || !isCommon) &&
                            (word.categories.length === 0 || word.categories.some(cat => activeCategories.includes(cat)));

            if (visible) count++;
        });

        if (count > maxVisibleWords) {
            maxVisibleWords = count;
        }
    });

    // --------------------------------------------------
    // Color each cell
    // --------------------------------------------------

    document.querySelectorAll("td[data-cell]").forEach(td => {

        const cellId = td.dataset.cell;
        const cellData = data[cellId];

        if (!cellData || cellData.words.length === 0) {
            td.classList.add("empty");
            td.style.backgroundColor = "#ff4c4c"; // red
            return;
        }

        let visibleWords = 0;
        let hiddenWords = 0;
        let hasCategoryWordVisible = false;

        cellData.words.forEach(word => {

            const isCommon = word.categories.length === 0;

            const visible = (!hideInappropriate || !word.inappropriate) &&
                            (!hideCommonWords || !isCommon) &&
                            (word.categories.length === 0 || word.categories.some(cat => activeCategories.includes(cat)));

            if (visible) {
                visibleWords++;
                if (word.categories.length > 0) hasCategoryWordVisible = true;
            } else {
                hiddenWords++;
            }
        });

        if (hideCommonWords) {

            if (visibleWords === 0 && hiddenWords === 0) {
                td.classList.add("empty");
                td.style.backgroundColor = "#ff4c4c";
            }

            else if (hasCategoryWordVisible) {
                td.classList.remove("empty");
                td.style.backgroundColor = "#4c8cff"; // blue
            }

            else {
                td.classList.remove("empty");
                td.style.backgroundColor = ""; // colorless
            }

        } else {

            if (visibleWords === 0 && hiddenWords === 0) {
                td.classList.add("empty");
                td.style.backgroundColor = "#ff4c4c";
            }

            else if (visibleWords === 0 && hiddenWords > 0) {
                td.classList.remove("empty");
                td.style.backgroundColor = "#ffeb99"; // yellow
            }

            else {

                td.classList.remove("empty");

                // --------------------------------------------------
                // HEATMAP SCALING OPTIONS
                // --------------------------------------------------

                // CURRENTLY ACTIVE: LINEAR SCALING
                const intensity = maxVisibleWords > 0
                    ? visibleWords / maxVisibleWords
                    : 0;

                // TO TRY SQUARE-ROOT SCALING:
                // 1) Comment the linear line above
                // 2) Uncomment the line below
                //
                // const intensity = maxVisibleWords > 0
                //     ? Math.sqrt(visibleWords / maxVisibleWords)
                //     : 0;

                // TO TRY LOGARITHMIC SCALING:
                // 1) Comment the linear line above
                // 2) Uncomment the line below
                //
                // const intensity = maxVisibleWords > 0
                //     ? Math.log(visibleWords + 1) / Math.log(maxVisibleWords + 1)
                //     : 0;

                const colorValue = Math.floor(255 - intensity * 200);

                td.style.backgroundColor = `rgb(${colorValue}, 255, ${colorValue})`;
            }
        }

    });

    updateHeaderColors();
}

// ------------------------- HEADERS -------------------------
function updateHeaderColors() {
    const trulyEmptyThreshold = 2;
    const apparentEmptyThreshold = 2;

    alphabet.forEach(letter => {
        let rowTrueEmpty = 0;
        let rowApparentEmpty = 0;
        let colTrueEmpty = 0;
        let colApparentEmpty = 0;

        alphabet.forEach(other => {
            const rowCell = document.querySelector(`td[data-cell="${letter}${other}"]`);
            const colCell = document.querySelector(`td[data-cell="${other}${letter}"]`);

            if (rowCell) {
                const bg = rowCell.style.backgroundColor;
                if (bg === "rgb(255, 76, 76)") rowTrueEmpty++;
                if (bg === "rgb(255, 76, 76)" || bg === "rgb(255, 235, 153)" || bg === "") rowApparentEmpty++;
            }

            if (colCell) {
                const bg = colCell.style.backgroundColor;
                if (bg === "rgb(255, 76, 76)") colTrueEmpty++;
                if (bg === "rgb(255, 76, 76)" || bg === "rgb(255, 235, 153)" || bg === "") colApparentEmpty++;
            }
        });

        let color = "";
        if (rowTrueEmpty > trulyEmptyThreshold || colTrueEmpty > trulyEmptyThreshold) {
            color = "#ff4c4c";
        } else if (rowApparentEmpty > apparentEmptyThreshold || colApparentEmpty > apparentEmptyThreshold) {
            color = "#ffeb99";
        }

        const rowHeader = document.querySelector(`th[data-row="${letter}"]`);
        const colHeader = document.querySelector(`th[data-col="${letter}"]`);

        if (rowHeader) rowHeader.style.backgroundColor = color;
        if (colHeader) colHeader.style.backgroundColor = color;
    });

    const corner = document.getElementById("cornerHeader");
    if (corner) {
        let redCount = 0;
        let redOrYellowCount = 0;

        alphabet.forEach(letter => {
            const rowHeader = document.querySelector(`th[data-row="${letter}"]`);
            const colHeader = document.querySelector(`th[data-col="${letter}"]`);
            const color = rowHeader.style.backgroundColor || colHeader.style.backgroundColor;

            if (color === "rgb(255, 76, 76)") redCount++;
            if (color === "rgb(255, 76, 76)" || color === "rgb(255, 235, 153)") redOrYellowCount++;
        });

        if (redCount > 2) corner.style.backgroundColor = "#ff4c4c";
        else if (redOrYellowCount > 2) corner.style.backgroundColor = "#ffeb99";
        else corner.style.backgroundColor = "";
    }
}

// ------------------------- DYNAMIC CATEGORY CHECKBOXES -------------------------
function generateCategoryCheckboxes() {
    const container = document.getElementById("categoryFilters");
    container.innerHTML = "";

    const allCategories = new Set();
    Object.values(data).forEach(cell => {
        cell.words.forEach(word => word.categories.forEach(cat => allCategories.add(cat)));
    });

    const sortedCategories = Array.from(allCategories).sort((a, b) => a.localeCompare(b));

    sortedCategories.forEach(cat => {
        const label = document.createElement("label");
        label.style.marginRight = "10px";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = cat;
        cb.className = "categoryCheckbox";
        cb.checked = true;

        label.appendChild(cb);
        label.appendChild(document.createTextNode(" " + cat));
        container.appendChild(label);

        cb.addEventListener("change", () => {
            const allChecked = Array.from(document.querySelectorAll(".categoryCheckbox")).every(c => c.checked);
            document.getElementById("toggleAllCategories").checked = allChecked;

            generateGrid();       // 🔥 rebuild titles + structure
            updateGridColors();   // 🔥 recolor

            const popup = document.getElementById("popup");
            if (popup.style.display === "block") {
                openPopup(currentPopupCellId);
            }
        });
    });
}

// ------------------------- EVENT LISTENERS -------------------------
document.getElementById("hideInappropriate").addEventListener("change", () => {
    generateGrid();
    updateGridColors();
});

document.getElementById("showInappropriate").addEventListener("change", () => {
    const popup = document.getElementById("popup");
    if (popup.style.display === "block") openPopup(currentPopupCellId);
});

document.getElementById("hideCommonWords").addEventListener("change", () => {
    generateGrid();
    updateGridColors();
});

document.getElementById("toggleAllCategories").addEventListener("change", () => {
    const toggleAll = document.getElementById("toggleAllCategories").checked;
    document.querySelectorAll(".categoryCheckbox").forEach(cb => cb.checked = toggleAll);
    generateGrid();
    updateGridColors();
    const popup = document.getElementById("popup");
    if (popup.style.display === "block") openPopup(currentPopupCellId);
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {

        const popup = document.getElementById("popup");
        const infoPopup = document.getElementById("infoPopup");

        if (popup.style.display === "block") {
            closePopup();
        }

        if (infoPopup.style.display === "block") {
            closeInfoPopup();
        }
    }
});

function openInfoPopup(type) {
    const popup = document.getElementById("infoPopup");
    const overlay = document.getElementById("infoOverlay");
    const title = document.getElementById("infoTitle");
    const content = document.getElementById("infoContent");

    if (type === "pairRules") {
        title.textContent = "Letter Pair Rules";
        content.innerHTML = `
            <ol>
                <li>
                    There may be exceptions to the rules.
                </li>
                <li>
                    English is the main language.
                </li>
                <li>
                    Only concrete words that can be imagined.
                </li>
                <li>
                    Only simple words/phrases (e.g. "urchin" instead of "sea urchin").
                </li>
                <li>
                    No verbs or standalone adjectives.
                </li>
                <li>
                    If an image name contains multiple words, form the pair using the initials of the main words in their original order 
                    (e.g. “World War Hulk” → “WH”).
                </li>
                <li>
                    If it's a compound/blend word/portmanteau (like many Pokémon names), use the first letter of the first two words.
                </li>
                <li>
                    If the word is monosyllabic, use the first and last letters.
                </li>
                <li>
                    If polysyllabic, use the first letters of the first two syllables.
                </li>
                <li>
                    For people: first letter of first name + first letter of chosen surname.
                </li>
                <li>
                    Name edge sticker images by listing the colors in alphabetical order (e.g. “green/white edge” rather than 
                    “white/green edge”).
                </li>
            </ol>
        `;
    }

    if (type === "interfaceRules") {
        title.textContent = "Interface Rules";
        content.innerHTML = `
            <h4>Grid Colors</h4>
            <ul>
                <li><b>Red</b>: No words exist for this cell.</li>
                <li><b>"Hide common words" is inactive</b></li>
                <ol>
                    <li><b>Yellow</b>: Words exist, but all are currently hidden by filters.</li>
                    <li><b>Green gradient</b>: At least one visible word. The brighter the green, the more visible words.</li>
                </ol>
                <li><b>"Hide common words" is active</b></li>
                    <ol>
                        <li><b>Blue</b>: At least one categorized word is visible.</li>
                        <li><b>No color</b>: No categorized word is visible.</li>
                    </ol>
            </ul>

            <h4>Filters</h4>
            <ul>
                <li><b>Hide inappropriate words</b>: Removes inappropriate entries unless manually toggled in popup.</li>
                <li><b>Hide common words</b>: Hides words without categories.</li>
                <li><b>Categories</b>: Only shows words belonging to selected categories.</li>
            </ul>

            <h4>Header Cells</h4>
            <ul>
                <li>Hovering shows total visible words in that row or column.</li>
                <li>Clicking opens "trigger words" (if any exist).</li>
                <li>Header colors depend only on grid completeness, not their own words.</li>
            </ul>

            <h4>Popups</h4>
            <ul>
                <li>Click any cell to view its words.</li>
                <li>Header popups ignore category and common-word filters.</li>
            </ul>
        `;
    }

    popup.style.display = "block";
    overlay.style.display = "block";
}

function closeInfoPopup() {
    document.getElementById("infoPopup").style.display = "none";
    document.getElementById("infoOverlay").style.display = "none";
}
