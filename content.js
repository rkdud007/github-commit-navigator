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
  const commitHash = pathParts.find((part) => part.length === 40);
  const viewType = pathParts.includes("blob") ? "blob" : "tree";

  const commitIndex = pathParts.indexOf(commitHash);
  const prePath = pathParts.slice(0, commitIndex).join("/");
  const postPath = pathParts.slice(commitIndex + 1).join("/");

  return { owner, repo, commitHash, viewType, prePath, postPath };
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
  const { owner, repo, commitHash, viewType, prePath, postPath } =
    parseGitHubUrl();

  try {
    const commits = await fetchCommits(owner, repo);
    const currentIndex = commits.findIndex(
      (commit) => commit.sha === commitHash,
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
    const newUrl = `https://github.com/${prePath}/${newCommit.sha}/${postPath}`;

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
