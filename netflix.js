//npm install puppeteer fs @antiadmin/anticaptchaofficial
// update your login credentials
// run with command: "node netflix.js"

//IMPORTANT:
//1. Netflix utilizes Enterprise Recaptcha V3
//2. We use their obfuscated script located at https://codex.nflxext.com/*** CDN.
//   We modify it a little to add a function "getMyToken" at the place where they use token from Google.
//   In case of script modifcations, you may add this function yourself.
//   This function simply returns V3 Enterprise token which we substitute after solving it in Anti Captcha.
//3. Netflix login and password are required to test this script.
//4. Several attempts (about 10 times) should be made to sign in successfully.

const anticaptcha = require("@antiadmin/anticaptchaofficial");
const pup = require("puppeteer");
const fs = require('fs');


//API key for anti-captcha.com
const anticaptchaAPIKey = 'API_KEY_HERE';

//access data
const url = 'https://www.netflix.com/login';
const login = 'your@email.com';
const password = 'password';

let browser = null;
let page = null;
let token = null;



(async () => {

    anticaptcha.setAPIKey(anticaptchaAPIKey);
    const balance = await anticaptcha.getBalance();
    if (balance <= 0) {
        console.log('Buy your anticaptcha balance!');
        return;
    } else {
        console.log('API key balance is '+balance+', continuing');
        // anticaptcha.shutUp(); //uncomment for silent captcha recognition
    }

    try {
        console.log('opening browser ..');


        let options = {
            headless: false,
            ignoreHTTPSErrors: true,
            devtools: true
        };
        console.log(options);
        browser = await pup.launch(options);


        console.log('creating new page ..');
        page = await browser.newPage();
    } catch (e) {
        failCallback("could not open browser: "+e);
        return false;
    }


    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (request.url().indexOf('none') !== -1 && request.url().indexOf('js') !== -1 && request.url().indexOf('components') !== -1) {
            console.log('aborting '+request.url());
            request.abort();
        } else {
            request.continue();
        }
    });
    page.on('response', (response) => {
        if (response.url().indexOf('login') !== -1 && response.request().method() === 'POST') {
            console.log("\n\n==== captcha check response ====\n\n");
            console.log('status: '+response.status());
            if (response.status() !== 302) {
                failCallback("captcha result not accepted");
            } else {
                successCallback("successfully passed test");
            }
        }
    });

    console.log('solving captcha');

    try {
        token = await anticaptcha.solveRecaptchaV3Enterprise(url,'6Lf8hrcUAAAAAIpQAFW2VFjtiYnThOjZOA5xvLyR',0.9,'');
    } catch (e) {
        failCallback("could not solve captcha");
        return;
    }

    console.log('token is ready: '+token);


    try {
        await page.goto(url, {
            waitUntil: "domcontentloaded"
        });
    } catch (e) {
        console.log('err while loading the page: '+e);
    }

    // await delay(5000);


    console.log('adding modifed script');
    try {

        const path = require('path');
        let file = fs.readFileSync(path.resolve('.', '_netflix.js'), 'utf8');
        file = file.replace('RECAPTCHA_TOKEN', token);
        await page.addScriptTag({ content: file });
    } catch (e) {
        console.log('failed to insert script: '+e);
    }

    await delay(3000);

    console.log('filling form ..');

    const loginInput= await page.$(`#id_userLoginId`)
    await loginInput.focus();
    await page.type(`#id_userLoginId`,login)

    await delay(1000);

    const passwordInput= await page.$(`#id_password`)
    await passwordInput.focus();
    await page.type(`#id_password`,password)


    await delay(1000);

    console.log('clicking the button');

    await Promise.all([
        page.click("#appMountPoint > div > div.login-body > div > div > div.hybrid-login-form-main > form > button"),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);



})();



function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}



function successCallback() {
    console.log('Successfully passed: ');
    // console.log('closing browser .. ');
    // browser.close();
}

function failCallback(code) {
    console.log('Failed to pass: '+code);
    // console.log('closing browser .. ');
    // browser.close();
}

