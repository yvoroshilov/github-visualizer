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
fetch("https://api.github.com/rate_limit", OPTIONS)
    .then(result => (result.json())
    .then(result => {
        result.rate.reset = (new Date(result.rate.reset * 1000)).toString();
        console.log(result.rate);
    }));
// --------INITIAL DATA----------

// --------COLLECTED DATA--------
let commitGraph;
let maxCommits = 0;
let branches;
let defaultBranch;
let usrAndRepo;
// --------COLLECTED DATA--------

function Paginator (items) {
    // Raw response from api req
    let _items = null;
    this.pageNumber = 0;
    this.links = {
        next: "",
        prev: "",
        first: "",
        last: ""
    };

    Object.defineProperty(this, "items", {
        set: function () {
            _items = items;
            this.pageNumber = 1;
            this.links = {
                next: "",
                prev: "",
                first: "",
                last: ""
            };
            this.getNewLinks();
        },
        get: function () {
            return _items;
        }
    });
    this.getNewLinks = function () {
        let links = (_items.headers.get("Link"));
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
    };
    this.next = async function () {
        if (this.links.next === "") throw new Error("next link does not exist!");

        this.pageNumber++;
        _items = await fetch(this.links.next, OPTIONS);
        this.getNewLinks();
    };
    this.prev = async function () {
        if (this.links.prev === "") throw new Error("prev link does not exist!");

        this.pageNumber--;
        _items = await fetch(this.links.prev, OPTIONS);
        this.getNewLinks();
    };
    this.first = async function () {
        if (this.links.first === "") throw new Error("first link does not exist!");

        this.pageNumber = 1;
        _items = await fetch(this.links.first, OPTIONS);
        this.getNewLinks();

    };
    this.last = async function () {
        if (this.links.last === "") throw new Error("last link does not exist!");

        this.pageNumber = Number.parseInt((this.links.last.slice(this.links.last.lastIndexOf("=") + 1)));
        _items = await fetch(this.links.last, OPTIONS);
        this.getNewLinks();
    };

    this.items = items;
}

async function fetchSmth () {
    /*
const gHApiUrl = "https://api.github.com";
const response = await fetch(gHApiUrl);
const result = await response.json();
console.log(result);
debugger;
*/
}
async function startFetching (decomposedInput) {
    usrAndRepo = decomposedInput;

    // Getting repository data
    let repoUrl;
    repoUrl = REPO_URL_TEMPLATE.replace("*", `${usrAndRepo.username}/${usrAndRepo.repoName}`);
    const repoInfo = await (await fetch(repoUrl, OPTIONS)).json();

    // Getting commits data and creating a paginator
    let commitsInfo, commitsUrl;
    commitsUrl = COMMITS_URL_TEMPLATE + `?per_page=${COMMITS_PER_PAGE}`;
    commitsUrl = commitsUrl.replace("*", `${usrAndRepo.username}/${usrAndRepo.repoName}`);
    commitsInfo = await fetch(commitsUrl, OPTIONS);

    await setRepoStats(repoInfo);
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
    for (let i = 0; i < branches.length; i++) {
        const curElem = branchSelector.appendChild(document.createElement("option"));
        curElem.setAttribute("value", i.toString());
        curElem.innerHTML = branches[i].name;
        branches[i] = {
            name: branches[i].name,
            data: await fetchWithSha(branches[i].commit.sha)
        };
        if (branches[i].name === repoInfo.default_branch) {
            curElem.setAttribute("selected", "selected");
            defaultBranch = branches[i];
            branches.splice(i, 1);
            branches.splice(0, 0, defaultBranch);
        }
    }
    setBranchStats(defaultBranch);
}

async function setBranchStats (branch) {
    const paginator = new Paginator(branch.data);
    let curComPage = await paginator.items.clone().json();
    let latestCommit = curComPage[0];
    let numberOfCommits = curComPage.length;
    if (paginator.links.last !== "") {
        await paginator.last();
        curComPage = await paginator.items.clone().json();
        numberOfCommits = (paginator.pageNumber - 1) * COMMITS_PER_PAGE + curComPage.length;
    }
    const cells = document.getElementById("stats").getElementsByTagName("span");

    cells[1].appendChild(document.createTextNode(numberOfCommits));
    branch.totalCommits = numberOfCommits;
    maxCommits = Math.max(maxCommits, branch.totalCommits);

    // Last commit info
    cells[3].appendChild(document.createTextNode(
        latestCommit.sha.slice(0, 7) + " | " +
        latestCommit.commit.committer.date
    ));
}

