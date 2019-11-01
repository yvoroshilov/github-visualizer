const btnRepo = document.getElementById("btnRepo");
btnRepo.addEventListener("click", visualize);

const OPTIONS = {
        method: "GET",
        headers: {
            Authorization: "Token be7095a2838af941e665a27f1b34242f6b60e816"
    }
};
const COMMITSPERPAGE = 100;
const REPOURLTEMPLATE = "https://api.github.com/repos/{owner}/{repo}";
const COMMITSURLTEMPLATE = "https://api.github.com/repos/{owner}/{repo}/commits{/sha}";
fetch("https://api.github.com/rate_limit", OPTIONS).then(result => (result.json()).then(result => (console.log(result.rate))));


async function fetchSmth () {
}
async function visualize () {
    const usrAndRepo = await processUrl();
    /*
    const GHApiUrl = "https://api.github.com";
    const response = await fetch(GHApiUrl);
    const result = await response.json();
    console.log(result);
    debugger;
    */
    let repoUrl;
    repoUrl = REPOURLTEMPLATE.replace("{owner}", usrAndRepo.username);
    repoUrl = repoUrl.replace("{repo}", usrAndRepo.repoName);
    const repoInfo = await (await fetch(repoUrl, OPTIONS)).json();


    let commitsInfo, commitsUrl;
    commitsUrl = COMMITSURLTEMPLATE.replace("{/sha}", `?per_page=${COMMITSPERPAGE}`);
    commitsUrl = commitsUrl.replace("{repo}", usrAndRepo.repoName);
    commitsUrl = commitsUrl.replace("{owner}", usrAndRepo.username);
    commitsInfo = await fetch(commitsUrl, OPTIONS);
    const commitsPaginator = {
        // Raw response from commits url
        commitsInfo: commitsInfo,
        pageNumber: 0,
        links: {
            next: "",
            prev: "",
            first: "",
            last: ""
        },

        getNewLinks: function () {
            let links = (commitsInfo.headers.get("Link"));
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
            this.commitsInfo = await fetch(this.links.next, OPTIONS);
            this.getNewLinks();
        },
        prev: async function () {
            if (this.links.prev === "") throw new Error("prev link does not exist!");

            this.pageNumber--;
            this.commitsInfo = await fetch(this.links.prev, OPTIONS);
            this.getNewLinks();
        },
        first: async function () {
            if (this.links.first === "") throw new Error("first link does not exist!");

            this.pageNumber = 1;
            this.commitsInfo = await fetch(this.links.first, OPTIONS);
            this.getNewLinks();

        },
        last: async function () {
            if (this.links.last === "") throw new Error("last link does not exist!");

            this.pageNumber = Number.parseInt((this.links.last.slice(this.links.last.lastIndexOf("=") + 1)));
            this.commitsInfo = await fetch(this.links.last, OPTIONS);
            this.getNewLinks();
        }
    };
    commitsPaginator.getNewLinks();
    console.log(commitsInfo);
    await setStats(commitsPaginator, repoInfo, commitsUrl);
}

async function processUrl () {
    const inp = document.getElementById("inpRepo");
    const repoUrl = inp.value;
    let decomposedUrl = repoUrl.split("/");
    decomposedUrl = {
        username: decomposedUrl[decomposedUrl.length-2],
        repoName: decomposedUrl[decomposedUrl.length-1]
    };
    return decomposedUrl;
}

async function setStats (commitsPaginator, repoInfo) {
    const cells = document.getElementById("stats").getElementsByTagName("span");
    let curComPage = await commitsPaginator.commitsInfo.json();

    // Setting a reference to repo
    const repoHtmlUrl = curComPage[0].html_url.slice(0,(curComPage[0].html_url.indexOf("/commit")));
    cells[0].appendChild(document.createElement("a"));
    cells[0].lastElementChild.setAttribute("href", repoHtmlUrl);
    cells[0].lastElementChild.appendChild(document.createTextNode(repoHtmlUrl.replace("https://", "")));

    // Getting all commits and specifying commits number
    //TODO Make datalist with branches!!!
    let lastCommit = curComPage[0];
    let numberOfCommits = curComPage.length;
    if (commitsPaginator.links.last !== "") {
        await commitsPaginator.last();
        curComPage = await commitsPaginator.commitsInfo.json();
        numberOfCommits += (commitsPaginator.pageNumber - 2) * COMMITSPERPAGE + curComPage.length;
    }
    debugger;

    cells[1].appendChild(document.createTextNode(numberOfCommits));

    // Repository creating date
    cells[2].appendChild(document.createTextNode(repoInfo.created_at));

    // Last commit info
    cells[3].appendChild(document.createTextNode(
        lastCommit.sha.slice(0, 7) + " | " +
        lastCommit.commit.committer.date
    ));
}

