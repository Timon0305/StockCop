const Store = require("electron-store");
let store = new Store({ name: "Proxies" });

exports.save = (proxies) => {
  return store.set(proxies.id, proxies);
};

exports.get = (proxies) => {
  if (proxies) {
    return store.get(proxies);
  } else return store.get();
};

exports.update = (proxies) => {
  return store.set(proxies.id, proxies);
};

exports.delete = (id) => {
  return store.delete(id);
};
