const fs = require("fs");
const moment = require("moment");
const electron = require("electron");
const $ = require("jquery");
const ip = require("ip");
$("#notif-icon").hide();
$("#notif-box").hide();
$("#page-tasks").show();
$("#create-proxies").hide();
$("#page-profiles").hide();
$("#page-proxies").hide();
$("#page-settings").hide();
let activeTab = "tasks";
let profileBeingEdited = false;
let proxiesBeingEdited = false;

const { uuid } = require("uuidv4");
const path = require("path");
const request = require("request");
const ipc = electron["ipcRenderer"];

const { shell } = require("electron");

let create_id = () => {
  let alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let createdId = "";
  for (let i = 0; i < alph.length; i++) {
    createdId += alph[Math.floor(Math.random() * alph.length)];
  }
  return createdId;
};

let formatProxy = (proxies) => {
  if (proxies && ["localhost", ""].indexOf(proxies) < 0) {
    proxies = proxies.replace("\x20", "_");
    const proxy = proxies.split(":");
    if (proxy.length > 3)
      return (
        "http://" + proxy[2] + ":" + proxy[3] + "@" + proxy[0] + ":" + proxy[1]
      );
    else return "http://" + proxy[0] + ":" + proxy[1];
  } else return false;
};

let create_alert = (alert) => {
  let id = create_id();
  $("#notify-div").append(`
  <div id="${id}" class="toast">
    <div class="toast-header">
      <img class="toast-img" src="./images/logo.png" alt=""/>
      <p class="toast-title">Aurora</p>
    </div>
    <div class="toast-body">
    <p> ${alert} </p>
    </div>
  </div>
  `);
  setTimeout(() => {
    $("#" + id).fadeOut(350, () => {
      $("#" + id).remove();
    });
  }, 2800);
};

$("#menu-tasks").click(() => {
  $("#page-tasks").show();
  $("#page-profiles").hide();
  $("#page-proxies").hide();
  $("#page-settings").hide();
  $("#menu-tasks").addClass("inactive");
  $("#menu-profiles").removeClass("inactive");
  $("#menu-proxies").removeClass("inactive");
  $("#menu-settings").removeClass("inactive");
  activeTab = "tasks";
});
$("#menu-profiles").click(() => {
  $("#page-tasks").hide();
  $("#page-profiles").show();
  $("#page-proxies").hide();
  $("#page-settings").hide();
  $("#menu-tasks").removeClass("inactive");
  $("#menu-profiles").addClass("inactive");
  $("#menu-proxies").removeClass("inactive");
  $("#menu-settings").removeClass("inactive");
  activeTab = "profiles";
});
$("#menu-proxies").click(() => {
  $("#page-tasks").hide();
  $("#page-profiles").hide();
  $("#page-proxies").show();
  $("#page-settings").hide();
  $("#menu-tasks").removeClass("inactive");
  $("#menu-profiles").removeClass("inactive");
  $("#menu-proxies").addClass("inactive");
  $("#menu-settings").removeClass("inactive");
  activeTab = "proxies";
});
$("#menu-settings").click(() => {
  $("#menu-tasks").removeClass("inactive");
  $("#menu-profiles").removeClass("inactive");
  $("#menu-proxies").removeClass("inactive");
  $("#menu-settings").addClass("inactive");
  $("#settings-disable").addClass("disable");
  $("#page-settings").show("fast", () => {});
});

//hide drawers on launch
$("#create-tasks").hide();
$("#create-profiles").hide();

