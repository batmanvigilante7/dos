export interface GitCommit {
  hash: string;
  parents: string[];
  message: string;
  files: Record<string, string>; // filepath -> content
  author: string;
  timestamp: number;
}

export interface VirtualFile {
  name: string;
  content: string;
}

export interface VirtualDirectory {
  name: string;
  files: Record<string, VirtualFile>;
  dirs: Record<string, VirtualDirectory>;
}

export class GitEngine {
  // Virtual Filesystem State
  root: VirtualDirectory = { name: "root", files: {}, dirs: {} };
  currentPath: string[] = []; // relative to root
  
  // Git Repo State
  isGitRepo: boolean = false;
  stagingArea: Record<string, string> = {}; // filepath -> content
  commits: Record<string, GitCommit> = {}; // hash -> Commit
  branches: Record<string, string> = {}; // branchName -> commitHash
  currentBranch: string = "main";
  headCommitHash: string | null = null;
  remoteCommits: Record<string, GitCommit> = {}; // simulated remote repo commits
  
  // Console logs
  terminalLogs: string[] = [];
  
  constructor() {
    this.resetFileSystem();
  }

  resetFileSystem() {
    this.root = { name: "root", files: {}, dirs: {} };
    this.currentPath = [];
    this.isGitRepo = false;
    this.stagingArea = {};
    this.commits = {};
    this.branches = {};
    this.currentBranch = "main";
    this.headCommitHash = null;
    this.remoteCommits = {};
    this.terminalLogs = ["Welcome to DOS Virtual Git Terminal. Type help for commands."];
  }

  // Get current directory reference
  getDir(path: string[]): VirtualDirectory | null {
    let curr = this.root;
    for (const name of path) {
      if (curr.dirs[name]) {
        curr = curr.dirs[name];
      } else {
        return null;
      }
    }
    return curr;
  }

  // Helper to resolve relative path
  resolvePath(relPath: string): string[] | null {
    if (!relPath) return [...this.currentPath];
    const parts = relPath.split("/").filter(Boolean);
    const result = relPath.startsWith("/") ? [] : [...this.currentPath];
    
    for (const part of parts) {
      if (part === ".") {
        continue;
      } else if (part === "..") {
        if (result.length > 0) result.pop();
      } else {
        result.push(part);
      }
    }
    return result;
  }

  // Recursive file lister for working tree status
  getAllFiles(dir: VirtualDirectory, prefix = ""): Record<string, string> {
    const list: Record<string, string> = {};
    for (const [name, file] of Object.entries(dir.files)) {
      list[prefix + name] = file.content;
    }
    for (const [name, sub] of Object.entries(dir.dirs)) {
      Object.assign(list, this.getAllFiles(sub, prefix + name + "/"));
    }
    return list;
  }

  // Run command line parser
  execute(commandLine: string): string {
    const parts = commandLine.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    
    if (!cmd) return "";

    let output = "";
    
    switch (cmd) {
      case "help":
        output = "Available commands:\n  mkdir [dir]\n  touch [file]\n  rm [file]\n  mv [src] [dest]\n  ls\n  cd [dir]\n  pwd\n  git init\n  git add [file]\n  git status\n  git commit -m \"[msg]\"\n  git branch [name]\n  git checkout [name]\n  git merge [branch]\n  git log\n  git restore [file]\n  git reset [hash]\n  git push";
        break;
      case "mkdir":
        output = this.mkdir(args[0]);
        break;
      case "touch":
        output = this.touch(args[0], args.slice(1).join(" ") || "Default file content.");
        break;
      case "rm":
        output = this.rm(args[0]);
        break;
      case "mv":
        output = this.mv(args[0], args[1]);
        break;
      case "ls":
        output = this.ls();
        break;
      case "cd":
        output = this.cd(args[0]);
        break;
      case "pwd":
        output = "/" + this.currentPath.join("/");
        break;
      case "git":
        output = this.executeGit(args);
        break;
      default:
        output = `command not found: ${cmd}`;
    }

    this.terminalLogs.push(`$ ${commandLine}`, output);
    return output;
  }

  // Mkdir
  mkdir(name: string): string {
    if (!name) return "mkdir: missing operand";
    const dir = this.getDir(this.currentPath);
    if (!dir) return "mkdir: path resolution failed";
    if (dir.dirs[name] || dir.files[name]) return `mkdir: cannot create directory '${name}': File exists`;
    dir.dirs[name] = { name, files: {}, dirs: {} };
    return "";
  }

