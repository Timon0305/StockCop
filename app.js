const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const electronSettings = require("electron-settings");
const machineUuid = require("machine-uuid");
const { v4: uuidv4 } = require("uuid");
const request = require("request");
const updater = require("./scripts/updater");
const express = require("express");

global.Tasks = require(path.join(__dirname, "/scripts/Tasks"));
global.Profiles = require(path.join(__dirname, "/scripts/Profiles"));
global.Proxies = require(path.join(__dirname, "/scripts/Proxies"));
global.Task = require(path.join(__dirname, "/scripts/task"));
global.Webhooks = require(path.join(__dirname, "/scripts/Webhooks"));
global.Updater = require(path.join(__dirname, "/scripts/updater"));
global.tools = require(path.join(__dirname, "/scripts/tools"));

const isMac = process.platform === "darwin";

let activeTasks = {};
let mainWindow;
let authWindow;
let versionNumber = app.getVersion();

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1140,
    height: 750,
    minHeight: 750,
    minWidth: 1140,
    maxHeight: 750, //for production
    maxWidth: 1140, // for production
    title: "StockCop",
    frame: false,
    backgroundColor: "white",
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      devTools: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "/src/index.html"));

  mainWindow.webContents.on("did-finish-load", () => {
    let profiles = Profiles.get();
    let proxies = Proxies.get();
    let webhook = Webhooks.get();
    let tasks = Tasks.get();
    activeTasks = JSON.parse(JSON.stringify(tasks));
    let settings = electronSettings.getAll() || {};

    const user = {
      username: settings.username,
      image: `https://cdn.discordapp.com/avatars/${settings.discordId}/${settings["profile-img"]}.png?size=512`,
    };

    mainWindow.webContents.send("add-profiles", JSON.stringify(profiles));
    mainWindow.webContents.send("add-webhook", webhook["webhook"]);
    mainWindow.webContents.send("add-proxies", JSON.stringify(proxies));
    mainWindow.webContents.send("add-tasks", JSON.stringify(tasks));
    mainWindow.webContents.send("user-loggedIn", user);
    mainWindow.webContents.send("add-delay", settings.delay);
    mainWindow.webContents.send("add-declined", settings.totalDeclines);
    mainWindow.webContents.send("add-carted", settings.totalCarted);
    mainWindow.webContents.send("add-checkout", settings.totalCheckout);
    mainWindow.webContents.send("version", versionNumber);
    setTimeout(updater, 3000);
    pullDroplist(0);
  });
};

app.on("ready", () => {
  auth();
});

const auth = () => {
  let settings = electronSettings.getAll() || {};
  if (settings.key) {
    machineUuid().then((id) => {
      activate(settings.key, id, true);
    });
  } else {
    createAuth();
  }
};

const createAuth = () => {
  authWindow = new BrowserWindow({
    parent: mainWindow,
    width: 500,
    height: 280,
    minHeight: 280,
    minWidth: 500,
    maxHeight: 280,
    maxWidth: 500,
    frame: false,
    webPreferences: {
      webSecurity: true,
      nodeIntegration: true,
    },
  });

  authWindow.loadFile(path.join(__dirname, "/src/login.html"));
};

ipcMain.on("attempt-auth", (e, key) => {
  machineUuid().then((id) => {
    activate(key, id);
  });
});

function activate(key, id, boolean = false) {
  if (boolean) {
    let url = {
      url: "https://dash.stockcop.io/api/machine/validate",
      method: "POST",
      headers: { apiKey: "a5f69c3b-c0f7-46a9-aad7-e1ea8c91d32b" },
      json: { key, machine: id },
    };

    request(url, (error, res, body) => {
      if (res.statusCode === 200) {
        createWindow();
      } else {
        if (boolean) {
          electronSettings.set("key", null);
          createAuth();
        } else {
          authWindow.webContents.send(
            "auth-error",
            "Auth Error, contact admin via discord."
          );
        }
      }
    });
  } else {
    let urlData = {
      url: "https://dash.stockcop.io/api/machine/update",
      method: "POST",
      headers: { apiKey: "a5f69c3b-c0f7-46a9-aad7-e1ea8c91d32b" },
      json: { key, machine: id },
    };
    createWindow()
    // request(urlData, (error, res, body) => {
    //   if (error) {
    //     if (boolean) {
    //       app.quit();
    //     } else {
    //       authWindow.webContents.send("auth-error", "Error activating key");
    //     }
    //   } else if (res.statusCode == 200) {
    //     electronSettings.set("key", key);
    //     let data = {
    //       url: "https://dash.stockcop.io/api/get/user/key",
    //       method: "POST",
    //       headers: { apiKey: "a5f69c3b-c0f7-46a9-aad7-e1ea8c91d32b" },
    //       json: { key },
    //     };
    //
    //     request(data, (error, res, body) => {
    //       electronSettings.set("username", res.body.discordName);
    //       electronSettings.set("profile-img", res.body.avatar);
    //       electronSettings.set("discordId", res.body.id);
    //       createWindow();
    //     });
    //   } else {
    //     if (boolean) {
    //       electronSettings.set("key", null);
    //       createAuth();
    //     } else {
    //       console.log("error authing key");
    //       authWindow.webContents.send(
    //         "auth-error",
    //         "Key is invalid or has been binded."
    //       );
    //     }
    //   }
    // });
  }
}

