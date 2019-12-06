let levels = [];
let straightLines = [];
let curveLines = [];

/*
const MAX_NODES = 30;
const MAX_BRANCHES = 10;
const BASE_RADIUS_MAX = 80;
const BASE_RADIUS_MIN = 30;
const BASE_DISTANCE_HORIZONTAL_MAX = 330;
const BASE_DISTANCE_VERTICAL_MIN = 130;
*/
// with no padding included
//let width = (radius * 2 + (distanceHorizontal - radius * 2)) * maxCommits > svgSize.width ? (radius * 2 + (distanceHorizontal - radius * 2)) * maxCommits : svgSize.width;
let baseWidth;
let baseHeight;

let radius;
let distanceHorizontal;
let distanceVertical;
let initialPosX;
let initialPosY;
let lineWidth;

function computeBaseValues () {
    let svgElem = document.getElementsByTagName("svg")[0];
    let svgSize = {
        width: svgElem.getBoundingClientRect().width,
        height: svgElem.getBoundingClientRect().height
    };
    baseWidth = svgSize.width;
    baseHeight = svgSize.height;

    initialPosX = 0.04 * baseWidth;
    initialPosY = 0.9 * baseHeight;
    distanceVertical = 130;
    distanceHorizontal = 124;
    radius = 30;
    lineWidth = 30;
}

async function visualize () {
    await buildGraph();
    setLevels();
    createLines();
    computeBaseValues();
    const svg = d3.select("svg");
    const g = svg.append("g");
    console.log(document.getElementsByTagName("svg")[0].getBoundingClientRect());
    console.log(levels);
    console.log(straightLines);
    console.log(curveLines);
    svg.attr("viewBox", [0, 0, baseWidth, baseHeight]);
    svg.call(d3.zoom()
            .extent([[0, 0], [baseWidth, baseHeight]])
            .scaleExtent([0.05, 8])
            .on("zoom", () => g.attr("transform", d3.event.transform)));
    /*
     svg.append("path")
        .attr("d", getEdge([150, 150], [190, 100]));
     */

    // drawing straight lines
    g.selectAll("line")
            .data(straightLines)
        .enter().append("line")
            //.attr("class", "straight")
            .attr("x1", (d, i) => {
                if (i === 0) {
                    return getPosX(indexOfSha(allUniqueCommits, d.parent.sha)) - radius / 2 - 1;
                } else {
                    return getPosX(indexOfSha(allUniqueCommits, d.parent.sha) + 1) - radius / 2 - 1;
                }
            })
            .attr("y1", (d) => getPosY(indexOfSha(allUniqueCommits, d.begin.sha)))
            .attr("x2", (d) => getPosX(indexOfSha(allUniqueCommits, d.end.sha)))
            .attr("y2", (d) => getPosY(indexOfSha(allUniqueCommits, d.end.sha)))
            .attr("stroke-width", lineWidth);

    // drawing curve lines
    g.selectAll("path")
            .data(curveLines)
        .enter().append("path")
            //.attr("class", "curve")
            .attr("d" , function (d) {
                let beginIndex = indexOfSha(allUniqueCommits, d.begin.sha);
                let endIndex = indexOfSha(allUniqueCommits, d.end.sha);
                let beginX = getPosX(beginIndex) + radius / 2;
                let beginY = getPosY(beginIndex) - radius / 2;
                let endX = getPosX(beginIndex + 1) - radius / 2;
                let endY = getPosY(endIndex) - radius / 2;
                if (levels[beginIndex] < levels[endIndex]) {
                    return getCurve([beginX, beginY], [endX, endY]);
                } else {
                    return getCurve([beginX, beginY], [endX, endY], true);
                }
            })
            .attr("stroke-width", 0);


    // drawing nodes
    g.selectAll("circle")
            .data(allUniqueCommits)
        .enter().append("circle")
            .attr("cx", (d, i) => getPosX(i))
            .attr("cy", (d, i) => getPosY(i))
            .attr("r", radius);
    g.selectAll("text")
            .data(allUniqueCommits)
        .enter().append("text")
            .attr("x", (d, i) => getPosX(i) - radius)
            .attr("y", (d, i) => getPosY(i))
            .text((d) => d.sha.slice(0, 8));



    function getPosX (index) {
        return initialPosX + index * distanceHorizontal;
    }

    function getPosY (index) {
        return initialPosY - levels[index] * distanceVertical;
    }

}