//close stuff if clicked outside that region
$(document).on("click", (item) => {
  if (
    $(item.target).closest("#create-tasks").length === 0 &&
    $(item.target).closest("#create-task").length === 0
  ) {
    $("#tasks-disable").removeClass("disable");
    $("#create-tasks").hide();
  }
  if (
    $(item.target).closest("#create-profiles").length === 0 &&
    $(item.target).closest("#create-profile").length === 0
  ) {
    $("#profiles-disable").removeClass("disable");
    $("#create-profiles").hide();
    profileBeingEdited = false;
    $("#create-profile-button").text("Create");
  }
  if (
    $(item.target).closest("#create-proxies").length === 0 &&
    $(item.target).closest("#create-list").length === 0
  ) {
    $("#proxies-disable").removeClass("disable");
    $("#create-proxies").hide();
    proxiesBeingEdited = false;
    $("#save-list").text("Save");
  }
  if (
    $(item.target).closest("#notif-box").length === 0 &&
    $(item.target).closest("#notif-button").length === 0
  ) {
    $("#notif-box").fadeOut(50, () => {});
  }
  if (
    $(item.target).closest("#menu-settings").length === 0 &&
    $(item.target).closest("#page-settings").length === 0
  ) {
    $("#settings-disable").removeClass("disable");
    $("#page-settings").hide();
  }
});

// open notifs
$("#notif-button").click(() => {
  $("#notif-icon").hide();
  $("#notif-box").show();
});

// task creation
//open drawer to create task
$("#create-task").click(() => {
  $("#tasks-disable").addClass("disable");
  $("#create-tasks").show("fast", () => {});
});

//close drawer
$("#x-task-button").click(() => {
  $("#tasks-disable").removeClass("disable");
  $("#create-tasks").hide();
});

// start all and stop all task
$("#start-all").click(() => {
  $("#start-all").addClass("start-all-on");
  $("#stop-all").removeClass("stop-all-on");
  ipc.send("start-all-tasks");
});
$("#stop-all").click(() => {
  $("#start-all").removeClass("start-all-on");

  ipc.send("stop-all-tasks");
});

//create profile
$("#create-profile").click(() => {
  $("#profiles-disable").addClass("disable");
  $("#create-profiles").show("fast", () => {});
});

//close profile box
$("#x-profile-button").click(() => {
  $("#profiles-disable").removeClass("disable");
  $("#create-profiles").hide();
  profileBeingEdited = false;
  $("#create-profile-button").text("Create");
});

//Close and min buttons
$("#x-button").click(() => {
  console.log("clicked");
  ipc.send("quit-app");
});
$("#min-button").click(() => {
  ipc.send("min-app");
});

//create proxy
$("#create-list").click(() => {
  $("#proxies-disable").addClass("disable");
  $("#create-proxies").show("fast", () => {});
});

//close proxy creation
$("#x-proxies-button").click(() => {
  $("#proxies-disable").removeClass("disable");
  $("#create-proxies").hide();
  proxiesBeingEdited = false;
  $("#save-list").text("Save");
});

//Add product to task from hot list
$("body").on("click", ".product-button", (item) => {
  $("#keywords").val(item.target.id);
});

//update hot list with new items
ipc.on("update-droplist", (e, list) => {
  for (let i = 0; i < list.length; i++) {
    const product = list[i];
    $("#product-list").append(
      `<div class="product item">
      <img class="product-image" src="${product.image_url}" alt="" />
      <div class="product-title-div">${product.title}</div>
      <button class="product-button" id="${product.keywords}">+</button>
    </div>`
    );
  }
});

//Update task statuses
ipc.on("update-status", (e, id, text, status) => {
  return updateStatus(id, text, status);
});

let updateStatus = (id, text, status) => {
  $("#" + id + "\x20>\x20p.task-status").text(text);
  if (status) {
    if (status == "error") {
      $("#" + id + " > p.task-status").css({ color: "#f7647f" });
    } else if (status == "yellow") {
      $("#" + id + " > p.task-status").css({
        color: "#f5b352",
      });
    } else if (status == "success") {
      $("#" + id + " > p.task-status").css({
        color: "#4ceaa3",
      });
    } else if (status == "white") {
      $("#" + id + " > p.task-status").css({
        color: "#fff",
      });
    } else if (status == "blue") {
      $("#" + id + " > p.task-status").css({ color: "#6c84f3" });
    }
  }
};

