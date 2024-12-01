const urlParams = new URLSearchParams(window.location.search);
let handles = urlParams.get("handles")?.split(';');

if (!handles?.length) {
  handles = [
    "chaos.social/@alexglow",
    "mstdn.social/alpenglow",
    "hackaday.social/architeuthisflux",
    "leds.social/@graemegets",
    "qoto.org/@Blenster",
    "chaos.social/@chipperdoodles",
    "mastodon.social/clomads",
    // "desertember.bsky.social",
    "mastodon.social/wormyrocks",
    "leds.social/@jasoncoon",
    "mastodon.social/geekmomprojects",
    "mastodon.social/@gvy_dvpont",
    "chaos.social/ishotjr",
    "mastodon.social/joeycastillo",
    "mstdn.social/lasermistress",
    "fosstodon.org/leeborg",
    "indieweb.social/settinger",
    "infosec.exchange/straithe",
  ];
}

const divLoading = document.getElementById("loading");
const divProgress = document.getElementById('progress');
const tableBody = document.getElementById('tableBody');

loadTable();

async function getProfile(server, username) {
  try {
    let response = await fetch(
      `https://${server}/api/v1/accounts/lookup?acct=${username}`
    );
    const profile = await response.json();
    console.log({ profile, response });
    return profile;  
  } catch (error) {
    console.error("error getting profile: ", error);
  }
}

async function loadTable() {
  divLoading.style.display = "block";
  tableBody.innerHTML = '';
  
  const profiles = [];
  let i = 1;

  for (const handle of handles) {
    divProgress.innerText = `Getting profile ${handle} ${i} of ${handles.length}`;
    const [server, username] = handle.split('/');
    const profile = await getProfile(server, username);
    profiles.push(profile);
    i++;
  }

  profiles.sort((a, b) => b.followers_count - a.followers_count);

  i = 1;

  for (const profile of profiles) {
    const followersPerFollow = ((profile.followers_count ?? 0) / (profile.following_count ?? 0)).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 0 });
    // const followersPerPost = ((profile.followers_count ?? 0) / (profile.postsCount ?? 0)).toLocaleString(undefined, { style: 'percent', minimumFractionDigits:0 });

    const row = tableBody.insertRow();
    let cell;

    cell = row.insertCell();
    cell.innerHTML = i.toLocaleString();
    
    cell = row.insertCell();
    cell.innerHTML = `<a href="${profile.url}">${profile.display_name || profile.username}</a>`;
    
    cell = row.insertCell();
    cell.innerHTML = profile.followers_count?.toLocaleString(); 
    
    cell = row.insertCell();
    cell.innerHTML = profile.following_count?.toLocaleString();
    
    cell = row.insertCell();
    cell.title = 'Followers per Follow';
    cell.innerHTML = followersPerFollow.toLocaleString(undefined, { style: 'percent', minimumFractionDigits:0 });
    
    // cell = row.insertCell();
    // cell.innerHTML = profile.postsCount?.toLocaleString();

    // cell = row.insertCell();
    // cell.title = 'Followers per Post';
    // cell.innerHTML = followersPerPost.toLocaleString(undefined, { style: 'percent', minimumFractionDigits:0 });
    
    cell = row.insertCell();
    cell.innerHTML = new Date(profile.created_at).toLocaleString();

    i++;
  }

  divLoading.style.display = "none";
  divProgress.innerHTML = '';

  // console.log({profiles});
}