// Reddit Inline Comments - Content Script
// Adds inline comment viewing to Reddit's home feed

const CONFIG = {
    MAX_ROOT_COMMENTS: 5,
    MAX_REPLY_DEPTH: 2,
    MAX_REPLIES_PER_LEVEL: 3,
    START_COLLAPSED: true
};

// ============== Cookie/CSRF Helpers ==============
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function getCsrfToken() {
    return getCookie('csrf_token') || '';
}

// ============== Voting API ==============
async function vote(thingId, voteState) {
    const csrf = getCsrfToken();
    if (!csrf) return false;

    const isComment = thingId.startsWith('t1_');
    const operation = isComment ? 'UpdateCommentVoteState' : 'UpdatePostVoteState';
    const inputKey = isComment ? 'commentId' : 'postId';

    try {
        const response = await fetch('https://www.reddit.com/svc/shreddit/graphql', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                operation: operation,
                variables: {
                    input: {
                        [inputKey]: thingId,
                        voteState: voteState
                    }
                },
                csrf_token: csrf
            })
        });
        return response.ok;
    } catch (err) {
        console.error('RIC: Vote failed:', err);
        return false;
    }
}

// ============== Theme & Utility ==============
function isDarkTheme() {
    return document.documentElement.classList.contains('theme-dark') ||
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('theme-dark');
}

function getThemeClass() {
    return isDarkTheme() ? 'ric-dark' : 'ric-light';
}

