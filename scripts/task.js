const request = require("request").defaults({ gzip: true });
const cheerio = require("cheerio");
const ticketgen = require("titanium-ticket-api-node");
const electronSettings = require("electron-settings");
let settings = electronSettings.getAll() || {};

exports.Task = class {
  constructor(opts) {
    Object.assign(this, opts);
  }
};

exports.findProduct = function () {
  this.jar = request.jar();
  this.proxy = exports.randomProxy.bind(this)();

  if (!this.active) {
    return exports.stop.bind(this)();
  }
  updateStatus(this.id, "Fetching products", "blue");

  request(
    {
      url: "https://hype-supreme-api-mbn1ba.herokuapp.com/api/monitor",
      json: true,
    },
    (err, resp, body) => {
      if (err) {
        console.log(err);
        updateStatus(this.id, "Error Fetching products", "error");
        return setTimeout(exports.findProduct.bind(this), 500);
      }

      try {
        let found;

        monitorLoop: for (let monitor in body) {
          prodLoop: for (let product of body[monitor]) {
            let prod = product.name.toLowerCase();

            kwLoop: for (let kw of this.keywords.split(",")) {
              let [pos, k] = [
                kw.startsWith("+"),
                kw.toLowerCase().trim().slice(1),
              ];

              if (
                (pos && !prod.includes(k.toLowerCase())) ||
                (!pos && prod.includes(k.toLowerCase()))
              ) {
                continue prodLoop;
              }
            }

            found = product;
            break monitorLoop;
          }
        }

        if (!found) {
          return setTimeout(exports.findProduct.bind(this), 500);
        }

        updateProduct(this.id, found.name);
        this.productId = found.id;
        this.productInfo = found;

        return exports.fetchStyles.bind(this)();
      } catch (e) {
        console.log(e);
        updateStatus(this.id, "Error Finding Product", "error");
        return setTimeout(exports.findProduct.bind(this), 500);
      }
    }
  );
};

exports.fetchStyles = function () {
  if (!this.active) {
    return exports.stop.bind(this)();
  }
  updateStatus(this.id, "Fetching styles", "blue");

  request(
    {
      url: `https://www.supremenewyork.com/shop/${this.productId}.json`,
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://www.supremenewyork.com/mobile",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
        "x-requested-with": "XMLHttpRequest",
      },
      jar: this.jar,
      proxy: this.proxy,
      json: true,
    },
    (err, resp, body) => {
      if (err) {
        updateStatus(this.id, "Error Fetching styles", "error");
        return setTimeout(exports.fetchStyles.bind(this), 500);
      }

      try {
        let style, size;
        for (let sty of body.styles) {
          if (!sty.name.toLowerCase().includes(this.color.toLowerCase())) {
            continue;
          }

          style = sty;
        }
        if (this.color == "" && this.color.length == 0) {
          style = body.styles.random();
        }

        if (!style) {
          return updateStatus(this.id, "Style not found", "error");
        }

        for (let s of style.sizes) {
          if (s.name.toLowerCase() == this.size.toLowerCase()) {
            size = s;
            break;
          }
        }
        if (this.size.toLowerCase() == "random") {
          size = style.sizes.random();
        }

        if (!size) {
          return updateStatus(this.id, "Size not found", "error");
        }

        updateSize(this.id, size.name);
        this.styleId = style.id;
        this.sizeId = size.id;

        updateStatus(this.id, "Size found", "success");

        return exports.cart.bind(this)();
      } catch (e) {
        console.log(e);
        updateStatus(this.id, "Error Fetching Styles", "error");
        return setTimeout(exports.fetchStyles.bind(this), 500);
      }
    }
  );
};

