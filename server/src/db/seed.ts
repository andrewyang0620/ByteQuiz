import { DatabaseSync } from 'node:sqlite';

const DEFAULT_CATEGORIES = [
  { name: 'Array',              color: '#A8C4A0' },
  { name: 'String',             color: '#90B0C4' },
  { name: 'LinkedList',         color: '#C4B48A' },
  { name: 'Tree',               color: '#90A870' },
  { name: 'Graph',              color: '#90A870' },
  { name: 'DynamicProgramming', color: '#B0A0C4' },
  { name: 'Stack',              color: '#A0A098' },
  { name: 'Queue',              color: '#A0A098' },
  { name: 'HashTable',          color: '#90B0C4' },
  { name: 'BinarySearch',       color: '#C4BC90' },
  { name: 'Sorting',            color: '#C4BC90' },
  { name: 'Math',               color: '#C4A090' },
  { name: 'SQL',                color: '#C4B48A' },
];

interface ProblemData {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  tags: string;
  description: string;
  examples: string;
  constraints: string;
  solution: string;
  solution_explanation: string;
  test_cases: string;
}

const problems: ProblemData[] = [
  {
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'HashTable',
    tags: JSON.stringify(['Array', 'Hash Table']),
    description: `## Two Sum

Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to* \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: JSON.stringify([
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9, return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
      { input: 'nums = [3,3], target = 6', output: '[0,1]' },
    ]),
    constraints: `- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
    solution: `function solution(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    solution_explanation: `## Hash Map â€” One Pass

For each element, compute \`complement = target - nums[i]\`. If the complement already exists in the map, we found our answer. Otherwise store the current value â†’ index.

**Time:** O(n) â€” single pass  
**Space:** O(n) â€” hash map storage`,
    test_cases: JSON.stringify([
      { input: [[2, 7, 11, 15], 9], expected_output: [0, 1] },
      { input: [[3, 2, 4], 6], expected_output: [1, 2] },
      { input: [[3, 3], 6], expected_output: [0, 1] },
      { input: [[-1, -2, -3, -4, -5], -8], expected_output: [2, 4] },
      { input: [[0, 4, 3, 0], 0], expected_output: [0, 3] },
    ]),
  },
  {
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    category: 'Stack',
    tags: JSON.stringify(['String', 'Stack']),
    description: `## Valid Parentheses

Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: JSON.stringify([
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
      { input: 's = "([)]"', output: 'false' },
    ]),
    constraints: `- 1 <= s.length <= 10^4
- s consists of parentheses only '()[]{}'.`,
    solution: `function solution(s) {
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
}`,
    solution_explanation: `## Stack

Push opening brackets onto a stack. When a closing bracket appears, pop the top and check it matches. At the end, the stack must be empty.

**Time:** O(n)  
**Space:** O(n)`,
    test_cases: JSON.stringify([
      { input: ['()'], expected_output: true },
      { input: ['()[]{}'], expected_output: true },
      { input: ['(]'], expected_output: false },
      { input: ['([)]'], expected_output: false },
      { input: ['{[]}'], expected_output: true },
      { input: [')'], expected_output: false },
    ]),
  },
  {
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    category: 'LinkedList',
    tags: JSON.stringify(['Linked List', 'Recursion']),
    description: `## Merge Two Sorted Lists

You are given two sorted arrays \`list1\` and \`list2\`. Merge them into one **sorted** array and return it.

> For this problem, linked lists are represented as arrays.`,
    examples: JSON.stringify([
      { input: 'list1 = [1,2,4], list2 = [1,3,4]', output: '[1,1,2,3,4,4]' },
      { input: 'list1 = [], list2 = []', output: '[]' },
      { input: 'list1 = [], list2 = [0]', output: '[0]' },
    ]),
    constraints: `- 0 <= list1.length, list2.length <= 50
- -100 <= list1[i], list2[i] <= 100
- Both lists are sorted in non-decreasing order.`,
    solution: `function solution(list1, list2) {
  const result = [];
  let i = 0, j = 0;
  while (i < list1.length && j < list2.length) {
    if (list1[i] <= list2[j]) result.push(list1[i++]);
    else result.push(list2[j++]);
  }
  while (i < list1.length) result.push(list1[i++]);
  while (j < list2.length) result.push(list2[j++]);
  return result;
}`,
    solution_explanation: `## Two Pointers

Maintain two pointers, one per list. Always pick the smaller element and advance that pointer. Append any remaining elements after one list is exhausted.

**Time:** O(m + n)  
**Space:** O(m + n)`,
    test_cases: JSON.stringify([
      { input: [[1, 2, 4], [1, 3, 4]], expected_output: [1, 1, 2, 3, 4, 4] },
      { input: [[], []], expected_output: [] },
      { input: [[], [0]], expected_output: [0] },
      { input: [[-10, 0, 3], [-5, -1, 5, 10]], expected_output: [-10, -5, -1, 0, 3, 5, 10] },
    ]),
  },
  {
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    category: 'DynamicProgramming',
    tags: JSON.stringify(['Array', 'Dynamic Programming', 'Divide and Conquer']),
    description: `## Maximum Subarray

Given an integer array \`nums\`, find the **subarray** with the largest sum, and return *its sum*.`,
    examples: JSON.stringify([
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: 'nums = [1]', output: '1' },
      { input: 'nums = [5,4,-1,7,8]', output: '23' },
    ]),
    constraints: `- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4`,
    solution: `function solution(nums) {
  let maxSum = nums[0];
  let currentSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}`,
    solution_explanation: `## Kadane's Algorithm

Track a running \`currentSum\`. At each element, decide: start a new subarray here (\`nums[i]\`) or extend the previous one (\`currentSum + nums[i]\`). Keep the global maximum.

**Time:** O(n)  
**Space:** O(1)`,
    test_cases: JSON.stringify([
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected_output: 6 },
      { input: [[1]], expected_output: 1 },
      { input: [[5, 4, -1, 7, 8]], expected_output: 23 },
      { input: [[-1]], expected_output: -1 },
      { input: [[-2, -1]], expected_output: -1 },
    ]),
  },
  {
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'Medium',
    category: 'Tree',
    tags: JSON.stringify(['Tree', 'BFS', 'Binary Tree']),
    description: `## Binary Tree Level Order Traversal

Given a binary tree (represented as an array where index \`i\` has children at \`2*i+1\` and \`2*i+2\`, \`null\` = missing node), return the level order traversal of its nodes' values â€” an array of arrays, each inner array being one level from left to right.`,
    examples: JSON.stringify([
      { input: 'root = [3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]' },
      { input: 'root = [1]', output: '[[1]]' },
      { input: 'root = []', output: '[]' },
    ]),
    constraints: `- 0 <= number of nodes <= 2000
- -1000 <= Node.val <= 1000`,
    solution: `function solution(root) {
  if (!root || root.length === 0) return [];
  const nodes = root.map(v => v !== null ? { val: v, left: null, right: null } : null);
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]) {
      if (2*i+1 < nodes.length) nodes[i].left  = nodes[2*i+1];
      if (2*i+2 < nodes.length) nodes[i].right = nodes[2*i+2];
    }
  }
  const result = [];
  const queue = [nodes[0]];
  while (queue.length > 0) {
    const size = queue.length;
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (node) {
        level.push(node.val);
        if (node.left)  queue.push(node.left);
        if (node.right) queue.push(node.right);
      }
    }
    if (level.length > 0) result.push(level);
  }
  return result;
}`,
    solution_explanation: `## BFS with Queue

Build the tree from the array representation, then use a queue. Each iteration, process exactly \`queue.length\` nodes (the current level), collect their values, and enqueue their children.

**Time:** O(n)  
**Space:** O(n)`,
    test_cases: JSON.stringify([
      { input: [[3, 9, 20, null, null, 15, 7]], expected_output: [[3], [9, 20], [15, 7]] },
      { input: [[1]], expected_output: [[1]] },
      { input: [[]], expected_output: [] },
      { input: [[1, 2, 3, 4, 5]], expected_output: [[1], [2, 3], [4, 5]] },
    ]),
  },
];