// card number infomation uppate card image
$("#card-number").on("keyup", function (e) {
  let cardInfo = $(this).val();
  let formatedCard = "";
  cardInfo = cardInfo["replace"](/\s/g, "");
  for (let i = 0; i < cardInfo.length; i++) {
    if (i % 4 == 0 && i > 0) formatedCard = formatedCard.concat("\x20");
    formatedCard = formatedCard.concat(cardInfo[i]);
  }
  $("#card-number-p").text(formatedCard);
  if (formatedCard.startsWith("4")) {
    $("#card-image").attr("src", "./images/payments/visa.png");
  } else if (formatedCard.startsWith("5")) {
    $("#card-image").attr("src", "./images/payments/master.png");
  } else if (formatedCard.startsWith("6")) {
    $("#card-image").attr("src", "./images/payments/discover.png");
  } else if (formatedCard.startsWith("3")) {
    $("#card-image").attr("src", "./images/payments/amex.png");
  } else {
    $("#card-image").attr("src", "./images/payments/visa.png");
  }
});

//card holders name on card with card expo
$("#full-name").on("keyup", function (e) {
  const text = $(this).val();
  $("#card-holder-p").text(text);
});

$("#month").on("change", function (e) {
  let month = $(this).val();
  $("#card-exp-p").text(
    month + "/" + ($("#year").val() ? $("#year").val().substr(2) : "")
  );
});
$("#year").on("change", function (e) {
  let year = $(this).val();
  $("#card-exp-p").text(
    ($("#month").val() ? $("#month").val() : "") + "/" + year.substr(2)
  );
});

//save profile
$("#create-profile-button").click(() => {
  let createdProfile = {
    "profile-name": "profile\x20name",
    "full-name": "full name",
    email: "email",
    "billing-address": "address",
    city: "city",
    phone: "phone",
    state: "state",
    zip: "zip",
    country: "country",
    "card-number": "card number",
    month: "expiration month",
    year: "expiration year",
    cvv: "CVV",
  };
  for (let item in createdProfile) {
    if (!$("#" + item).val()) {
      if (
        item == "email" &&
        !$("#" + item)
          .val()
          .includes("@")
      ) {
        return create_alert("Invalid email");
      }
      return create_alert("Missing\x20" + createdProfile[item] + " field");
    }
  }
  if (!profileBeingEdited) {
    ipc.send("save-profile", {
      id: uuid(),
      profileName: $("#profile-name").val(),
      fullName: $("#full-name").val(),
      email: $("#email").val(),
      address: $("#billing-address").val(),
      apt: $("#apt").val(),
      city: $("#city").val(),
      phone: $("#phone").val(),
      stexpate: $("#state").val(),
      zip: $("#zip").val(),
      country: $("#country").val(),
      cardNumber: $("#card-number").val(),
      expMonth: $("#month").val(),
      expYear: $("#year").val(),
      cvv: $("#cvv").val(),
    });
  } else {
    ipc.send("update-profile", profileBeingEdited, {
      id: profileBeingEdited,
      profileName: $("#profile-name").val(),
      fullName: $("#full-name").val(),
      email: $("#email").val(),
      address: $("#billing-address").val(),
      apt: $("#apt").val(),
      city: $("#city").val(),
      phone: $("#phone").val(),
      state: $("#state").val(),
      zip: $("#zip").val(),
      country: $("#country").val(),
      cardNumber: $("#card-number").val(),
      expMonth: $("#month").val(),
      expYear: $("#year").val(),
      cvv: $("#cvv").val(),
    });
  }
});

