import { DatabaseSync } from 'node:sqlite';

interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  tags: string;
  solution: string;
  test_cases: string;
  acceptance_rate: number;
}

const problems: Problem[] = [
  {
    id: 1,
    title: 'Two Sum',
    difficulty: 'Easy',
    acceptance_rate: 49.1,
    tags: JSON.stringify(['Array', 'Hash Table']),
    description: `## Two Sum

Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to* \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

---

### Example 1

\`\`\`
Input:  nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: nums[0] + nums[1] == 9, return [0, 1].
\`\`\`

### Example 2

\`\`\`
Input:  nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

### Example 3

\`\`\`
Input:  nums = [3,3], target = 6
Output: [0,1]
\`\`\`

---

### Constraints

- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- Only one valid answer exists.

---

### Function Signature

\`\`\`javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function solution(nums, target) {
  // your code here
}
\`\`\``,
    solution: `## Solution

### Approach: Hash Map (One Pass)

Use a hash map to store each number and its index as you iterate. For each element, check if the complement (\`target - nums[i]\`) already exists in the map.

**Time Complexity:** O(n)  
**Space Complexity:** O(n)

\`\`\`javascript
function solution(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
\`\`\``,
    test_cases: JSON.stringify([
      { input: [[2, 7, 11, 15], 9], expected_output: [0, 1] },
      { input: [[3, 2, 4], 6], expected_output: [1, 2] },
      { input: [[3, 3], 6], expected_output: [0, 1] },
      { input: [[-1, -2, -3, -4, -5], -8], expected_output: [2, 4] },
      { input: [[0, 4, 3, 0], 0], expected_output: [0, 3] },
    ]),
  },
  {
    id: 2,
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    acceptance_rate: 40.8,
    tags: JSON.stringify(['String', 'Stack']),
    description: `## Valid Parentheses

Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

---

### Example 1

\`\`\`
Input:  s = "()"
Output: true
\`\`\`

### Example 2

\`\`\`
Input:  s = "()[]{}"
Output: true
\`\`\`

### Example 3

\`\`\`
Input:  s = "(]"
Output: false
\`\`\`

---

### Constraints

- \`1 <= s.length <= 10^4\`
- \`s\` consists of parentheses only \`'()[]{}'.\`

---

### Function Signature

\`\`\`javascript
/**
 * @param {string} s
 * @return {boolean}
 */
function solution(s) {
  // your code here
}
\`\`\``,
    solution: `## Solution

### Approach: Stack

Use a stack to track opening brackets. When a closing bracket is encountered, check if the top of the stack is the matching opening bracket.

**Time Complexity:** O(n)  
**Space Complexity:** O(n)

\`\`\`javascript
function solution(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const ch of s) {
    if ('({['.includes(ch)) {
      stack.push(ch);
    } else {
      if (stack.pop() !== map[ch]) return false;
    }
  }
  return stack.length === 0;
}
\`\`\``,
    test_cases: JSON.stringify([
      { input: ['()'], expected_output: true },
      { input: ['()[]{}'], expected_output: true },
      { input: ['(]'], expected_output: false },
      { input: ['([)]'], expected_output: false },
      { input: ['{[]}'], expected_output: true },
      { input: [''], expected_output: true },
      { input: [')'], expected_output: false },
    ]),
  },
  {
    id: 3,
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    acceptance_rate: 61.2,
    tags: JSON.stringify(['Linked List', 'Recursion']),
    description: `## Merge Two Sorted Lists

You are given the heads of two sorted linked lists \`list1\` and \`list2\`.

Merge the two lists into one **sorted** list. The list should be made by splicing together the nodes of the first two lists.

Return *the head of the merged linked list*.

> **Note:** For this problem, represent linked lists as arrays. Your function receives two sorted arrays and should return a merged sorted array.

---

### Example 1

\`\`\`
Input:  list1 = [1,2,4], list2 = [1,3,4]
Output: [1,1,2,3,4,4]
\`\`\`

### Example 2

\`\`\`
Input:  list1 = [], list2 = []
Output: []
\`\`\`

### Example 3

\`\`\`
Input:  list1 = [], list2 = [0]
Output: [0]
\`\`\`

---

### Constraints

- The number of nodes in both lists is in the range \`[0, 50]\`.
- \`-100 <= Node.val <= 100\`
- Both \`list1\` and \`list2\` are sorted in **non-decreasing** order.

---

### Function Signature

\`\`\`javascript
/**
 * @param {number[]} list1
 * @param {number[]} list2
 * @return {number[]}
 */
function solution(list1, list2) {
  // your code here
}
\`\`\``,
    solution: `## Solution

### Approach: Two Pointers

Use two pointers to iterate through both arrays simultaneously, always picking the smaller element.

**Time Complexity:** O(m + n)  
**Space Complexity:** O(m + n)

\`\`\`javascript
function solution(list1, list2) {
  const result = [];
  let i = 0, j = 0;
  while (i < list1.length && j < list2.length) {
    if (list1[i] <= list2[j]) {
      result.push(list1[i++]);
    } else {
      result.push(list2[j++]);
    }
  }
  while (i < list1.length) result.push(list1[i++]);
  while (j < list2.length) result.push(list2[j++]);
  return result;
}
\`\`\``,
    test_cases: JSON.stringify([
      { input: [[1, 2, 4], [1, 3, 4]], expected_output: [1, 1, 2, 3, 4, 4] },
      { input: [[], []], expected_output: [] },
      { input: [[], [0]], expected_output: [0] },
      { input: [[1], [2]], expected_output: [1, 2] },
      { input: [[-10, 0, 3], [-5, -1, 5, 10]], expected_output: [-10, -5, -1, 0, 3, 5, 10] },
    ]),
  },
  {
    id: 4,
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    acceptance_rate: 49.8,
    tags: JSON.stringify(['Array', 'Dynamic Programming', 'Divide and Conquer']),
    description: `## Maximum Subarray

Given an integer array \`nums\`, find the **subarray** with the largest sum, and return *its sum*.

---

### Example 1

\`\`\`
Input:  nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.
\`\`\`

### Example 2

\`\`\`
Input:  nums = [1]
Output: 1
\`\`\`

### Example 3

\`\`\`
Input:  nums = [5,4,-1,7,8]
Output: 23
\`\`\`

---

### Constraints

- \`1 <= nums.length <= 10^5\`
- \`-10^4 <= nums[i] <= 10^4\`

---

### Function Signature

\`\`\`javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
function solution(nums) {
  // your code here
}
\`\`\``,
    solution: `## Solution

### Approach: Kadane's Algorithm

Maintain a running sum. If the running sum becomes negative, reset it to 0 (start a new subarray). Track the maximum seen so far.

**Time Complexity:** O(n)  
**Space Complexity:** O(1)

\`\`\`javascript
function solution(nums) {
  let maxSum = nums[0];
  let currentSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}
\`\`\``,
    test_cases: JSON.stringify([
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected_output: 6 },
      { input: [[1]], expected_output: 1 },
      { input: [[5, 4, -1, 7, 8]], expected_output: 23 },
      { input: [[-1]], expected_output: -1 },
      { input: [[-2, -1]], expected_output: -1 },
      { input: [[1, 2, 3, 4, 5]], expected_output: 15 },
    ]),
  },
  {
    id: 5,
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'Medium',
    acceptance_rate: 64.7,
    tags: JSON.stringify(['Tree', 'BFS', 'Binary Tree']),
    description: `## Binary Tree Level Order Traversal

Given the root of a binary tree, return *the level order traversal of its nodes' values* (i.e., from left to right, level by level).

> **Note:** For this problem, the tree is represented as an array where index \`i\` has children at \`2*i+1\` and \`2*i+2\`. \`null\` values indicate missing nodes. Your function receives this array and should return an array of arrays (each inner array = one level).

---

### Example 1

\`\`\`
Input:  root = [3,9,20,null,null,15,7]
Output: [[3],[9,20],[15,7]]
\`\`\`

### Example 2

\`\`\`
Input:  root = [1]
Output: [[1]]
\`\`\`

### Example 3

\`\`\`
Input:  root = []
Output: []
\`\`\`

---

### Constraints

- The number of nodes in the tree is in the range \`[0, 2000]\`.
- \`-1000 <= Node.val <= 1000\`

---

### Function Signature

\`\`\`javascript
/**
 * @param {(number|null)[]} root  - array representation of binary tree
 * @return {number[][]}
 */
function solution(root) {
  // your code here
}
\`\`\``,
    solution: `## Solution

### Approach: BFS with Queue

Build the tree from the array, then use a queue (BFS) to traverse level by level.

**Time Complexity:** O(n)  
**Space Complexity:** O(n)

\`\`\`javascript
function solution(root) {
  if (!root || root.length === 0) return [];

  // Build tree nodes from array representation
  const nodes = root.map(v => v !== null ? { val: v, left: null, right: null } : null);
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]) {
      if (2 * i + 1 < nodes.length) nodes[i].left = nodes[2 * i + 1];
      if (2 * i + 2 < nodes.length) nodes[i].right = nodes[2 * i + 2];
    }
  }

  const result = [];
  const queue = [nodes[0]];
  while (queue.length > 0) {
    const levelSize = queue.length;
    const level = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      if (node) {
        level.push(node.val);
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
      }
    }
    if (level.length > 0) result.push(level);
  }
  return result;
}
\`\`\``,
    test_cases: JSON.stringify([
      { input: [[3, 9, 20, null, null, 15, 7]], expected_output: [[3], [9, 20], [15, 7]] },
      { input: [[1]], expected_output: [[1]] },
      { input: [[]], expected_output: [] },
      { input: [[1, 2, 3, 4, 5]], expected_output: [[1], [2, 3], [4, 5]] },
    ]),
  },
];

export function seedDb(db: DatabaseSync): void {
  const row = db.prepare('SELECT COUNT(*) as c FROM problems').get() as { c: number };
  if (row.c > 0) return;

  const insert = db.prepare(`
    INSERT INTO problems (id, title, difficulty, description, tags, solution, test_cases, acceptance_rate)
    VALUES (@id, @title, @difficulty, @description, @tags, @solution, @test_cases, @acceptance_rate)
  `);

  db.exec('BEGIN');
  try {
    for (const row of problems) insert.run(row as unknown as Record<string, import('node:sqlite').SQLInputValue>);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log(`Seeded ${problems.length} problems into the database.`);
}
