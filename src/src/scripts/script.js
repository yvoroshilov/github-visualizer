const btnRepo = document.getElementById("btnRepo");
btnRepo.addEventListener("click", fetchSmth);

const REPOURLTEMPLATE = "https://api.github.com/repos/{owner}/{repo}";
const COMMITSURLTEMPLATE = "https://api.github.com/repos/{owner}/{repo}/commits{/sha}";
let OPTIONS = {
        method: "GET",
        headers: {
        Authorization: "Token be7095a2838af941e665a27f1b34242f6b60e816"
    }
};

async function fetchSmth () {
    //be7095a2838af941e665a27f1b34242f6b60e816
    const URL = "https://api.github.com/";
    const info = await fetch(URL + "rate_limit", OPTIONS);
    console.log(await info.json());
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
    const repoInfo = await (await fetch(repoUrl)).json();


    let commitsInfo, commitsUrl;
    commitsUrl = COMMITSURLTEMPLATE.replace("{/sha}", "?per_page=100&page=1");
    commitsUrl = commitsUrl.replace("{repo}", usrAndRepo.repoName);
    commitsUrl = commitsUrl.replace("{owner}", usrAndRepo.username);
    commitsInfo = await (await fetch(commitsUrl)).json();
    console.log(commitsInfo);
    await setStats(commitsInfo, repoInfo, commitsUrl);
    console.log(commitsUrl);
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

async function setStats (commitsInfo, repoInfo, commitsUrl) {
    const cells = document.getElementById("stats").getElementsByTagName("span");

    const repoHtmlUrl = commitsInfo[0].html_url.slice(0,(commitsInfo[0].html_url.indexOf("/commit")));
    cells[0].appendChild(document.createElement("a"));
    cells[0].lastElementChild.setAttribute("href", repoHtmlUrl);
    cells[0].lastElementChild.appendChild(document.createTextNode(repoHtmlUrl.replace("https://", "")));

    let firstCommit = commitsInfo[commitsInfo.length-1];
    let lastCommit = commitsInfo[0];
    let numberOfCommits = commitsInfo.length;
    let page = 1;
    while (firstCommit.parents.length != 0) {
        commitsUrl = commitsUrl.slice(0, commitsUrl.lastIndexOf("=") + 1) + ++page;
        commitsInfo = await (await fetch(commitsUrl)).json();
        numberOfCommits += commitsInfo.length;
        firstCommit = commitsInfo[commitsInfo.length-1];
    }
    cells[1].appendChild(document.createTextNode(numberOfCommits));

    cells[2].appendChild(document.createTextNode(repoInfo.created_at));

    cells[3].appendChild(document.createTextNode(
        lastCommit.sha.slice(0, 7) + " | " +
        lastCommit.commit.committer.date
    ));
}

