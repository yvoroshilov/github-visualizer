let levels = [];

async function visualize () {
    await buildGraph();
    setLevels();
}

function setLevels () {
    allUniqueCommits.sort(comparator);
    for (let i = 0; i < allUniqueCommits.length; i++) {
        levels[i] = -1;
    }

    let curLevel = -1;
    // contains chains
    let queue = [{chain: orderedCommits, parent: orderedCommits[0]}];
    while (queue.length !== 0) {
        let curChain = queue[0].chain;
        let curParent = queue[0].parent;
        queue.shift();

        let begin = allUniqueCommits.indexOf(allUniqueCommits.find(x => x.sha === curParent.sha));
        let end = allUniqueCommits.indexOf(allUniqueCommits.find(x => x.sha === curChain[curChain.length-1].sha));
        curLevel = levels[begin];
        for (let i = begin; i < end; i++) {
            curLevel = Math.max(curLevel, levels[i]);
        }
        curLevel++;
        if ("children" in curParent && curParent.children.length > 1) {
            let x = curParent.children.length - curParent.children.indexOf(curParent.children.find(x => x[0].sha === curChain[0].sha));
            curLevel = Math.max(curLevel, levels[begin] + x);
        }

        for (let i = curChain.length - 1; i >= 0; i--) {
            let index = allUniqueCommits.indexOf(allUniqueCommits.find(x => x.sha === curChain[i].sha));
            levels[index] = curLevel;

            if ("children" in curChain[i]) {
                for (let j = curChain[i].children.length - 1; j >= 0 ; j--) {
                    queue.push({chain: curChain[i].children[j], parent: curChain[i]});
                }
            }
        }
    }

    function comparator (a, b) {
        let dateA = new Date(a.commit.committer.date);
        let dateB = new Date(b.commit.committer.date);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        if (dateA === dateB) return 0;
    }

    console.log(levels);

}