//Add saved profile to app
ipc.on("saved-profile", (e, profile) => {
  $("#profiles").append(
    `
    <div class="task" id=${profile.id}>
    <p class="profile-name task-data">${profile.profileName}</p>
    <p class="profile-email task-data">${profile.email}</p>
    <p class="profile-holder task-data">${profile.fullName}</p>
    <p class="profile-card task-data">Ending in ${profile.cardNumber.substr(
      0,
      4
    )}</p>
    
    <div class="profile-action">
      <img class="task-img edit-profile" src="./images/edit.svg" alt="" />
      <img class="task-img delete-profile" src="./images/delete.svg" alt="" />
    </div>
    </div>
    `
  );
  $("#profile-select").append(
    `
    <option value="${profile.id}">${profile.profileName}</option>
    `
  );
  formatProfileColors();
});

//on start add all profiles saved in electron store
ipc.on("add-profiles", (e, profiles) => {
  profiles = JSON.parse(profiles);
  for (id in profiles) {
    let profile = profiles[id];
    $("#profiles").append(
      `
      <div class="task" id=${profile.id}>
      <p class="profile-name task-data">${profile.profileName}</p>
      <p class="profile-email task-data">${profile.email}</p>
      <p class="profile-holder task-data">${profile.fullName}</p>
      <p class="profile-card task-data">Ending in ${profile.cardNumber.substr(
        -4
      )}</p>
      
      <div class="profile-action">
        <img class="task-img edit-profile" src="./images/edit.svg" alt="" />
        <img class="task-img delete-profile" src="./images/delete.svg" alt="" />
      </div>
      </div>
      `
    );
    $("#profile-select").append(
      `
    <option value="${profile.id}">${profile.profileName}</option>
    `
    );
  }
  formatProfileColors();
});

//format profiles
function formatProfileColors() {
  $("#profiles > div").each((profile) => {
    if (profile % 2 == 0) {
      $("#profiles\x20>\x20div:nth-child(" + (profile + 1) + ")").removeClass(
        "odd"
      );
      $("#profiles\x20>\x20div:nth-child(" + (profile + 1) + ")").addClass(
        "even"
      );
    } else {
      $("#profiles\x20>\x20div:nth-child(" + (profile + 1) + ")").addClass(
        "odd"
      );
      $("#profiles\x20>\x20div:nth-child(" + (profile + 1) + ")").removeClass(
        "even"
      );
    }
  });
}

//format tasks
function formatTaskColors() {
  $("#tasks > div").each((task) => {
    $("#tasks\x20>\x20div:nth-child(" + (task + 1) + ") > p.task-id").text(
      "" + (task + 1)
    );
    if (task % 2 == 0) {
      $("#tasks > div:nth-child(" + (task + 1) + ")").removeClass("odd");
      $("#tasks > div:nth-child(" + (task + 1) + ")").addClass("even");
    } else {
      $("#tasks\x20>\x20div:nth-child(" + (task + 1) + ")").addClass("odd");
      $("#tasks > div:nth-child(" + (task + 1) + ")").removeClass("even");
    }
  });
}

//Format Proxies
function formatProxyColors() {
  $("#proxies > div").each((proxy) => {
    $("#proxies > div:nth-child(" + (proxy + 1) + ") > p.proxies-id").text(
      "" + (proxy + 1)
    );
    if (proxy % 2 == 0) {
      $("#proxies > div:nth-child(" + (proxy + 1) + ")").removeClass("odd");
      $("#proxies > div:nth-child(" + (proxy + 1) + ")").addClass("even");
    } else {
      $("#proxies > div:nth-child(" + (proxy + 1) + ")").addClass("odd");
      $("#proxies > div:nth-child(" + (proxy + 1) + ")").removeClass("even");
    }
  });
}

//pull profile that needs to be updated
$("body").on("click", ".edit-profile", (profile) => {
  ipc.send("pull-profile", $(profile.target).parent().parent().attr("id"));
});

