const navbarBrand = document.getElementById("navbar-brand");
const divLoading = document.getElementById("loading");
const divProgress = document.getElementById("progress");
const tableBody = document.getElementById("tableBody");
const inputHandle = document.getElementById("inputHandle");

document.getElementById("btnGo").onclick = () => {
  window.location.href = `/masto-metrics/posts.htm?handle=${inputHandle.value}`;
};

let allPosts = [];
let handle;
let maxId;

onLoad();

async function onLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  handle = urlParams.get("handle");

  if (!handle) {
    // handle = "leds.social/@jasoncoon";
    return;
  }

  const title = `${handle} | Profile Details | Mastodon Metrics`;
  document.title = title;
  navbarBrand.innerText = title;

  await loadTable();
}

async function loadTable() {
  divLoading.style.display = "block";
  tableBody.innerHTML = "";

  try {
    divProgress.innerText = `Getting posts for profile ${handle}`;

    if (handle.startsWith("https://")) {
      handle = handle.replace("https://", "");
    }

    handle = handle.trim();

    let [server, username] = handle.split("/");

    if (username.startsWith("@")) username = username.replace("@", "");

    const title = `${username} | Profile Details | Mastodon Metrics`;
    document.title = title;
    navbarBrand.innerText = title;

    const profile = await getProfile(server, username);

    document.getElementById("imgBanner").setAttribute("src", profile.header);
    document.getElementById("imgAvatar").setAttribute("src", profile.avatar);
    document.getElementById("divDisplayName").innerText = profile.display_name;
    document.getElementById("divHandle").innerText = handle;
    document
      .getElementById("divHandle")
      .setAttribute("href", `https://${handle}`);
    document.getElementById("link").innerText = `https://${handle}`;
    document.getElementById("divDescription").innerHTML = profile.note;
    document.getElementById("divCreated").innerText = `Signed up: ${new Date(
      profile.created_at
    ).toLocaleString()}`;
    document.getElementById(
      "divPosts"
    ).innerText = `Posts: ${profile.statuses_count.toLocaleString()}`;
    document.getElementById(
      "divFollows"
    ).innerText = `Following: ${profile.following_count.toLocaleString()}`;
    document.getElementById(
      "divFollowers"
    ).innerText = `Followers: ${profile.followers_count.toLocaleString()}`;

    let maxId;
    while (true) {
      const posts = await getPosts(server, profile.id, maxId);
      allPosts.push(...posts);

      allPosts.sort((a, b) => b.favourites_count - a.favourites_count);
      tableBody.innerHTML = "";
      const newMaxId = loadPosts(allPosts);

      if (!newMaxId || newMaxId >= maxId) break;
      maxId = newMaxId;
      await setTimeout(1_000);
    }
  } catch (error) {
    console.error(error);
  }

  divLoading.style.display = "none";
  divProgress.innerHTML = "";

  // console.log({profiles});
}

function loadPosts(posts) {
  let i = 1;
  let maxId;
  for (const post of posts) {
    const row = tableBody.insertRow();
    let cell;

    cell = row.insertCell();
    cell.innerHTML = i.toLocaleString();

    cell = row.insertCell();
    cell.innerHTML = `<a href="${post.uri}">${new Date(
      post.created_at
    ).toLocaleString()}</a>`;

    cell = row.insertCell();
    cell.innerHTML = post.favourites_count?.toLocaleString();

    cell = row.insertCell();
    cell.innerHTML = post.reblogs_count?.toLocaleString();

    cell = row.insertCell();
    cell.innerHTML = post.content;

    i++;

    if (!maxId || post.id < maxId) maxId = post.id;
  }

  return maxId;
}

async function getProfile(server, username) {
  try {
    let response = await fetch(
      `https://${server}/api/v1/accounts/lookup?acct=${username}`
    );
    const profile = await response.json();
    // console.log({ profile, response });
    return profile;
  } catch (error) {
    console.error("error getting profile: ", error);
  }
}

async function getPosts(server, userId, maxId) {
  try {
    let response = await fetch(
      `https://${server}/api/v1/accounts/${userId}/statuses?exclude_replies=true&exclude_reblogs=true&max_id=${
        maxId || ""
      }`
    );
    const posts = await response.json();
    // console.log({ posts, response });
    return posts;
  } catch (error) {
    console.error("error getting profile: ", error);
  }
}
