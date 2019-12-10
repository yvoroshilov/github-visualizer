const FETCH_DATA_STR = "Fetch data", VISUALIZE_STR = "Visualize!";
const BTN = document.getElementById("btnRepo");
const INPUT_REPO = document.getElementById("inpRepo");
const BRANCH_SELECTOR = document.getElementById("branchSel");
const STATS_BOX = document.getElementById("statsBox");
const WARNING_TOOLTIP = document.getElementById("warningTooltip");

BTN.addEventListener("click", fetchPressed);
BRANCH_SELECTOR.addEventListener("change", branchChanged);
INPUT_REPO.addEventListener("keypress", enterPressed);
window.onresize = windowResized;

function windowResized () {
    if (STATS_BOX.scrollWidth > STATS_BOX.clientWidth) {
        STATS_BOX.style.flex = "0 0 87px";
        STATS_BOX.style.overflowX = "auto";
    } else {
        STATS_BOX.style.flex = "0 0 70px";
        STATS_BOX.style.overflowX = "hidden";
    }
}

function enterPressed (e) {
    if (e.key === "Enter") {
        BTN.click();
    }
}

async function fetchPressed () {
    BTN.removeEventListener("click", fetchPressed);
    updateProgressBar("", 0, 0);

    let decomposedInput;
    try {
        decomposedInput = processUrl();
    } catch (e) {
        WARNING_TOOLTIP.innerText = e.message;

        WARNING_TOOLTIP.classList.remove("animate");
        //reflow triggering
        void WARNING_TOOLTIP.offsetWidth;
        WARNING_TOOLTIP.classList.add("animate");
        BTN.addEventListener("click", fetchPressed);
        return
    }
    clearStats();
    clearCollectedData();

    //TODO Make "fetching" animation (e.g. three dots blinking)
    await startFetching(decomposedInput);
    BTN.innerHTML = VISUALIZE_STR;
    BTN.addEventListener("click", visualize);
    INPUT_REPO.addEventListener("input", inputChanged);
}

function inputChanged() {
    BTN.innerHTML = FETCH_DATA_STR;
    INPUT_REPO.removeEventListener("input", inputChanged);
    BTN.addEventListener("click", fetchPressed);
}

function branchChanged() {
    const cells = document.getElementById("stats").getElementsByTagName("span");
    cells[1].innerHTML = "";
    cells[3].innerHTML = "";
    setBranchStats(branches[BRANCH_SELECTOR.value]);
}

function processUrl () {
    let repoUrl = INPUT_REPO.value;
    const BASE_LENGTH = 19 + 1;
    const BAD_URL_ERR = new Error("Bad URL has been entered!");
    try {
        if (repoUrl[repoUrl.length-1] === '/') repoUrl = repoUrl.substr(0, repoUrl.length-1);
        if (repoUrl.substr(0, 8) !== "https://") repoUrl = "https://" + repoUrl;
    } catch {
        throw BAD_URL_ERR;
    }

    let decomposedUrl = repoUrl.split("/");

    if (repoUrl <= BASE_LENGTH) {
        throw BAD_URL_ERR;
    } else if (
        decomposedUrl[0] !== "https:" ||
        decomposedUrl[1] !== "" ||
        decomposedUrl[2] !== "github.com"
    ) {
        throw BAD_URL_ERR;
    }

    decomposedUrl = {
        username: decomposedUrl[decomposedUrl.length-2],
        repoName: decomposedUrl[decomposedUrl.length-1]
    };
    return decomposedUrl;
}

function clearStats () {
    document.getElementsByClassName("hint")[0].style.visibility = "hidden";
    const cells = document.getElementById("stats").getElementsByTagName("span");
    for (let cell of cells) {
        cell.innerHTML = "";
    }
    const branches = document.querySelectorAll("option");
    for (let branch of branches) {
        branch.remove();
    }
}

function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}