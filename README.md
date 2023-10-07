# aiSnake
基于bfs算法的自动寻路贪吃蛇（虚拟蛇探路+追尾）
演示：
 
演示地址：www.zm-zm.top
源码：https://github.com/zm2001/aiSnake.git

准备工作：
首先自己找一个可操控的js+canvas的贪吃蛇小游戏，网上相关代码很多不做过多介绍。 

BFS算法（核心）：
广度优先算法（Breadth-First-Search），简称BFS。
BFS算法从问题的初始状态（起点）出发，搜索起点周围的节点直到目标结点。可参考b站教程：https://www.bilibili.com/video/BV16C4y1s7EF/?spm_id_from=333.337.search-card.all.click&vd_source=d88b78d209c8ac5b74b6840972e0941f
 
相关代码：地图map是一个二维数组，其中0表示可移动的空位，1表示蛇身。start是起始节点；end为目标节点。
首先把食物的坐标放入队列，只要队列非空就把队头出队，然后把蛇头周围的4个点放入队列，不断地循环操作，直到覆盖整个地图。在遍历过程中应该注意：1.蛇的身体和墙不能访问。2.为了提高效率，有重合的格子如果被访问过就不用再访问了。当整个循环结束后，我们就获得了蛇头与食物之间的最短路径。

BFS路径查找函数：

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

此时我们让小蛇去吃食物，但是当我们运行一段时间过后会发现小蛇很快就撞墙
 
仔细研究会发现当小蛇吃完食物后并不能找到蛇头与食物之间的路径，此时小蛇会陷入迷茫状态，一直沿着一个方向冲过去。因此我们需要优化策略让小蛇安全的去吃食物。

追尾+虚拟蛇探路：
	首先我们应该为“安全”定义，什么是安全状态？我们发现蛇头移动一格对应蛇尾的位置就移出一格，所以只要蛇头能跟着蛇尾走那么就是安全状态，因此当小蛇吃完食物之后能检查到蛇头与蛇尾之间有通路即为安全。
通过以上结论，我们可以在小蛇找不到吃食物的路径时，让小蛇跟着蛇尾走。当小蛇可以吃到食物时，先创建一个虚拟蛇模拟小蛇使用bfs算法沿着最短路径去吃掉食物，当虚拟蛇吃完食物之后可以找到蛇头与蛇尾之间的通路时，此时吃完为安全状态，于是我们再派真实的小蛇去吃食物。反之当虚拟蛇吃完食物之后发现找不到连接尾部的通路时，此时吃完为不安全状态，我们让真蛇跟着蛇尾走一步。直到虚拟蛇找到安全的状态再让真实的小蛇移动。
以下是伪代码：
 

我们根据这个策略进行优化后可以看到，小蛇虽然不会死但是一直围绕蛇尾转圈；

优先远离食物追尾：
我们再次分析会发现当蛇头沿着蛇尾走时会在路上留下许多空隙，这些空隙导致蛇头并不能找到一个安全的路径去吃食物，因此我们还需要去优化蛇头跟着蛇尾走的策略。我们应当在蛇头去找蛇尾时尽量不与蛇身产生空隙。
因此让真蛇去找自己的尾巴时需要满足两点：
1.在蛇头的四周找一个空位，蛇头走到这个空位后任然可以找到连接尾部的通路。
2.找到所有满足条件1的情况下，优先选择距离食物最远的一格。（计算两个点之间的曼哈顿距离）
 
当我们优化完策略之后：
 www.zm-zm.top
