({ value, n }, state) => __awaiter(void 0, void 0, void 0, function* () {
            const fs = require('fs');
            const pathModule = require('path');
            const cwd = process.cwd();
            const explore = (dir, depth) => {
                dir = pathModule.join(cwd, dir || '');
                if (depth < 0)
                    return null;
                const directoryTree = { path: dir, children: [] };
                try {
                    const fsd = fs.readdirSync(dir, { withFileTypes: true });
                    fsd.forEach((dirent) => {
                        const fullPath = pathModule.join(dir, dirent.name); // Use pathModule instead of path
                        // ignore node_modules and .git directories
                        if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git'))
                            return;
                        if (dirent.isDirectory()) {
                            directoryTree.children.push(explore(fullPath, depth - 1));
                        }
                        else {
                            directoryTree.children.push({ path: fullPath });
                        }
                    });
                }
                catch (e) {
                    return e.message;
                }
                return directoryTree;
            };
            return explore(value, n);
        })