  // Touch
  touch(name: string, content = ""): string {
    if (!name) return "touch: missing file operand";
    const dir = this.getDir(this.currentPath);
    if (!dir) return "touch: path resolution failed";
    if (dir.dirs[name]) return `touch: '${name}' is a directory`;
    dir.files[name] = { name, content };
    return "";
  }

  // Rm
  rm(name: string): string {
    if (!name) return "rm: missing operand";
    const dir = this.getDir(this.currentPath);
    if (!dir) return "rm: path resolution failed";
    if (dir.files[name]) {
      delete dir.files[name];
      // remove from staging too
      const relPath = [...this.currentPath, name].join("/");
      delete this.stagingArea[relPath];
      return "";
    }
    if (dir.dirs[name]) {
      delete dir.dirs[name];
      return "";
    }
    return `rm: cannot remove '${name}': No such file or directory`;
  }

  // Mv
  mv(src: string, dest: string): string {
    if (!src || !dest) return "mv: missing operand";
    const dir = this.getDir(this.currentPath);
    if (!dir) return "mv: path resolution failed";
    if (!dir.files[src] && !dir.dirs[src]) return `mv: cannot stat '${src}': No such file or directory`;
    
    if (dir.files[src]) {
      const file = dir.files[src];
      dir.files[dest] = { name: dest, content: file.content };
      delete dir.files[src];
    } else {
      const sub = dir.dirs[src];
      dir.dirs[dest] = { ...sub, name: dest };
      delete dir.dirs[src];
    }
    return "";
  }

  // Ls
  ls(): string {
    const dir = this.getDir(this.currentPath);
    if (!dir) return "ls: path resolution failed";
    const items = [...Object.keys(dir.dirs).map(d => d + "/"), ...Object.keys(dir.files)];
    return items.length ? items.join("   ") : "(empty directory)";
  }

  // Cd
  cd(path: string): string {
    if (!path) {
      this.currentPath = [];
      return "";
    }
    const resolved = this.resolvePath(path);
    if (!resolved) return `cd: ${path}: No such file or directory`;
    const targetDir = this.getDir(resolved);
    if (!targetDir) return `cd: ${path}: No such file or directory`;
    this.currentPath = resolved;
    return "";
  }

