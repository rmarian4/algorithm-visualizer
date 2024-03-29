//vars used to keep track of timeouts used in dvAlgo function for animations
var distVecGraphIntervalId;
var distVecTimeoutArr = [];

function initializeCostMatrix(adjacencyList) {
    let costMatrix = new Map();

    for (let [vertex, neighbors] of adjacencyList.nodes) {
        costMatrix.set(vertex, {});
        costMatrix.get(vertex)["changed"] = true;
        costMatrix.get(vertex)["distanceVector"] = {};
        costMatrix.get(vertex)["distanceVector"][vertex] = {
            distance: 0,
            hop: vertex,
        };
        neighbors.forEach((neighbor) => {
            costMatrix.get(vertex)["distanceVector"][neighbor["node"]] = {
                distance: neighbor["weight"],
                hop: neighbor["node"],
            };
        });
    }
    //add non-neighbor vertices to the distance vector of each vertex
    for (let key of adjacencyList.nodes.keys()) {
        let distanceVector = costMatrix.get(key)["distanceVector"];
        for (let node of adjacencyList.nodes.keys()) {
            if (distanceVector[node] === undefined) {
                distanceVector[node] = { distance: Infinity, hop: null };
            }
        }
    }
    return costMatrix;
}

function dvAlgo(adjacencyList, showPath, start, end) {
    let costMatrix = initializeCostMatrix(adjacencyList);

    //update annotation on screen
    document.getElementById("dvAnnotation").innerHTML =
        "Initially the distance vector of each vertex is the distance to each of its neighbours, and all non-neighbor vertices have a distance of infinity";

    //function used to created the distance vector tables for each vertex
    createTables(costMatrix);

    var startTimeout = 3000;

    //while algorithm has not converged
    while (!checkForConvergence(costMatrix)) {
        let updatedCostMatrix = new Map();

        //update annotation
        distVecTimeoutArr.push(
            setTimeout(() => {
                document.getElementById("dvAnnotation").innerHTML =
                    "Each node with an updated distance vector will share its distance vector with each of its neighbors";
            }, startTimeout)
        );

        for (let key of costMatrix.keys()) {
            let neighbors = adjacencyList.nodes.get(key);
            let changedNeighbors = [];

            //iterate through neighbors and check if their distance vector has changed
            for (let neighbor of neighbors) {
                if (costMatrix.get(neighbor["node"])["changed"] === true) {
                    //if neighbors distance vector has changed add neighbor to list of neighbors whose distance vector has changed
                    changedNeighbors.push(neighbor["node"]);
                }
            }

            let updatedDV = updateDistanceVector(
                key,
                changedNeighbors,
                costMatrix
            );
            let currentDV = costMatrix.get(key)["distanceVector"];
            let annotation = "After ";

            if (neighbors.length > 0) {
                for (let element of neighbors) {
                    annotation += element["node"] + ", ";
                }
                annotation +=
                    "share their distance vectors with " +
                    key +
                    ", " +
                    key +
                    " updates its distance vector";
            }

            //if distance vector has updated then update cost matrix and update distance vector table displayed on screen
            if (checkIfDistanceVectorUpdated(currentDV, updatedDV)) {
                updatedCostMatrix.set(key, {
                    changed: true,
                    distanceVector: updatedDV,
                });
                distVecTimeoutArr.push(
                    setTimeout(() => {
                        document.getElementById("dvAnnotation").innerHTML =
                            annotation;
                        updateDistanceVectorTable(key, updatedDV);
                    }, startTimeout)
                );
                startTimeout += 3000;
            } else {
                updatedCostMatrix.set(key, {
                    changed: false,
                    distanceVector: currentDV,
                });
            }
        }
        costMatrix = updatedCostMatrix;
    }

    //update annotation
    distVecTimeoutArr.push(
        setTimeout(() => {
            document.getElementById(
                "dvAnnotation"
            ).innerHTML = `No updates from neighbor nodes have been sent, so now each node has the shortest distance to all other nodes in the network. See graph above to see path from ${start} to ${end}`;
        }, startTimeout + 2000)
    );

    let path = getPath(start, end, costMatrix);

    distVecTimeoutArr.push(
        setTimeout(() => {
            distVecGraphIntervalId = setInterval(() => {
                showPath(path);
            }, 3000);
        }, startTimeout + 3000)
    );

    //showPath(path);
    return costMatrix;
}

