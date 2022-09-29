const applicationName = 'Talent Tree Creator';
const exampleData = {
    application: applicationName,
    rows: 5,
    columns: 4,
    arrowOptions: {},
    version: 1,
    talents: {
        '1-1': {
            iconUrl: 'https://wow.zamimg.com/images/wow/icons/large/spell_fire_fire.jpg',
            name: 'Empowered Flames',
            description: "You can add 1 to the damage of your Fire Bolt cantrip for every point spent in this talent.",
            maxPoints: 5,
            requiredTalents: []
        },
        '1-4': {
            iconUrl: 'https://wow.zamimg.com/images/wow/icons/large/inv_elemental_primal_fire.jpg',
            name: 'Exploding Flames',
            description: "When you hit a target with your Fire Bolt cantrip, it explodes, dealing half of the damage to all creatures within 1.5 meters of the initial target.",
            maxPoints: 1,
            requiredTalents: ['1-1']
        }
    }
};

let lines = [];
let tabs = [{
    name: 'Awesome Talent Tree',
    data: JSON.parse(JSON.stringify(exampleData))
}];
let curTab = 0;

function getSingleBlockModelForCoords(x, y) {
    let talent = tabs[curTab].data.talents[x + '-' + y];
    let classes = talent == undefined ? 'block not-selectable' : 'block icon tooltip';
    let content = talent == undefined ? '' :
        `<span onclick="event.preventDefault(); event.stopPropagation();" oncontextmenu="event.preventDefault(); event.stopPropagation();" 
          class="tooltiptext not-selectable"><b>${talent.name}</b><br>${talent.description}</span>
         <span class="number-holder">${talent.spentPoints ? talent.spentPoints : 0}</span>`;
    return `
    <div class="${classes}" id="slot-${x}-${y}" 
    ${talent == undefined ? '' : 'onclick="modifySpentPoints(event, \'' + x + '-' + y + '\', +1);" oncontextmenu="modifySpentPoints(event, \'' + x + '-' + y +'\', -1);"'}
    ${talent == undefined ? '' : 'style="background-image: url(\'' + talent.iconUrl + '\');"'}>
    ${content}
    </div>
    `
}

window.onload = function () {
    loadFromLocalStorage();
    renderTabs();
    renderGrid();
}

function requiredTalentArrayToText(requiredTalentsArray) {
    return requiredTalentsArray.join(',').replaceAll('-', ' ');
}

function renderGrid() {
    let container = $('#tree-container');
    container.empty();

    for (let x = 1; x <= tabs[curTab].data.columns; x++) {
        let column = document.createElement('div');
        column.classList.add('column');
        for (let y = 1; y <= tabs[curTab].data.rows; y++) {
            column.innerHTML += getSingleBlockModelForCoords(x, y);
        }
        container.append(column);
    }

    for (let line of lines) {
        line.remove();
    }

    lines = [];
    for (const [key, value] of Object.entries(tabs[curTab].data.talents)) {
        for (let requiredTalent of value.requiredTalents) {
            let newLine = new LeaderLine(
                document.getElementById(`slot-${requiredTalent}`),
                document.getElementById(`slot-${key}`),
                tabs[curTab].data.arrowOptions);
            lines.push(newLine);
        }
    }

    saveInLocalStorage();
}

function downloadJSON() {
    var a = document.createElement("a");
    var file = new Blob([JSON.stringify(tabs)], { type: 'text/plain' });
    a.href = URL.createObjectURL(file);
    a.download = 'your-talent-tree.json';
    a.click();
}

function readJSON() {
    let file = document.querySelector("#input-upload-file").files[0];

    if (!file) {
        return;
    }

    let reader = new FileReader();
    reader.addEventListener('load', function (e) {
        let text = e.target.result;
        try {
            let data = JSON.parse(text);

            if (data[0].data.application != applicationName) {
                throw 'Invalid JSON for this application.';
            }

            tabs = data;
            curTab = 0;

            $('#select-arrow-style').val(tabs[curTab].data.arrowOptions.path)
            $('#select-arrow-color').val(tabs[curTab].data.arrowOptions.color)

            renderTabs();
            renderGrid();
        } catch (e) {
            alert("The chosen file is not valid for this application.")
        }
        e.target.value = '';
    });
    reader.readAsText(file);
}

function buildTabTemplate(tabIndex, tabName, isActive) {
    let template = `
    <li class="nav-item id="tab-${tabIndex}" oncontextmenu="openTabContextMenu(event, ${tabIndex});" onclick="openTab(${tabIndex});">
        <a class="nav-link not-selectable ${isActive ? 'active-tab' : ''}"">${tabName}</a>
    </li>
    `
    return template;
}

function renderTabs() {
    $('#tabs-footer').prevAll().remove();

    for (let tabIndex in tabs) {
        $(buildTabTemplate(tabIndex, tabs[tabIndex].name, tabIndex == curTab)).insertBefore('#tabs-footer');
    }
}

function openTab(tabIndex) {
    curTab = tabIndex;
    renderTabs();
    renderGrid();
}

function modifySpentPoints(event, position, value) {
    event.preventDefault();
    let talent = tabs[curTab].data.talents[position];

    let canSpend = talent.requiredTalents.length == 0;

    for (let reqTalentIndex of talent.requiredTalents) {
        let reqTalent = tabs[curTab].data.talents[reqTalentIndex];
        if (reqTalent.spentPoints) {
            canSpend = true;
        }
    }

    if (!canSpend) {
        return;
    }

    if (talent.spentPoints) {
        talent.spentPoints += value;
    } else {
        talent.spentPoints = value;
    }

    if (talent.spentPoints < 0) {
        talent.spentPoints = 0;
    }

    if (talent.spentPoints > talent.maxPoints) {
        talent.spentPoints = talent.maxPoints;
    }

    checkAndFixTalentsRequirements();
    renderGrid();
}

function checkAndFixTalentsRequirements() {
    for (let talent of Object.values(tabs[curTab].data.talents)) {
        let isTalentOk = !talent.spentPoints || talent.requiredTalents.length == 0;

        if (isTalentOk) {
            continue;
        }

        for (let reqTalentIndex of talent.requiredTalents) {
            let reqTalent = tabs[curTab].data.talents[reqTalentIndex];
            if (reqTalent.spentPoints) {
                isTalentOk = true;
            }
        }

        if (!isTalentOk) {
            talent.spentPoints = 0;
        }
    }
}

function saveInLocalStorage() {
    window.localStorage.setItem('viewerData', JSON.stringify(tabs));
}

function loadFromLocalStorage() {
    try {
        let localData = window.localStorage.getItem('viewerData');
        if (localData) {
            tabs = JSON.parse(localData);
        } 
    } catch (e) {
        
    }
}

function resetTree() {
    if (!confirm("Do you really want to reset all spent points?")) {
        return;
    }

    for (let talent of Object.values(tabs[curTab].data.talents)) {
        talent.spentPoints = 0;
    }
    
    renderGrid();
}