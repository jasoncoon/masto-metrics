const navbarBrand = document.getElementById("navbar-brand");
const divLoading = document.getElementById("loading");
const divProgress = document.getElementById("progress");
const tableBody = document.getElementById("tableBody");
const inputHandle = document.getElementById("inputHandle");

document.getElementById("btnGo").onclick = () => {
  window.location.href = `/masto-metrics/followers.htm?handle=${inputHandle.value}`;
};

let handles;
let days;

let chart;
let chartData;

let loadedHandles;
let allItems;

onLoad();

async function onLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  let handle = urlParams.get("handle");

  console.log({ handle });

  if (!handle) {
    // handle = "leds.social/@jasoncoon";
    return;
  }

  const title = `${handle} | Followers | Mastodon Metrics`;
  document.title = title;
  navbarBrand.innerHTML = `<a href="/">Mastodon Metrics</a> | ${handle} | Followers`;

  try {
    divProgress.innerText = `Getting followers for profile ${handle}`;

    if (handle.startsWith("https://")) {
      handle = handle.replace("https://", "");
    }

    handle = handle.trim();

    let [server, username] = handle.split("/");

    if (username.startsWith("@")) username = username.replace("@", "");

    const title = `${username} | Followers | Mastodon Metrics`;
    document.title = title;
    navbarBrand.innerHTML = `<a href="/">Mastodon Metrics</a> | ${handle} | Followers`;

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

    await loadTable(profile, server, username);
  } catch (error) {
    console.error(error);
  }
}

async function loadTable(profile, server, username) {
  divLoading.style.display = "block";
  tableBody.innerHTML = "";

  const profiles = [];

  let maxId = undefined;
  while (true) {
    const { followers, newMaxId } = await getFollowers(
      server,
      profile.id,
      maxId
    );
    profiles.push(...followers);

    profiles.sort((a, b) => b.followers_count - a.followers_count);
    tableBody.innerHTML = "";
    loadProfiles(profiles);
    if (!newMaxId) break;
    maxId = newMaxId;
    await setTimeout(500);
  }

  let i = 1;

  profiles.sort((a, b) => b.followers_count - a.followers_count);

  divLoading.style.display = "none";
  divProgress.innerHTML = "";

  // console.log({profiles});
}

function loadProfiles(profiles) {
  let i = 1;
  for (const profile of profiles) {
    const row = tableBody.insertRow();
    let cell;

    cell = row.insertCell();
    cell.innerHTML = i.toLocaleString();

    cell = row.insertCell();
    cell.innerHTML = `<a href="${profile.url}">${
      profile.display_name || profile.username
    }</a>`;

    cell = row.insertCell();
    cell.innerHTML = profile.followers_count?.toLocaleString();

    cell = row.insertCell();
    cell.innerHTML = profile.following_count?.toLocaleString();

    const followersPerFollow = (
      (profile.followers_count ?? 0) / (profile.following_count ?? 0)
    ).toLocaleString(undefined, { style: "percent", minimumFractionDigits: 0 });

    cell = row.insertCell();
    cell.title = "Followers per Follow";
    cell.innerHTML = followersPerFollow.toLocaleString(undefined, {
      style: "percent",
      minimumFractionDigits: 0,
    });

    // cell = row.insertCell();
    // cell.innerHTML = profile.postsCount?.toLocaleString();

    // cell = row.insertCell();
    // cell.title = 'Followers per Post';
    // cell.innerHTML = followersPerPost.toLocaleString(undefined, { style: 'percent', minimumFractionDigits:0 });

    cell = row.insertCell();
    cell.innerHTML = new Date(profile.created_at).toLocaleDateString();

    cell = row.insertCell();
    cell.innerHTML = `<img src="${profile.avatar_static}" style="width: 64px;" />`;

    cell = row.insertCell();
    cell.innerHTML = profile.note;

    i++;
  }
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

async function getFollowers(server, userId, maxId) {
  try {
    let response = await fetch(
      `https://${server}/api/v1/accounts/${userId}/followers?limit=80&max_id=${
        maxId || ""
      }`
    );
    const followers = await response.json();
    const linkValue = response.headers.get("link");
    let newMaxId;
    if (linkValue) {
      const maxIdLink = linkValue.split(",").find((l) => l.includes("max_id"));
      if (maxIdLink) {
        const url = maxIdLink
          .split(";")[0]
          .replaceAll("<", "")
          .replaceAll(">", "");
        newMaxId = new URL(url).searchParams.get("max_id");
      }
    }
    // console.log({ followers, newMaxId, response });
    return { followers, newMaxId };
  } catch (error) {
    console.error("error getting followers: ", error);
  }
}