function updateDistanceVector(currentNode, changedNeighbors, costMatrix) {
    let newDV = {};
    for (let vertex of costMatrix.keys()) {
        let minDis = Infinity;
        let hop = null;
        for (let neighbor of changedNeighbors) {
            let distanceFromCurrentNodeToVertex =
                costMatrix.get(currentNode)["distanceVector"][vertex][
                    "distance"
                ];
            let distanceToNeighbor =
                costMatrix.get(currentNode)["distanceVector"][neighbor][
                    "distance"
                ];
            let distanceFromNeighborToVertex =
                costMatrix.get(neighbor)["distanceVector"][vertex]["distance"];

            if (
                minDis !== Infinity &&
                distanceToNeighbor + distanceFromNeighborToVertex < minDis
            ) {
                minDis = distanceToNeighbor + distanceFromNeighborToVertex;
                hop = costMatrix.get(currentNode)['distanceVector'][neighbor]['hop'];
            } else if (
                minDis === Infinity &&
                distanceToNeighbor + distanceFromNeighborToVertex <
                    distanceFromCurrentNodeToVertex
            ) {
                minDis = distanceToNeighbor + distanceFromNeighborToVertex;
                hop = costMatrix.get(currentNode)['distanceVector'][neighbor]['hop'];
            }
        }

        //if minDis has not changed then distance from currentNode to vertex is already shortest so don't update distance
        if (minDis === Infinity) {
            newDV[vertex] =
                costMatrix.get(currentNode)["distanceVector"][vertex];
        } else {
            //otherwise update distance to minimum distance
            newDV[vertex] = { distance: minDis, hop: hop };
        }
    }

    return newDV;
}

function checkIfDistanceVectorUpdated(currentDV, newDV) {
    for (let vertex of Object.keys(currentDV)) {
        if (currentDV[vertex]["distance"] !== newDV[vertex]["distance"]) {
            return true;
        }
    }
    return false;
}

function checkForConvergence(costMatrix) {
    for (let node of costMatrix.keys()) {
        if (costMatrix.get(node)["changed"] === true) {
            return false;
        }
    }
    return true;
}

function getPath(start, destination, minCostMatrix) {
    let path = [];
    path.push(start);
    let currentNode = start;

    while (currentNode != destination) {
        let nextNode =
            minCostMatrix.get(currentNode)["distanceVector"][destination][
                "hop"
            ];
        path.push(nextNode);
        currentNode = nextNode;
    }

    return path;
}



//=============================Code below used to create and update algorithm information while algorithm is running=========================================== 
function createDistanceVectorTable(vertex, costMatrix) {
    // Get the container for distance vector tables
    let distanceVectorContainer = document.getElementById("currentDistanceVectorsContainer");
  
    // Create a new table
    let table = document.createElement("table");
    table.setAttribute("id", `${vertex}DV`);
    table.classList.add("table", "table-bordered", "table-striped");
  
    // Create a table header with caption
    let tableHeader = document.createElement("thead");
    tableHeader.classList.add("table-dark");
    let tablecaption = document.createElement("caption");
    tablecaption.innerHTML = `${vertex}`;
    tablecaption.classList.add("fs-6", "fw-bold", "mb-1", "text-center");
    tablecaption.setAttribute("colspan", "3"); // add colspan attribute
    tableHeader.appendChild(tablecaption);
  
    // Create table header elements
    let tableHeaderRow = document.createElement("tr");
    let tableHeadElement = document.createElement("th");
    tableHeadElement.innerHTML = "Vertex";
    tableHeaderRow.appendChild(tableHeadElement);
    tableHeadElement = document.createElement("th");
    tableHeadElement.innerHTML = "Distance";
    tableHeaderRow.appendChild(tableHeadElement);
    tableHeadElement = document.createElement("th");
    tableHeadElement.innerHTML = "Hop";
    tableHeaderRow.appendChild(tableHeadElement);
    tableHeader.appendChild(tableHeaderRow);
    table.appendChild(tableHeader);
  
    // Add the table to the container
    let tableContainer = document.createElement("div");
    tableContainer.classList.add("col-md-2", "col-sm-12", "mb-3");
    tableContainer.appendChild(table);
    let tableRow = distanceVectorContainer.lastElementChild;
    if (!tableRow || tableRow.children.length == 6) {
      // Create a new row if the last row is full
      tableRow = document.createElement("div");
      tableRow.classList.add("row");
      distanceVectorContainer.appendChild(tableRow);
    }
    // Add the table container to the row
    tableRow.appendChild(tableContainer);
  
    // Get the distance vector for the vertex
    let distanceVector = costMatrix.get(vertex)["distanceVector"];
  
    // Create a table body
    let tableBody = document.createElement("tbody");
  
    // Add table rows for each vertex in the distance vector
    for (let key of Object.keys(distanceVector)) {
      let tableRow = document.createElement("tr");
  
      // Create table cells for vertex, distance, and hop
      let vertexTableEntry = document.createElement("td");
      vertexTableEntry.innerHTML = key;
  
      let distanceTableEntry = document.createElement("td");
      distanceTableEntry.innerHTML = distanceVector[key]["distance"];
  
      let hopTableEntry = document.createElement("td");
      hopTableEntry.innerHTML =
        distanceVector[key]["hop"] === null ? "None" : distanceVector[key]["hop"];
  
      // Add the cells to the row
      tableRow.appendChild(vertexTableEntry);
      tableRow.appendChild(distanceTableEntry);
      tableRow.appendChild(hopTableEntry);
  
      // Add the row to the table body
      tableBody.appendChild(tableRow);
    }
  
    // Add the table body to the table
    table.appendChild(tableBody);
}
  

