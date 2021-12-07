/*

Perimeter bypass.
Install dependencies:

npm install puppeteer @antiadmin/anticaptchaofficial

Run in head-on mode:
node perimeterx.js

* */

const anticaptcha = require("@antiadmin/anticaptchaofficial");
const pup = require('puppeteer');

//Anti-captcha.com API key
const apiKey = 'API_KEY_HERE';

//control address with PerimeterX captcha
const url = 'https://www.walmart.com/blocked?url=L3Byb2R1Y3QvOTU0MjE4MjUyL3NlbGxlcnM=&uuid=9957eb60-f319-11eb-afcc-5b8dc3dc9e62&vid=98d54de1-f319-11eb-8873-ed95dbe093ae&g=b';

let browser = null;
let page = null;


(async () => {

    anticaptcha.setAPIKey(apiKey);
    const balance = await anticaptcha.getBalance();
    if (balance <= 0) {
        console.log('Topup your anti-captcha.com balance!');
        return;
    } else {
        console.log('API key balance is '+balance+', continuing');
        // anticaptcha.shutUp(); //uncomment for silent captcha recognition
    }


    try {
        antigateResult = await anticaptcha.solveAntiGateTask(
            url,
            'Anti-bot screen bypass',
            {
                "css_selector": ".sign-in-widget" //this CSS selector '.sign-in-widget' is present only at the captcha page
            });
    } catch (e) {
        console.error("could not solve captcha: "+e.toString());
        return;
    }


    const fingerPrint = antigateResult.fingerprint;

    try {
        console.log('opening browser ..');


        let options = {
            headless: false,
            ignoreHTTPSErrors: true,
            devtools: true,
            args: [
                '--window-size='+fingerPrint['self.screen.width']+','+fingerPrint['self.screen.height']
            ]
        };
        browser = await pup.launch(options);

        console.log('creating new page ..');
        page = await browser.newPage();
    } catch (e) {
        console.log("could not open browser: "+e);
        return false;
    }

    //screen size
    console.log('setting view port to '+fingerPrint['self.screen.width']+'x'+fingerPrint['self.screen.height']);
    await page.setViewport({width: fingerPrint['self.screen.width'], height: fingerPrint['self.screen.height']});

    //user agent
    let userAgent = '';
    if (fingerPrint['self.navigator.userAgent']) {
        userAgent = fingerPrint['self.navigator.userAgent'];
    } else {
        if (fingerPrint['self.navigator.appVersion'] && fingerPrint['self.navigator.appCodeName']) {
            userAgent = fingerPrint['self.navigator.appCodeName'] + '/' + fingerPrint['self.navigator.appVersion']
        }
    }
    console.log('setting browser user agent to '+userAgent);
    await page.setUserAgent(userAgent);

    console.log('setting cookies');
    let cookies = [];
    for (const name in antigateResult.cookies) {
        cookies.push({ name: name, value: antigateResult.cookies[name], domain: antigateResult.domain })
    }
    await page.setCookie(...cookies);


    try {
        await page.goto(antigateResult.url, {
            waitUntil: "networkidle0"
        });
    } catch (e) {
        console.log('err while loading the page: '+e);
    }


    console.log('done');



})();