exports.cart = function () {
  if (!this.active) {
    return exports.stop.bind(this)();
  }
  updateStatus(this.id, "Adding to Cart", "blue");

  console.log("before atc -", (Date.now() / 1000).toFixed(1));
  const userAgent =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1";

  const options = {
    method: "GET",
    url: "http://134.122.91.176:8721/api/v1/ticketjs",
    headers: {
      "X-API-KEY": "TEST",
    },
  };
  request(options, (err, resp, body) => {
    if (err) {
      updateStatus(this.id, "Error grabbing atc ticket.", "error");
      return setTimeout(exports.fetchStyles.bind(this), 500);
    }

    const value = body;
    console.log("first ticket grab ", value);

    this.jar.setCookie(
      value,
      "https://www.supremenewyork.com",
      (error, cookie) => {
        if (error) {
          throw error;
        }
        console.log(cookie);
      }
    );

    request(
      {
        method: "POST",
        url: `https://www.supremenewyork.com/shop/${this.productId}/add.json`,
        headers: {
          accept: "application/json",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://www.supremenewyork.com",
          referer: "https://www.supremenewyork.com/mobile",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": userAgent,
          "x-requested-with": "XMLHttpRequest",
        },
        json: true,
        form: {
          st: this.styleId,
          s: this.sizeId,
          qty: 1,
        },
        jar: this.jar,
        proxy: this.proxy,
      },
      (err, resp, body) => {
        console.log(body);
        if (err) {
          updateStatus(this.id, "Error Adding to Cart", "error");
          return setTimeout(exports.fetchStyles.bind(this), 500);
        }
        try {
          if ((body.cart && body.cart.length == 0) || !body.success) {
            updateStatus(this.id, "Out of Stock", "yellow");
            return exports.restocks.bind(this)();
          }

          updateStatus(this.id, "Added to Cart", "success");
          update_carted(1);

          let cookies = this.jar.getCookies("https://www.supremenewyork.com");
          console.log(this.jar);

          let pureCart = cookies.find(({ key }) => key == "pure_cart").value;

          if (!pureCart) {
            updateStatus(this.id, "Error Adding to Cart", "error");
            return setTimeout(exports.cart.bind(this), 500);
          }
          this.pureCart = pureCart;

          // this.ticket = response;

          console.log("after atc  -", (Date.now() / 1000).toFixed(1));

          return exports.parseForm.bind(this)();
          // return exports.solveTicket.bind(this)()
        } catch (e) {
          console.log(e);
          updateStatus(this.id, "Error Adding to Cart", "error");
          setTimeout(exports.cart.bind(this), 500);
        }
      }
    );
  });
};

exports.restocks = function () {
  if (!this.active) {
    return exports.stop.bind(this)();
  }
  updateStatus(this.id, "Checking for Restocks", "blue");

  this.styleId = null;
  this.sizeId = null;

  request(
    {
      url: `https://www.supremenewyork.com/shop/${this.productId}.json`,
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://www.supremenewyork.com/mobile",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
        "x-requested-with": "XMLHttpRequest",
      },
      jar: this.jar,
      proxy: this.proxy,
      json: true,
    },
    (err, resp, body) => {
      if (err) {
        updateStatus(this.id, "Error Fetching styles", "error");
        return setTimeout(exports.fetchStyles.bind(this), 500);
      }

      try {
        let style, size;
        for (let sty of body.styles) {
          if (!sty.name.toLowerCase().includes(this.color.toLowerCase())) {
            continue;
          }

          style = sty;
        }
        if (this.color == "" && this.color.length == 0) {
          style = body.styles.filter(
            (x) => x.sizes.filter((y) => y.stock_level > 0).length > 0
          );
          if (style.length > 0) {
            style = style.random();
          } else {
            style = null;
          }
        }

        if (!style) {
          return setTimeout(exports.restocks.bind(this), 250);
        }

        for (let s of style.sizes) {
          if (s.name.toLowerCase() == this.size.toLowerCase()) {
            size = s;
            break;
          }
        }
        if (this.size.toLowerCase() == "random") {
          size = style.sizes.random();
          size = style.sizes.filter((x) => x.stock_level > 0);
          if (size.length > 0) {
            size = size.random();
          } else {
            size = null;
          }
        }

        if (!size) {
          return setTimeout(exports.restocks.bind(this), 250);
        }

        updateSize(this.id, size.name);
        this.styleId = style.id;
        this.sizeId = size.id;

        updateStatus(this.id, "Size found", "success");

        return exports.cart.bind(this)();
      } catch (e) {
        console.log(e);
        updateStatus(this.id, "Error Fetching Styles", "error");
        return setTimeout(exports.restocks.bind(this), 250);
      }
    }
  );
};

