const Store = require("electron-store");
const { app } = require("electron");
const request = require("request");

exports.test = (webhook) => {
  var embeds = [
    {
      title: "StockCop Webhook Test",
      color: 14049925,
      timestamp: new Date(),
      thumbnail: {
        url: "https://i.imgur.com/mPNeIe0.png",
      },
      footer: {
        icon_url: "https://i.imgur.com/xMQ9HhS.png",
        text: `StockCop | v${app.getVersion()}`,
      },
      fields: [
        {
          name: "Test Complete",
          value: "Webhook is working :partying_face:",
          inline: false,
        },
      ],
    },
  ];

  var hookOpts = {
    url: webhook,
    method: "POST",
    json: true,
    resolveWithFullResponse: true,
    simple: false,
    body: { embeds },
  };

  request(hookOpts, (e, r, b) => {});
};

exports.checkout = (item) => {
  console.log(item);
  var embeds = [
    {
      title: "Order Successful!",
      color: 14049925,
      timestamp: new Date(),
      thumbnail: {
        url: `${
          item.image_url ? item.image_url : '"https://i.imgur.com/mPNeIe0.png"'
        }`,
      },
      footer: {
        icon_url: "https://i.imgur.com/xMQ9HhS.png",
        text: `StockCop | v${app.getVersion()}`,
      },
      fields: [
        {
          name: "Stock Copped!",
          value: `Copped ${item.name} :partying_face:`,
          inline: false,
        },
      ],
    },
  ];

  var hookOpts = {
    url: Webhooks.get()["webhook"],
    method: "POST",
    json: true,
    resolveWithFullResponse: true,
    simple: false,
    body: { embeds },
  };

  request(hookOpts, (e, r, b) => {});
};

let store = new Store({ name: "Settings" });
exports.save = (webhook) => {
  return store.set("webhook", webhook);
};

exports.get = () => {
  return store.get();
};
