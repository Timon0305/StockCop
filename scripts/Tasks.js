const Store = require("electron-store");
let store = new Store({ name: "Tasks" });

exports.save = (task) => {
  return store.set(task.id, task);
};

exports.get = (task) => {
  if (task) {
    return store.get(task);
  } else {
    return store.get();
  }
};

exports.update = (task) => {
  return store.set(task.id, task);
};

exports.delete = (id) => {
  return store.delete(id);
};
