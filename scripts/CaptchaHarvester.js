const Body = require("koa-body");
const Router = require("koa-router");
const Application = require("koa");
const $ = require("ramda");
const Dayjs = require("dayjs");
const path = require("path");
const util = require("util");
const fs = require("fs");
// const GoogleLogin = require('./Auto-Google-SignIn');
const puppeteer = require("puppeteer-extra");
puppeteer.use(require("puppeteer-extra-plugin-stealth")());

// USA CHROMIUM 77 → LA VERSIONE 80 TI RENDE LA VITA DURA, si ma la 77 ti genera dei token di merda

const EventEmitter = require("events").EventEmitter;
const filesEE = new EventEmitter();

const koabody = new Body();
const app = new Application();
const router = new Router();

// process.env.APPDATA corrisponde a C:\Users\GIULIO\AppData\Roaming
const mainfolder =
  process.env.APPDATA ||
  ("darwin" === process.platform
    ? `${process.env.HOME}/Library/Preferences`
    : `${process.env.HOME}/.local/share`);
const CAPTCHAHARVESTERFOLDER = path.join(mainfolder, "HARVESTER");
console.log(mainfolder);
const gcookiesfolder = path.join(CAPTCHAHARVESTERFOLDER, "g-cookies");
const creacartella = util.promisify(fs.mkdir); //function for creating folders
const scrittura = util.promisify(fs.writeFile); //function for writing files
const lettura = util.promisify(fs.readFile); //function for reading folders

const resolve = require("path").resolve;
const Chromium77Path = resolve("chrome77/chrome-win/chrome.exe");
//Better using Chrome 77, it gets one clicks far more frequently

///CHANGE THESE TWO VARIABLES FOR MAKE IT A UNIVERSAL HARVESTER
const hostname = "http://www.supremenewyork.com/"; //window.location
const sitekey = "6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz";

const vestitodaninja = async (page) => {
  //Imposta user agent
  // const useragent='Mozilla/5.0 (Linux; Android 7.0; VKY-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36'
  // await page.setUserAgent(userAgent.data.userAgent);//userAgent.data.userAgent

  // Bypassa Webdriver Test
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });
  });

  // Bypassa Chrome Test.
  await page.evaluateOnNewDocument(() => {
    window.navigator.chrome = {
      runtime: {},
      // etc.
    };
  });

  // Pass the Permissions Test.
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    return (window.navigator.permissions.query = (parameters) =>
      parameters.name === "notifications"
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters));
  });

  // Pass the Plugins Length Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` erty to use a custom getter.
    Object.defineProperty(navigator, "plugins", {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5],
    });
  });

  // Pass the Languages Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });
};

class CaptchaHarvester {
  constructor(account, arraytoken) {
    this.account = account;
    this.arraytoken = arraytoken;
  }

  async CreateCookieDirectory() {
    try {
      fs.existsSync(gcookiesfolder) ||
        (await creacartella(gcookiesfolder, { recursive: true })); //Check if the folder where are located the g-cookies exists. if it doesn't exist, it creates it
      console.log("Folder for g-cookies ready...");
    } catch (err) {
      console.log(err);
    }
  }

  CheckCookiesfiles(GoogleCookiesPath) {
    fs.readdir(gcookiesfolder, (err, files) => {
      files.forEach((file) => {
        this.percorso = path.join(gcookiesfolder, file);
        if (!GoogleCookiesPath.includes(this.percorso))
          GoogleCookiesPath.push(this.percorso);
      });
    });
  }

  async UpdateElectronCookies(cookies) {
    //save the cookies when you click on "get-cookies"
    try {
      this.filepath = path.join(
        mainfolder,
        `HARVESTER/g-cookies/${this.account}_cookies.json`
      );
      scrittura(this.filepath, JSON.stringify(cookies));
      console.log("File updated:", this.filepath);
    } catch (err) {
      console.log("Did not manage in saving cookies");
    }
  }

  async UpdateCookies() {
    try {
      (this.CDP = await this.pagina.target().createCDPSession()), //in questo modo posso dialogare con il devtools e prendere i cookies
        (this.cookies = (await this.CDP.send("Network.getAllCookies"))[
          "cookies"
        ]); //prende tutti i cookies
      console.log("There are", this.cookies.length, "cookies...");
      this.filepath = path.join(
        mainfolder,
        `HARVESTER/g-cookies/${this.account.gmail}_cookies.json`
      );
      scrittura(this.filepath, JSON.stringify(this.cookies)); //scrive i cookies all'interno dell'i-esimo file cookies.json
      console.log("File updated:", this.filepath);
    } catch (err) {
      console.log("Did not manage in saving cookies");
    }
  }