ipcMain.on("clear", (e) => {
  electronSettings.set("totalDeclines", 0);
  electronSettings.set("totalCheckout", 0);
  electronSettings.set("totalCarted", 0);

  mainWindow.webContents.send("add-declined", 0);
  mainWindow.webContents.send("add-carted", 0);
  mainWindow.webContents.send("add-checkout", 0);
});

ipcMain.on("deactivate", (e) => {
  machineUuid().then((id) => {
    deactivate(id);
  });
});

function deactivate(hwid) {
  let settings = electronSettings.getAll() || {};
  const key = settings.key;

  let urlData = {
    url: "https://dash.stockcop.io/api/machine/update",
    method: "POST",
    headers: { apiKey: "a5f69c3b-c0f7-46a9-aad7-e1ea8c91d32b" },
    json: { machine: "a5f69c3b-c0f7-46a9-aad7-e1ea8c91d32b", key },
  };

  request(urlData, (error, res, body) => {
    if (error) {
      console.log(error);
    } else if (res.statusCode === 200) {
      electronSettings.set("username", null);
      electronSettings.set("profile-img", null);
      electronSettings.set("key", null);
      app.quit();
    }
  });
}

// get hotlist
let pullDroplist = (list) => {
  let URL = {
    method: "GET",
    url: "https://stockcopio.herokuapp.com/droplist",
    gzip: true,
    timeout: 0xea60,
    time: true,
    strictSSL: true,
  };
  request(URL, (err, resp, body) => {
    if (err || resp.statusCode !== 200) {
      list++;
      return setTimeout(() => {
        pullDroplist(list);
      }, 0x1388);
    }
    body = JSON.parse(body);
    mainWindow.webContents.send("update-droplist", body.dropList);
  });
};

//Profiles
ipcMain.on("save-profile", (e, profile) => {
  Profiles.save(profile);
  return mainWindow.webContents.send("saved-profile", profile);
});

ipcMain.on("update-profile", (e, profile, id) => {
  Profiles.update(id);
  return mainWindow.webContents.send("updated-profile", id);
});

ipcMain.on("pull-profile", (e, id) => {
  profile = Profiles.get(id);
  return mainWindow.webContents.send("edit-profile", profile);
});

//Delete profile
ipcMain.on("delete-profile", (e, id) => {
  if (id == "profiles") return;

  Profiles.delete(id);
  mainWindow.webContents.send("delete-profile", id);
});

//Tasks
ipcMain.on("add-task", async (e, task) => {
  try {
    if (task.proxies === "none") task.proxies = false;

    Tasks.save(task);
    activeTasks[task.id] = JSON.parse(JSON.stringify(task));

    return mainWindow.webContents.send("saved-task", task);
  } catch (err) {
    console.log(err);
    return mainWindow.webContents.send(
      "error-creating-task",
      "Error creating task."
    );
  }
});

ipcMain.on("delete-task", (e, id) => {
  if (id == "tasks") return;
  Tasks.delete(id);
  stopTask(id, true);
  mainWindow.webContents.send("delete-task", id);
});

ipcMain.on("toggle-task", (e, id) => {
  if (id == "tasks") return;
  if (activeTasks[id]["active"]) {
    stopTask(id, false);
  } else {
    startTask(id);
  }
});

ipcMain.on("start-all-tasks", (e) => {
  for (id in activeTasks) {
    if (!activeTasks[id]["active"]) {
      startTask(id);
    }
  }
});
ipcMain.on("stop-all-tasks", (e) => {
  for (id in activeTasks) {
    if (activeTasks[id]["active"]) {
      stopTask(id, false);
    }
  }
});

//stop / delete task
let stopTask = (id, deletable) => {
  activeTasks[id]["active"] = false;

  switch (activeTasks[id].site) {
    case "supreme":
      Task.stop.bind(activeTasks[id])();
      break;
    case "bestbuy":
      Bestbuy.stop.bind(activeTasks[id])();
      break;
    case "walmart":
      Walmart.stop.bind(activeTasks[id])();
      break;
  }

  if (deletable) {
    delete activeTasks[id];
  } else {
    return mainWindow.webContents.send("show-start", id);
  }
};