exports.parseForm = function () {
  if (!this.active) {
    return exports.stop.bind(this)();
  }
  updateStatus(this.id, "Parsing form", "blue");

  request(
    {
      url: "https://www.supremenewyork.com/mobile",
      // url: 'https://www.supremenewyork.com/checkout',
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": 1,
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
      },
      proxy: this.proxy,
      jar: this.jar,
    },
    (err, resp, body) => {
      if (err) {
        console.log(err);
        updateStatus(this.id, "Error Parsing Form", "error");
        return setTimeout(exports.parseForm.bind(this), 500);
      }

      let profile = JSON.parse(JSON.stringify(Profiles.get(this.profile)));
      let form = {};

      try {
        let $ = cheerio.load(body);
        // $ = cheerio.load($('#checkoutViewTemplate').html())
        let that = this;
        let _$ = cheerio.load($("#checkoutViewTemplate").html());

        // console.log($('#checkoutViewTemplate').html())
        _$("input,select").each(function () {
          // console.log(this.attribs)
          let id = $(this).attr("id");
          let name = $(this).attr("name");
          let value = $(this).attr("value");
          if (name == "current_time") {
            that.curTime = value;
          }
        });

        if (this.captcha) {
          updateStatus(this.id, "Waiting for Captcha", "yellow");
          return requestCaptcha((token, queueId) => {
            console.log("token here", token);
            if (!token) {
              return updateStatus(this.id, "Harvester Closed", "error");
            }

            that.captchaToken = token;
            delete captchaQueue[queueId];

            exports.solveTicket.bind(that)();
          });
        }
        return exports.solveTicket.bind(this)();
      } catch (e) {
        console.log(e);
        updateStatus(this.id, "Error Parsing form", "error");
        setTimeout(exports.parseForm.bind(this), 500);
      }
    }
  );
};

exports.solveTicket = function () {
  if (!this.active) {
    return exports.stop.bind(this)();
  }
  updateStatus(this.id, "Solving Ticket", "blue");

  const options = {
    method: "GET",
    url: "http://134.122.91.176:8721/api/v1/ticketjs",
    headers: {
      "X-API-KEY": "TEST",
    },
  };
  request(options, (err, resp, body) => {
    console.log("second ticket grab ", body);

    this.jar.setCookie(
      body,
      "https://www.supremenewyork.com",
      (error, cookie) => {
        if (error) {
          throw error;
        }
        console.log(cookie);
      }
    );

    console.log(this.jar);

    updateStatus(
      this.id,
      `Delaying for ${settings.delay ? settings.delay : "5000"}ms`,
      "yellow"
    );
    setTimeout(
      exports.checkout.bind(this),
      settings.delay ? settings.delay : 5000
    );
  });
};