  async ImpostaCookies(pagina, percorsofile) {
    console.log("Trying to set cookies...");
    try {
      this.biscottigrezzi = await lettura(percorsofile);
      console.log(percorsofile);
      this.biscottibuoni = JSON.parse(this.biscottigrezzi);
      await pagina.setCookie(...this.biscottibuoni);
      console.log("Cookies set");
    } catch (err) {
      console.log(
        "Could not find the cookies-file, there will be less chances of getting one-clicks"
      );
      // console.log(err)
    }
  }

  async Harvest(porta, percorsofile, autoclick) {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        devtools: false,
        // executablePath: Chromium77Path,
        ignoreDefaultArgs: true,
        args: ["--window-size=320,569"],
      });
      this.captchapage = (await this.browser.pages())[0];

      await vestitodaninja(this.captchapage);
      console.log("Inizializzo il tool...");
      try {
        await this.ImpostaCookies(this.captchapage, percorsofile); // I cookies sono davvero impostati?
        await this.captchapage.setRequestInterception(true);
      } catch (e) {}

      this.captchahtml = `\n  <!DOCTYPE html>
            \n  <html lang="en">
            \n  <head>
            \n    <title>Captcha Harvester</title>
            \n    <script src="https://www.google.com/recaptcha/api.js" async defer>
            <\/script>
            \n    <style>
            \n      .flex {
                \n        display: flex;
                \n      }
                \n      .justify-center {
                    \n        justify-content: center;
                    \n      }
                    \n      .items-center {
                        \n        align-items: center;
                        \n      }
                        \n      .mt-6 {
                            \n        margin-top: 1.5rem;
                            \n      }
                            \n    </style>
                            \n  </head>
                            \n  <body>
                            \n    <div class="flex justify-center items-center mt-6">
                            \n      <div id="captchaFrame" class="g-recaptcha" data-callback="sendCaptcha" data-sitekey=${sitekey} data-theme="dark"></div>
                            \n    </div>
                            \n  </body>
                            \n  </html>
                            \n  `;

      this.captchapage.on("request", (e) => {
        e.url() === hostname
          ? e.respond({
              status: 200,
              contentType: "text/html",
              body: this.captchahtml,
            })
          : e.continue();
      }),
        await this.captchapage.goto(hostname); //Carica l'Harvest tool

      console.log("Lancio il Captcha-Harvester sulla porta", porta + "..."),
        router.get("/fetch", koabody, (e) => {
          (e.request.body = this.arraytoken),
            (e.body = JSON.stringify(e.request.body)),
            arraytoken.splice(0, 1);
        }),
        app.use(router.routes()).use(router.allowedMethods()),
        app.listen(porta);

      this.captchareset = () => this.window.grecaptcha.reset();

      if (autoclick) {
        setInterval(async () => {
          try {
            await this.captchapage.waitForSelector("#captchaFrame");
            await this.captchapage.click("#captchaFrame");
          } catch (e) {}
        }, 5000);
      }

      //Estrazione del token...
      await this.captchapage.exposeFunction("sendCaptcha", (valore) => {
        this.tokenestratto = {
          token: valore,
          timestamp: new Dayjs().format(),
          host: hostname,
          sitekey: sitekey,
        };
        this.arraytoken.push(this.tokenestratto),
          console.log("Token harvested:", this.tokenestratto);
        // console.log('Hai estratto un token per il captcha:',this.tokenestratto.timestamp)
        if (valore) {
          (async () => {
            await this.captchapage.reload();
          })();
        }
        (async () => {
          await this.captchapage.evaluate(this.captchareset);
        })();
      });
    } catch (e) {
      console.log(e);
      await this.captchapage.close();
      await this.browser.close();
    }
    // finally{
    //     await this.captchapage.close()
    //     await this.browser.close()
    // }
  }

  UpdateArrayToken = () => {
    //Aggiorna i token presenti nella GIARA
    this.removetoken = (t) => {
      try {
        this.now = new Dayjs();
        this.a = new Dayjs(t.timestamp);
        this.now.diff(this.a, "second") > 59 &&
          (console.log(this.now.format(), "Removing expired token"),
          this.arraytoken.splice(0, 1),
          console.log("token rimasti:", this.arraytoken.length));
      } catch (err) {}
    };
    //Controlla ogni secondo che l'array sia più lungo d zero così da triggerare la rimozione
    setInterval(() => {
      this.arraytoken.length > 0 && $.map(this.removetoken, this.arraytoken);
    }, 1e3);
  };
}

//////////////INSTANCE (decomment it and launch it using the command "node captchaharvester" to see it working)

// var Jar = []
// var Cookiespath = 'C:/Users/GIULIO/AppData/Roaming/HARVESTER/g-cookies/g-cookies.json'
// var port = 3001
// var autoclick = false; // Set it true and it's going to autoclick the captcha solution after 5 secs

// (async()=>{
//     var coookiesThief = new CookiesThief(null,Jar)
//     console.log('Lancio harvester con file:',Cookiespath)
//     await coookiesThief.Harvest(port,Cookiespath,autoclick)
//   })()

module.exports = CaptchaHarvester;
