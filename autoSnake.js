const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gridSize = 38;
const gapSize = 2; // 格子之间的间距
const cellSize = gridSize + gapSize; // 格子的实际大小，包括间距
const snakeColor = "white";
const foodColor = "red";
const gameSpeed = 16; // 游戏速度，调整这个值以控制速度

// 创建小蛇、食物、地图
let snake = [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }];
let food = { x: 5, y: 5 };
let direction = "right";
let lastUpdate = 0;
let map = []

// 创建虚拟蛇、虚拟地图用于探路
let virtualSnake = [...snake];
let virdirection = "right";// 创建一个地图的副本，用于虚拟蛇的路径计算
let virtualMap = [];

function startGame() {
    window.requestAnimationFrame(updateGameArea);
}

// 在updateGameArea函数中调用findPathBFS
function updateGameArea(timestamp) {
    // 控制速度
    if (timestamp - lastUpdate < gameSpeed) {
        window.requestAnimationFrame(updateGameArea);
        return;
    }

    lastUpdate = timestamp;

    // 创建一个二维数组表示地图，标记蛇身和食物的位置
    for (let i = 0; i < canvas.height / cellSize; i++) {
        map[i] = [];
        for (let j = 0; j < canvas.width / cellSize; j++) {
            map[i][j] = 0; // 0 表示空格
        }
    }
    
    // 判断游戏是否结束
    if (isGameOver()) {
        return;
    }

    // 标记蛇身
    snake.forEach(segment => {
        map[segment.y][segment.x] = 1; // 1 表示蛇身
    });

    // 标记食物
    map[food.y][food.x] = 2; // 2 表示食物

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid()
    drawSnake();
    drawFood();
    findPathBFS(); // 调用BFS路径查找函数
    moveSnake();

    window.requestAnimationFrame(updateGameArea);
}

// 画蛇
function drawSnake() {
    snake.forEach((segment, index) => {
        ctx.fillStyle = snakeColor; // 设置蛇身颜色为绿色
        if (index === 0) {
            // 绘制蛇头并设置颜色为蓝色
            ctx.fillStyle = "blue";
        }
        ctx.fillRect(segment.x * cellSize, segment.y * cellSize, gridSize, gridSize);
    });
}

// 画格子
function drawGrid() {
    ctx.strokeStyle = "gray"; // 设置网格线颜色为灰色
    ctx.lineWidth = 1; // 设置网格线宽度
    ctx.font = "10px Arial"; // 设置字体样式

    for (let y = 0; y < canvas.height; y += cellSize) {
        for (let x = 0; x < canvas.width; x += cellSize) {
            // 绘制水平网格线
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();

            // 绘制垂直网格线
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();

            // 在格子中心绘制坐标
            const textX = x + gridSize / 2 - 10; // 调整 x 坐标位置
            const textY = y + gridSize / 2 + 5; // 调整 y 坐标位置
            ctx.fillText(`(${x / cellSize},${y / cellSize})`, textX, textY);
        }
    }
}

// 画食物
function drawFood() {
    ctx.fillStyle = foodColor;
    ctx.fillRect(food.x * cellSize, food.y * cellSize, gridSize, gridSize);
}

// 执行BFS路径查找
function findPathBFS() {
    // 使用BFS算法计算路径
    const startNode = { x: snake[0].x, y: snake[0].y };
    const endNode = { x: food.x, y: food.y };
    const path = bfs(map, startNode, endNode);
    const tailNode = { x: snake[snake.length - 1].x, y: snake[snake.length - 1].y };

    // 根据路径决定蛇的下一步移动方向
    if (path.length > 1) {
        
        // 如果虚拟蛇可以找到蛇尾
        if (simulateSnake(path)) {
            // 派真蛇去吃食物
            const nextNode = path[1];
            if (nextNode.x === startNode.x + 1) direction = "right";
            else if (nextNode.x === startNode.x - 1) direction = "left";
            else if (nextNode.y === startNode.y + 1) direction = "down";
            else if (nextNode.y === startNode.y - 1) direction = "up";
        } else {
            // 虚拟蛇吃完食物之后不能找到连接尾部的通路
            // 让真蛇去找自己的尾巴；但是需要满足两点：
            // 1.在蛇头的四周找一个空位，蛇头走到这个空位后任然可以找到连接尾部的通路；
            // 2.找到所有满足条件1的情况下，优先选择距离食物最远的一格

            // 创建新地图副本，地图中蛇尾部分设置为非1的数用于bfs函数忽略蛇尾节点
            let newMap = [...map]
            newMap[tailNode.y][tailNode.x] = 3
            const longestSafePath = findFarthestSafeCell(newMap,snake, food);
            // 根据最远安全路径移动真蛇
            const nextNode = longestSafePath;
            
            if (nextNode.x === startNode.x + 1) direction = "right";
            else if (nextNode.x === startNode.x - 1) direction = "left";
            else if (nextNode.y === startNode.y + 1) direction = "down";
            else if (nextNode.y === startNode.y - 1) direction = "up";
        }
    } else {
        // 真蛇没有找到吃食物的路径：
        // 让真蛇去找自己的尾巴；但是需要满足两点：
        // 1.在蛇头的四周找一个空位，蛇头走到这个空位后任然可以找到连接尾部的通路；
        // 2.找到所有满足条件1的情况下，优先选择距离食物最远的一格

        // 创建新地图副本，地图中蛇尾部分设置为非1的数用于bfs函数忽略蛇尾节点
        let newMap = [...map]
        newMap[tailNode.y][tailNode.x] = 3
        const longestSafePath = findFarthestSafeCell(newMap,snake, food);
        // 根据最远安全路径移动真蛇
        const nextNode = longestSafePath;
        
        if (nextNode.x === startNode.x + 1) direction = "right";
        else if (nextNode.x === startNode.x - 1) direction = "left";
        else if (nextNode.y === startNode.y + 1) direction = "down";
        else if (nextNode.y === startNode.y - 1) direction = "up";
    }
}

