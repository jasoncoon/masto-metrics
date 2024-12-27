const urlParams = new URLSearchParams(window.location.search);
let handles = urlParams.get("handles")?.split(';');

if (!handles?.length) {
  handles = [
    "chaos.social/@alexglow",
    "chaos.social/@chipperdoodles",
    "chaos.social/ishotjr",
    "fosstodon.org/leeborg",
    "hackaday.social/@architeuthisflux",
    "indieweb.social/settinger",
    "infosec.exchange/straithe",
    "leds.social/@graemegets",
    "leds.social/@highenergybeams",
    "leds.social/@jasoncoon",
    "leds.social/benhencke",
    "mastodon.social/@gvy_dvpont",
    "mastodon.social/clomads",
    "mastodon.social/geekmomprojects",
    "mastodon.social/joeycastillo",
    "mastodon.social/wormyrocks",
    "mstdn.social/alpenglow",
    "mstdn.social/lasermistress",
    "qoto.org/@Blenster",
  ];
}

const divLoading = document.getElementById("loading");
const divProgress = document.getElementById('progress');
const tableBody = document.getElementById('tableBody');
const textAreaHandles = document.getElementById('textAreaHandles');
const buttonSubmitHandles = document.getElementById('buttonSubmitHandles');

buttonSubmitHandles.addEventListener('click', submitHandles);

loadTable();

async function loadTable() {
  divLoading.style.display = "block";
  tableBody.innerHTML = '';
  
  const profiles = [];
  let i = 1;

  for (let handle of handles) {
    try {
      divProgress.innerText = `Getting profile ${handle} ${i} of ${handles.length}`;
      
      if (handle.startsWith('https://')) {
        handle = handle.replace('https://', '');
      }

      handle = handle.trim();

      let [server, username] = handle.split('/');

      if (username.startsWith('@')) username = username.replace('@', '');
      
      const profile = await getProfile(server, username);
      
      profiles.push(profile);
      i++;
    } catch(error) {
      console.error(error);
    }
  }

  profiles.sort((a, b) => b.followers_count - a.followers_count);

  i = 1;

  for (const profile of profiles) {
    if (!profile) continue;
    
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

function submitHandles() {
  const value = textAreaHandles.value;
  let newHandles = value.split('\n');
  newHandles = newHandles.map(handle => handle.trim()).filter(handle => !!handle);
  console.log(newHandles);
  window.location = `/masto-metrics/index.htm?handles=${newHandles.join(';')}`;
}