// start and end - arrays [x, y]
function getCurve(start, end, reversed = false) {
    /*
        1 - start point
        2 - control point
        3 - control point
        4 - end point
    */
    function constructEdge(points) {
        const lineGen = d3.line().curve(d3.curveBasis);
        let path = lineGen(points);
        if (reversed) {
            path += `L${points[3][0]},${points[3][1] + lineWidth}`;
            points.forEach(p => {
                p[0] -= lineWidth;
                p[1] += lineWidth;
            });
            points.reverse();
            points[0][0] += lineWidth;
            points[3][0] += lineWidth;
        } else {
            path += `L${points[3][0]},${points[3][1] + lineWidth}`;
            points.forEach(p => {
                p[0] += lineWidth;
                p[1] += lineWidth;
            });
            points.reverse();
            points[0][0] -= lineWidth;
            points[3][0] -= lineWidth;
        }

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

    let points;
    if (reversed) {
        points = [
            start,
            [start[0] + distanceHorizontal / 2, start[1]],
            [end[0] - distanceHorizontal / 2 + lineWidth, end[1]],
            end
        ];
    } else {
        points = [
            start,
            [start[0] + distanceHorizontal / 2 - lineWidth, start[1]],
            [end[0] - distanceHorizontal / 2, end[1]],
            end
        ];
    }
    /*
    d3.select("svg").append("g")
            .selectAll("circle")
            .data(points)
        .enter().append("circle")
            .attr("cx", (d) => d[0])
            .attr("cy", (d) => d[1])
            .attr("r", 1)
            .attr("fill", "black");
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
        let firstInChain = queue[0].parent;
        queue.shift();

        let begin = indexOfSha(allUniqueCommits, firstInChain.sha);
        let end = indexOfSha(allUniqueCommits, curChain[curChain.length-1].sha);
        curLevel = levels[begin];
        for (let i = begin; i < end; i++) {
            curLevel = Math.max(curLevel, levels[i]);
        }
        curLevel++;
        if ("children" in firstInChain && firstInChain.children.length > 1) {
            let x = firstInChain.children.length - indexOfSha(firstInChain.children, curChain[0].sha);
            curLevel = Math.max(curLevel, levels[begin] + x);
        }

        for (let i = curChain.length - 1; i >= 0; i--) {
            let index = indexOfSha(allUniqueCommits, curChain[i].sha);
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
}

function createLines () {
    let queue = [{chain: orderedCommits, parent: orderedCommits[0]}];
    while (queue.length !== 0) {
        let curParent = queue[0].parent;
        let curChain = queue[0].chain;
        let lineBegin = curChain[0];
        let lineEnd = curChain[curChain.length - 1];
        queue.shift();
        straightLines.push({
            begin: allUniqueCommits.find(x => x.sha === lineBegin.sha),
            end: allUniqueCommits.find(x => x.sha === lineEnd.sha),
            parent: curParent
        });
        for (let i = 0; i < curChain.length; i++) {
            if ("mergeCommits" in curChain[i]) {
                for (let j = 0; j < curChain[i].mergeCommits.length; j++) {
                    curveLines.push({
                        begin: allUniqueCommits.find(x => x.sha === curChain[i].sha),
                        end: allUniqueCommits.find(x => x.sha === curChain[i].mergeCommits[j].sha),
                    });
                }
            }
            if ("children" in curChain[i]) {
                for (let j = 0; j < curChain[i].children.length; j++) {
                    queue.push({chain: curChain[i].children[j], parent: curChain[i]});

                    curveLines.push({
                        begin: allUniqueCommits.find(x => x.sha === curChain[i].sha),
                        end: allUniqueCommits.find(x => x.sha === curChain[i].children[j][0].sha),
                    });
                }
            }
        }
    }
}

function indexOfSha (arr, sha) {
    return arr.indexOf(arr.find(x => x.sha === sha))
}