// BFS路径查找函数
function bfs(map, start, end) {
    // queue 用于存储待处理的节点
    const queue = [];
    // visited 用于记录已经访问过的节点。
    const visited = new Set();
    // directions 包含四个可能的移动方向：上、下、左、右，每个方向表示为一个对象 {x, y}。
    const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

    // 将起点 start 放入队列 queue 中，并初始化一个空路径 path，然后将起点坐标标记为已访问，
    // 存入集合 visited 中。这个路径 path 是一个数组，用于记录从起点到当前节点的路径。
    queue.push({ node: start, path: [] });
    visited.add(`${start.x},${start.y}`);

    while (queue.length > 0) {
        // 从队列 queue 中取出队首节点 {node, path}，其中 node 表示当前节点，
        // path 表示从起点到当前节点的路径。
        const { node, path } = queue.shift();

        // 检查当前节点 node 是否为终点 end，如果是，则说明找到了最短路径，直接返回 path。
        if (node.x === end.x && node.y === end.y) {
            
            return [...path, end]
        }

        // 遍历四个可能的移动方向，分别计算下一个节点的坐标 nextX 和 nextY。
        // 检查下一个节点是否在地图内（坐标在合法范围内）且未被访问过（visited 集合中没有记录）
        // 且不是蛇身（map[nextY][nextX] !== 1）。
        // 如果满足上述条件，将下一个节点 {x: nextX, y: nextY} 加入队列 queue，同时将当前路径
        // path 的拷贝（使用 path: [...path, node]）加入到新节点的路径中，并将下一个节点坐标标
        // 记为已访问。
        for (const dir of directions) {
            const nextX = node.x + dir.x;
            const nextY = node.y + dir.y;
            const nextPos = `${nextX},${nextY}`;

            if (
                nextX >= 0 &&
                nextX < map[0].length &&
                nextY >= 0 &&
                nextY < map.length &&
                !visited.has(nextPos) &&
                map[nextY][nextX] !== 1
            ) {
                queue.push({ node: { x: nextX, y: nextY }, path: [...path, node] });
                visited.add(nextPos);
            }
        }
    }

    return [];
}

// 虚拟蛇探路
function simulateSnake(path) {
    // 创建一个虚拟蛇的副本，包括位置、方向等信息
    virtualSnake = [...snake];

    // 使用BFS算法找到虚拟蛇吃食物的路径
    const pathToFood = path

    for (let i = 1; i < pathToFood.length; i++) {
        var nextNode = pathToFood[i];
        var lastNode = pathToFood[i - 1]
        if (nextNode.x === lastNode.x + 1) virdirection = "right";
        else if (nextNode.x === lastNode.x - 1) virdirection = "left";
        else if (nextNode.y === lastNode.y + 1) virdirection = "down";
        else if (nextNode.y === lastNode.y - 1) virdirection = "up";
        moveVirtualSnake(virdirection)
    }
    let startNode = { x: virtualSnake[0].x, y: virtualSnake[0].y };
    let endNode = { x: virtualSnake[virtualSnake.length - 1].x, y: virtualSnake[virtualSnake.length - 1].y };

    // // 更新虚拟蛇的位置
    virtualMap = [];
    for (let i = 0; i < canvas.height / cellSize; i++) {
        virtualMap[i] = [];
        for (let j = 0; j < canvas.width / cellSize; j++) {
            virtualMap[i][j] = 0; // 0 表示空格
        }
    }
    

    // 标记蛇身
    virtualSnake.forEach(segment => {
        virtualMap[segment.y][segment.x] = 1; // 1 表示虚拟蛇蛇身
    });
    // 标记蛇尾
    virtualMap[endNode.y][endNode.x] = 3

    let headToTail = bfs(virtualMap, startNode, endNode,'tail')
    return headToTail.length > 1; // 返回是否找到路径
}

