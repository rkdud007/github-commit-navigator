const messageElement = document.createElement("div");
messageElement.id = "extension-message";
messageElement.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background-color: #21262d;
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-weight: bold;
  z-index: 9999;
  display: none;
  transition: opacity 0.3s ease-in-out;
`;
document.body.appendChild(messageElement);

// Function to show message
function showMessage(message, duration = 5000) {
  messageElement.textContent = message;
  messageElement.style.display = "block";
  messageElement.style.opacity = "1";
  setTimeout(() => {
    messageElement.style.opacity = "0";
    setTimeout(() => {
      messageElement.style.display = "none";
    }, 300);
  }, duration);
}

// Function to parse GitHub URL
function parseGitHubUrl() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const owner = pathParts[0];
  const repo = pathParts[1];
  const isRepoRoot = pathParts.length === 2;
  const commitHash = pathParts.find((part) => part.length === 40);
  const viewType = pathParts.includes("blob") ? "blob" : "tree";
  const commitOrBranchIndex = isRepoRoot
    ? -1
    : pathParts.findIndex((part) => part === "tree" || part === "blob") + 1;
  const commitOrBranch = isRepoRoot ? null : pathParts[commitOrBranchIndex];
  const prePath = isRepoRoot
    ? `${owner}/${repo}`
    : pathParts.slice(0, commitOrBranchIndex).join("/");
  const postPath = isRepoRoot
    ? ""
    : pathParts.slice(commitOrBranchIndex + 1).join("/");
  return {
    owner,
    repo,
    commitHash,
    commitOrBranch,
    viewType,
    prePath,
    postPath,
    isRepoRoot,
  };
}

// Event listener for key presses
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowRight") {
    showMessage("→ : Navigating to next commit");
    navigateCommit("next");
  } else if (e.key === "ArrowLeft") {
    showMessage("← : Navigating to previous commit");
    navigateCommit("previous");
  }
});

// Function to navigate commits
async function navigateCommit(direction) {
  const {
    owner,
    repo,
    commitHash,
    commitOrBranch,
    viewType,
    prePath,
    postPath,
    isRepoRoot,
  } = parseGitHubUrl();

  try {
    let currentCommitHash = commitHash;
    if (!currentCommitHash) {
      // If we don't have a commit hash, fetch the latest commit for the branch or default branch
      currentCommitHash = await fetchLatestCommit(
        owner,
        repo,
        commitOrBranch || "HEAD",
      );
      if (!currentCommitHash) {
        showMessage("Unable to fetch the latest commit");
        return;
      }
    }

    const commits = await fetchCommits(owner, repo);
    const currentIndex = commits.findIndex(
      (commit) => commit.sha === currentCommitHash,
    );

    if (currentIndex === -1) {
      showMessage("Current commit not found in recent history");
      return;
    }

    const newIndex = direction === "next" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= commits.length) {
      showMessage(`No ${direction} commit available`);
      return;
    }

    const newCommit = commits[newIndex];
    let newUrl;
    if (isRepoRoot) {
      newUrl = `https://github.com/${prePath}/tree/${newCommit.sha}`;
    } else {
      newUrl = `https://github.com/${prePath}/${newCommit.sha}/${postPath}`;
    }

    // Save current scroll position
    const scrollPosition = window.scrollY;

    // Navigate to new URL
    window.location.href = newUrl;

    // Save scroll position to session storage
    sessionStorage.setItem("scrollPosition", scrollPosition);
  } catch (error) {
    console.error("Error navigating commits:", error);
    showMessage("Error navigating commits. Check console for details.");
  }
}

// Function to fetch recent commits using GitHub API
async function fetchCommits(owner, repo) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status}`);
  }
  return await response.json();
}

// Function to fetch the latest commit for a branch
async function fetchLatestCommit(owner, repo, branch) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    console.error(`Failed to fetch latest commit: ${response.status}`);
    return null;
  }
  const data = await response.json();
  return data.sha;
}

// Function to restore scroll position
function restoreScrollPosition() {
  const savedScrollPosition = sessionStorage.getItem("scrollPosition");
  if (savedScrollPosition !== null) {
    window.scrollTo(0, parseInt(savedScrollPosition));
    sessionStorage.removeItem("scrollPosition");
  }
}

// Restore scroll position after page load
window.addEventListener("load", restoreScrollPosition);

// Listen for URL changes (for single-page app navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    restoreScrollPosition();
  }
}).observe(document, { subtree: true, childList: true });

console.log("GitHub Commit Navigator Extension loaded");