exports.checkout = function () {
  if (!this.active) {
    return exports.stop.bind(this)();
  }
  updateStatus(this.id, "Checking Out", "blue");

  console.log(Date.now());
  const userAgent =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1";

  let profile = JSON.parse(JSON.stringify(Profiles.get(this.profile)));
  let form = {
    store_credit_id: "",
    from_mobile: 1,
    "cookie-sub": this.pureCart,
    current_time: this.curTime,
    same_as_billing_address: 1,
    scerkhaj: "CKCRSUJHXH",
    "order[billing_name]": "",
    "order[bn]": profile.fullName,
    "order[email]": profile.email,
    "order[tel]": formatPhoneNumber(profile.phone),
    "order[billing_address]": profile.address,
    "order[billing_address_2]": profile.apt,
    "order[billing_zip]": profile.zip,
    "order[billing_city]": profile.city,
    "order[billing_state]": profile.state,
    "order[billing_country]": profile.country,
    riearmxa: formatCC(profile.cardNumber),
    "credit_card[month]": profile.expMonth,
    "credit_card[year]": profile.expYear,
    rand: "",
    "credit_card[meknk]": profile.cvv,
    // "order[terms]": "0",
    "order[terms]": "1",
  };

  // disable once modes are added
  if (this.captchaToken) {
    form["g-recaptcha-response"] = this.captchaToken;
  }

  console.log("captcha", this.captchaToken);
  console.log("time", this.curTime);
  console.log(this.productInfo);
  request(
    {
      method: "POST",
      url: "https://www.supremenewyork.com/checkout.json",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        accept: "application/json",
        "accept-language":
          "en-DE,en;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6,fr;q=0.5,it;q=0.4",
        Origin: "https://www.supremenewyork.com",
        Referer: "https://www.supremenewyork.com/mobile",
        "Sec-Fetch-Dest": "empty",
        "Upgrade-Insecure-Requests": 1,
        "user-agent": userAgent,
        "x-requested-with": "XMLHttpRequest",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      proxy: this.proxy,
      jar: this.jar,
      form,
      json: true,
    },
    (err, resp, body) => {
      if (err) {
        console.log(err);
        updateStatus(this.id, "Error Checking out", "error");
        return setTimeout(exports.checkout.bind(this), 500);
      }

      try {
        let col, stat;
        console.log(body);

        switch (body.status) {
          case "dup":
          case "duplicate":
            stat = "Duplicate Order";
            col = "blue";
            break;
          case "outOfStock":
            stat = "Out of Stock";
            col = "error";
            break;
          default:
            stat = "Declined";
            col = "error";
            update_declines(1);
            break;
        }

        if (body.status == "queued") {
          updateStatus(this.id, "Checkout Queued", "yellow");
          this.slug = body.slug;
          return exports.poll.bind(this)();
        }

        updateStatus(this.id, stat, col);
        if ("outOfStock" == body.status) {
          return exports.restocks.bind(this)();
        }
      } catch (e) {
        console.log(e);
        updateStatus(this.id, "Error Checking out", "error");
        setTimeout(exports.checkout.bind(this), 2000);
      }
    }
  );
};

exports.poll = function () {
  if (!this.active) {
    return exports.stop.bind(this)();
  }
  updateStatus(this.id, "Polling Checkout", "blue");

  request(
    {
      url: `https://www.supremenewyork.com/checkout/${this.slug}/status.json`,
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://www.supremenewyork.com/checkout",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
        "x-requested-with": "XMLHttpRequest",
      },
      proxy: this.proxy,
      json: true,
    },
    (err, resp, body) => {
      if (err) {
        console.log(err);
        updateStatus(this.id, "Error Polling Checkout", "error");
        return setTimeout(exports.poll.bind(this), 500);
      }
      console.log(body);

      try {
        let col, stat;
        switch (body.status) {
          case "dup":
          case "duplicate":
            stat = "Duplicate Order";
            col = "blue";
            break;
          case "success":
          case "paid":
            col = "success";
            stat = "Stock Copped!";
            break;
          case "queued":
            col = "blue";
            stat = "Queued";
            break;
          default:
            stat = "Declined";
            col = "error";
            update_declines(1);
            break;
        }

        if (body.status == "queued") {
          updateStatus(this.id, "Checkout Queued", "yellow");
          return setTimeout(exports.poll.bind(this), 500);
        }

        if (body.status == "success" || body.status == "paid") {
          notification("checkout", this.productInfo);
          update_checkout(1);
          Webhooks.checkout(this.productInfo);
        }

        updateStatus(this.id, stat, col);
      } catch (e) {
        console.log(e);
        updateStatus(this.id, "Error Polling Checkout", "error");
        setTimeout(exports.poll.bind(this), 2000);
      }
    }
  );
};

exports.randomProxy = function () {
  let { proxies } = Proxies.get(this.proxies);
  if (!proxies) {
    return null;
  }
  return tools.formatProxy(proxies.random());
};

exports.stop = function () {
  updateStatus(this.id, "Stopped", "error");
  updateSize(this.id, this.size);
  updateProduct(this.id, this.keywords);
};

Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};

function formatPhoneNumber(phoneNumberString) {
  var cleaned = ("" + phoneNumberString).replace(/\D/g, "");
  var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return match[1] + "-" + match[2] + "-" + match[3];
  }
  return null;
}

function formatCC(value) {
  var v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  var matches = v.match(/\d{4,16}/g);
  var match = (matches && matches[0]) || "";
  var parts = [];

  for (i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  if (parts.length) {
    return parts.join(" ");
  } else {
    return value;
  }
}
