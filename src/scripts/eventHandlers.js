const FETCH_DATA_STR = "Fetch data", VISUALIZE_STR = "Visualize!";
const BTN = document.getElementById("btnRepo");
const INPUT_REPO = document.getElementById("inpRepo");
const BRANCH_SELECTOR = document.getElementById("branchSel");

BTN.addEventListener("click", btnRepoPressed);
BRANCH_SELECTOR.addEventListener("change", changeBranch);


function btnRepoPressed () {
    clearStats();
    let decomposedInput;
    try {
        decomposedInput = processUrl();
    } catch (e) {
        console.log(e);
        debugger;
        return;
    }

    //TODO Make "fetching" animation (e.g. three dots blinking)
    BTN.innerHTML = VISUALIZE_STR;
    //BTN.removeEventListener("click", );
    //BTN.addEventListener("click", )
    INPUT_REPO.addEventListener("input", inputChanged);
    startPoint(decomposedInput);
}

function inputChanged() {
    BTN.innerHTML = FETCH_DATA_STR;
    INPUT_REPO.removeEventListener("input", inputChanged);
    //BTN.removeEventListener("click", );
}

function changeBranch() {
    const cells = document.getElementById("stats").getElementsByTagName("span");
    cells[1].innerHTML = "";
    cells[3].innerHTML = "";
    setBranchStats(branches[BRANCH_SELECTOR.value]);
}

function processUrl () {
    const repoUrl = INPUT_REPO.value;
    let decomposedUrl = repoUrl.split("/");
    if (decomposedUrl[0] === "" && decomposedUrl.length === 1) {
        throw new Error("You haven't entered anything!");
    } else if (
        decomposedUrl[0] !== "https:" ||
        decomposedUrl[1] !== "" ||
        decomposedUrl[2] !== "github.com"
    ) {
        throw new Error("Bad URL has been entered!");
    }

    decomposedUrl = {
        username: decomposedUrl[decomposedUrl.length-2],
        repoName: decomposedUrl[decomposedUrl.length-1]
    };
    return decomposedUrl;
}

function clearStats () {
    const cells = document.getElementById("stats").getElementsByTagName("span");
    for (let cell of cells) {
        cell.innerHTML = "";
    }
    const branches = document.querySelectorAll("option");
    for (let branch of branches) {
        branch.remove();
    }
}