//edit profile
ipc.on("edit-profile", (e, profile) => {
  $("#profile-name").val(profile.profileName);
  $("#full-name").val(profile.fullName);
  $("#email").val(profile.email);
  $("#billing-address").val(profile.address);
  $("#apt").val(profile.apt ? profile.apt : "");
  $("#city").val(profile.city);
  $("#phone").val(profile.phone);
  $("#state").val(profile.state);
  $("#zip").val(profile.zip);
  $("#country").val(profile.country);
  $("#card-number").val(profile.cardNumber);
  $("#month").val(profile.expMonth);
  $("#year").val(profile.expYear);
  $("#cvv").val(profile.cvv);
  $("#card-holder-p").text(profile.fullName);
  $("#card-exp-p").text(profile.expMonth + "/" + profile.expYear.substr(2));
  let cardNum = profile.cardNumber;
  let cardDisplay = "";
  cardNum = cardNum.replace(/\s/g, "");
  for (let i = 0; i < cardNum.length; i++) {
    if (i % 4 == 0 && i > 0) cardDisplay = cardDisplay.concat("\x20");
    cardDisplay = cardDisplay.concat(cardNum[i]);
  }
  $("#card-number-p").text(cardDisplay);
  if (cardDisplay.startsWith("4")) {
    $("#card-image").attr("src", "./images/payments/visa.png");
  } else if (cardDisplay.startsWith("5")) {
    $("#card-image").attr("src", "./images/payments/master.png");
  } else if (cardDisplay.startsWith("6")) {
    $("#card-image").attr("src", "./images/payments/discover.png");
  } else if (cardDisplay.startsWith("3")) {
    $("#card-image").attr("src", "./images/payments/amex.png");
  } else {
    $("#card-image").attr("src", "./images/payments/visa.png");
  }
  profileBeingEdited = profile.id;
  $("#create-profile-button").text("Update");
  $("#profiles-disable").addClass("disable");
  $("#create-profiles").show("fast", () => {});
});

ipc.on("add-declined", (e, total) => {
  $("#total-failed > .info-size").text(total);
});

ipc.on("add-carted", (e, total) => {
  $("#total-carted > .info-size").text(total);
});

ipc.on("add-checkout", (e, total) => {
  $("#total-checkouts > .info-size").text(total);
});

//Update profile list with edited profile
ipc.on("updated-profile", (e, profile) => {
  $("#profiles > div#" + profile.id + " > p.profile-name").text(
    profile.profileName
  );
  $("#profiles > div#" + profile.id + " > p.profile-email").text(profile.email);
  $("#profiles > div#" + profile.id + "\x20>\x20p.profile-holder").text(
    profile.fullName
  );
  $("#profiles > div#" + profile.id + " > p.profile-card").text(
    "Ending in " + profile.cardNumber.substr(-4)
  );
  $("#profiles-disable").removeClass("disable");
  $("#create-profiles").hide();
  profileBeingEdited = false;
  $("#create-profile-button").text("Create");
});

$("#save-list").click(() => {
  console.log("clicked");
  if (!$("#proxy-area").val()) {
    return create_alert("No proxies added");
  }

  if (!proxiesBeingEdited) {
    ipc.send("save-proxies", {
      id: uuid(),
      listName: $("#list-name").val(),
      proxies: $("#proxy-area").val(),
    });
  } else {
    ipc.send("update-proxies", {
      id: proxiesBeingEdited,
      listName: $("#list-name").val(),
      proxies: $("#proxy-area").val(),
    });
  }
});

//add saved proxies in electron store to the app
ipc.on("saved-proxies", (e, list) => {
  $("#proxies").append(
    `
<div class="task" id="${list.id}">
  <p class="proxies-id task-data">0</p>
  <p class="proxies-name task-data">${list.listName}</p>
  <p class="proxies-count task-data">${list.proxies.length} Proxies</p>
  <div class="proxies-action">
    <img class="task-img edit-proxies" src="./images/edit.svg" alt="" />
    <img class="task-img delete-proxies" src="./images/delete.svg" alt="" />
  </div>
</div>
`
  );
  $("#proxies-select").append(
    `
    <option value="${list.id}">${list.listName}(${list.proxies.length})</option>
    `
  );
  formatProxyColors();
});