// 寻找蛇头附近安全的格子
function findFarthestSafeCell( map,snake,food) {
    const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    const candidateCells = [];

    // 遍历蛇头周围的可行走的格子
    for (const dir of directions) {
        const nextX = snake[0].x + dir.x;
        const nextY = snake[0].y + dir.y;

        // 检查是否在地图内且不与蛇身重叠
        if (
            nextX >= 0 &&
            nextX < map[0].length &&
            nextY >= 0 &&
            nextY < map.length &&
            map[nextY][nextX] === 0
        ) {
            const virtualSnake = [...snake];
            virtualSnake.unshift({ x: nextX, y: nextY });

            // canReachTail函数模拟蛇走到这个格子后，是否能到达尾部，
            // 如果能到达尾部则添加到数组candidateCells进行条件2的判断
            if (canReachTail(virtualSnake, map)) {
                candidateCells.push({ x: nextX, y: nextY });
            }
        }
    }

    // 如果没有找到周围有空格满足条件，则返回当前蛇尾坐标，让蛇头直接追蛇尾
    if (candidateCells.length === 0) {
        return { x: snake[snake.length - 1].x, y: snake[snake.length - 1].y }; // 没有找到满足条件的格子
    }

    // 计算候选格子到食物的距离，选择距离最远的格子
    let farthestCell = candidateCells[0];
    let maxDistance = calculateManhattanDistance(farthestCell, food);

    for (const cell of candidateCells) {
        const distance = calculateManhattanDistance(cell, food);
        if (distance > maxDistance) {
            farthestCell = cell;
            maxDistance = distance;
        }
    }

    return farthestCell;
}

// 检查蛇移动后是否能找到尾部的通路
function canReachTail(virtualSnake, map) {
    // 使用BFS算法查找蛇头到蛇尾的路径
    const startNode = { x: virtualSnake[0].x, y: virtualSnake[0].y };
    const endNode = { x: virtualSnake[virtualSnake.length - 1].x, y: virtualSnake[virtualSnake.length - 1].y };
    const path = bfs(map, startNode, endNode);
    return path.length > 1; // 返回是否找到路径
}

// 计算两个点之间的曼哈顿距离
function calculateManhattanDistance(point1, point2) {
    return Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y);
}

// 移动蛇
function moveSnake() {
    const head = { ...snake[0] };
    switch (direction) {
        case "up":
            head.y--;
            break;
        case "down":
            head.y++;
            break;
        case "left":
            head.x--;
            break;
        case "right":
            head.x++;
            break;
    }
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        // Snake ate the food, generate new food
        let newFood;
        if(snake.length!=map[0].length*map.length){
            do {
                newFood = {
                    x: Math.floor(Math.random() * (canvas.width / cellSize)),
                    y: Math.floor(Math.random() * (canvas.height / cellSize))
                };
            } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        }
        food = newFood;

    } else {
        // Remove the tail segment
        snake.pop();
    }
}

// 模拟虚拟蛇移动
function moveVirtualSnake() {
    const head = { ...virtualSnake[0] };
    switch (virdirection) {
        case "up":
            head.y--;
            break;
        case "down":
            head.y++;
            break;
        case "left":
            head.x--;
            break;
        case "right":
            head.x++;
            break;
    }
    if (head.x === food.x && head.y === food.y) {
    } else {
        virtualSnake.pop();
    }
    virtualSnake.unshift(head);

}

function isGameOver() {
    const head = snake[0];
    if (
        head.x < 0 ||
        head.x >= canvas.width / cellSize ||
        head.y < 0 ||
        head.y >= canvas.height / cellSize ||
        snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)
    ) {
        alert("游戏结束");
        return true; // 游戏失败
    } else if (snake.length === map[0].length * map.length) {
        alert("贪吃蛇已占满全图，游戏胜利！");
        return true; // 游戏胜利
    } else {
        return false; // 游戏继续
    }
}

// 按键事件
window.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "ArrowUp":
            if (direction !== "down") direction = "up";
            break;
        case "ArrowDown":
            if (direction !== "up") direction = "down";
            break;
        case "ArrowLeft":
            if (direction !== "right") direction = "left";
            break;
        case "ArrowRight":
            if (direction !== "left") direction = "right";
            break;
    }
});

startGame();