//start task
let startTask = (id) => {
  activeTasks[id]["active"] = true;

  switch (activeTasks[id].site) {
    case "supreme":
      Task.findProduct.bind(activeTasks[id])();
      break;
    case "bestbuy":
      Bestbuy.findProduct.bind(activeTasks[id])();
      break;
    case "walmart":
      Walmart.findProduct.bind(activeTasks[id])();
      break;
  }
  return mainWindow.webContents.send("show-stop", id);
};

//Proxies
//pull proxies list
ipcMain.on("pull-profile", (e, list) => {
  list = Proxies.get(list);
  mainWindow.webContents.send("edit-proxies", list);
});

//Quit and Min App
ipcMain.on("quit-app", (e) => {
  app.quit();
});

ipcMain.on("min-app", (e) => {
  mainWindow.minimize();
});

ipcMain.on("pull-proxies", (e, proxies) => {
  proxies = Proxies.get(proxies);
  mainWindow.webContents.send("edit-proxies", proxies);
});

//save proxies to electron store
ipcMain.on("save-proxies", (e, proxiesList) => {
  let results = [];

  proxiesList.proxies = proxiesList.proxies.split("\n");
  for (let i = 0; i < proxiesList.proxies.length; i++) {
    if (proxiesList.proxies[i].length > 0) {
      results.push(proxiesList.proxies[i].trim());
    }
  }
  proxiesList.proxies = results;
  if (!proxiesList.listName || proxiesList.listName.length == 0) {
    proxiesList.listName = "Proxy List";
  }
  Proxies.save(proxiesList);
  return mainWindow.webContents.send("saved-proxies", proxiesList);
});

//Update proxie list
ipcMain.on("update-proxies", (e, list) => {
  let results = [];
  list.proxies = list.proxies.split("\n");
  for (let i = 0; i < list.proxies.length; i++) {
    if (list.proxies[i].length > 0) {
      results.push(list.proxies[i].trim());
    }
  }
  list.proxies = results;
  if (!list.listName || list.listName.length == 0) {
    list.listName = "Proxy List";
  }
  Proxies.update(list);
  return mainWindow.webContents.send("updated-proxies", list);
});

//Delete proxies list
ipcMain.on("delete-proxies", (e, id) => {
  if (id == "proxies") return;

  Proxies.delete(id);
  mainWindow.webContents.send("delete-proxy", id);
});

//create notifcations
global["notification"] = (id, item) => {
  if (id === "checkout") {
    // createNotification(item);
    return mainWindow.webContents.send("notifcation", id, item);
  } else if (id === "update") {
    // createUpdateNotification(item);
    return mainWindow.webContents.send("notifcation", id, item);
  }
};

global["createNotification"] = (item) => {
  let notfi = new Notification({
    title: "StockCop",
    body: "Checked out " + (item["name"] ? item["name"] : ""),
    icon: path.join(__dirname, "/src/images/icon.png"),
    silent: false,
  });
  notfi.show();
};

global["createUpdateNotification"] = (msg) => {
  let notfi = new Notification({
    title: "StockCop",
    body: msg,
    icon: path.join(__dirname, "/src/images/icon.png"),
    silent: false,
  });
  notfi.show();
};

//Update statuses of tasks
global["updateStatus"] = (id, title, status) => {
  mainWindow.webContents.send("update-status", id, title, status);
};

global["update_declines"] = (total) => {
  let newTotal = 0;
  let settings = electronSettings.getAll() || {};

  if (!settings.totalDeclines) {
    newTotal += total;
  } else {
    settings.totalDeclines += total;

    newTotal = settings.totalDeclines;
  }

  electronSettings.set("totalDeclines", newTotal);
  mainWindow.webContents.send("add-declined", newTotal);
};

global["update_carted"] = (total) => {
  let newTotal = 0;
  let settings = electronSettings.getAll() || {};

  if (!settings.totalCarted) {
    newTotal += total;
  } else {
    settings.totalCarted += total;

    newTotal = settings.totalCarted;
  }

  electronSettings.set("totalCarted", newTotal);
  mainWindow.webContents.send("add-carted", newTotal);
};

global["update_checkout"] = (total) => {
  let newTotal = 0;
  let settings = electronSettings.getAll() || {};

  if (!settings.totalCheckout) {
    newTotal += total;
  } else {
    settings.totalCheckout += total;

    newTotal = settings.totalCheckout;
  }

  electronSettings.set("totalCheckout", newTotal);
  mainWindow.webContents.send("add-checkout", newTotal);
};

global["updateProduct"] = (id, product) => {
  mainWindow.webContents.send("update-product", id, product);
};
global["updateSize"] = (id, size) => {
  mainWindow.webContents.send("update-size", id, size);
};

let capWindow = false;