  // Git parser
  executeGit(args: string[]): string {
    const cmd = args[0];
    const subArgs = args.slice(1);
    
    if (!cmd) return "usage: git <command>";

    if (cmd === "init") {
      if (this.isGitRepo) return "Reinitialized existing Git repository.";
      this.isGitRepo = true;
      this.currentBranch = "main";
      this.branches = {};
      this.commits = {};
      this.stagingArea = {};
      this.headCommitHash = null;
      return "Initialized empty Git repository.";
    }

    if (!this.isGitRepo) {
      return "fatal: not a git repository (or any of the parent directories): .git";
    }

    switch (cmd) {
      case "status":
        return this.gitStatus();
      case "add":
        return this.gitAdd(subArgs[0]);
      case "commit":
        // check for message option -m
        let msg = "Auto-commit";
        const mIdx = subArgs.indexOf("-m");
        if (mIdx !== -1 && subArgs[mIdx + 1]) {
          msg = subArgs[mIdx + 1].replace(/^["']|["']$/g, '');
        }
        return this.gitCommit(msg);
      case "branch":
        return this.gitBranch(subArgs[0]);
      case "checkout":
        return this.gitCheckout(subArgs[0]);
      case "merge":
        return this.gitMerge(subArgs[0]);
      case "log":
        return this.gitLog();
      case "restore":
        return this.gitRestore(subArgs[0]);
      case "reset":
        return this.gitReset(subArgs[0]);
      case "push":
        return this.gitPush();
      default:
        return `git command not supported: ${cmd}`;
    }
  }

  // Git Add
  gitAdd(filename: string): string {
    if (!filename) return "Nothing specified, nothing added.";
    const workingFiles = this.getAllFiles(this.root);
    
    if (filename === ".") {
      let count = 0;
      for (const [path, content] of Object.entries(workingFiles)) {
        this.stagingArea[path] = content;
        count++;
      }
      return `Staged ${count} files.`;
    }

    const resolved = this.resolvePath(filename);
    if (!resolved) return `fatal: pathspec '${filename}' did not match any files`;
    const relPath = resolved.join("/");
    
    if (workingFiles[relPath] !== undefined) {
      this.stagingArea[relPath] = workingFiles[relPath];
      return `Staged file '${filename}'.`;
    }
    
    return `fatal: pathspec '${filename}' did not match any files`;
  }

  // Git Status
  gitStatus(): string {
    const workingFiles = this.getAllFiles(this.root);
    const headCommit = this.headCommitHash ? this.commits[this.headCommitHash] : null;
    const baseFiles = headCommit ? headCommit.files : {};
    
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    // Check Staging
    for (const [path, content] of Object.entries(this.stagingArea)) {
      if (baseFiles[path] === undefined) {
        staged.push(`  new file:   ${path}`);
      } else if (baseFiles[path] !== content) {
        staged.push(`  modified:   ${path}`);
      }
    }

    // Check Working Copy modifications/untracked files
    for (const [path, content] of Object.entries(workingFiles)) {
      const isStaged = this.stagingArea[path] !== undefined;
      const isCommitted = baseFiles[path] !== undefined;
      
      if (!isStaged && !isCommitted) {
        untracked.push(`  ${path}`);
      } else if (!isStaged && isCommitted && baseFiles[path] !== content) {
        modified.push(`  modified:   ${path}`);
      } else if (isStaged && this.stagingArea[path] !== content) {
        modified.push(`  modified:   ${path}`);
      }
    }

    // Check for staged deleted files
    for (const path of Object.keys(baseFiles)) {
      if (workingFiles[path] === undefined && this.stagingArea[path] === undefined) {
        // file deleted in working copy and unstaged
        modified.push(`  deleted:    ${path}`);
      }
    }

    let out = `On branch ${this.currentBranch}\n`;
    if (staged.length > 0) {
      out += `Changes to be committed:\n${staged.join("\n")}\n`;
    } else {
      out += "No changes added to commit (use \"git add\")\n";
    }
    
    if (modified.length > 0) {
      out += `Changes not staged for commit:\n${modified.join("\n")}\n`;
    }
    if (untracked.length > 0) {
      out += `Untracked files:\n${untracked.join("\n")}\n`;
    }
    
    return out;
  }

  // Git Commit
  gitCommit(msg: string): string {
    if (Object.keys(this.stagingArea).length === 0) {
      return "nothing to commit, working tree clean";
    }

    const hash = "c" + Math.floor(1000 + Math.random() * 9000);
    const parentHashes = this.headCommitHash ? [this.headCommitHash] : [];
    
    // The commit copies the files from the staging area plus unchanged committed files
    const headCommit = this.headCommitHash ? this.commits[this.headCommitHash] : null;
    const baseFiles = headCommit ? { ...headCommit.files } : {};
    
    const files = { ...baseFiles, ...this.stagingArea };
    
    const commit: GitCommit = {
      hash,
      parents: parentHashes,
      message: msg,
      files,
      author: "DOS Developer <dev@dos.com>",
      timestamp: Date.now()
    };

    this.commits[hash] = commit;
    this.branches[this.currentBranch] = hash;
    this.headCommitHash = hash;
    this.stagingArea = {}; // Clear staging

    return `[${this.currentBranch} ${hash}] ${msg}\n ${Object.keys(files).length} files changed`;
  }

  // Git Branch
  gitBranch(name: string): string {
    if (!name) {
      const list = Object.keys(this.branches).map(b => b === this.currentBranch ? `* ${b}` : `  ${b}`);
      if (list.length === 0) return `* ${this.currentBranch}`;
      return list.join("\n");
    }
    if (this.branches[name]) return `fatal: A branch named '${name}' already exists.`;
    this.branches[name] = this.headCommitHash || "";
    return `Created branch '${name}'`;
  }

  // Git Checkout
  gitCheckout(target: string): string {
    if (!target) return "error: checkout target missing";

    // Checkout files helper
    const checkoutFiles = (files: Record<string, string>) => {
      this.root.files = {};
      this.root.dirs = {};
      for (const [path, content] of Object.entries(files)) {
        const parts = path.split("/");
        let curr = this.root;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!curr.dirs[part]) {
            curr.dirs[part] = { name: part, files: {}, dirs: {} };
          }
          curr = curr.dirs[part];
        }
        curr.files[parts[parts.length - 1]] = { name: parts[parts.length - 1], content };
      }
    };

    if (this.branches[target] !== undefined) {
      this.currentBranch = target;
      const targetHash = this.branches[target];
      this.headCommitHash = targetHash || null;
      if (targetHash) {
        checkoutFiles(this.commits[targetHash].files);
      } else {
        this.root.files = {};
        this.root.dirs = {};
      }
      return `Switched to branch '${target}'`;
    }

    if (this.commits[target]) {
      this.headCommitHash = target;
      checkoutFiles(this.commits[target].files);
      return `Note: switching to '${target}' (detached HEAD)\nHEAD is now at ${target}`;
    }

    return `error: pathspec '${target}' did not match any file(s) known to git`;
  }

