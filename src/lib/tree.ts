import type { GitHubFile } from './types';

export interface TreeNode {
  name: string;
  path: string;
  type: 'tree' | 'blob';
  children: TreeNode[];
}

export function buildTree(files: GitHubFile[] | undefined): TreeNode[] {
    if (!files) return [];
    const tree: TreeNode = { name: 'root', path: '', type: 'tree', children: [] };
    const map: { [key: string]: TreeNode } = { '': tree };

    files.forEach(file => {
        if (!file.path) return;
        const parts = file.path.split('/');
        parts.reduce((parentPath, part, index) => {
            const currentPath = parentPath ? `${parentPath}/${part}` : part;
            if (!map[currentPath]) {
                const parentNode = map[parentPath];
                const newNode: TreeNode = {
                    name: part,
                    path: currentPath,
                    type: index === parts.length - 1 ? file.type : 'tree',
                    children: [],
                };
                parentNode.children.push(newNode);
                map[currentPath] = newNode;
            }
            return currentPath;
        }, '');
    });

    Object.values(map).forEach(node => {
        if (node.children) {
            node.children.sort((a, b) => {
                if (a.type === 'tree' && b.type === 'blob') return -1;
                if (a.type === 'blob' && b.type === 'tree') return 1;
                return a.name.localeCompare(b.name);
            });
        }
    });

    return tree.children;
}

export function getFilePaths(files: GitHubFile[] | undefined): string[] {
    if (!files) return [];
    return files.map(file => file.path).filter(path => !!path);
}
