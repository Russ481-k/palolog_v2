export function parseWhereClause(whereClause) {
  let currentIndex = 0;
  function parseCondition() {
    skipWhitespace();
    if (whereClause[currentIndex] === '(') {
      currentIndex++;
      const node = parseExpression();
      skipWhitespace();
      if (whereClause[currentIndex] !== ')') {
        throw new Error(
          `Expected closing parenthesis at position ${currentIndex}`
        );
      }
      currentIndex++;
      return node;
    }
    const field = parseField();
    const operator = parseOperator();
    skipWhitespace();
    if (whereClause[currentIndex] !== "'") {
      throw new Error(`Expected quote at position ${currentIndex}`);
    }
    const value = parseValue();
    return {
      type: 'condition',
      value: { field, operator, value },
    };
  }
  function parseExpression() {
    let left = parseCondition();
    while (currentIndex < whereClause.length) {
      skipWhitespace();
      if (currentIndex >= whereClause.length) break;
      if (whereClause[currentIndex] === ')') break;
      const nextOp = whereClause.substring(currentIndex, currentIndex + 3);
      if (nextOp === 'AND' || nextOp.substring(0, 2) === 'OR') {
        const operator = nextOp === 'AND' ? 'AND' : 'OR';
        currentIndex += operator === 'AND' ? 3 : 2;
        skipWhitespace();
        const right = parseCondition();
        left = {
          type: 'operator',
          value: operator,
          left,
          right,
        };
      } else {
        break;
      }
    }
    return left;
  }
  function parseValue() {
    let value = '';
    currentIndex++; // Skip first quote
    while (
      currentIndex < whereClause.length &&
      whereClause[currentIndex] !== "'"
    ) {
      value += whereClause[currentIndex];
      currentIndex++;
    }
    currentIndex++; // Skip last quote
    return value;
  }
  function skipWhitespace() {
    while (
      currentIndex < whereClause.length &&
      whereClause[currentIndex] === ' '
    ) {
      currentIndex++;
    }
  }
  function parseField() {
    var _a;
    let field = '';
    skipWhitespace();
    while (
      currentIndex < whereClause.length &&
      !/[\s=!]/.test(
        (_a = whereClause[currentIndex]) !== null && _a !== void 0 ? _a : ''
      )
    ) {
      field += whereClause[currentIndex];
      currentIndex++;
    }
    return field;
  }
  function parseOperator() {
    skipWhitespace();
    if (
      whereClause[currentIndex] === '!' &&
      whereClause[currentIndex + 1] === '='
    ) {
      currentIndex += 2;
      return '!=';
    } else if (whereClause[currentIndex] === '=') {
      currentIndex++;
      return '=';
    }
    throw new Error(`Invalid operator at position ${currentIndex}`);
  }
  return parseExpression();
}
export function buildOpenSearchQuery(node) {
  function buildQuery(node) {
    if (node.type === 'condition') {
      const condition = node.value;
      if (condition.operator === '=') {
        return { match: { [condition.field]: condition.value } };
      } else {
        return {
          bool: {
            must_not: [{ match: { [condition.field]: condition.value } }],
          },
        };
      }
    } else {
      const operator = node.value;
      const left = buildQuery(node.left);
      const right = buildQuery(node.right);
      return {
        bool: Object.assign(
          { [operator === 'AND' ? 'must' : 'should']: [left, right] },
          operator === 'OR' ? { minimum_should_match: 1 } : {}
        ),
      };
    }
  }
  return [buildQuery(node)];
}