  // Git Merge
  gitMerge(branchName: string): string {
    if (!branchName) return "fatal: branch to merge missing";
    const targetHash = this.branches[branchName];
    if (!targetHash) return `merge: branch '${branchName}' not found`;
    
    const headHash = this.headCommitHash;
    if (!headHash) {
      // Fast-forward merge of first commit
      this.branches[this.currentBranch] = targetHash;
      this.headCommitHash = targetHash;
      this.gitCheckout(this.currentBranch);
      return `Fast-forward merged branch '${branchName}'`;
    }

    // Basic fast-forward check: is current commit an ancestor of target commit?
    let isAncestor = false;
    let curr = this.commits[targetHash];
    while (curr) {
      if (curr.parents.includes(headHash)) {
        isAncestor = true;
        break;
      }
      curr = this.commits[curr.parents[0]];
    }

    if (isAncestor) {
      this.branches[this.currentBranch] = targetHash;
      this.headCommitHash = targetHash;
      this.gitCheckout(this.currentBranch);
      return `Fast-forward merged branch '${branchName}'`;
    }

    // Generate merge commit
    const mergeHash = "c" + Math.floor(1000 + Math.random() * 9000);
    const files = { ...this.commits[headHash].files, ...this.commits[targetHash].files };
    
    const mergeCommit: GitCommit = {
      hash: mergeHash,
      parents: [headHash, targetHash],
      message: `Merge branch '${branchName}' into ${this.currentBranch}`,
      files,
      author: "DOS Developer <dev@dos.com>",
      timestamp: Date.now()
    };

    this.commits[mergeHash] = mergeCommit;
    this.branches[this.currentBranch] = mergeHash;
    this.headCommitHash = mergeHash;
    this.gitCheckout(this.currentBranch);

    return `Merge made by the 'ort' strategy.\nMerged ${branchName} into ${this.currentBranch}. commit hash: ${mergeHash}`;
  }

  // Git Log
  gitLog(): string {
    if (!this.headCommitHash) return "fatal: your current branch has no commits yet";
    const log: string[] = [];
    
    let curr: string | null = this.headCommitHash;
    const visited = new Set<string>();
    
    while (curr && !visited.has(curr)) {
      visited.add(curr);
      const commit: GitCommit = this.commits[curr];
      if (!commit) break;

      log.push(`commit ${commit.hash}\nAuthor: ${commit.author}\nDate: ${new Date(commit.timestamp).toLocaleTimeString()}\n\n    ${commit.message}\n`);
      curr = commit.parents[0] || null; // trace first parent
    }
    return log.join("\n");
  }

  // Git Restore
  gitRestore(filename: string): string {
    if (!filename) return "error: restore target required";
    const headCommit = this.headCommitHash ? this.commits[this.headCommitHash] : null;
    const baseFiles = headCommit ? headCommit.files : {};
    
    const resolved = this.resolvePath(filename);
    if (!resolved) return `error: pathspec '${filename}' did not match any files`;
    const relPath = resolved.join("/");

    if (baseFiles[relPath] !== undefined) {
      // Restore file content in working copy
      const content = baseFiles[relPath];
      const dir = this.getDir(resolved.slice(0, -1));
      if (dir) {
        dir.files[resolved[resolved.length - 1]] = { name: resolved[resolved.length - 1], content };
        return `Restored '${filename}' from latest commit.`;
      }
    }
    return `error: pathspec '${filename}' not found in HEAD`;
  }

  // Git Reset
  gitReset(hash: string): string {
    if (!hash) return "fatal: commit hash required for reset";
    if (!this.commits[hash]) return `fatal: commit '${hash}' not found`;
    this.headCommitHash = hash;
    this.branches[this.currentBranch] = hash;
    this.gitCheckout(this.currentBranch);
    return `HEAD is now at commit ${hash}`;
  }

  // Git Push (simulates remote push)
  gitPush(): string {
    if (!this.headCommitHash) return "Everything up-to-date";
    // Sync all local commits to remoteCommits mock database
    Object.assign(this.remoteCommits, this.commits);
    return `Pushed commits to remote (origin/${this.currentBranch})`;
  }
}