//add proxies to app from creation screen
ipc.on("add-proxies", (e, allProxies) => {
  allProxies = JSON.parse(allProxies);
  for (id in allProxies) {
    let list = allProxies[id];
    $("#proxies").append(
      `
<div class="task" id="${list.id}">
  <p class="proxies-id task-data">0</p>
  <p class="proxies-name task-data">${list.listName}</p>
  <p class="proxies-count task-data">${list.proxies.length} Proxies</p>
  <div class="proxies-action">
    <img class="task-img edit-proxies" src="./images/edit.svg" alt="" />
    <img class="task-img delete-proxies" src="./images/delete.svg" alt="" />
  </div>
</div>
`
    );
    $("#proxies-select").append(
      `
      <option value="${list.id}">${list.listName}(${list.proxies.length})</option>
      `
    );
  }
  formatProxyColors();
});

//pull proxie list that needs to be edited from electron store
$("body").on("click", ".edit-proxies", (list) => {
  ipc.send("pull-proxies", $(list.target).parent().parent().attr("id"));
});

//edit proxies list
ipc.on("edit-proxies", (e, proxiesList) => {
  $("#list-name").val(proxiesList.listName);
  $("#proxy-area").val(
    JSON.stringify(proxiesList.proxies)
      .replace(/,/g, "\n")
      .replace("[", "")
      .replace("]", "")
      .replace(/"/g, "")
  );
  proxiesBeingEdited = proxiesList.id;
  $("#save-list").text("Update");
  $("#proxies-disable").addClass("disable");
  $("#create-proxies").show("fast", () => {});
});

//update proxie list in app
ipc.on("updated-proxies", (e, updatedProxiesList) => {
  $("#proxies > div#" + updatedProxiesList.id + " > p.proxies-name").text(
    updatedProxiesList.listName
  );
  $("#proxies > div#" + updatedProxiesList.id + " > p.proxies-count").text(
    updatedProxiesList.proxies.length + " Proxies"
  );
  $("#proxies-disable").removeClass("disable");
  $("#create-proxies").hide();
  proxiesBeingEdited = false;
  $("#save-list").text("Save");
});

//create task from app
$("#create-task-button").click(() => {
  let task = {
    "profile-select": "profile",
    "proxies-select": "proxies",
    keywords: "keywords",
    captcha: "mode",
    size: "size",
  };
  for (let item in task) {
    if (!$("#" + item).val()) {
      return create_alert("Missing " + task[item] + " field");
    }
  }

  ipc.send("add-task", {
    id: uuid(),
    profile: $("#profile-select").val(),
    profileName: $("#profile-select option:selected").text(),
    proxies: $("#proxies-select").val(),
    keywords: $("#keywords").val(),
    site: $("#site").val(),
    price: $("#price").val(),
    captcha: $("#captcha").val() === "true" ? true : false,
    size: $("#size").val(),
    color: $("#color").val(),
  });
});

//add saved tasks from electron store to the app
ipc.on("saved-task", (e, task) => {
  $("#tasks").append(
    `
    <div id="${task.id}" class="task even">
      <p class="task-id task-data">${task.site}</p>
      <p class="task-product task-data">${task.keywords}</p>
      <p class="task-size task-data">${task.size}</p>
      <p class="task-profile task-data">${task.profileName}</p>
      <div class="task-proxy task-data">
        <p class="${task.proxies ? "task-proxy-green" : "task-proxy-idle"}"></p>
      </div>
      <p class="task-status task-data">Idle</p>
      <div class="task-toggle">
        <img class="task-img task-start" src="./images/start.svg" alt="" />
      </div>
      <div class="task-delete">
        <img class="task-img task-trash" src="./images/delete.svg" alt="" />
      </div>
    </div>
    `
  );
  formatTaskColors();
});

//add tasks to app from creation
ipc.on("add-tasks", (e, task) => {
  task = JSON.parse(task);
  for (id in task) {
    let createdTask = task[id];
    $("#tasks").append(
      `
      <div id="${createdTask.id}" class="task even">
        <p class="task-id task-data">${createdTask.site}</p>
        <p class="task-product task-data">${createdTask.keywords}</p>
        <p class="task-size task-data">${createdTask.size}</p>
        <p class="task-profile task-data">${createdTask.profileName}</p>
        <div class="task-proxy task-data">
          <p class="${
            createdTask.proxies ? "task-proxy-green" : "task-proxy-idle"
          }"></p>
        </div>
        <p class="task-status task-data">Idle</p>
        <div class="task-toggle">
          <img class="task-img task-start" src="./images/start.svg" alt="" />
        </div>
        <div class="task-delete">
          <img class="task-img task-trash" src="./images/delete.svg" alt="" />
        </div>
      </div>
      `
    );
  }
  formatTaskColors();
});

//Delete task from electron store
$("body").on("click", ".task-trash", (task) => {
  ipc.send("delete-task", $(task.target).parent().parent().attr("id"));
});

//Delete profile from electron store
$("body").on("click", ".delete-profile", (profile) => {
  ipc.send("delete-profile", $(profile.target).parent().parent().attr("id"));
});

//Delete proxies list from electron store
$("body").on("click", ".delete-proxies", (proxies) => {
  ipc.send("delete-proxies", $(proxies.target).parent().parent().attr("id"));
});

//delete task from app
ipc.on("delete-task", (e, id) => {
  $("#" + id).remove();
  formatTaskColors();
});

//delete proxies list from app
ipc.on("delete-proxy", (e, id) => {
  $("#" + id).remove();
  $("#proxies-select option[value='" + id + "\x27]").remove();
  formatProxyColors();
});

//delete profile from app
ipc.on("delete-profile", (e, id) => {
  $("#" + id).remove();
  $("#profile-select option[value='" + id + "\x27]").remove();
  formatProfileColors();
});

//webhook
ipc.on("webhook-alert", (e, hook) => {
  create_alert(hook);
});

$("#save-hook")["click"](() => {
  ipc.send("save-webhook", $("#settings-webhook")["val"]());
});

$("#test-hook")["click"](() => {
  ipc.send("test-webhook", $("#settings-webhook")["val"]());
});

ipc.on("add-webhook", (e, hook) => {
  $("#settings-webhook").val(hook ? hook : "");
});

$("#save-delay")["click"](() => {
  ipc.send("save-delay", $("#checkout-delay")["val"]());
});

ipc.on("add-delay", (e, hook) => {
  $("#checkout-delay").val(hook ? hook : "");
});

//Test proxies
$("#test-list").click(() => {
  $("#tested-div").empty();
  let list = $("#proxy-area")["val"]()["split"]("\x0a");
  let result = [];
  if (list.length > 0) {
    for (let i = 0; i < list.length; i++) {
      let proxy = list[i].trim();
      result.push({ proxy: proxy, id: uuid() });
    }
    testProxies(result);
  }
});
let testProxies = (proxies) => {
  for (let i = 0x0; i < proxies.length; i++) {
    $("#tested-div").append(
      `
      <div id="${proxies[i].id}" class="tested-proxy ${
        i % 2 == 0 ? "even" : "odd"
      }">
      <p class="list-ip">${
        proxies[i].proxy ? `${proxies[i].proxy}` : `${ip.address()} (YOUR IP)`
      }</p>
      <p class="list-status">Testing</p>
      <p class="list-speed"></p>
      </div>
      
      `
    );
    testProxy(proxies[i]);
  }
};

let testProxy = (proxy) => {
  const link = $("#website-link").val();

  let URL = {
    method: "GET",
    url: "https://www.supremenewyork.com/shop.json",

    gzip: true,
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36",
    },
    timeout: 0xea60,
    proxy: formatProxy(proxy["proxy"]),
    time: true,
    strictSSL: true,
  };
  request(URL, (err, resp, body) => {
    if (err) {
      $("#" + proxy.id + " > p.list-speed").text("0");
      $("#" + proxy.id + " > p.list-status").text("Bad");
      $("#" + proxy.id + " > p.list-status").addClass("bad-text");
    } else if (resp.statusCode == 0xc8 || resp.statusCode == 0x194) {
      $("#" + proxy.id + " > p.list-speed").text(
        "" + resp["elapsedTime"] + "ms"
      );
      $("#" + proxy.id + " > p.list-status").text("Good");
      $("#" + proxy.id + " > p.list-status").addClass("good-text");
    } else {
      $("#" + proxy.id + " > p.list-speed").text("" + resp["elapsedTime"]);
      $("#" + proxy.id + " > p.list-status").text("Banned");
      $("#" + proxy.id + " > p.list-status").addClass("bad-text");
    }
  });
};