//open capatcha harvester
ipcMain.on("open-harvester", (e) => {
  let PORT = 18277;

  if (!capWindow) {
    capWindow = new BrowserWindow({
      width: 455,
      height: 620,
      frame: false,
      transparent: true,
      icon: path.join(__dirname, "/src/images/logo.png"),
      show: false,
      maximizable: false,
      resizable: false,
      webPreferences: { nodeIntegration: true, partition: "1" },
    });
    capWindow.webContents.setUserAgent(
      "Mozilla/5.0\x20(Windows\x20NT\x2010.0;\x20Win64;\x20x64)\x20AppleWebKit/537.36\x20(KHTML,\x20like\x20Gecko)\x20Chrome/80.0.3987.141\x20Safari/537.36"
    );
    let server = express();
    server.set("port", PORT);
    let page = server.listen(server.get("port"), () => {
      captcha();
    });
    let captcha = () => {
      server.get("/", (res, req) => {
        req.sendFile(path.join(__dirname, "/src/captcha.html"));

        capWindow.webContents.session
          .setProxy({ proxyRules: "" })
          .then(() => {});
      });
      capWindow.webContents.session
        .setProxy({ proxyRules: "http://localhost:" + PORT })
        .then(() => {
          setTimeout(() => {
            capWindow.loadURL("http://www.supremenewyork.com/");
          }, 0x64);
          capWindow.once("ready-to-show", function () {
            setTimeout(() => {
              capWindow.show();
            }, 0x9c4);
          });
          capWindow.once("closed", function () {
            capWindow = null;
            page.close();
          });
        });
    };
  }
});

ipcMain.on("quit-harvester", (e) => {
  capWindow.close();
  capWindow = null;
});
ipcMain.on("open-login", (e, _0x47be47) => {
  var harvesterWindow = new BrowserWindow({
    width: 0x3de,
    height: 0x26c,
    frame: true,
    transparent: false,
    icon: path.join(__dirname, "/src/images/logo.png"),
    show: true,
    maximizable: false,
    resizable: true,
    webPreferences: { partition: "1" },
  });
  const google = { urls: ["https://accounts.google.com/*"] };
  harvesterWindow.webContents.session.webRequest.onBeforeSendHeaders(
    google,
    (_0xd5710f, _0x10d9b1) => {
      _0xd5710f["requestHeaders"]["DNT"] = "1";
      _0xd5710f["requestHeaders"]["User-Agent"] =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/71.0";
      _0x10d9b1({ cancel: false, requestHeaders: _0xd5710f["requestHeaders"] });
    }
  );
  harvesterWindow["loadURL"]("https://www.google.com");
  harvesterWindow.once("ready-to-show", () => {
    harvesterWindow["show"]();
  });
});

global["captchaQueue"] = {};
global["captchaBeingSolved"] = false;
global["requestCaptcha"] = (token) => {
  if (capWindow) {
    let uuid = uuidv4();
    console.log(token);
    if (Object.keys(captchaQueue).length === 0) {
      console.log(Object.keys(captchaQueue)["length"]);
      capWindow.webContents["send"]("add-captcha", uuid);
      captchaBeingSolved = true;
    } else if (!captchaBeingSolved) {
      captchaBeingSolved = true;
      capWindow.webContents["send"]("add-captcha", uuid);
    }
    captchaQueue[uuid] = {
      solved: false,
      token: null,
      requestedAt: Date["now"](),
      solvedAt: null,
    };
    let solver = (id, captcha) => {
      if (captchaQueue[id]["solved"]) {
        console.log("being sent here", id);
        return [captcha(captchaQueue[id]["token"]), id];
      } else {
        setTimeout(() => {
          solver(id, captcha);
        }, 0x32);
      }
    };
    setTimeout(() => {
      solver(uuid, token);
    }, 0x32);
  } else {
    console.log("or being sent here");
    return token(false);
  }
};

ipcMain.on("got-captcha", (e, id, token) => {
  console.log("being called");
  captchaQueue[id]["solved"] = true;
  captchaQueue[id]["token"] = token;
  captchaQueue[id]["solvedAt"] = Date.now();
  captchaBeingSolved = false;
  for (queued in captchaQueue) {
    if (!captchaQueue[queued]["solved"] && !captchaBeingSolved) {
      capWindow.webContents.send("add-captcha", queued);
      break;
    }
  }
});

//test webhook/save webhook
ipcMain.on("test-webhook", (e, hook) => {
  Webhooks.test(hook);
  mainWindow.webContents.send("webhook-alert", "Test sent");
});
ipcMain.on("save-webhook", (e, hook) => {
  Webhooks.save(hook);
  mainWindow.webContents.send("webhook-alert", "Webhook\x20saved");
});

ipcMain.on("save-delay", (e, delay) => {
  electronSettings.set("delay", Number(delay));
  mainWindow.webContents.send("webhook-alert", "Delay Saved");
});

// app stuff
app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
