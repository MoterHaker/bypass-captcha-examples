/*

CloudFlare bypass with Anti-Captcha plugin.
Install dependencies:

npm install adm-zip puppeteer-extra puppeteer-extra-plugin-stealth puppeteer

Run in headless mode:
xvfb-run node cloudfare.js

To install xvfb run:
apt update
apt install -y xvfb

* */

const https = require('https');
const fs = require('fs');
const AdmZip = require("adm-zip");
const pup = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
pup.use(StealthPlugin())

//address with Cloudflare
const url = 'https://www.foodproductdata.com/search?q=028000428433';

//control address behind Cloudflare
const checkUrl = 'https://www.foodproductdata.com/nesquik-chocolate-powder-20.1oz-028000428433';

//Anti-captcha.com API key
const apiKey = 'API_KEY_HERE';


let browser = null;
let page = null;


(async () => {

    if (apiKey.length !== 32) {
        console.error('Invalid API key');
        return;
    }

    try {
        await testPlugin();
    } catch (e) {
        failCallback('Could not download plugin: '+e.toString());
        return;
    }

    //configuring API key
    if (fs.existsSync('./plugin/js/config_ac_api_key.js')) {
        let confData = fs.readFileSync('./plugin/js/config_ac_api_key.js', 'utf8');
        confData = confData.replace(/antiCapthaPredefinedApiKey = ''/g, `antiCapthaPredefinedApiKey = '${apiKey}'`);
        fs.writeFileSync('./plugin/js/config_ac_api_key.js', confData, 'utf8');
    } else {
        failCallback('plugin configuration file not found');
        return;
    }

    try {
        console.log('opening browser ..');


        let options = {
            headless: false,
            ignoreDefaultArgs: ["--disable-extensions","--enable-automation"],
            args: [
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--allow-running-insecure-content',
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions-except=./plugin',
                '--load-extension=./plugin',
                '--no-sandbox'
            ]
        };
        browser = await pup.launch(options);


        console.log('creating new page ..');
        page = await browser.newPage();
    } catch (e) {
        failCallback("could not open browser: "+e);
        return false;
    }

    //screen size
    await page.setViewport({width: 1360, height: 1000});

    console.log('navigating to cloudflare');
    try {
        await page.goto(url, {
            waitUntil: "networkidle0"
        });
    } catch (e) {
        console.log('err while loading the page: '+e);
    }

    let currentUrl = await page.evaluate(async() => {
       return new Promise((resolve => {
           resolve(document.location.href);
       }))
    });
    if (currentUrl === checkUrl) {
        successCallback('We are already on the target page '+checkUrl)
        return;
    }

    console.log('waiting for solution result..');
    await page.setDefaultNavigationTimeout(0);
    await page.waitForNavigation();
    console.log('redirected to next page');

    currentUrl = await page.evaluate(async() => {
       return new Promise((resolve => {
           resolve(document.location.href);
       }))
    });
    console.log('current address is '+currentUrl);

    if (currentUrl === url) {
        failCallback('Could not pass cloudflare :(');
        return;
    }
    if (currentUrl === checkUrl) {
        successCallback('Cloudflare passed');
    } else {
        failCallback('Navigated to unexpected address. Check if it is the one!');
    }


})();


function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}

async function testPlugin() {
    return new Promise(((resolve, reject) => {
        if (!fs.existsSync('./plugin')) {
            console.log('downloading plugin..');
            download("https://antcpt.com/downloads/anticaptcha/chrome/anticaptcha-plugin_v0.56.zip","./plugin.zip")
                .then(() => {
                    console.log('unzipping plugin..');
                    const zip = new AdmZip("./plugin.zip");
                    zip.extractAllTo("./plugin/", true);
                    resolve();
                })
                .catch(e => {
                    console.error('something went wrong while downloading plugin: '+e.toString());
                    reject(e)
                });
        } else {
            console.log('plugin already exists');
            resolve();
        }
    }))

}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    // Check file does not exist yet before hitting network
    fs.access(dest, fs.constants.F_OK, (err) => {

        if (err === null) reject('File already exists');

        const request = https.get(url, response => {
            if (response.statusCode === 200) {

              const file = fs.createWriteStream(dest, { flags: 'wx' });
              file.on('finish', () => resolve());
              file.on('error', err => {
                file.close();
                if (err.code === 'EEXIST') reject('File already exists');
                else fs.unlink(dest, () => reject(err.message)); // Delete temp file
              });
              response.pipe(file);
            } else if (response.statusCode === 302 || response.statusCode === 301) {
              //Recursively follow redirects, only a 200 will resolve.
              download(response.headers.location, dest).then(() => resolve());
            } else {
              reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
            }
          });

          request.on('error', err => {
            reject(err.message);
          });
    });
  });
}

function successCallback(result) {
    console.log('Successfully passed: '+result);
    console.log('closing browser .. ');
    if (browser) browser.close();
}

function failCallback(code) {
    console.log('Failed to pass: '+code);
    console.log('closing browser .. ');
    if (browser) browser.close();
}
