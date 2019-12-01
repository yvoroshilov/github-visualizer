let svgElem = document.getElementsByTagName("svg")[0];

let svgSize = {
    width: svgElem.getBoundingClientRect().width,
    height: svgElem.getBoundingClientRect().height
};

let levels = [];

async function visualize () {
    await buildGraph();
    setLevels();
}

/*
const MAX_NODES = 30;
const MAX_BRANCHES = 10;
const BASE_WIDTH = svgSize.width;
const BASE_HEIGHT = svgSize.height;
const BASE_RADIUS_MAX = 80;
const BASE_RADIUS_MIN = 30;
const BASE_DISTANCE_HORIZONTAL_MAX = 330;
const BASE_DISTANCE_VERTICAL_MIN = 130;

function visualize () {
    const RADIUS = 30;
    const DISTANCE_HORIZONTAL = 123.75;
    const DISTANCE_VERTICAL = 130;
    // with no padding accounting
    const WIDTH = (RADIUS * 2 + (DISTANCE_HORIZONTAL - RADIUS * 2)) * maxCommits > svgSize.width ?
        (RADIUS * 2 + (DISTANCE_HORIZONTAL - RADIUS * 2)) * maxCommits : svgSize.width;



    debugger;
}
*/

// start and end - arrays [x, y]
function getEdge(start, end) {
    /*
        1 - start point
        2 - control point
        3 - control point
        4 - end point
    */
    function constructEdge(points) {
        const lineGen = d3.line().curve(d3.curveBasis);
        const edgeWidth = 4;
        let path = lineGen(points);

        path += `L${points[3][0]},${points[3][1] + edgeWidth}`;
        points.forEach(p => {
            p[0] += edgeWidth;
            p[1] += edgeWidth;
        });
        points.reverse();
        points[0][0] -= edgeWidth;
        points[3][0] -= edgeWidth;

        let l = path.length;
        path += lineGen(points);
        // removing M command for linejoin occurring
        path = removeM(path, l + 1);

        path += `Z`;

        return path;
    }

    function removeM(path, start) {
        let i;
        for (i = start; i < path.length; i++) {
            if (path[i].match(/[a-z]/i)) break;
        }
        return path.slice(0, start - 1) + path.slice(i);
    }

    let points = [
        start,
        [166, 150],
        [170, 100],
        end
    ];
    /*
    d3.select("svg").append("g")
            .selectAll("circle")
            .data(points)
        .enter().append("circle")
            .attr("cx", (d) => d[0])
            .attr("cy", (d) => d[1])
            .attr("r", 1);

     */
    let str = constructEdge(points);
    /*
    d3.select("svg").append("g")
        .selectAll("circle")
        .data(points)
        .enter().append("circle")
        .attr("cx", (d) => d[0])
        .attr("cy", (d) => d[1])
        .attr("r", 1)
        .attr("fill", "blue");

     */
    return str;
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