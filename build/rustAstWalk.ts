// Minimal AST walker for acorn nodes (no external deps).
// Provides simple and recursive traversal compatible with the rust transpiler.

type Node = {
    type: string;
    [key: string]: any;
};

type Visitor<TState> = (node: Node, state: TState, c: (child: Node, state: TState) => void) => void;
type Visitors<TState> = Record<string, Visitor<TState>>;

function isNode(x: any): x is Node {
    return x && typeof x === 'object' && typeof x.type === 'string';
}

function baseWalker<TState>(node: Node, state: TState, c: (child: Node, state: TState) => void) {
    for (const key of Object.keys(node)) {
        const value = (node as any)[key];
        if (!value) continue;
        if (Array.isArray(value)) {
            for (const el of value) {
                if (isNode(el)) c(el, state);
            }
        } else if (isNode(value)) {
            c(value, state);
        }
    }
}

export function walkRecursive<TState>(node: Node, state: TState, visitors: Visitors<TState>) {
    const visit = (n: Node, s: TState) => {
        const handler = visitors[n.type];
        if (handler) {
            handler(n, s, visit);
        } else {
            baseWalker(n, s, visit);
        }
    };
    visit(node, state);
}

export function walkSimple<TState>(node: Node, visitors: Record<string, (node: Node) => void>) {
    const visit = (n: Node) => {
        const handler = visitors[n.type];
        if (handler) handler(n);
        baseWalker(n, undefined as unknown as TState, (child) => visit(child));
    };
    visit(node);
}
