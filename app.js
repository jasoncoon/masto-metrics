google.charts.load("current", { packages: ["corechart"] });
google.charts.setOnLoadCallback(onLoad);

const divLoading = document.getElementById("loading");
const divProgress = document.getElementById("progress");
const tableBody = document.getElementById("tableBody");
const textAreaHandles = document.getElementById("textAreaHandles");
const buttonSubmitHandles = document.getElementById("buttonSubmitHandles");
const divFollowersChart = document.getElementById("divFollowersChart");
const inputLogScale = document.getElementById("inputLogScale");
const inputPointSize = document.getElementById("inputPointSize");
const divHandleChecks = document.getElementById("divHandleChecks");

buttonSubmitHandles.addEventListener("click", submitHandles);
inputLogScale.addEventListener("change", drawChart);
inputPointSize.addEventListener("change", drawChart);

let handles;

let chart;
let chartData;

let loadedHandles;
let allItems;

async function onLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  handles = urlParams.get("handles")?.split(";");

  if (!handles?.length) {
    handles = [
      "chaos.social/@alexglow",
      "chaos.social/@chipperdoodles",
      "chaos.social/ishotjr",
      "fosstodon.org/leeborg",
      "infosec.exchange/straithe",
      "leds.social/@architeuthisflux",
      "leds.social/@flashingjanet",
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

  // eslint-disable-next-line no-undef
  chart = new google.visualization.LineChart(divFollowersChart);

  await loadTable();

  await fetchChartData();
}

async function loadTable() {
  divLoading.style.display = "block";
  tableBody.innerHTML = "";

  const profiles = [];
  let i = 1;

  for (let handle of handles) {
    try {
      divProgress.innerText = `Getting profile ${handle} ${i} of ${handles.length}`;

      if (handle.startsWith("https://")) {
        handle = handle.replace("https://", "");
      }

      handle = handle.trim();

      let [server, username] = handle.split("/");

      if (username.startsWith("@")) username = username.replace("@", "");

      const profile = await getProfile(server, username);

      profiles.push(profile);
      i++;
    } catch (error) {
      console.error(error);
    }
  }

  profiles.sort((a, b) => b.followers_count - a.followers_count);

  i = 1;

  for (const profile of profiles) {
    if (!profile) continue;

    const followersPerFollow = (
      (profile.followers_count ?? 0) / (profile.following_count ?? 0)
    ).toLocaleString(undefined, { style: "percent", minimumFractionDigits: 0 });
    // const followersPerPost = ((profile.followers_count ?? 0) / (profile.postsCount ?? 0)).toLocaleString(undefined, { style: 'percent', minimumFractionDigits:0 });

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
    cell.innerHTML = new Date(profile.created_at).toLocaleString();

    i++;
  }

  divLoading.style.display = "none";
  divProgress.innerHTML = "";

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
  let newHandles = value.split("\n");
  newHandles = newHandles
    .map((handle) => handle.trim())
    .filter((handle) => !!handle);
  console.log(newHandles);
  window.location = `/masto-metrics/index.htm?handles=${newHandles.join(";")}`;
}

async function fetchChartData() {
  divLoading.style.display = "block";
  document.getElementById("divChartControls").style.display = "block";

  let i = 1;

  loadedHandles = [];
  allItems = [];

  for (const currentHandle of handles) {
    divProgress.innerText = `Getting followers chart data for profile ${i} of ${handles.length}: ${currentHandle}`;

    const response = await fetch(
      `https://social-metrics.evilgeniuslabs.org/query?social=Mastodon&handle=${currentHandle}`
    );
    const body = await response.json();
    const items = body.Items;
    if (!items) {
      continue;
    }

    loadedHandles.push(currentHandle);

    items.sort((a, b) => a.date - b.date);

    allItems.push(...items);

    loadChartData(loadedHandles);

    drawChart();

    i++;
  }

  createHandleCheckboxes();

  divLoading.style.display = "none";
  divProgress.innerHTML = "";
}

function loadChartData(loadedHandles) {
  const checkedHandles = loadedHandles.filter((handle) => {
    const checkbox = document.getElementById(`input${handle}`);
    if (!checkbox) return true;
    return checkbox.checked;
  });

  const items = allItems.filter((item) => checkedHandles.includes(item.handle));

  const allDates = getAllDates(items);

  const sortedHandles = getSortedHandles(loadedHandles);

  const filteredHandles = sortedHandles.filter((handle) =>
    checkedHandles.includes(handle)
  );

  chartData = [["Date", ...filteredHandles.map(shortenHandle)]];

  for (const date of allDates) {
    const row = [date];
    for (const handle of filteredHandles) {
      row.push(
        items.find((i) => i.handle === handle && i.date === date)?.followers ??
          undefined
      );
    }

    chartData.push(row);
  }
}

function shortenHandle(handle) {
  return handle.split("/")[1].replace("@", "");
}

function getSortedHandles(handles) {
  const latestTotals = handles.map((handle) => {
    const sorted = allItems
      .filter((i) => i.handle === handle)
      .sort((a, b) => a.date - b.date);
    const latestTotal = sorted[sorted.length - 1]?.followers;
    // console.log({ handle, sorted, latestTotal });
    return { handle, latestTotal };
  });

  const sortedHandles = latestTotals
    .sort((a, b) => b.latestTotal - a.latestTotal)
    .map((h) => h.handle);

  return sortedHandles;
}

function createHandleCheckboxes() {
  const sortedHandles = getSortedHandles(handles);

  divHandleChecks.innerHTML = "";

  for (const handle of sortedHandles) {
    const handleCheck = document.createElement("div");
    handleCheck.setAttribute("class", "form-check");
    handleCheck.innerHTML = `<input class="form-check-input" type="checkbox" id="input${handle}" checked>
            <label class="form-check-label" for="input${handle}">
              ${handle}
            </label>`;

    divHandleChecks.appendChild(handleCheck);

    const input = document.getElementById(`input${handle}`);
    input.addEventListener("change", reloadChart);
  }
}

function reloadChart() {
  loadChartData(handles);

  drawChart();
}

function getAllDates(items) {
  const allDates = [];

  for (const item of items) {
    if (allDates.includes(item.date)) {
      continue;
    }

    allDates.push(item.date);
  }

  allDates.sort();

  return allDates;
}

function drawChart() {
  const logScale = inputLogScale.checked;
  const pointSize = inputPointSize.value;

  // eslint-disable-next-line no-undef
  const data = google.visualization.arrayToDataTable(chartData);

  // eslint-disable-next-line no-undef
  chart.draw(data, {
    title: `Followers over time`,
    pointSize,
    vAxis: {
      format: "short", // "#,###",
      logScale,
      viewWindowMode: "maximized",
    },
  });
}
