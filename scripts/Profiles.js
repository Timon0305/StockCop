const Store = require("electron-store");
let store = new Store({ name: "Profiles" });

exports.save = (profile) => {
  return store.set(profile.id, profile);
};

exports.get = (profile) => {
  console.log(profile);
  if (profile) {
    return store.get(profile);
  } else return store.get();
};

exports.update = (profile) => {
  return store.set(profile.id, profile);
};

exports.delete = (id) => {
  return store.delete(id);
};