//add keywords to field when selecting hot item
$("body").on("click", ".product-button", (item) => {
  $("#keywords").val(item.target.id);
});

// clear all notifcations
$("#clear-all").click(() => {
  $("#notifs").empty();
  $("#notif-box").fadeOut(50, () => {});
});

//start all tasks
$("#start-all").click(() => {
  $("#start-all").addClass("start-all-on");
  ipc.send("start-all-tasks");
});

//stop all tasks
$("#stop-all").click(() => {
  ipc.send("stop-all-tasks");
});

$("body").on("click", ".task-start", (task) => {
  ipc.send("toggle-task", $(task.target).parent().parent().attr("id"));
});

ipc.on("show-start", (e, id) => {
  $("#" + id + " > div.task-toggle > img").attr("src", "./images/start.svg");
  updateStatus(id, "Stopped", "error");
});

ipc.on("show-stop", (e, id) => {
  $("#" + id + " > div.task-toggle > img").attr("src", "./images/stop.svg");
});

ipc.on("update-status", (e, id, title, status) => {
  return updateStatus(id, title, status);
});

ipc.on("update-product", (e, id, product) => {
  $("#" + id + " > p.task-product").html(product);
});

ipc.on("update-size", (e, id, size) => {
  $("#" + id + " > p.task-size").html(size);
});

