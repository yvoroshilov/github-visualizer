// ----------INITIAL DATA--------
const COMMITS_PER_PAGE = 100;
// "*" - user/repo
const REPO_URL_TEMPLATE = "https://api.github.com/repos/*";
const COMMITS_URL_TEMPLATE = "https://api.github.com/repos/*/commits";
const OPTIONS = {
    method: "GET",
    headers: {
        Authorization: "Token "
    }
};
OPTIONS.headers.Authorization += btoa("oFÝ_knµõöµsN8ãmZïÞ_ãÝwM¼u¾{");
fetch("https://api.github.com/rate_limit", OPTIONS)
    .then(result => (result.json())
    .then(result => {
        result.rate.reset = (new Date(result.rate.reset * 1000)).toString();
        console.log(result.rate);
    }));
// --------INITIAL DATA----------

// --------COLLECTED DATA--------
let maxCommits = 0;
let branches = [];
let defaultBranch = {};
let usrAndRepo = {};
let allUniqueCommits = [];
let orderedCommits = [];
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
        this.links = {
            next: "",
            prev: "",
            first: "",
            last: ""
        };
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
        }
        await updateProgress("branches", i + 1, branches.length);
    }
    setBranchStats(defaultBranch);
    await updateProgress("", -1, -1);
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
    // all commits for every branch
    let allCommits = [];
    // for progressBar
    let curTotalCommits, curBranchName;
    for (let i = 0; i < branches.length; i++) {
        curTotalCommits = await getTotalCommitsNumber(new Paginator(branches[i].data));
        curBranchName = branches[i].name;

        allCommits.push(await getAllCommits(new Paginator(branches[i].data)));
        for (let j = 0; j < allCommits[i].length; j++) {
            if (allUniqueCommits.find(x => x.sha === allCommits[i][j].sha) === undefined) {
                allUniqueCommits.push(allCommits[i][j]);
            }
        }
    }

    let brsDefaultFirst = [];
    Object.assign(brsDefaultFirst, branches);
    brsDefaultFirst.splice(brsDefaultFirst.indexOf(defaultBranch), 1);
    brsDefaultFirst.splice(0, 0, defaultBranch);
    let tmp = allCommits.splice(branches.indexOf(defaultBranch), 1)[0];
    allCommits.splice(0, 0, tmp);

    orderedCommits = [await getFirstCommit(new Paginator(brsDefaultFirst[0].data))];
    let lastBranchN = -1;
    for (let i = 0; i < brsDefaultFirst.length; i++) {
        let latestCommit = (await brsDefaultFirst[i].data.clone().json())[0];
        let queue = [latestCommit];
        while (queue.length !== 0) {
            let curCommit = queue.shift();
            let curParent = undefined;
            if (curCommit.parents.length > 0) {
                curParent = allUniqueCommits.find(x => x.sha === curCommit.parents[0].sha);
            }
            let chain = [curCommit];
            // *—*—*
            //    \
            // *—*—*—*
            if (graphSearch(orderedCommits, curCommit) !== undefined) continue;
            while (true) {
                if (curCommit.parents.length > 1) {
                    for (let j = 1; j < curCommit.parents.length; j++) {
                        let anotherParent = allUniqueCommits.find(x => x.sha === curCommit.parents[j].sha);
                        if ("mergeCommits" in anotherParent) {
                            anotherParent.mergeCommits.push(curCommit);
                        } else {
                            anotherParent.mergeCommits = [curCommit];
                        }
                        if (!graphSearch(orderedCommits, anotherParent)) queue.push(anotherParent);

                    }
                }
                if (curParent === undefined) break;
                if (graphSearch(orderedCommits, curParent)) break;
                curCommit = curParent;
                chain.push(curCommit);
                if (curParent.parents.length > 0) {
                    curParent = allUniqueCommits.find(x => x.sha === curCommit.parents[0].sha);
                }
            }
            chain.reverse();
            allUniqueCommits.find(x => x.sha === chain[chain.length-1].sha).start = false;
            allUniqueCommits.find(x => x.sha === chain[0].sha).start = true;
            if (curParent === undefined) continue;
            if (orderedCommits.length !== 1) {
                let to = graphSearch(orderedCommits, curParent);
                if (!("children" in to)) {
                    to.children = [chain];
                } else {
                    to.children.push(chain);
                }
            } else {
                delete allUniqueCommits.find(x => x.sha === chain[0].sha).start;
                orderedCommits.push(...chain);
            }
        }
    }


    async function getAllCommits (paginator) {
        let allCommits = [];
        let curPage = await paginator.items.clone().json();
        allCommits.push(...curPage);
        await updateProgress(`commits for ${curBranchName}`, allCommits.length, curTotalCommits);
        while (paginator.links.next !== "") {
            await paginator.next();
            curPage = await paginator.items.clone().json();
            allCommits.push(...curPage);
            await updateProgress(`commits for ${curBranchName}`, allCommits.length, curTotalCommits);
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

    async function getFirstCommit (paginator) {
        let first;
        if (paginator.links.last !== "") await paginator.last();
        first = (await paginator.items.clone().json());
        first = first[first.length-1];
        return first;
    }

    function graphSearch (graph, item) {
        let found = undefined;
        function rec (chain, item) {
            if (found) return;
            for (let i = 0; i < chain.length; i++) {
                let cur = chain[i];
                if (cur.sha === item.sha) {
                    found = cur;
                    return;
                }
                if ("children" in chain[i]) {
                    for (let j = 0; j < chain[i].children.length; j++) {
                        rec(chain[i].children[j], item);
                    }
                }
                if (found) return;
            }
        }
        rec(graph, item);
        return found;
    }
    console.log(orderedCommits);
    await updateProgress("", -1, -1);
}

function clearCollectedData () {
    maxCommits = 0;
    branches = [];
    defaultBranch = {};
    usrAndRepo = {};
    allUniqueCommits = [];
    orderedCommits = [];
}

async function updateProgress (elements, cur, max) {
    const dotsCount = 3;
    let progressBox = document.getElementsByClassName("hint")[1];
    let progressBar = document.getElementById("progressBar");
    let progressBarBorder = document.getElementById("progressBarBorder");
    progressBox.style.visibility = "visible";

    if (elements !== "" && cur !== max) {
        if (progressBox.childNodes[1].tagName === "SPAN") {
            for (let i = 0; i < dotsCount; i++) progressBox.childNodes[1].remove();
        }
        progressBar.style.visibility = "visible";
        progressBarBorder.style.visibility = "visible";
        updateCounter();
    } else {
        if (cur === max) {
            progressBar.style.visibility = "hidden";
            progressBarBorder.style.visibility = "hidden";
            // remove placeholder
            if (cur === -1 && max === -1) {
                progressBox.style.visibility = "hidden";
                return;
            }
        }
        setPlaceholder();
    }


    function updateCounter () {
        progressBox.childNodes[0].nodeValue = `Fetching ${elements}: ${cur}/${max}`;
        progressBar.style.width = `${cur / max * 100}%`;
    }

    function setPlaceholder () {
        progressBox.childNodes[0].nodeValue = "Processing";

        let firstBr = progressBox.getElementsByTagName("br")[0];
        for (let i = 0; i < dotsCount; i++) {
            let dot = document.createElement("span");
            dot.innerText = ".";
            dot.className = "processingDot";
            progressBox.insertBefore(dot, firstBr);

        }
    }
}

/*
    auxilary
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

function deepCopy (aObject) {
    if (!aObject) {
        return aObject;
    }

    let v;
    let bObject = Array.isArray(aObject) ? [] : {};
    for (const k in aObject) {
        v = aObject[k];
        bObject[k] = (typeof v === "object") ? deepCopy(v) : v;
    }

    return bObject;
}

function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