function updateDistanceVectorTable(vertex, distanceVector) {
    let table = document.getElementById(`${vertex}DV`);
    let tableBody = table.querySelector("tbody");

    //delete the current rows of the table body
    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }

    //update distance vector table for vertex
    for (let key of Object.keys(distanceVector)) {
        let tableRow = document.createElement("tr");

        let vertexTableEntry = document.createElement("td");
        vertexTableEntry.innerHTML = key;

        let distanceTableEntry = document.createElement("td");
        distanceTableEntry.innerHTML = distanceVector[key]["distance"];

        let hopTableEntry = document.createElement("td");
        hopTableEntry.innerHTML =
            distanceVector[key]["hop"] === null
                ? "None"
                : distanceVector[key]["hop"];

        tableRow.appendChild(vertexTableEntry);
        tableRow.appendChild(distanceTableEntry);
        tableRow.appendChild(hopTableEntry);

        tableBody.appendChild(tableRow);
    }
}

function createTables(costMatrix) {
    for (let vertex of costMatrix.keys()) {
        createDistanceVectorTable(vertex, costMatrix);
    }
}

function initializeAnnotations() {
    //get annotations container for dv algo
    let dvAnnotationsContainer = document.getElementById(
        "dvAnnotationsContainer"
    );

    //add h5 tag for annotation for dv algo
    dvAnnotationsContainer.innerHTML = "";
    let annotation = document.createElement("h5");
    annotation.setAttribute("id", "dvAnnotation");
    annotation.innerHTML = "";

    //add table container to annotations container
    let currentDistanceVectorsContainer = document.createElement("div");
    currentDistanceVectorsContainer.setAttribute(
        "id",
        "currentDistanceVectorsContainer"
    );
    currentDistanceVectorsContainer.style.display = "flex";
    currentDistanceVectorsContainer.style.flexDirection = "row";
    currentDistanceVectorsContainer.style.flexWrap = "wrap";

    //append new html elements to the dom
    dvAnnotationsContainer.appendChild(annotation);
    dvAnnotationsContainer.appendChild(currentDistanceVectorsContainer);
}


//===================Function to be called when dv algo is selected to be run ============================================
function runDV(start, end) {
    //create a new Graph adjacency List
    const currentgraph = new GraphAdjacencyList();
    //loop through nodes and add them to new graph
    cy.nodes().forEach(function (ele) {
        currentgraph.addNode(ele.id());
    });
    //loop through edges and add them to graph
    cy.edges().forEach(function (ele) {
        currentgraph.addEdge(
            ele.source().id(),
            ele.target().id(),
            parseInt(ele.data("weight"))
        );
    });
    //run Distance vector Algorithm
    initializeAnnotations();
    let result = dvAlgo(
        currentgraph,
        highlightPathAnimated,
        start,
        end
    );

    let shortestPath = getPath(start, end, result);

    return shortestPath;
}