//open captcha harvester
$("#harvester").click(() => {
  ipc.send("open-harvester");
});

//send notications
ipc.on("notifcation", (e, type, notif) => {
  $("#notif-icon").show();
  $("#notif-button").addClass("ring");
  setTimeout(() => {
    $("#notif-button").removeClass("ring");
  }, 500);
  if (type == "checkout") {
    $("#notifs").append(
      `
      <div class="notif">
        <img class="notif-img" src="${
          notif.image_url ? `https:${notif.image_url}` : "./images/sup-logo.png"
        }" alt="" />
        <p class="notif-title">Successful Checkout</p>
        <p class="notif-desc">${notif.name}</p>
      </div>
      `
    );
  } else if (type === "update") {
    $("#notifs").append(
      `
      <div class="notif">
        <img class="notif-img" src="${"./images/logo.png"}" alt="" />
        <p class="notif-title">Update</p>
        <p class="notif-desc">${notif}</p>
      </div>
      `
    );
  }
});

//set user info
ipc.on("user-loggedIn", (e, user) => {
  $("#username").text(user.username);
  $("#profile-img").append(`
  <img src="${user.image}" width="60" height="60" />`);
});

//deactivate key
$("#deactivate").click(() => {
  ipc.send("deactivate");
});

//clear anaytics
$("#clear-analytics").click(() => {
  ipc.send("clear");
});

ipc.on("version", (e, v) => {
  $("#version").text(`v${v}`);
});