function timeAgo(utc) {
    const diff = Math.floor(Date.now() / 1000 - utc);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

function formatScore(score) {
    if (score >= 1000) return (score / 1000).toFixed(1) + 'k';
    return String(score);
}

function getAvatarColor(author) {
    const colors = ['#FF4500', '#0079D3', '#46D160', '#FFB000', '#DDBDFF', '#FF8717'];
    let hash = 0;
    for (let i = 0; i < author.length; i++) hash = author.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// ============== ICONS (High Fidelity from Shreddit Reference) ==============
const ICONS = {
    upvote: `<svg fill="currentColor" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M10 19a3.966 3.966 0 01-3.96-3.962V10.98H2.838a1.731 1.731 0 01-1.605-1.073 1.734 1.734 0 01.377-1.895L9.364.254a.925.925 0 011.272 0l7.754 7.759c.498.499.646 1.242.376 1.894-.27.652-.9 1.073-1.605 1.073h-3.202v4.058A3.965 3.965 0 019.999 19H10zM2.989 9.179H7.84v5.731c0 1.13.81 2.163 1.934 2.278a2.163 2.163 0 002.386-2.15V9.179h4.851L10 2.163 2.989 9.179z"/></svg>`,
    downvote: `<svg fill="currentColor" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M10 1a3.966 3.966 0 013.96 3.962V9.02h3.202c.706 0 1.335.42 1.605 1.073.27.652.122 1.396-.377 1.895l-7.754 7.759a.925.925 0 01-1.272 0l-7.754-7.76a1.734 1.734 0 01-.376-1.894c.27-.652.9-1.073 1.605-1.073h3.202V4.962A3.965 3.965 0 0110 1zm7.01 9.82h-4.85V5.09c0-1.13-.81-2.163-1.934-2.278a2.163 2.163 0 00-2.386 2.15v5.859H2.989l7.01 7.016 7.012-7.016z"/></svg>`,
    expand: `<svg fill="currentColor" height="16" viewBox="0 0 20 20" width="16"><path d="M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM1 10a9 9 0 1118 0 9 9 0 01-18 0zm9-3a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 110-2h1V8a1 1 0 011-1z"/></svg>`,
    collapse: `<svg fill="currentColor" height="16" viewBox="0 0 20 20" width="16"><path d="M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM1 10a9 9 0 1118 0 9 9 0 01-18 0zm5 0a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z"/></svg>`,
    comment: `<svg fill="currentColor" height="16" viewBox="0 0 20 20" width="16"><path d="M10 1a9 9 0 00-9 9c0 1.9.8 3.6 1.9 5L.2 17.7c-.3.3-.2.8.1 1 .1.1.3.2.5.2H10a9 9 0 009-9 9 9 0 00-9-9zm0 16.2H6.2c-1 0-1.9.1-3 .1l-.1-.2c.8-.7 1.6-1.4 2.3-2.1l-1-1.3C3.3 12.6 2.8 11.3 2.8 10c0-4 3.2-7.2 7.2-7.2s7.2 3.2 7.2 7.2-3.2 7.2-7.2 7.2z"/></svg>`
};

// ============== UI Components ==============
function createVoteButtons(commentData, thingId) {
    const container = document.createElement('div');
    container.className = 'ric-votes';

    let currentVote = 'NONE';
    let displayScore = commentData.score || 0;

    const upBtn = document.createElement('button');
    upBtn.className = 'ric-vote-btn ric-upvote';
    upBtn.innerHTML = ICONS.upvote;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'ric-vote-score';
    scoreSpan.textContent = formatScore(displayScore);

    const downBtn = document.createElement('button');
    downBtn.className = 'ric-vote-btn ric-downvote';
    downBtn.innerHTML = ICONS.downvote;

    const updateUI = () => {
        upBtn.classList.toggle('ric-voted-up', currentVote === 'UP');
        downBtn.classList.toggle('ric-voted-down', currentVote === 'DOWN');
        scoreSpan.textContent = formatScore(displayScore);
    };

    upBtn.onclick = async (e) => {
        e.stopPropagation();
        const old = currentVote;
        if (currentVote === 'UP') { currentVote = 'NONE'; displayScore--; }
        else { if (currentVote === 'DOWN') displayScore++; currentVote = 'UP'; displayScore++; }
        updateUI();
        if (!(await vote(thingId, currentVote))) { currentVote = old; updateUI(); }
    };

    downBtn.onclick = async (e) => {
        e.stopPropagation();
        const old = currentVote;
        if (currentVote === 'DOWN') { currentVote = 'NONE'; displayScore++; }
        else { if (currentVote === 'UP') displayScore--; currentVote = 'DOWN'; displayScore--; }
        updateUI();
        if (!(await vote(thingId, currentVote))) { currentVote = old; updateUI(); }
    };

    container.append(upBtn, scoreSpan, downBtn);
    return container;
}

function renderLoadingState() {
    const c = document.createElement('div');
    c.className = `ric-container ric-loading ${getThemeClass()}`;
    c.innerHTML = `<div class="ric-spinner"></div><span>Loading comments...</span>`;
    return c;
}

function renderErrorState(retry) {
    const c = document.createElement('div');
    c.className = `ric-container ric-error ${getThemeClass()}`;
    c.innerHTML = `<span>Failed to load comments</span><button class="ric-retry-btn">Retry</button>`;
    c.querySelector('.ric-retry-btn').onclick = (e) => { e.stopPropagation(); retry(); };
    return c;
}

// ============== Comment Rendering ==============
function renderComment(commentData, depth = 0) {
    const author = commentData.author || '[deleted]';
    const body = commentData.body || '';
    const score = commentData.score || 0;
    const created = commentData.created_utc || 0;
    const replies = commentData.replies;
    const isOP = commentData.is_submitter || false;
    const thingId = commentData.name || '';

    const commentEl = document.createElement('div');
    commentEl.className = `ric-comment ric-depth-${Math.min(depth, 4)}`;

    // Avatar
    const avatar = document.createElement('a');
    avatar.className = 'ric-avatar';
    avatar.style.background = getAvatarColor(author);
    avatar.href = `https://www.reddit.com/user/${author}/`;
    avatar.target = '_blank';
    avatar.textContent = author.charAt(0).toUpperCase();
    avatar.onclick = e => e.stopPropagation();

    const content = document.createElement('div');
    content.className = 'ric-comment-content';

    const header = document.createElement('div');
    header.className = 'ric-comment-header';
    header.innerHTML = `
        <a class="ric-author ${isOP ? 'ric-op' : ''}" href="https://www.reddit.com/user/${author}/" target="_blank">${author}</a>
        <span class="ric-time">${timeAgo(created)} ago</span>
    `;
    header.querySelector('a').onclick = e => e.stopPropagation();

    const bodyEl = document.createElement('div');
    bodyEl.className = 'ric-comment-body';
    bodyEl.textContent = body;

    const actionRow = document.createElement('div');
    actionRow.className = 'ric-action-row';
    actionRow.appendChild(createVoteButtons({ score }, thingId));

    content.append(header, bodyEl, actionRow);
    commentEl.append(avatar, content);

    // Replies
    if (replies && replies.data && replies.data.children && depth < CONFIG.MAX_REPLY_DEPTH) {
        const childComments = replies.data.children.filter(c => c.kind === 't1');
        if (childComments.length > 0) {
            const repliesWrapper = document.createElement('div');
            repliesWrapper.className = 'ric-replies-wrapper';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'ric-toggle-thread';
            toggleBtn.innerHTML = CONFIG.START_COLLAPSED ? ICONS.expand : ICONS.collapse;
            const toggleText = document.createElement('span');
            toggleText.textContent = `${childComments.length} ${childComments.length === 1 ? 'reply' : 'replies'}`;
            toggleBtn.appendChild(toggleText);

            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'ric-replies';
            repliesContainer.style.display = CONFIG.START_COLLAPSED ? 'none' : 'block';

            childComments.slice(0, CONFIG.MAX_REPLIES_PER_LEVEL).forEach(child => {
                repliesContainer.appendChild(renderComment(child.data, depth + 1));
            });

            let expanded = !CONFIG.START_COLLAPSED;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                expanded = !expanded;
                repliesContainer.style.display = expanded ? 'block' : 'none';
                toggleBtn.innerHTML = expanded ? ICONS.collapse : ICONS.expand;
                toggleBtn.appendChild(toggleText);
            };

            repliesWrapper.append(toggleBtn, repliesContainer);
            content.appendChild(repliesWrapper);
        }
    }
    return commentEl;
}

function renderCommentsSection(comments, permalink) {
    const container = document.createElement('div');
    container.className = `ric-container ${getThemeClass()}`;

    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="ric-empty">No comments yet</div>';
        return container;
    }

    comments.forEach(c => container.appendChild(renderComment(c.data, 0)));

    const viewAll = document.createElement('a');
    viewAll.className = 'ric-view-all';
    viewAll.href = permalink;
    viewAll.target = '_blank';
    viewAll.innerHTML = `${ICONS.comment} <span>View all comments on Reddit</span>`;
    viewAll.onclick = e => e.stopPropagation();
    container.appendChild(viewAll);

    return container;
}

