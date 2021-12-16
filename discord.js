/*

Register account at discord.com

npm install @antiadmin/anticaptchaofficial

Run:
node discord.js

* */

const anticaptcha = require("@antiadmin/anticaptchaofficial");

//Anti-captcha.com API key
const apiKey = 'API_KEY_HERE';

const username = 'myusername123453';
const password = 'SOMEP@ssword1343'
const email = 'myuseremail87842@gmail.com';

let confirmationLink = null;


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
            'https://discord.com/register',
            'discord registration',
            {
                "username": username,
                "password": password,
                "email": email
            });
    } catch (e) {
        console.error("could not solve captcha: "+e.toString());
        return;
    }

    console.log("\n\nAccount registered. Confirm it by clicking link in email.\n");
    console.log("Use these cookies for navigation to the website:\n");
    console.log(antigateResult.cookies);


    // uncomment the following, set confirmationLink to the value from email message
    // confirmationLink = "link from email message";

    /*
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
        await page.goto(confirmationLink, {
            waitUntil: "networkidle0"
        });
    } catch (e) {
        console.log('err while loading the page: '+e);
    }


    console.log('done');
    */


})();