export function seedDb(db: DatabaseSync): void {
  // 1. Seed default categories (idempotent)
  const insertCat = db.prepare(
    'INSERT OR IGNORE INTO categories (name, color, is_default) VALUES (?, ?, 0)'
  );
  db.exec('BEGIN');
  try {
    for (const cat of DEFAULT_CATEGORIES) {
      insertCat.run(cat.name, cat.color);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  // 2. Seed problems only if table is empty
  const row = db.prepare('SELECT COUNT(*) as c FROM problems').get() as { c: number };
  if (row.c > 0) return;

  const cats = db.prepare('SELECT id, name FROM categories').all() as Array<{ id: number; name: string }>;
  const catMap = new Map(cats.map(c => [c.name, c.id]));

  const insert = db.prepare(`
    INSERT INTO problems
      (title, difficulty, category_id, tags, description, examples, constraints, solution, solution_explanation, test_cases)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const p of problems) {
      const categoryId = catMap.get(p.category);
      if (!categoryId) throw new Error(`Unknown category during seed: ${p.category}`);
      insert.run(
        p.title, p.difficulty, categoryId, p.tags,
        p.description, p.examples, p.constraints,
        p.solution, p.solution_explanation, p.test_cases
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log(`Seeded ${problems.length} problems into the database.`);
}