// ============== Main Logic ==============
function createInlineButton() {
    const btn = document.createElement('button');
    btn.className = 'button border-md flex flex-row justify-center items-center h-xl font-semibold relative text-caption-1 button-secondary inline-flex items-center px-sm ric-button';
    btn.innerHTML = `<span class="flex items-center"><span class="flex me-[6px]">${ICONS.comment}</span><span>Inline</span></span>`;
    btn.setAttribute('data-ric-state', 'closed');
    return btn;
}

function injectCommentButton(post) {
    const root = post.shadowRoot || post;
    const actionRow = root.querySelector('div[data-testid="action-row"]');
    if (!actionRow || actionRow.querySelector('.ric-button')) return;

    const commentLink = post.querySelector('a[href*="/comments/"]');
    if (!commentLink) return;

    const permalink = commentLink.getAttribute('href');
    const button = createInlineButton();

    const shareSlot = actionRow.querySelector('slot[name="share-button"]');
    if (shareSlot) shareSlot.parentNode.insertBefore(button, shareSlot);
    else actionRow.appendChild(button);

    button.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        const state = button.getAttribute('data-ric-state');
        const container = post.parentNode.querySelector('.ric-container');

        if (state === 'open') {
            if (container) container.remove();
            button.setAttribute('data-ric-state', 'closed');
            button.classList.remove('ric-button-active');
            return;
        }

        button.setAttribute('data-ric-state', 'open');
        button.classList.add('ric-button-active');

        const loading = renderLoadingState();
        post.after(loading);

        try {
            const res = await fetch(`https://www.reddit.com${permalink}.json`);
            const json = await res.json();
            loading.remove();

            const comments = json[1].data.children
                .filter(c => c.kind === 't1')
                .slice(0, CONFIG.MAX_ROOT_COMMENTS);

            post.after(renderCommentsSection(comments, permalink));
        } catch (err) {
            loading.remove();
            post.after(renderErrorState(() => button.click()));
        }
    };
}

// ============== Observers ==============
function processAllPosts() {
    document.querySelectorAll('shreddit-post').forEach(post => {
        const root = post.shadowRoot || post;
        if (root.querySelector('div[data-testid="action-row"]')) injectCommentButton(post);
        else {
            const obs = new MutationObserver(() => {
                if (root.querySelector('div[data-testid="action-row"]')) {
                    injectCommentButton(post);
                    obs.disconnect();
                }
            });
            obs.observe(root, { childList: true, subtree: true });
        }
    });
}

const feedObserver = new MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
            if (node.tagName === 'SHREDDIT-POST') processAllPosts();
            else if (node.querySelectorAll) {
                if (node.querySelectorAll('shreddit-post').length) processAllPosts();
            }
        }
    }));
});

feedObserver.observe(document.body, { childList: true, subtree: true });
processAllPosts();
console.log('RIC Loaded');
