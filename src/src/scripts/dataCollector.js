// ----------INITIAL DATA--------
const COMMITS_PER_PAGE = 100;
// "*" - user/repo
const REPO_URL_TEMPLATE = "https://api.github.com/repos/*";
const COMMITS_URL_TEMPLATE = "https://api.github.com/repos/*/commits";
const OPTIONS = {
        method: "GET",
        headers: {
            Authorization: "Token be7095a2838af941e665a27f1b34242f6b60e816"
    }
};
fetch("https://api.github.com/rate_limit", OPTIONS).then(result => (result.json()).then(result => (console.log(result.rate))));
// --------INITIAL DATA----------
// --------COLLECTED DATA--------
let branches;
// --------COLLECTED DATA--------

const paginator = {
    // Raw response from api req
    _items: null,
    pageNumber: 0,
    links: {
        next: "",
        prev: "",
        first: "",
        last: ""
    },

    set items (items) {
        this._items = items;
        this.getNewLinks();
    },
    get items () {
        return this._items;
    },
    getNewLinks: function () {
        let links = (this._items.headers.get("Link"));
        if (!links) return;
        links = links.split(",");
        const pageUrls = links.map(a => {
            return {
                title: a.split(";")[1],
                url: a.split(";")[0]
            }
        });
        pageUrls.forEach(a => {
            a.url = a.url.replace("<", "").replace(">", "").replace(" ", "");
            a.title = a.title.slice(a.title.indexOf("\"") + 1, a.title.lastIndexOf("\""));
        });
        for (let link of pageUrls) {
            this.links[link.title] = link.url;
        }
    },
    next: async function () {
        if (this.links.next === "") throw new Error("next link does not exist!");

        this.pageNumber++;
        this._items = await fetch(this.links.next, OPTIONS);
        this.getNewLinks();
    },
    prev: async function () {
        if (this.links.prev === "") throw new Error("prev link does not exist!");

        this.pageNumber--;
        this._items = await fetch(this.links.prev, OPTIONS);
        this.getNewLinks();
    },
    first: async function () {
        if (this.links.first === "") throw new Error("first link does not exist!");

        this.pageNumber = 1;
        this._items = await fetch(this.links.first, OPTIONS);
        this.getNewLinks();

    },
    last: async function () {
        if (this.links.last === "") throw new Error("last link does not exist!");

        this.pageNumber = Number.parseInt((this.links.last.slice(this.links.last.lastIndexOf("=") + 1)));
        this._items = await fetch(this.links.last, OPTIONS);
        this.getNewLinks();
    }
};

async function fetchSmth () {
    /*
const gHApiUrl = "https://api.github.com";
const response = await fetch(gHApiUrl);
const result = await response.json();
console.log(result);
debugger;
*/
}
async function startPoint (decomposedInput) {
    const usrAndRepo = decomposedInput;

    // Getting repository data
    let repoUrl;
    repoUrl = REPO_URL_TEMPLATE.replace("*", `${usrAndRepo.username}/${usrAndRepo.repoName}`);
    const repoInfo = await (await fetch(repoUrl, OPTIONS)).json();

    // Getting commits data and creating a paginator
    let commitsInfo, commitsUrl;
    commitsUrl = COMMITS_URL_TEMPLATE + `?per_page=${COMMITS_PER_PAGE}`;
    commitsUrl = commitsUrl.replace("*", `${usrAndRepo.username}/${usrAndRepo.repoName}`);
    commitsInfo = await fetch(commitsUrl, OPTIONS);

    setRepoStats(repoInfo);
}


async function setRepoStats (repoInfo) {
    const cells = document.getElementById("stats").getElementsByTagName("span");

    // Setting a reference to repo
    cells[0].appendChild(document.createElement("a"));
    cells[0].lastElementChild.setAttribute("href", repoInfo.html_url);
    cells[0].lastElementChild.appendChild(document.createTextNode(repoInfo.html_url.replace("https://", "")));

    // Repository creating date
    cells[2].appendChild(document.createTextNode(repoInfo.created_at));

    // Getting all info about branches
    const branchesUrl = REPO_URL_TEMPLATE.replace("*", repoInfo.full_name) + "/branches?per_page=100";
    branches = await (await fetch(branchesUrl, OPTIONS)).json();
    const branchSelector = document.getElementById("branchSel");
    let defaultBranch;
    for (let i = 0; i < branches.length; i++) {
        const curElem = branchSelector.appendChild(document.createElement("option"));
        curElem.setAttribute("value", i.toString());
        curElem.innerHTML = branches[i].name;
        if (branches[i].name === repoInfo.default_branch) {
            curElem.setAttribute("selected", "selected");
            defaultBranch = branches[i];
        }
    }
    setBranchStats(defaultBranch);
}

async function setBranchStats (branch) {
    // should I sperate variables or put url constructing statment directly to fetch???????
    let curComPage = (
        branch.commit.url.slice(0, branch.commit.url.lastIndexOf("/")) +
        `?per_page=${COMMITS_PER_PAGE}&sha=` +
        branch.commit.url.slice(branch.commit.url.lastIndexOf("/") + 1)
    );
    paginator.items = await fetch(curComPage, OPTIONS);
    curComPage = await paginator.items.json();
    let latestCommit = curComPage[0];
    let numberOfCommits = curComPage.length;
    if (paginator.links.last !== "") {
        await paginator.last();
        curComPage = await paginator.items.json();
        numberOfCommits += (paginator.pageNumber - 2) * COMMITS_PER_PAGE + curComPage.length;
    }
    const cells = document.getElementById("stats").getElementsByTagName("span");

    cells[1].appendChild(document.createTextNode(numberOfCommits));

    // Last commit info
    cells[3].appendChild(document.createTextNode(
        latestCommit.sha.slice(0, 7) + " | " +
        latestCommit.commit.committer.date
    ));
}