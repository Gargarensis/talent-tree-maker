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
let currentBlock = [1, 1];
let currentContextMenuTabIndex = 0;

function getSingleBlockModelForCoords(x, y) {
    let talent = tabs[curTab].data.talents[x + '-' + y];
    let classes = talent == undefined ? 'block not-selectable' : 'block icon tooltip';
    let content = talent == undefined ? x + ' ' + y :
        `<span class="tooltiptext"><b>${talent.name}</b><br>${talent.description}</span><span class="number-holder">${talent.maxPoints}</span>`;
    return `
    <div class="${classes}" id="slot-${x}-${y}" onclick="showModalForBlock(${x}, ${y})" ondrop="drop(event, '${x}-${y}')" ondragover="allowDrop(event)" 
    ${talent == undefined ? '' : 'draggable="true"  ondragstart="onDragStart(event, \'' + x + '-' + y + '\')"'} 
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

function showModalForBlock(blockX, blockY) {
    currentBlock = [blockX, blockY];
    let talent = tabs[curTab].data.talents[blockX + '-' + blockY];

    $('#modal-title-talent-slot-position').text(`${blockX} ${blockY}`);
    $('#input-name').val(talent != undefined ? talent.name : '');
    $('#input-icon-url').val(talent != undefined ? talent.iconUrl : '');
    $('#input-max-points').val(talent != undefined ? talent.maxPoints : '');
    $('#textarea-description').val(talent != undefined ? talent.description : '');
    $('#input-requires-talent').val(talent != undefined ? requiredTalentArrayToText(talent.requiredTalents) : '');

    refreshModalPreview();

    $('#edit-talent-modal').modal();
}

function requiredTalentsTextToArray(requiredTalentsText) {
    let result = [];
    for (let reqTalent of requiredTalentsText.split(',')) {
        if (reqTalent == '') {
            continue;
        }
        result.push(reqTalent.trim().replaceAll(/ +/g, '-'))
    }

    return result;
}

function requiredTalentArrayToText(requiredTalentsArray) {
    return requiredTalentsArray.join(',').replaceAll('-', ' ');
}

function onModalSave() {
    tabs[curTab].data.talents[currentBlock.join('-')] = {
        iconUrl: $('#input-icon-url').val(),
        name: $('#input-name').val(),
        maxPoints: $('#input-max-points').val(),
        description: $('#textarea-description').val(),
        requiredTalents: requiredTalentsTextToArray($('#input-requires-talent').val())
    }
    renderGrid();
}

function renderGrid() {
    let container = $('#tree-container');
    container.empty();

    tabs[curTab].data.arrowOptions = {
        path: $('#select-arrow-style').val(),
        color: $('#select-arrow-color').val()
    };

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

function modifyRows(value) {
    tabs[curTab].data.rows += value;
    renderGrid();
}

function modifyColumns(value) {
    tabs[curTab].data.columns += value;
    renderGrid();
}

function refreshModalPreview() {
    $('#modal-preview').html(`
    <div class="block icon tooltip" style="background-image: url('${$('#input-icon-url').val()}');">
    <span class="tooltiptext"><b>${$('#input-name').val()}</b><br>${$('#textarea-description').val()}</span>
    <span class="number-holder">${$('#input-max-points').val()}</span>
    </div>
    `)
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

function newTree() {
    if (confirm('Do you want to reset the active tree? Unsaved changes will be lost.')) {
        tabs[curTab].data = exampleData;
        renderGrid();
    }
}

function resetCurrentBlock() {

    if (!confirm('Are you sure that you want to delete this block?')) {
        return;
    }

    delete tabs[curTab].data.talents[currentBlock[0] + '-' + currentBlock[1]];

    refreshModalPreview();
    renderGrid();
}

function allowDrop(e) {
    e.preventDefault();
}

function onDragStart(e, block) {
    e.dataTransfer.setData("text", block);
    $(".tooltiptext").hide();
}

function drop(e, block) {
    e.preventDefault();
    try {
        let data = e.dataTransfer.getData("text");

        let block1 = tabs[curTab].data.talents[data];
        let block2 = tabs[curTab].data.talents[block];
    
        if (!block1) {
            tabs[curTab].data.talents[data] = JSON.parse(JSON.stringify(block2));
            updateRequiredTalents(block, data);
            delete tabs[curTab].data.talents[block];
        } else if (!block2) {
            tabs[curTab].data.talents[block] = JSON.parse(JSON.stringify(block1));
            delete tabs[curTab].data.talents[data];
            updateRequiredTalents(data, block);
        } else {
            tabs[curTab].data.talents[block] = JSON.parse(JSON.stringify(block1));
            tabs[curTab].data.talents[data] = JSON.parse(JSON.stringify(block2));
            updateRequiredTalents(block, 'temp-temp');
            updateRequiredTalents(data, block);
            updateRequiredTalents('temp-temp', data);
        }
    
        renderGrid();
    } catch (e) {
        return;
    }
}

function updateRequiredTalents(oldPosition, newPosition) {
    for (const [key, value] of Object.entries(tabs[curTab].data.talents)) {
        let index = value.requiredTalents.indexOf(oldPosition);

        if (index !== -1) {
            value.requiredTalents[index] = newPosition;
        }
    }
}

function openTabContextMenu(e, tabIndex) {
    e.preventDefault();
    currentContextMenuTabIndex = tabIndex;
    $("#context-menu").css({
        display: "block",
        top: e.pageY,
        left: e.pageX
    }).addClass("show");

    return false;
}

function closeTabContextMenu(e, force = false) {
    let inside = (e.target.closest('#context-menu'));
    if (!inside || force) {
        $("#context-menu").removeClass("show").hide();
    }
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
    $('#new-tab-button').prevAll().remove();

    for (let tabIndex in tabs) {
        $(buildTabTemplate(tabIndex, tabs[tabIndex].name, tabIndex == curTab)).insertBefore('#new-tab-button');
    }

    saveInLocalStorage();
}

function addNewTab(tabData = null) {
    let data = tabData;
    let name = 'New Tab';
    if (!data) {
        data = {
            name: name,
            data: JSON.parse(JSON.stringify(exampleData))
        }
    }
    tabs.push(data);

    renderTabs();
}

function renameTab() {
    let newName = prompt("Enter the new tab name:", tabs[currentContextMenuTabIndex].name);

    if (newName) {
        tabs[currentContextMenuTabIndex].name = newName;
    }

    renderTabs();
}

function moveTab(value) {
    if (value < 0) {
        if (currentContextMenuTabIndex == 0) {
            return;
        }
    } else if (value > 0) {
        if (currentContextMenuTabIndex == tabs.length - 1) {
            return;
        }
    } else {
        return;
    }

    if (curTab == currentContextMenuTabIndex) {
        curTab = currentContextMenuTabIndex + value;
    } else if (curTab == currentContextMenuTabIndex + value) {
        curTab = currentContextMenuTabIndex;
    }

    [tabs[currentContextMenuTabIndex + value], tabs[currentContextMenuTabIndex]] = [tabs[currentContextMenuTabIndex], tabs[currentContextMenuTabIndex + value]];
    
    renderTabs();
}

function openTab(tabIndex) {
    curTab = tabIndex;

    $('#select-arrow-style').val(tabs[curTab].data.arrowOptions.path || $('#select-arrow-style').val())
    $('#select-arrow-color').val(tabs[curTab].data.arrowOptions.color || $('#select-arrow-color').val())

    renderTabs();
    renderGrid();
}

function removeTab() {
    if (currentContextMenuTabIndex == curTab) {
        alert("You cannot delete the active tab.");
        return;
    }

    if (confirm(`Do you really want to delete the tab "${tabs[currentContextMenuTabIndex].name}"? It cannot be recovered if unsaved.`)) {
        tabs.splice(currentContextMenuTabIndex, 1);

        if (currentContextMenuTabIndex < curTab) {
            curTab--;
        }

        renderTabs();
        renderGrid();
    }
}

function saveInLocalStorage() {
    window.localStorage.setItem('creatorData', JSON.stringify(tabs));
}

function loadFromLocalStorage() {
    try {
        let localData = window.localStorage.getItem('creatorData');
        if (localData) {
            tabs = JSON.parse(localData);
        } 
    } catch (e) {
        
    }
}