async function buildGraph () {
    let initial = {
        data: null,
        descendants: [],
        endOfMerged: false,
        
        has: function (sha) {
            let found = false;
            function hasRec (cur, sha) {
                if (found) return;
                if (cur.data.sha === sha) {
                    found = true;
                    return;
                }
                for (let i = 0; i < cur.descendants.length; i++) {
                    hasRec(cur.descendants[i], sha);
                }
            }
            hasRec(this, sha);
            return found;
        }
    };
    // constantly altering array
    let notCompletlyMerged = [];

    // !THIS FUNCTION PROCESSES COMMITS IN REVERSE
    // ORDER COMPARING TO DEFAULT FETCH OUTPUT AND
    // ALL COMMITS ARE "initial" OBJECT INSTANCES!
    async function build () {
        for (let brn = 0; brn < branches.length; brn++) {
            let commitPool = await getAllCommits(new Paginator(branches[brn]));
            commitPool.forEach(com => com = Object.create(initial).data = com);
            if (brn === 0) initial = commitPool[commitPool.length];


            // searching for the beginning of the branch
            let mainBranch = commitPool[0];
            let pos = 0;
            let found = false;
            while (!found) {
                let mainParentN = 0;
                if (mainBranch.parents.length === 2) {
                    let branch1 = await fetchWithSha(mainBranch.parents[0].sha);
                    let branch2 = await fetchWithSha(mainBranch.parents[1].sha);
                    if (await distinguishMainMerged(new Paginator(branch1) !== branch1)) {
                        mainParentN = 1;
                    }
                }
                for (let j = pos + 1; j < commitPool.length; j++) {
                    if (commitPool[j].sha === mainBranch.parents[mainParentN].sha) {
                        if (initial.has(commitPool[j])) {
                            found = true;
                            await appendDescendant(initial, commitPool[j].sha, mainBranch);
                            break;
                        }
                        commitPool[j].descendants.push(mainBranch);
                        mainBranch = commitPool[j];
                        pos = j;
                    }
                }
            }
            for (let cmtn = 0; cmtn < commitPool.length; cmtn++) {
                // if main branch has
            }
        }
    }

    async function appendDescendant (cur, toSha, newDescendant) {
        for (let i = 0; i < notCompletlyMerged.length; i++) {
            let item = notCompletlyMerged[i];
            if (item.sha === toSha) {
                item.descendants.push(newDescendant);
                if (item.descendants.length === 2) {
                    if (await distinguishMainMerged(cur.descendants[0], cur.descendants[1])[0] !== cur.descendants[0]) {
                        swap(cur.descendants[0], cur.descendants[1]);
                    }
                }
                return;
            }
        }

        let found = false;
        async function appendDescendantRec (cur, toSha, newDescendant) {
            if (found) return;
            if (cur.sha === toSha) {
                cur.descendants.push(newDescendant);
                if (cur.descendants.length === 2) {
                    if (await distinguishMainMerged(cur.descendants[0], cur.descendants[1])[0] !== cur.descendants[0]) {
                        swap(cur.descendants[0], cur.descendants[1]);
                    }
                }
                found = true;
            }
            for (let i = 0; i < cur.descendants.length; i++) {
                await appendDescendantRec(cur.descendants[i], toSha, newDescendant);
            }
        }
        await appendDescendantRec(cur, toSha, newDescendant);
    }

    async function distinguishMainMerged (paginator1, paginator2) {
        if (await getTotalCommitsNumber(paginator1) > await getTotalCommitsNumber(paginator2)) {
            swap(paginator1, paginator2);
        }
        // [main_branch, merged_branch]
        return [paginator1, paginator2];
    }

    async function getAllCommits (paginator) {
        let allCommits = [];
        let curPage = await paginator.items.clone().json();
        allCommits.push(curPage);
        while (paginator.links.next !== "") {
            await paginator.next();
            curPage = await paginator.items.clone().json();
            allCommits.push(curPage);
        }
        return allCommits;
    }

    async function getTotalCommitsNumber (paginator) {
        if (paginator.links.last !== "") {
            await paginator.last();
            let lastPage = await paginator.items.clone().json();
            return (paginator.pageNumber - 1) * COMMITS_PER_PAGE + lastPage.length;
        } else {
            let page = await paginator.items.clone().json();
            return page.length;
        }
    }
}


/*
    ***auxilary***
*/

function swap (a, b) {
    a = [b, b = a][0];
}

async function fetchWithSha (sha) {
    return await fetch(
        COMMITS_URL_TEMPLATE
        .replace("*", `${usrAndRepo.username}/${usrAndRepo.repoName}`)
        .concat(`?per_page=${COMMITS_PER_PAGE}&sha=${sha}`),
        OPTIONS
    )
}